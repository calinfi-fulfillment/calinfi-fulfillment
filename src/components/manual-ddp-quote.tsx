"use client";

import { Calculator, Save, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { formatOpsValue } from "@/lib/ops-ui/labels";

type ManualDdpQuoteOrder = {
  route: string;
  sourceOrderKey: string;
};

type ManualDdpQuoteProps = {
  orders?: readonly ManualDdpQuoteOrder[];
};

export function ManualDdpQuote({ orders = [] }: ManualDdpQuoteProps) {
  const [amount, setAmount] = useState("0.00");
  const [bufferPercent, setBufferPercent] = useState("5");
  const [currency, setCurrency] = useState("USD");
  const [orderKey, setOrderKey] = useState(orders[0]?.sourceOrderKey ?? "");
  const [providerQuote, setProviderQuote] = useState("");
  const [stagedQuote, setStagedQuote] = useState("Henüz fiyat önizlemesi hazırlanmadı");
  const selectedOrder = orders.find((order) => order.sourceOrderKey === orderKey) ?? orders[0];

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

  if (!selectedOrder) {
    return (
      <section className="quote-control-panel" data-testid="manual-ddp-control">
        <div className="empty-state">
          <p className="eyebrow">Manuel DDP fiyatı</p>
          <h2>DDP siparişi yok</h2>
          <p>PM&apos;den DDP rotasına düşen sipariş geldiğinde manuel fiyat burada hazırlanır.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="quote-control-panel" data-testid="manual-ddp-control">
      <div className="panel-header">
        <p className="eyebrow">Manuel DDP fiyatı</p>
        <h2>{formatOpsValue("route", selectedOrder.route)}</h2>
      </div>

      <div className="field-grid">
        <label>
          Sipariş
          <select onChange={(event) => setOrderKey(event.target.value)} value={selectedOrder.sourceOrderKey}>
            {orders.map((order) => (
              <option key={order.sourceOrderKey} value={order.sourceOrderKey}>
                {formatOpsValue("sourceOrderKey", order.sourceOrderKey)}
              </option>
            ))}
          </select>
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
          onClick={() =>
            setStagedQuote(
              `${formatOpsValue("sourceOrderKey", selectedOrder.sourceOrderKey)} için ${providerQuote || "manuel fiyat"} toplam ${currency} ${quoteMath.total.toFixed(2)} hazırlandı`,
            )
          }
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
