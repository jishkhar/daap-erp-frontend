"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

/** Website delivery charges and the delivery time shown to shoppers. The fee includes GST; pickup orders pay none. */
export type ShippingSettings = {
  fee_minor: number;
  free_above_minor: number | null;
  delivery_min_days: number | null;
  delivery_max_days: number | null;
};

export function useShippingSettings() {
  return useQuery({
    queryKey: queryKeys.shippingSettings,
    queryFn: () => erpGet<ShippingSettings>("/api/v1/tenant/shipping"),
  });
}

export function useSaveShippingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ShippingSettings) =>
      erpSend<ShippingSettings>("/api/v1/tenant/shipping", "PUT", body),
    onSuccess: (saved) => qc.setQueryData(queryKeys.shippingSettings, saved),
  });
}
