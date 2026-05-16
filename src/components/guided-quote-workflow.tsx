"use client";

import { CheckCircle2, CircleDollarSign, LockKeyhole, Route, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { formatOpsValue } from "@/lib/ops-ui/labels";

type QuoteRow = {
  expires: string;
  mode: string;
  quote: string;
  route: string;
  sourceOrderKey: string;
};

type GuidedQuoteWorkflowProps = {
  rows: readonly QuoteRow[];
};

const nextActionByRoute: Record<string, string> = {
  CHINA_HK_DIRECT_DDP: "DDP yöntemi yazılı teyit gelince fiyatı gir",
  REGIONAL_3PL: "Fiyat kaydını hazırla ve ödeme adımına hazırla",
};

function routeTone(row: QuoteRow) {
  if (row.quote === "manual needed") return "warning";
  if (row.quote === "none") return "ready";
  return "neutral";
}

function routeSummary(row: QuoteRow) {
  if (row.route === "CHINA_HK_DIRECT_DDP") {
    return {
      result: "Elle fiyat bekliyor",
      reason: "Asya DDP için kargo yöntemi yazılı teyit bekliyor.",
      safeAction: "Canlı firma bağlantısı kapalı kalır; sadece yerel fiyat önizlemesi hazırlanır.",
    };
  }

  return {
    result: row.quote === "none" ? "Fiyat kaydı yok" : "Fiyat kaydı hazır",
    reason: "Adres, ürün ve bölgesel depo rotası PM intake verisiyle tamam.",
    safeAction: "Fiyat kaydı hazırlanabilir; canlı etiket ve ödeme kapalı kalır.",
  };
}

export function GuidedQuoteWorkflow({ rows }: GuidedQuoteWorkflowProps) {
  const [selectedOrderKey, setSelectedOrderKey] = useState(rows[0]?.sourceOrderKey ?? "");
  const [localResult, setLocalResult] = useState("Henüz local fiyat seçilmedi.");
  const selected = rows.find((row) => row.sourceOrderKey === selectedOrderKey) ?? rows[0];
  const summary = useMemo(() => (selected ? routeSummary(selected) : null), [selected]);

  if (!selected) {
    return (
      <section className="guided-quote" data-testid="guided-quote-workflow">
        <div className="empty-state">
          <p className="eyebrow">Kargo fiyatı</p>
          <h2>Fiyat bekleyen PM siparişi yok</h2>
          <p>PM&apos;den onaylı sipariş geldikçe burada rota ve fiyat aksiyonu görünecek.</p>
        </div>
      </section>
    );
  }
  const stages = [
    {
      detail: "Adres + paket hazır siparişler buraya gelir.",
      icon: CheckCircle2,
      label: "Sipariş hazır",
      state: "ready",
    },
    {
      detail: `${formatOpsValue("route", selected.route)} / ${formatOpsValue("mode", selected.mode)}`,
      icon: Route,
      label: "Kargo yolu seçildi",
      state: "ready",
    },
    {
      detail: formatOpsValue("quote", selected.quote),
      icon: CircleDollarSign,
      label: "Fiyat durumu",
      state: selected.quote === "manual needed" ? "warning" : "ready",
    },
    {
      detail: "Canlı ödeme, etiket ve takip kapalı.",
      icon: LockKeyhole,
      label: "Canlı kilit",
      state: "locked",
    },
  ] as const;

  return (
    <section className="guided-quote" data-testid="guided-quote-workflow">
      <div className="guided-quote-hero">
        <div>
          <p className="eyebrow">Kargo fiyatı</p>
          <h2>Önce sistem kararı, sonra tek güvenli aksiyon</h2>
          <p>Bu ekranda canlı kargo firması, ödeme, etiket ve takip işlemi yapılmaz. Sadece hangi siparişin fiyat beklediği görülür.</p>
        </div>
        <div className="guided-quote-safe">
          <ShieldCheck aria-hidden="true" size={18} />
          <span>Yerel önizleme</span>
          <strong>Canlı işlem kapalı</strong>
        </div>
      </div>

      <div className="quote-stage-grid">
        {stages.map(({ detail, icon: Icon, label, state }) => (
          <article className="quote-stage-card" data-state={state} key={label}>
            <Icon aria-hidden="true" size={18} />
            <span>{label}</span>
            <strong>{detail}</strong>
          </article>
        ))}
      </div>

      <div className="quote-decision-layout">
        <div className="quote-order-list" aria-label="Fiyat bekleyen siparişler">
          {rows.map((row) => (
            <button
              aria-pressed={row.sourceOrderKey === selected.sourceOrderKey}
              className="quote-order-button"
              data-tone={routeTone(row)}
              key={row.sourceOrderKey}
              onClick={() => setSelectedOrderKey(row.sourceOrderKey)}
              type="button"
            >
              <span>{formatOpsValue("sourceOrderKey", row.sourceOrderKey)}</span>
              <strong>{formatOpsValue("route", row.route)}</strong>
              <small>{formatOpsValue("quote", row.quote)}</small>
            </button>
          ))}
        </div>

        <article className="quote-focus-panel">
          <div className="panel-header">
            <p className="eyebrow">Seçili sipariş</p>
            <h3>{formatOpsValue("sourceOrderKey", selected.sourceOrderKey)}</h3>
          </div>

          <div className="quote-result-grid">
            <div>
              <span>Sistem sonucu</span>
              <strong>{summary?.result}</strong>
            </div>
            <div>
              <span>Neden</span>
              <strong>{summary?.reason}</strong>
            </div>
            <div>
              <span>Güvenli aksiyon</span>
              <strong>{nextActionByRoute[selected.route] ?? summary?.safeAction}</strong>
            </div>
          </div>

          <div className="quote-action-bar">
          <button
            disabled={selected.quote === "manual needed"}
              onClick={() => setLocalResult(`${formatOpsValue("sourceOrderKey", selected.sourceOrderKey)} için fiyat kontrolü hazırlandı.`)}
              type="button"
            >
              Fiyatı hazırla
            </button>
            <button className="button-secondary" disabled type="button">
              Canlı firma gönderimi kapalı
            </button>
          </div>

          <p className="local-state">{selected.quote === "manual needed" ? summary?.safeAction : localResult}</p>
        </article>
      </div>
    </section>
  );
}
