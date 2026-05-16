"use client";

import { Info } from "lucide-react";
import { type ReactNode, useState } from "react";

import { OpsModal } from "@/components/ops-modal";

type DetailPopupProps = {
  buttonLabel: string;
  children: ReactNode;
  intro?: string;
  size?: "default" | "wide";
  title: string;
};

export function DetailPopup({ buttonLabel, children, intro, size = "default", title }: DetailPopupProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="button-secondary" onClick={() => setOpen(true)} type="button">
        <Info aria-hidden="true" size={16} />
        {buttonLabel}
      </button>
      {open ? (
        <OpsModal onClose={() => setOpen(false)} size={size} title={title}>
          {intro ? <p className="modal-intro">{intro}</p> : null}
          {children}
        </OpsModal>
      ) : null}
    </>
  );
}
