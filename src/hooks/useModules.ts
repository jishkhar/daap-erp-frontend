"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";
import { refreshStaffSession } from "@/lib/staffAuth";

export type ModuleKey = "wholesale" | "transfers" | "workforce";

/** One optional module as the server sees it (services/optional_modules.py). `reason` says why an inactive module is off. */
export type OptionalModule = {
  key: ModuleKey;
  label: string;
  /** the platform's switch: false = disabled by ShopConnect, the business can't turn it on */
  allowed: boolean;
  /** the business's own switch */
  enabled: boolean;
  active: boolean;
  reason: "platform" | "business" | "no_service" | null;
  /** stock transfers with fewer than two branches */
  needs_branches: boolean;
  /** in-progress work; any of it blocks switching off */
  open_work: {
    key: string;
    label: string;
    count: number;
    amount_minor?: number;
  }[];
};

/** Settings > Modules: Wholesale, Stock transfers and Workforce with both switches and their open work. */
export function useModules() {
  return useQuery({
    queryKey: queryKeys.modules,
    queryFn: () => erpGet<OptionalModule[]>("/api/v1/tenant/modules"),
  });
}

/** Switch a module on or off for the business. The session is re-read so the menu follows at once; the module's own pages and the
 * dashboard refresh too. */
export function useSwitchModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled }: { key: ModuleKey; enabled: boolean }) =>
      erpSend<OptionalModule>(`/api/v1/tenant/modules/${key}`, "PUT", {
        enabled,
      }),
    onSuccess: async () => {
      await refreshStaffSession();
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.modules }),
        qc.invalidateQueries({ queryKey: queryKeys.wholesaleSettings }),
        qc.invalidateQueries({ queryKey: queryKeys.analytics }),
      ]);
    },
  });
}
