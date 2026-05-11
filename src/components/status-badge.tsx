import { formatOpsValue, opsStatusTone } from "@/lib/ops-ui/labels";

type StatusBadgeProps = {
  label: string;
};

export function StatusBadge({ label }: StatusBadgeProps) {
  const displayLabel = formatOpsValue("status", label);

  return (
    <span className="status-badge" data-tone={opsStatusTone(label)}>
      {displayLabel}
    </span>
  );
}
