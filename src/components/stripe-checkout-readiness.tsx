import { CreditCard, KeyRound, LockKeyhole, ShieldCheck, ToggleLeft, TriangleAlert } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import type { StripeCheckoutReadiness } from "@/lib/stripe-checkout";

type StripeCheckoutReadinessProps = {
  readiness: StripeCheckoutReadiness;
};

function statusLabel(readiness: StripeCheckoutReadiness) {
  if (readiness.status === "ready") return "test ready";
  if (readiness.status === "disabled") return "disabled";
  return "blocked";
}

function iconFor(checkName: string, ok: boolean) {
  if (!ok) return TriangleAlert;
  if (checkName === "checkout-flag") return ToggleLeft;
  if (checkName === "restricted-test-key") return KeyRound;
  if (checkName === "stripe-mode") return ShieldCheck;
  return CreditCard;
}

export function StripeCheckoutReadinessPanel({ readiness }: StripeCheckoutReadinessProps) {
  return (
    <section className="workbench-panel" data-testid="stripe-checkout-readiness">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Stripe Test Checkout</p>
          <h2>Checkout readiness</h2>
        </div>
        <StatusBadge label={statusLabel(readiness)} />
      </div>

      <div className="decision-summary">
        <span>Creation guard</span>
        <strong>{readiness.code}</strong>
        <small>Checkout session creation requires test mode, a restricted test key, a fresh quote, and matching metadata.</small>
      </div>

      <div className="checklist">
        {readiness.checks.map((check) => {
          const Icon = iconFor(check.name, check.ok);

          return (
            <div className="check-row" key={check.name}>
              <span>
                <Icon aria-hidden="true" size={15} />
                {check.name}
              </span>
              <StatusBadge label={check.ok ? "ready" : "blocked"} />
            </div>
          );
        })}
      </div>

      <div className="button-row">
        <button disabled title="Requires a selected fresh quote payload" type="button">
          <CreditCard aria-hidden="true" size={16} />
          Create test checkout
        </button>
        <button className="button-secondary" disabled type="button">
          <ShieldCheck aria-hidden="true" size={16} />
          Verify webhook
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Live checkout
        </button>
      </div>
    </section>
  );
}
