"use client";

import { useState } from "react";
import { SearchCombobox } from "@/components/ui/SearchCombobox";
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
  categoryId,
  exclude = [],
}: {
  onPick: (p: Product) => void;
  placeholder?: string;
  id?: string;
  serialized?: boolean;
  categoryId?: string;
  exclude?: string[];
}) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const query = useDebounced(q.trim());
  const results = useProductSearch(
    {
      q: query,
      lifecycle_status: "active",
      serialized,
      category_id: categoryId,
    },
    Boolean(query || (categoryId && focused)),
  );
  const shown = (results.data ?? []).filter(
    (p) =>
      !exclude.includes(String(p.id)) &&
      (!categoryId || p.category_id === categoryId),
  );
  return (
    <SearchCombobox
      id={id}
      label="Search products"
      placeholder={placeholder}
      query={q}
      onQueryChange={setQ}
      onFocus={() => setFocused(true)}
      items={shown}
      itemLabel={(product) => product.name}
      onPick={onPick}
      loading={results.isFetching || q.trim() !== query}
      emptyLabel={
        query || categoryId ? "No products match." : "Type to search products."
      }
      renderItem={(product) => (
        <>
          <span className="block text-[14px] font-medium text-ink-900">
            {product.name}
          </span>
          <span className="block text-[12px] text-ink-400">
            {product.sku}
            {product.serialization_type !== "NONE"
              ? ` · ${product.serialization_type}`
              : ""}
          </span>
        </>
      )}
    />
  );
}
