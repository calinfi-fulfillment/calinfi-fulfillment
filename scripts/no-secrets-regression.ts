import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([".agents", ".git", ".next", "node_modules"]);
const ignoredFiles = new Set(["package-lock.json", "scripts/no-secrets-regression.ts", "scripts/staging-launch-gates-regression.ts"]);
const searchableExtensions = new Set([".css", ".env.example", ".json", ".md", ".mjs", ".sql", ".ts", ".tsx", ".yaml"]);

const secretPatterns = [
  { name: "stripe-live-secret", pattern: new RegExp(["sk", "live"].join("_")) },
  { name: "stripe-webhook-secret", pattern: new RegExp(["wh", "sec"].join("")) },
  { name: "jwt-like-token", pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  {
    name: "non-empty-secret-env",
    pattern:
      /\b(?:SUPABASE_SERVICE_ROLE_KEY|PM_INTAKE_SHARED_SECRET|PM_PAYMENT_EVENT_SHARED_SECRET|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|SFC_APP_TOKEN|SFC_APP_KEY)[ \t]*=[ \t]*["']?[A-Za-z0-9_./+=-]{8,}/,
  },
  { name: "raw-auth-link", pattern: /token_hash=|auth\/v1\/verify/i },
  { name: "non-example-email", pattern: /[A-Z0-9._%+-]+@(?!example\.test\b)[A-Z0-9.-]+\.[A-Z]{2,}/i },
];

function shouldSearch(path: string) {
  if (ignoredFiles.has(path)) return false;
  return [...searchableExtensions].some((extension) => path.endsWith(extension));
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const absolutePath = join(dir, entry);
    const relativePath = absolutePath.slice(root.length + 1);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      return ignoredDirs.has(entry) ? [] : walk(absolutePath);
    }

    return shouldSearch(relativePath) ? [relativePath] : [];
  });
}

const findings: Array<{ file: string; pattern: string }> = [];

for (const file of walk(root)) {
  const content = readFileSync(file, "utf8");

  for (const { name, pattern } of secretPatterns) {
    if (pattern.test(content)) {
      findings.push({ file, pattern: name });
    }
  }
}

assert.deepEqual(findings, []);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "no-secrets",
      scannedFiles: walk(root).length,
      mode: "static-scan",
    },
    null,
    2,
  ),
);
