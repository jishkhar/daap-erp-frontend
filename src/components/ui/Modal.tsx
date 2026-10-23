"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Actions below the scrollable body; full width on mobile. */
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg";
  /** Reduce vertical padding in the header and footer. */
  compact?: boolean;
  /** false = no close button, and neither a backdrop click nor Escape closes it (a gate the person must act on). */
  dismissible?: boolean;
};

const WIDTH = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

/** Generic dialog: backdrop click and Escape close it. */
export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  width = "md",
  compact = false,
  dismissible = true,
}: ModalProps) {
  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, dismissible]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-space-4"
      style={{
        paddingBottom: "max(var(--space-4), env(safe-area-inset-bottom))",
      }}
      onClick={dismissible ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[90dvh] min-w-0 w-full ${WIDTH[width]} flex-col rounded-lg border border-line bg-card shadow-[var(--shadow-lg)]`}
      >
        <div
          className={`flex shrink-0 items-start gap-space-3 border-b border-line ${compact ? "px-space-4 py-space-2" : "p-space-4"}`}
        >
          <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
            <h2 className="text-[17px] font-bold text-ink-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[13px] text-ink-600">{description}</p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="touch-target shrink-0 rounded-md p-1 text-ink-400 hover:bg-black/[0.04] hover:text-ink-700"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="@container min-h-0 min-w-0 max-w-full overflow-y-auto overscroll-contain p-space-4">
          {children}
        </div>
        {footer && (
          <div
            className={`mobile-page-actions flex shrink-0 flex-wrap justify-end gap-space-2 border-t border-line ${compact ? "px-space-4 py-space-2" : "p-space-4"}`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
