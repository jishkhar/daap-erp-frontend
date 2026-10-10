"use client";

import { X } from "lucide-react";
import { ProductPicker } from "@/components/erp/ProductPicker";
import type { Product } from "@/lib/erp";

/** A form field holding ONE product: shows the chosen one (with a button to change it), otherwise a server-side search to choose from.
 * Replaces dropdowns that listed every product, which stopped scaling (and silently hid products) past a few hundred. */
export function ProductSelect({
  value,
  onChange,
  id,
  placeholder,
  serialized,
  exclude,
}: {
  value: Product | null;
  onChange: (product: Product | null) => void;
  id?: string;
  placeholder?: string;
  serialized?: boolean;
  exclude?: string[];
}) {
  if (!value)
    return (
      <ProductPicker
        id={id}
        onPick={onChange}
        placeholder={placeholder}
        serialized={serialized}
        exclude={exclude}
      />
    );
  return (
    <div className="flex h-10 items-center justify-between gap-space-2 rounded-md border border-line bg-card px-space-3 text-[14px]">
      <span className="min-w-0 truncate text-ink-900">
        {value.name}{" "}
        <span className="text-[12px] text-ink-400">{value.sku}</span>
      </span>
      <button
        type="button"
        aria-label="Change product"
        onClick={() => onChange(null)}
        className="shrink-0 text-ink-400 hover:text-ink-900"
      >
        <X size={15} />
      </button>
    </div>
  );
}
