"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { useId } from "react";

/** A small "i" button that opens an explanatory card on hover or keyboard focus. */
export function InfoTip({
  title,
  children,
  above = false,
  align = "left",
}: {
  title: string;
  children: React.ReactNode;
  /** Open upwards: for items near the bottom of a clipping container. */ above?: boolean;
  /** Which edge of the icon the card lines up with; use "right" near the right edge of a container. */ align?:
    "left" | "right";
}) {
  const id = useId();
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`About ${title}`}
        aria-describedby={id}
        className="ml-space-2 rounded-full text-ink-400 outline-none hover:text-ink-600 focus-visible:text-brand-600"
      >
        <HugeiconsIcon icon={InformationCircleIcon} size={15} />
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none invisible absolute ${align === "right" ? "right-0" : "left-0"} z-30 ${above ? "bottom-full mb-1.5" : "top-full mt-1.5"} w-72 rounded-lg border border-line bg-card p-space-3 text-left text-[12.5px] font-normal tracking-normal normal-case leading-relaxed text-ink-600 opacity-0 shadow-[var(--shadow-md)] transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100`}
      >
        <span className="mb-1 block text-[13px] font-semibold text-ink-900">
          {title}
        </span>
        {children}
      </span>
    </span>
  );
}
