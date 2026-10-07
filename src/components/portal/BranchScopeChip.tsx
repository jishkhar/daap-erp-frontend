"use client";

import { useActiveBranch } from "@/lib/branch";

/** "Viewing: Pune (B02) · Show all branches": makes it obvious that the branch switcher is narrowing a page. */
export function BranchScopeChip() {
  const { branchId, branches, setBranch } = useActiveBranch();
  const branch = branches.find((b) => b.id === branchId);
  if (!branch || branches.length < 2) return null;
  return (
    <p className="mt-1 inline-flex items-center gap-space-2 rounded-full bg-brand-50 px-space-3 py-0.5 text-[12px] font-medium text-brand-700">
      Viewing {branch.branch_name} ({branch.branch_code})
      <button
        type="button"
        className="font-semibold underline"
        onClick={() => setBranch(null)}
      >
        Show all branches
      </button>
    </p>
  );
}
