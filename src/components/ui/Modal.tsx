"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Right-aligned action buttons under the body. */
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg";
};

const WIDTH = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

/** Generic dialog: backdrop click and Escape close it. */
export function Modal({ open, title, description, onClose, children, footer, width = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-space-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[90vh] w-full ${WIDTH[width]} flex-col rounded-lg border border-line bg-card shadow-[var(--shadow-lg)]`}
      >
        <div className="flex items-start gap-space-3 border-b border-line p-space-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-bold text-ink-900">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-ink-600">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-ink-400 hover:bg-black/[0.04] hover:text-ink-700">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-space-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-space-2 border-t border-line p-space-4">{footer}</div>}
      </div>
    </div>
  );
}
