"use client";

import { ListChecks } from "lucide-react";
import { useState } from "react";

import { OpsModal } from "@/components/ops-modal";

type PageGuidePopupProps = {
  steps: readonly string[];
};

export function PageGuidePopup({ steps }: PageGuidePopupProps) {
  const [open, setOpen] = useState(false);

  if (!steps.length) return null;

  return (
    <>
      <button className="button-secondary topbar-help" onClick={() => setOpen(true)} type="button">
        <ListChecks aria-hidden="true" size={16} />
        Akış
      </button>
      {open ? (
        <OpsModal onClose={() => setOpen(false)} title="Bu ekran nasıl çalışır?">
          <ol className="modal-step-list">
            {steps.map((step, index) => (
              <li key={step}>
                <strong>{index + 1}</strong>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </OpsModal>
      ) : null}
    </>
  );
}
