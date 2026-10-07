"use client";

import { useState } from "react";
import { changeItems } from "@/lib/audit";

const SHOWN = 5;

/** "field: ~~old~~ → new", one per line. A field with no recorded old value shows "—" before the arrow. Long lists show the first five with View more / View less. */
export function ChangeList({
  before,
  after,
}: {
  before: unknown;
  after: unknown;
}) {
  const [all, setAll] = useState(false);
  const items = changeItems(before, after);
  if (items.length === 0) return <span className="text-ink-400">—</span>;
  const shown = all ? items : items.slice(0, SHOWN);
  return (
    <div className="max-w-md">
      <ul className="space-y-0.5 text-[12.5px] text-ink-900">
        {shown.map((c, i) => (
          <li key={i} className="break-words">
            <span className="font-medium">{c.field}:</span>{" "}
            <span className="text-ink-400 line-through decoration-ink-400/60">
              {c.from ?? "—"}
            </span>
            <span className="mx-1 text-ink-400">→</span>
            <span>{c.to}</span>
          </li>
        ))}
      </ul>
      {items.length > SHOWN && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-1 text-[12px] font-semibold text-brand-600 hover:underline"
        >
          {all ? "View less" : `View ${items.length - SHOWN} more`}
        </button>
      )}
    </div>
  );
}
