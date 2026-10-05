"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStaffSession, type SessionBranch } from "@/lib/staffAuth";

const KEY = "erp_active_branch";
const EVENT = "erp-branch-change";

/** The branch the person is currently working in ("all" = every branch they may see). It only ever NARROWS what
 * the API returns -- access itself is decided by the server from the person's grants. */
export function useActiveBranch(): { branchId: string | null; branches: SessionBranch[]; setBranch: (id: string | null) => void } {
  const session = useStaffSession();
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    // A shared link (?branch=<id>, or ?branch=all) wins over the remembered choice, once, when the page opens.
    const fromUrl = new URLSearchParams(window.location.search).get("branch");
    if (fromUrl) localStorage.setItem(KEY, fromUrl);
    const read = () => {
      const raw = localStorage.getItem(KEY);
      setBranchId(raw && raw !== "all" ? raw : null);
    };
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);

  const setBranch = useCallback((id: string | null) => {
    localStorage.setItem(KEY, id === null ? "all" : String(id));
    // Keep the address bar in step so the current view can be copied and shared.
    const url = new URL(window.location.href);
    if (url.searchParams.has("branch")) { url.searchParams.set("branch", id === null ? "all" : String(id)); window.history.replaceState(null, "", url); }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  // Deactivated branches stay in the session (old orders still need their codes) but can't be worked in.
  const branches = useMemo(() => (session?.branches ?? []).filter((b) => b.status !== "inactive"), [session]);
  // A remembered branch the person can no longer see falls back to "all".
  const valid = branchId !== null && branches.some((b) => b.id === branchId) ? branchId : null;
  return { branchId: valid, branches, setBranch };
}
