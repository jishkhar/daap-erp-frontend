"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
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
    <div className="relative">
      <Input
        id={id}
        value={q}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search business customers by name, code, GSTIN or phone…"
        aria-label="Search business customers"
      />
      {(focused || query) && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-line bg-card shadow-[var(--shadow-md)]">
          {(results.data ?? []).map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="block w-full px-space-3 py-space-2 text-left hover:bg-brand-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(a);
                  setQ("");
                }}
              >
                <span className="block text-[14px] font-medium text-ink-900">
                  {a.legal_name}
                </span>
                <span className="block text-[12px] text-ink-400">
                  {[
                    a.account_code,
                    a.gstin ?? "Unregistered",
                    a.price_list_name ?? "Normal prices",
                  ].join(" · ")}
                </span>
              </button>
            </li>
          ))}
          {results.data?.length === 0 && (
            <li className="px-space-3 py-space-2 text-[13px] text-ink-400">
              No business customer matches.
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
