"use client";

import { BadgeDollarSign, LockKeyhole, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";

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
  const [result, setResult] = useState("No payment event staged");

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
    setResult(`Test webhook ${sessionId} normalized for ${orderKey}: ${currency} ${amount} -> ${review.label}`);
  }

  return (
    <section className="workbench-panel" data-testid="payment-event-workbench">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Payment Control</p>
          <h2>Event review</h2>
        </div>
        <StatusBadge label={review.tone} />
      </div>

      <div className="field-grid two">
        <label>
          Order
          <select onChange={(event) => setOrderKey(event.target.value)} value={orderKey}>
            {rows.map((row) => (
              <option key={row.sourceOrderKey} value={row.sourceOrderKey}>
                {row.sourceOrderKey}
              </option>
            ))}
          </select>
        </label>
        <label>
          Event type
          <select onChange={(event) => setEventType(event.target.value)} value={eventType}>
            <option value="stripe_checkout_completed">Stripe checkout completed</option>
            <option value="owner_covered_approved">Owner covered approved</option>
            <option value="manual_review">Manual review</option>
          </select>
        </label>
        <label>
          Test session
          <input onChange={(event) => setSessionId(event.target.value)} value={sessionId} />
        </label>
        <label>
          Event amount
          <input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
        </label>
        <label>
          Quote total
          <input inputMode="decimal" onChange={(event) => setQuoteTotal(event.target.value)} value={quoteTotal} />
        </label>
        <label>
          Currency
          <select onChange={(event) => setCurrency(event.target.value)} value={currency}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="HKD">HKD</option>
          </select>
        </label>
      </div>

      <div className="decision-summary">
        <span>Test webhook guard result</span>
        <strong>{review.label}</strong>
        <small>Lock is allowed only when test mode, metadata, amount, currency, order, and quote all match.</small>
      </div>

      <div className="button-row">
        <button onClick={stageEvent} type="button">
          <BadgeDollarSign aria-hidden="true" size={16} />
          Stage event
        </button>
        <button className="button-secondary" onClick={() => setResult(`Mismatch review staged for ${orderKey}`)} type="button">
          <ShieldAlert aria-hidden="true" size={16} />
          Review mismatch
        </button>
        <button className="button-secondary" onClick={() => setResult(`Idempotency replay preview for ${orderKey}`)} type="button">
          <ShieldCheck aria-hidden="true" size={16} />
          Replay check
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Lock live order
        </button>
      </div>

      <p className="local-state" aria-live="polite">
        {result}
      </p>
    </section>
  );
}
