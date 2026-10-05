"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPortalToken } from "@/lib/portalAuth";
import { refreshStaffSession, useStaffSession } from "@/lib/staffAuth";

// The stored session (permissions, branches, plan modules) is a snapshot from sign-in. Re-read it once per page load so a plan,
// module or branch change made since then shows up without signing out and in again.
let refreshedThisLoad = false;

/** Redirects to /portal/login when nobody is signed in; otherwise returns the signed-in tenant once the session is
 * known (`ready`). Pages handle their own data fetching and their own 401 (via staffFetch). */
export function usePortalGuard() {
  const router = useRouter();
  const session = useStaffSession();

  useEffect(() => {
    if (!getPortalToken()) {
      router.push("/portal/login");
    } else if (!refreshedThisLoad) {
      refreshedThisLoad = true;
      void refreshStaffSession();
    }
  }, [router]);

  return { tenant: session?.tenant ?? null, ready: session !== null };
}
