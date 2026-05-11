"use client";

import { ClipboardCheck, MessageSquareText, ShieldCheck, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { formatOpsValue } from "@/lib/ops-ui/labels";

type ExceptionRow = {
  age: string;
  code: string;
  owner: string;
  severity: string;
};

type ExceptionTriageProps = {
  rows: readonly ExceptionRow[];
};

export function ExceptionTriage({ rows }: ExceptionTriageProps) {
  const [code, setCode] = useState(rows[0]?.code ?? "");
  const [owner, setOwner] = useState(rows[0]?.owner ?? "Operasyon");
  const [note, setNote] = useState("Kargo fiyatı veya ödeme açılmadan önce bu blokajı kontrol et.");
  const [resolution, setResolution] = useState("Henüz sorun çözüm işlemi hazırlanmadı");

  const selectedException = useMemo(() => rows.find((row) => row.code === code) ?? rows[0], [code, rows]);

  return (
    <section className="workbench-panel" data-testid="exception-triage">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Sorun kontrolü</p>
          <h2>Kime atanacak?</h2>
        </div>
        <StatusBadge label={selectedException?.severity ?? "review"} />
      </div>

      <div className="field-grid">
        <label>
          Sorun
          <select onChange={(event) => setCode(event.target.value)} value={code}>
            {rows.map((row) => (
              <option key={row.code} value={row.code}>
                {formatOpsValue("code", row.code)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sorumlu
          <select onChange={(event) => setOwner(event.target.value)} value={owner}>
            <option value="Veri">Veri</option>
            <option value="Operasyon">Operasyon</option>
            <option value="Finans">Finans</option>
            <option value="Founder">Founder</option>
          </select>
        </label>
        <label>
          Not
          <textarea onChange={(event) => setNote(event.target.value)} rows={4} value={note} />
        </label>
      </div>

      <div className="button-row">
        <button onClick={() => setResolution(`${formatOpsValue("code", code)} ${owner} ekibine atandı`)} type="button">
          <UserCheck aria-hidden="true" size={16} />
          Ata
        </button>
        <button className="button-secondary" onClick={() => setResolution(`Kontrol notu hazırlandı: ${note}`)} type="button">
          <MessageSquareText aria-hidden="true" size={16} />
          Not ekle
        </button>
        <button className="button-secondary" onClick={() => setResolution(`${formatOpsValue("code", code)} doğrulama için hazırlandı`)} type="button">
          <ClipboardCheck aria-hidden="true" size={16} />
          Doğrula
        </button>
        <button className="button-danger" disabled type="button">
          <ShieldCheck aria-hidden="true" size={16} />
          Canlı çöz
        </button>
      </div>

      <p className="local-state" aria-live="polite">
        {resolution}
      </p>
    </section>
  );
}
