"use client";

import { Building2 } from "lucide-react";
import { useActiveBranch } from "@/lib/branch";

/** Scopes list pages to one branch (or "All branches" when the person may see more than one). Only narrows the
 * view -- what a person can access is decided by the server from their role grants. */
export function BranchSwitcher() {
  const { branchId, branches, setBranch } = useActiveBranch();
  if (branches.length === 0) return null;
  const single = branches.length === 1;

  return (
    <label className="hidden items-center gap-space-2 rounded-md border border-line px-space-3 py-1.5 text-[13px] font-medium text-ink-600 md:flex">
      <Building2 size={15} className="text-ink-400" />
      <span className="sr-only">Branch</span>
      <select
        value={
          single
            ? String(branches[0].id)
            : branchId === null
              ? "all"
              : String(branchId)
        }
        disabled={single}
        onChange={(e) =>
          setBranch(e.target.value === "all" ? null : e.target.value)
        }
        className="max-w-[170px] cursor-pointer truncate bg-transparent text-ink-900 focus:outline-none disabled:cursor-default"
      >
        {!single && <option value="all">All branches</option>}
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.branch_name} ({b.branch_code})
          </option>
        ))}
      </select>
    </label>
  );
}
