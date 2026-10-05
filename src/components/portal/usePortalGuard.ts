"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPortalToken } from "@/lib/portalAuth";
import { useStaffSession } from "@/lib/staffAuth";

/** Redirects to /portal/login when nobody is signed in; otherwise returns the signed-in tenant once the session is
 * known (`ready`). Pages handle their own data fetching and their own 401 (via staffFetch). */
export function usePortalGuard() {
  const router = useRouter();
  const session = useStaffSession();

  useEffect(() => {
    if (!getPortalToken()) router.push("/portal/login");
  }, [router]);

  return { tenant: session?.tenant ?? null, ready: session !== null };
}
