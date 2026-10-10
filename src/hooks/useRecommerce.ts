"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import {
  erpGet,
  erpSend,
  type PipelineSummary,
  type PriceGuide,
  type RecommerceAsset,
  type RecommerceAssetDetail,
} from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

/** A device's journey touches stock (parts used, the device stocked or scrapped), the books (purchase, refurbishment cost, write-off)
 * and customers (the seller at intake), so every change refreshes those too. */
function useRefreshRecommerce() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.recommerce }),
      qc.invalidateQueries({ queryKey: queryKeys.inventory }),
      qc.invalidateQueries({ queryKey: queryKeys.finance }),
      qc.invalidateQueries({ queryKey: queryKeys.customers }),
    ]);
}

/** Units and money at each stage of the pipeline. */
export function useRecommerceSummary() {
  return useQuery({
    queryKey: queryKeys.recommerceSummary,
    queryFn: () => erpGet<PipelineSummary>("/api/v1/recommerce/summary"),
  });
}

/** Devices in the pipeline, newest first, searched (serial, model) and paged on the server. */
export function useRecommerceAssets(filters: {
  status?: string;
  q?: string;
  branch_id?: string | null;
}) {
  return usePagedQuery<RecommerceAsset>(
    queryKeys.recommerceAssets,
    "/api/v1/recommerce/assets",
    filters,
  );
}

/** One device with its inspection, work items and history. */
export function useRecommerceAsset(id: string) {
  return useQuery({
    queryKey: queryKeys.recommerceAsset(id),
    queryFn: () =>
      erpGet<RecommerceAssetDetail>(`/api/v1/recommerce/assets/${id}`),
    enabled: Boolean(id),
  });
}

export type AssetAction =
  | "acquire"
  | "reject"
  | "grade"
  | "work-items"
  | "submit-qc"
  | "qc"
  | "move"
  | "scrap";

/** One step of a device's journey, with that step's body. */
export function useAssetAction(id: string) {
  const refresh = useRefreshRecommerce();
  return useMutation({
    mutationFn: ({ action, body }: { action: AssetAction; body?: unknown }) =>
      erpSend(`/api/v1/recommerce/assets/${id}/${action}`, "POST", body ?? {}),
    onSuccess: refresh,
  });
}

/** Counter inspection of a device brought in (body: device, seller and inspection); returns the new asset with its grade and quote. */
export function useIntake() {
  const refresh = useRefreshRecommerce();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      erpSend<RecommerceAsset>("/api/v1/recommerce/intake", "POST", body),
    onSuccess: refresh,
  });
}

/** The most we will pay for each model by grade. */
export function usePriceGuides() {
  return useQuery({
    queryKey: queryKeys.priceGuides,
    queryFn: () => erpGet<PriceGuide[]>("/api/v1/recommerce/price-guides"),
  });
}

export function useSavePriceGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      variant_id: string;
      grade: string;
      max_price_minor: number;
    }) => erpSend("/api/v1/recommerce/price-guides", "PUT", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.priceGuides }),
  });
}
