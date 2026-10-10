"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { useCustomerSearch } from "@/hooks/useCustomers";
import type { Customer } from "@/lib/erp";
import { useDebounced } from "@/lib/useDebounced";

/** A form field holding ONE existing customer: shows the chosen one (with a button to clear it), otherwise a search by name, phone or
 * email run on the server (8 results), so it works with any number of customers. Cleared = no existing customer (`emptyLabel`). */
export function CustomerSelect({
  value,
  onChange,
  id,
  emptyLabel = "Search customers by name, phone or email…",
}: {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  id?: string;
  emptyLabel?: string;
}) {
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const results = useCustomerSearch(value ? "" : query);
  if (value)
    return (
      <div className="flex h-10 items-center justify-between gap-space-2 rounded-md border border-line bg-card px-space-3 text-[14px]">
        <span className="min-w-0 truncate text-ink-900">
          {value.name}
          {value.phone && (
            <span className="text-[12px] text-ink-400"> · {value.phone}</span>
          )}
        </span>
        <button
          type="button"
          aria-label="Clear customer"
          onClick={() => onChange(null)}
          className="shrink-0 text-ink-400 hover:text-ink-900"
        >
          <X size={15} />
        </button>
      </div>
    );
  return (
    <div className="relative">
      <Input
        id={id}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={emptyLabel}
        aria-label="Search customers"
      />
      {query && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-line bg-card shadow-[var(--shadow-md)]">
          {(results.data ?? []).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="block w-full px-space-3 py-space-2 text-left hover:bg-brand-50"
                onClick={() => {
                  onChange(c);
                  setQ("");
                }}
              >
                <span className="block text-[14px] font-medium text-ink-900">
                  {c.name}
                </span>
                <span className="block text-[12px] text-ink-400">
                  {[c.phone, c.email].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
          {results.data?.length === 0 && (
            <li className="px-space-3 py-space-2 text-[13px] text-ink-400">
              No customers match.
            </li>
          )}
          {!results.data && results.isFetching && (
            <li className="px-space-3 py-space-2 text-[13px] text-ink-400">
              Searching…
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
