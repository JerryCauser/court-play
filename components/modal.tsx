"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "./i18n-provider";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, title, onClose, children }: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="card modal-body">
          <div className="card-head">
            <h2>{title}</h2>
            <button className="btn ghost icon" type="button" onClick={onClose} aria-label={t("close")} title={t("close")}>
              ×
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
