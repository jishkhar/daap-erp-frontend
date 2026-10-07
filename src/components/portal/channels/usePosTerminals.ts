"use client";

import { useEffect, useState } from "react";
import { erp } from "@/lib/erp";

type Listing = {
  terminals: { status: "active" | "revoked"; last_seen_at: string | null }[];
};
export type BranchTerminalStats = {
  paired: number;
  online: number;
  lastSeen: string | null;
};

const ONLINE_WITHIN_MS = 15 * 60 * 1000;

/** Paired-terminal counts per branch (one request each; the terminals API is branch-scoped). A branch whose
 * listing fails (no permission) is left out rather than shown as zero. */
export function usePosTerminals(branchIds: string[]) {
  const [stats, setStats] = useState<Record<
    string,
    BranchTerminalStats
  > | null>(null);
  const key = branchIds.join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void Promise.all(
      key.split(",").map(async (id) => {
        const res = await erp<Listing>(`/api/v1/branches/${id}/terminals`);
        if (res.error || !res.data) return null;
        const active = res.data.terminals.filter((t) => t.status === "active");
        const seen = active
          .map((t) => t.last_seen_at)
          .filter((s): s is string => !!s)
          .sort();
        const lastSeen = seen.length ? seen[seen.length - 1]! : null;
        const online = active.filter(
          (t) =>
            t.last_seen_at &&
            Date.now() - new Date(t.last_seen_at).getTime() < ONLINE_WITHIN_MS,
        ).length;
        return [id, { paired: active.length, online, lastSeen }] as const;
      }),
    ).then((rows) => {
      if (!cancelled)
        setStats(Object.fromEntries(rows.filter((r) => r !== null)));
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return stats;
}
