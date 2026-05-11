"use client";

import { ClipboardCheck, MessageSquareText, ShieldCheck, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";

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
  const [owner, setOwner] = useState(rows[0]?.owner ?? "Ops");
  const [note, setNote] = useState("Review blocker before quote/payment.");
  const [resolution, setResolution] = useState("No triage action staged");

  const selectedException = useMemo(() => rows.find((row) => row.code === code) ?? rows[0], [code, rows]);

  return (
    <section className="workbench-panel" data-testid="exception-triage">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Exception Control</p>
          <h2>Triage desk</h2>
        </div>
        <StatusBadge label={selectedException?.severity ?? "review"} />
      </div>

      <div className="field-grid">
        <label>
          Issue
          <select onChange={(event) => setCode(event.target.value)} value={code}>
            {rows.map((row) => (
              <option key={row.code} value={row.code}>
                {row.code}
              </option>
            ))}
          </select>
        </label>
        <label>
          Owner
          <select onChange={(event) => setOwner(event.target.value)} value={owner}>
            <option value="Core Data">Core Data</option>
            <option value="Ops">Ops</option>
            <option value="Payment">Payment</option>
            <option value="Founder">Founder</option>
          </select>
        </label>
        <label>
          Note
          <textarea onChange={(event) => setNote(event.target.value)} rows={4} value={note} />
        </label>
      </div>

      <div className="button-row">
        <button onClick={() => setResolution(`${code} assigned to ${owner}`)} type="button">
          <UserCheck aria-hidden="true" size={16} />
          Assign
        </button>
        <button className="button-secondary" onClick={() => setResolution(`Review note staged: ${note}`)} type="button">
          <MessageSquareText aria-hidden="true" size={16} />
          Add note
        </button>
        <button className="button-secondary" onClick={() => setResolution(`${code} marked ready for verification`)} type="button">
          <ClipboardCheck aria-hidden="true" size={16} />
          Verify
        </button>
        <button className="button-danger" disabled type="button">
          <ShieldCheck aria-hidden="true" size={16} />
          Resolve live
        </button>
      </div>

      <p className="local-state" aria-live="polite">
        {resolution}
      </p>
    </section>
  );
}
