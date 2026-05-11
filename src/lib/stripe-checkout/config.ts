import type { SafetyEnv } from "../safety";

export type StripeCheckoutReadinessCode =
  | "stripe_checkout_ready"
  | "stripe_checkout_disabled"
  | "stripe_live_mode_blocked"
  | "stripe_restricted_test_key_missing"
  | "stripe_restricted_test_key_required"
  | "stripe_publishable_key_invalid";

export type StripeCheckoutBlockingCode = Exclude<StripeCheckoutReadinessCode, "stripe_checkout_ready">;

export type StripeCheckoutReadiness = {
  ok: boolean;
  code: StripeCheckoutReadinessCode;
  status: "ready" | "disabled" | "blocked";
  checks: Array<{
    name: string;
    ok: boolean;
    detail: string;
  }>;
};

function envValue(env: SafetyEnv, key: string) {
  return String(env[key] ?? "").trim();
}

function flagEnabled(env: SafetyEnv, key: string) {
  return envValue(env, key) === "true";
}

function maskedKeyState(value: string, expectedPrefix: string) {
  if (!value) return "missing";
  if (value.startsWith(expectedPrefix)) return "present";
  return "wrong_prefix";
}

export function stripeCheckoutSecretKey(env: SafetyEnv = process.env) {
  return envValue(env, "STRIPE_SECRET_KEY");
}

export function createStripeCheckoutReadiness(env: SafetyEnv = process.env): StripeCheckoutReadiness {
  const stripeMode = envValue(env, "STRIPE_MODE") || "test";
  const checkoutEnabled = flagEnabled(env, "FULFILLMENT_ENABLE_STRIPE_CHECKOUT");
  const secretKeyState = maskedKeyState(stripeCheckoutSecretKey(env), "rk_test_");
  const publishableKey = envValue(env, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  const publishableKeyState = maskedKeyState(publishableKey, "pk_test_");

  const checks = [
    {
      name: "checkout-flag",
      ok: checkoutEnabled,
      detail: checkoutEnabled ? "Stripe Checkout creation flag is enabled." : "Stripe Checkout creation flag is disabled.",
    },
    {
      name: "stripe-mode",
      ok: stripeMode === "test",
      detail: `Stripe mode is ${stripeMode}.`,
    },
    {
      name: "restricted-test-key",
      ok: secretKeyState === "present",
      detail:
        secretKeyState === "present"
          ? "Restricted test secret key is present."
          : secretKeyState === "missing"
            ? "Restricted test secret key is missing."
            : "Secret key must be a restricted test key.",
    },
    {
      name: "publishable-test-key",
      ok: !publishableKey || publishableKeyState === "present",
      detail:
        !publishableKey || publishableKeyState === "present"
          ? "Publishable test key is absent or test-mode."
          : "Publishable key must be a test publishable key.",
    },
  ];

  if (!checkoutEnabled) {
    return {
      ok: false,
      code: "stripe_checkout_disabled",
      status: "disabled",
      checks,
    };
  }

  if (stripeMode !== "test") {
    return {
      ok: false,
      code: "stripe_live_mode_blocked",
      status: "blocked",
      checks,
    };
  }

  if (secretKeyState === "missing") {
    return {
      ok: false,
      code: "stripe_restricted_test_key_missing",
      status: "blocked",
      checks,
    };
  }

  if (secretKeyState !== "present") {
    return {
      ok: false,
      code: "stripe_restricted_test_key_required",
      status: "blocked",
      checks,
    };
  }

  if (publishableKey && publishableKeyState !== "present") {
    return {
      ok: false,
      code: "stripe_publishable_key_invalid",
      status: "blocked",
      checks,
    };
  }

  return {
    ok: true,
    code: "stripe_checkout_ready",
    status: "ready",
    checks,
  };
}
