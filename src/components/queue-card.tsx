type QueueCardProps = {
  count: number;
  detail: string;
  label: string;
  tone?: string;
};

export function QueueCard({ count, detail, label, tone = "neutral" }: QueueCardProps) {
  return (
    <article className="queue-card" data-tone={tone}>
      <span>{label}</span>
      <strong>{count}</strong>
      <p>{detail}</p>
    </article>
  );
}
