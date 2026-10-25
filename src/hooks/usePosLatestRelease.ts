import { useQuery } from "@tanstack/react-query";
import type { PosRelease } from "@/lib/posReleases";
import { queryKeys } from "@/lib/queryKeys";

/** The newest published till release (null before the first one), to flag terminals running an older version. */
export function usePosLatestRelease() {
  return useQuery({
    queryKey: queryKeys.posLatestRelease,
    queryFn: async (): Promise<PosRelease | null> => {
      const res = await fetch("/api/pos/latest");
      return res.ok ? ((await res.json()) as PosRelease | null) : null;
    },
    staleTime: 10 * 60_000,
  });
}
