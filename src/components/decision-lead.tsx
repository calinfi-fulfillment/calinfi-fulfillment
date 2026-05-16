type DecisionLeadItem = {
  detail: string;
  label: string;
  tone?: "good" | "warning" | "danger" | "neutral";
  value: number | string;
};

type DecisionLeadProps = {
  items: readonly DecisionLeadItem[];
  subtitle: string;
  title: string;
};

export function DecisionLead({ items, subtitle, title }: DecisionLeadProps) {
  return (
    <section className="decision-lead" aria-label={title}>
      <div>
        <p className="eyebrow">Karar özeti</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="decision-lead-grid">
        {items.map((item) => (
          <article data-tone={item.tone ?? "neutral"} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
