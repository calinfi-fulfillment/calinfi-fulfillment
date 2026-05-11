type StatusBadgeProps = {
  label: string;
};

function statusTone(label: string) {
  const normalized = label.toLowerCase();

  if (["ready", "quote ready", "completed"].includes(normalized)) return "good";
  if (["blocker", "blocked", "missing hs/origin/value"].some((value) => normalized.includes(value))) return "danger";
  if (["review", "pending", "approval", "missing"].some((value) => normalized.includes(value))) return "warning";

  return "neutral";
}

export function StatusBadge({ label }: StatusBadgeProps) {
  return (
    <span className="status-badge" data-tone={statusTone(label)}>
      {label}
    </span>
  );
}
