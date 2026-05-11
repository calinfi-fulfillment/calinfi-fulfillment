"use client";

import { BadgeDollarSign, LockKeyhole, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { formatOpsValue } from "@/lib/ops-ui/labels";

type PaymentRow = {
  guard: string;
  quote: string;
  sourceOrderKey: string;
  status: string;
};

type PaymentEventWorkbenchProps = {
  rows: readonly PaymentRow[];
};

export function PaymentEventWorkbench({ rows }: PaymentEventWorkbenchProps) {
  const [amount, setAmount] = useState("25.25");
  const [currency, setCurrency] = useState("USD");
  const [eventType, setEventType] = useState("stripe_checkout_completed");
  const [orderKey, setOrderKey] = useState(rows[0]?.sourceOrderKey ?? "");
  const [quoteTotal, setQuoteTotal] = useState("25.25");
  const [sessionId, setSessionId] = useState("cs_test_mock_001");
  const [result, setResult] = useState("Henüz ödeme olayı hazırlanmadı");

  const review = useMemo(() => {
    const amountNumber = Number.parseFloat(amount) || 0;
    const quoteNumber = Number.parseFloat(quoteTotal) || 0;
    const amountMatches = Math.abs(amountNumber - quoteNumber) < 0.01;
    const currencyMatches = currency === "USD";

    if (!amountMatches) return { label: "payment_review_required", tone: "blocker" };
    if (!currencyMatches) return { label: "currency_review_required", tone: "review" };
    return { label: "lock_ready", tone: "ready" };
  }, [amount, currency, quoteTotal]);

  function stageEvent() {
    setResult(`${formatOpsValue("sourceOrderKey", orderKey)} için test ödeme haberi kontrol edildi: ${currency} ${amount} -> ${formatOpsValue("status", review.label)}`);
  }

  return (
    <section className="workbench-panel" data-testid="payment-event-workbench">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Ödeme kontrolü</p>
          <h2>Ödeme haberi eşleşiyor mu?</h2>
        </div>
        <StatusBadge label={review.tone} />
      </div>

      <div className="field-grid two">
        <label>
          Sipariş
          <select onChange={(event) => setOrderKey(event.target.value)} value={orderKey}>
            {rows.map((row) => (
              <option key={row.sourceOrderKey} value={row.sourceOrderKey}>
                {formatOpsValue("sourceOrderKey", row.sourceOrderKey)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ödeme türü
          <select onChange={(event) => setEventType(event.target.value)} value={eventType}>
            <option value="stripe_checkout_completed">Stripe test ödemesi tamamlandı</option>
            <option value="owner_covered_approved">Owner karşıladı</option>
            <option value="manual_review">Manuel kontrol</option>
          </select>
        </label>
        <label>
          Test oturumu
          <input onChange={(event) => setSessionId(event.target.value)} value={sessionId} />
        </label>
        <label>
          Gelen ödeme tutarı
          <input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
        </label>
        <label>
          Beklenen kargo tutarı
          <input inputMode="decimal" onChange={(event) => setQuoteTotal(event.target.value)} value={quoteTotal} />
        </label>
        <label>
          Para birimi
          <select onChange={(event) => setCurrency(event.target.value)} value={currency}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="HKD">HKD</option>
          </select>
        </label>
      </div>

      <div className="decision-summary">
        <span>Test ödeme sonucu</span>
        <strong>{formatOpsValue("status", review.label)}</strong>
        <small>Kilit sadece sipariş, fiyat, tutar ve para birimi eşleşirse güvenlidir.</small>
      </div>

      <div className="button-row">
        <button onClick={stageEvent} type="button">
          <BadgeDollarSign aria-hidden="true" size={16} />
          Ödemeyi kontrol et
        </button>
        <button
          className="button-secondary"
          onClick={() => setResult(`${formatOpsValue("sourceOrderKey", orderKey)} için uyuşmazlık kontrolü hazırlandı`)}
          type="button"
        >
          <ShieldAlert aria-hidden="true" size={16} />
          Uyuşmazlığı incele
        </button>
        <button
          className="button-secondary"
          onClick={() => setResult(`${formatOpsValue("sourceOrderKey", orderKey)} için tekrar ödeme kontrolü önizlendi`)}
          type="button"
        >
          <ShieldCheck aria-hidden="true" size={16} />
          Tekrarı kontrol et
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Canlı siparişi kilitle
        </button>
      </div>

      <p className="local-state" aria-live="polite">
        {result}
      </p>
    </section>
  );
}
