"use client";

import { Calculator, Save, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

export function ManualDdpQuote() {
  const [amount, setAmount] = useState("42.00");
  const [bufferPercent, setBufferPercent] = useState("5");
  const [currency, setCurrency] = useState("USD");
  const [providerQuote, setProviderQuote] = useState("manual-ddp-hk-test");
  const [stagedQuote, setStagedQuote] = useState("No quote staged");

  const quoteMath = useMemo(() => {
    const baseAmount = Number.parseFloat(amount) || 0;
    const percent = Number.parseFloat(bufferPercent) || 0;
    const buffer = Math.max(baseAmount * (percent / 100), 3);
    const total = Math.ceil((baseAmount + buffer) * 100) / 100;

    return {
      baseAmount,
      buffer,
      total,
    };
  }, [amount, bufferPercent]);

  return (
    <section className="quote-control-panel" data-testid="manual-ddp-control">
      <div className="panel-header">
        <p className="eyebrow">Manual DDP Quote</p>
        <h2>HK direct route</h2>
      </div>

      <div className="field-grid">
        <label>
          Order key
          <input readOnly value="pm:synthetic-ddp-001" />
        </label>
        <label>
          Provider quote
          <input onChange={(event) => setProviderQuote(event.target.value)} value={providerQuote} />
        </label>
        <label>
          Amount
          <input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
        </label>
        <label>
          Currency
          <select onChange={(event) => setCurrency(event.target.value)} value={currency}>
            <option value="USD">USD</option>
            <option value="HKD">HKD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
        <label>
          Buffer %
          <input inputMode="decimal" onChange={(event) => setBufferPercent(event.target.value)} value={bufferPercent} />
        </label>
      </div>

      <div className="quote-total">
        <span>
          <Calculator aria-hidden="true" size={18} />
          {currency} {quoteMath.total.toFixed(2)}
        </span>
        <small>
          buffer {currency} {quoteMath.buffer.toFixed(2)}
        </small>
      </div>

      <div className="button-row">
        <button
          onClick={() => setStagedQuote(`${providerQuote} staged at ${currency} ${quoteMath.total.toFixed(2)}`)}
          type="button"
        >
          <Save aria-hidden="true" size={16} />
          Stage quote
        </button>
        <button className="button-secondary" disabled type="button">
          <ShieldCheck aria-hidden="true" size={16} />
          Push live
        </button>
      </div>
      <p className="local-state">{stagedQuote}</p>
    </section>
  );
}
