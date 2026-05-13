"use client";

import { ClipboardCheck, ExternalLink, KeyRound, LockKeyhole, ShieldCheck, Warehouse } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { createSfcAgreementBrief } from "@/lib/sfc";

const icons = {
  "api-access": ClipboardCheck,
  credentials: KeyRound,
  warehouse: Warehouse,
  stock: ShieldCheck,
  rates: ExternalLink,
  mutations: LockKeyhole,
} as const;

export function SfcAgreementBriefPanel() {
  const brief = useMemo(() => createSfcAgreementBrief(), []);
  const [selectedId, setSelectedId] = useState(brief.requiredItems[0]?.id ?? "");
  const selected = brief.requiredItems.find((item) => item.id === selectedId) ?? brief.requiredItems[0];

  return (
    <section className="workbench-panel" data-testid="sfc-agreement-brief">
      <div className="control-rail">
        <div>
          <p className="eyebrow">SFC anlaşma brief&apos;i</p>
          <h2>Bugün SFC&apos;den ne istemeliyiz?</h2>
        </div>
        <StatusBadge label="owner action needed" />
      </div>

      <div className="network-safety-strip" role="status" aria-label="SFC anlaşma güvenlik sınırı">
        <ShieldCheck aria-hidden="true" size={17} />
        <strong>{brief.todayGoal}</strong>
        <span>Order, ASN ve product mutation ayrı pilot onayı olmadan kapalı kalır.</span>
      </div>

      <div className="network-grid">
        {brief.requiredItems.map((item) => {
          const Icon = icons[item.id as keyof typeof icons] ?? ClipboardCheck;

          return (
            <button
              className="network-card button-card"
              data-testid={`sfc-agreement-${item.id}`}
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              type="button"
            >
              <div>
                <span>
                  <Icon aria-hidden="true" size={15} />
                  {item.title}
                </span>
                <StatusBadge label={item.status} />
              </div>
              <small>{item.ownerAsk}</small>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="decision-summary" data-testid="sfc-agreement-selected">
          <span>{selected.title}</span>
          <strong>{selected.acceptance}</strong>
          <small>{selected.ownerAsk}</small>
        </div>
      ) : null}

      <div className="checklist" data-testid="sfc-agreement-boundary">
        {brief.mutationBoundary.map((item) => (
          <div className="check-row" key={item}>
            <span>
              <LockKeyhole aria-hidden="true" size={15} />
              {item}
            </span>
            <StatusBadge label="blocked" />
          </div>
        ))}
      </div>

      <div className="network-flow" data-testid="sfc-agreement-references">
        {brief.officialReferences.map((reference) => (
          <article key={reference.url}>
            <ExternalLink aria-hidden="true" size={16} />
            <span>{reference.label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
