"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { qs, useErpQuery, type Product } from "@/lib/erp";

/** Search-as-you-type product chooser: type a name, SKU or barcode, click a result. */
export function ProductPicker({
  onPick,
  placeholder = "Search products by name, SKU or barcode…",
  id,
}: {
  onPick: (p: Product) => void;
  placeholder?: string;
  id?: string;
}) {
  const [q, setQ] = useState("");
  const results = useErpQuery<Product[]>(
    q.trim()
      ? `/api/v1/products${qs({ q: q.trim(), lifecycle_status: "active", limit: 8 })}`
      : null,
  );
  return (
    <div className="relative">
      <Input
        id={id}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="Search products"
      />
      {q.trim() && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-line bg-card shadow-[var(--shadow-md)]">
          {(results.data ?? []).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="block w-full px-space-3 py-space-2 text-left hover:bg-brand-50"
                onClick={() => {
                  onPick(p);
                  setQ("");
                }}
              >
                <span className="block text-[14px] font-medium text-ink-900">
                  {p.name}
                </span>
                <span className="block text-[12px] text-ink-400">
                  {p.sku}
                  {p.serialization_type !== "NONE"
                    ? ` · ${p.serialization_type}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
          {results.data?.length === 0 && (
            <li className="px-space-3 py-space-2 text-[13px] text-ink-400">
              {results.loading ? "Searching…" : "No products match."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
