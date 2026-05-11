import { StatusBadge } from "@/components/status-badge";

type ActionRow = {
  item: string;
  owner: string;
  priority: string;
  queue: string;
  status: string;
};

type ActionListProps = {
  rows: readonly ActionRow[];
};

export function ActionList({ rows }: ActionListProps) {
  return (
    <div className="action-list">
      {rows.map((row) => (
        <article className="action-row" key={`${row.priority}-${row.item}`}>
          <strong>{row.priority}</strong>
          <div>
            <span>{row.queue}</span>
            <p>{row.item}</p>
          </div>
          <span>{row.owner}</span>
          <StatusBadge label={row.status} />
        </article>
      ))}
    </div>
  );
}
