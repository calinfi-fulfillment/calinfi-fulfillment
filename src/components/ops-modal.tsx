"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

type OpsModalProps = {
  children: ReactNode;
  onClose: () => void;
  size?: "default" | "wide";
  title: string;
};

export function OpsModal({ children, onClose, size = "default", title }: OpsModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="ops-modal-backdrop" onMouseDown={onClose} role="presentation">
      <section
        aria-label={title}
        aria-modal="true"
        className={`ops-modal ${size === "wide" ? "ops-modal--wide" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="Kapat" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className="ops-modal-body">{children}</div>
      </section>
    </div>
  );
}
