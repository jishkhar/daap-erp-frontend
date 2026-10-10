"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { useProductSearch } from "@/hooks/useProducts";
import type { Product } from "@/lib/erp";
import { useDebounced } from "@/lib/useDebounced";

/** Search-as-you-type product chooser: type a name, SKU or barcode, click a result. The server searches the whole catalogue (8 results
 * at a time), so it works with any number of products. `serialized`: only devices tracked by IMEI / serial (true) or only ordinary stock
 * (false); `exclude`: ids not to offer (e.g. already on the form). */
export function ProductPicker({
  onPick,
  placeholder = "Search products by name, SKU or barcode…",
  id,
  serialized,
  exclude = [],
}: {
  onPick: (p: Product) => void;
  placeholder?: string;
  id?: string;
  serialized?: boolean;
  exclude?: string[];
}) {
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const results = useProductSearch(
    { q: query, lifecycle_status: "active", serialized },
    Boolean(query),
  );
  const shown = (results.data ?? []).filter(
    (p) => !exclude.includes(String(p.id)),
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
          {shown.map((p) => (
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
          {results.data && shown.length === 0 && (
            <li className="px-space-3 py-space-2 text-[13px] text-ink-400">
              {results.isFetching ? "Searching…" : "No products match."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
