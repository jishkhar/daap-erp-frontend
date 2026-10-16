import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import type { LabelRequest, LabelSettings } from "@/lib/labels";
import { queryKeys } from "@/lib/queryKeys";

export function useLabelSettings() {
  return useQuery({
    queryKey: queryKeys.labelSettings,
    queryFn: () => erpGet<LabelSettings>("/api/v1/tenant/label-settings"),
  });
}

export function useSaveLabelSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LabelSettings) =>
      erpSend<LabelSettings>("/api/v1/tenant/label-settings", "PUT", body),
    onSuccess: (s) => qc.setQueryData(queryKeys.labelSettings, s),
  });
}

/** Ask a branch's till to print labels for these products. */
export function useSendLabelsToTill() {
  return useMutation({
    mutationFn: (body: {
      branch_id: string;
      note?: string;
      lines: { variant_id: string; quantity: number }[];
    }) => erpSend<LabelRequest>("/api/v1/label-requests", "POST", body),
  });
}
