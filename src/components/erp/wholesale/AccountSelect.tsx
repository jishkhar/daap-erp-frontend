"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { SearchCombobox } from "@/components/ui/SearchCombobox";
import { useAccountSearch } from "@/hooks/useWholesale";
import { useDebounced } from "@/lib/useDebounced";
import type { CustomerAccount } from "@/lib/wholesale";

/** A form field holding ONE active business customer: the chosen one (with a button to clear it), otherwise a server search by name,
 * code, GSTIN or phone. */
export function AccountSelect({
  value,
  onChange,
  id,
}: {
  value: CustomerAccount | null;
  onChange: (account: CustomerAccount | null) => void;
  id?: string;
}) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const query = useDebounced(q.trim());
  const results = useAccountSearch(query, !value && (focused || !!query));
  if (value)
    return (
      <div className="flex h-10 items-center justify-between gap-space-2 rounded-md border border-line bg-card px-space-3 text-[14px]">
        <span className="min-w-0 truncate text-ink-900">
          {value.legal_name}
          <span className="text-[12px] text-ink-400">
            {" "}
            · {value.account_code}
            {value.gstin ? ` · ${value.gstin}` : ""}
          </span>
        </span>
        <button
          type="button"
          aria-label="Clear business customer"
          onClick={() => onChange(null)}
          className="shrink-0 text-ink-400 hover:text-ink-900"
        >
          <X size={15} />
        </button>
      </div>
    );
  return (
    <SearchCombobox
      id={id}
      label="Search business customers"
      placeholder="Search business customers by name, code, GSTIN or phone…"
      query={q}
      onQueryChange={setQ}
      onFocus={() => setFocused(true)}
      items={results.data ?? []}
      itemLabel={(account) => account.legal_name}
      onPick={onChange}
      loading={results.isFetching || q.trim() !== query}
      emptyLabel="No business customer matches."
      renderItem={(account) => (
        <>
          <span className="block text-[14px] font-medium text-ink-900">
            {account.legal_name}
          </span>
          <span className="block text-[12px] text-ink-400">
            {[
              account.account_code,
              account.gstin ?? "Unregistered",
              account.price_list_name ?? "Normal prices",
            ].join(" · ")}
          </span>
        </>
      )}
    />
  );
}
