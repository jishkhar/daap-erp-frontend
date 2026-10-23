"use client";

import { Select } from "@/components/ui/Select";

import { Building2 } from "lucide-react";
import { useActiveBranch } from "@/lib/branch";

/** Scopes list pages to one branch (or "All branches" when the person may see more than one). Only narrows the
 * view -- what a person can access is decided by the server from their role grants. */
export function BranchSwitcher({ mobile = false }: { mobile?: boolean }) {
  const { branchId, branches, setBranch } = useActiveBranch();
  if (branches.length === 0) return null;
  const single = branches.length === 1;
  if (mobile && single) return null;

  return (
    <label
      className={
        mobile
          ? "flex shrink-0 items-center gap-space-2 border-b border-line bg-card px-space-4 py-2 text-[13px] font-medium text-ink-600 md:hidden"
          : "hidden items-center gap-space-2 rounded-md border border-line px-space-3 py-1.5 text-[13px] font-medium text-ink-600 md:flex"
      }
    >
      <Building2 size={15} className="text-ink-400" />
      <span className="sr-only">Branch</span>
      <Select
        value={
          single
            ? String(branches[0].id)
            : branchId === null
              ? "all"
              : String(branchId)
        }
        disabled={single}
        onValueChange={(value) => setBranch(value === "all" ? null : value)}
        className={`${mobile ? "h-8 min-w-0 flex-1" : "h-auto w-auto max-w-[170px]"} cursor-pointer rounded-none border-0 bg-transparent px-0 text-[13px] text-ink-900 shadow-none focus:outline-none disabled:cursor-default disabled:bg-transparent`}
      >
        {!single && <option value="all">All branches</option>}
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.branch_name} ({b.branch_code})
          </option>
        ))}
      </Select>
    </label>
  );
}
