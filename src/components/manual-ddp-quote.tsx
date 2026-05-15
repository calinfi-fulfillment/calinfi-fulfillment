"use client";

import { Calculator, Save, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

export function ManualDdpQuote() {
  const [amount, setAmount] = useState("42.00");
  const [bufferPercent, setBufferPercent] = useState("5");
  const [currency, setCurrency] = useState("USD");
  const [providerQuote, setProviderQuote] = useState("manual-ddp-hk-test");
  const [stagedQuote, setStagedQuote] = useState("Henüz fiyat önizlemesi hazırlanmadı");

  const quoteMath = useMemo(() => {
    const baseAmount = Math.max(Number.parseFloat(amount) || 0, 0);
    const percent = Math.max(Number.parseFloat(bufferPercent) || 0, 0);
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
        <p className="eyebrow">Manuel DDP fiyatı</p>
        <h2>Hong Kong direkt rota</h2>
      </div>

      <div className="field-grid">
        <label>
          Sipariş
          <input readOnly value="DDP test siparişi" />
        </label>
        <label>
          Firma teklif kodu
          <input onChange={(event) => setProviderQuote(event.target.value)} value={providerQuote} />
        </label>
        <label>
          Temel tutar
          <input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
        </label>
        <label>
          Para birimi
          <select onChange={(event) => setCurrency(event.target.value)} value={currency}>
            <option value="USD">USD</option>
            <option value="HKD">HKD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
        <label>
          Güvenlik payı %
          <input inputMode="decimal" onChange={(event) => setBufferPercent(event.target.value)} value={bufferPercent} />
        </label>
      </div>

      <div className="quote-total">
        <span>
          <Calculator aria-hidden="true" size={18} />
          {currency} {quoteMath.total.toFixed(2)}
        </span>
        <small>
          güvenlik payı {currency} {quoteMath.buffer.toFixed(2)}
        </small>
      </div>

      <div className="button-row">
        <button
          onClick={() => setStagedQuote(`${providerQuote} için toplam ${currency} ${quoteMath.total.toFixed(2)} hazırlandı`)}
          type="button"
        >
          <Save aria-hidden="true" size={16} />
          Fiyatı hazırla
        </button>
        <button className="button-secondary" disabled type="button">
          <ShieldCheck aria-hidden="true" size={16} />
          Canlıya gönder
        </button>
      </div>
      <p className="local-state">{stagedQuote}</p>
    </section>
  );
}
