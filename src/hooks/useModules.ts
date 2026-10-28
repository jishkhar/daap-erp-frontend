"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";
import { refreshStaffSession } from "@/lib/staffAuth";

export type ModuleKey =
  | "back_office"
  | "procurement"
  | "wholesale"
  | "inventory"
  | "transfers"
  | "finance"
  | "workforce";

/** One optional module as the server sees it (services/optional_modules.py). `reason` says why an inactive module is off: "parent" is
 * Back office being off (the module keeps its own switch). */
export type OptionalModule = {
  key: ModuleKey;
  label: string;
  /** the module it sits under ("back_office" for the Back office modules) */
  parent: ModuleKey | null;
  /** the platform's switch: false = disabled by ShopConnect, the business can't turn it on */
  allowed: boolean;
  /** the business's own switch */
  enabled: boolean;
  active: boolean;
  reason: "platform" | "business" | "no_service" | "parent" | null;
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

/** Settings > Modules: Back office and its modules, and Workforce, with both switches and their open work. */
export function useModules() {
  return useQuery({
    queryKey: queryKeys.modules,
    queryFn: () => erpGet<OptionalModule[]>("/api/v1/tenant/modules"),
  });
}

/** Switch a module on or off for the business. The session is re-read so the menu follows at once, and every page's data is refetched
 * (Back office alone touches most of the portal). */
export function useSwitchModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled }: { key: ModuleKey; enabled: boolean }) =>
      erpSend<OptionalModule>(`/api/v1/tenant/modules/${key}`, "PUT", {
        enabled,
      }),
    onSuccess: async () => {
      await refreshStaffSession();
      await qc.invalidateQueries();
    },
  });
}
