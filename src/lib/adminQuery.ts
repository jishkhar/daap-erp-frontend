"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminJson } from "@/lib/adminAuth";

/** GET against the platform API on mount / reload. On an expired session the (still-mounted) sign-in gate is shown
 * again by clearing the token, which adminFetch already does on a 401. */
export function useAdminQuery<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const id = ++latest.current;
    let cancelled = false;
    (async () => {
      const res = await adminJson<T>(path);
      if (cancelled || id !== latest.current) return;
      setData(res.data);
      setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  return { data, error, reload: useCallback(() => setTick((t) => t + 1), []) };
}
