"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { erpGet, erpSend, qs, type StockSummary } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

/** One product's stock at one branch (a row of the stock list). */
export type StockLevel = {
  branch_id: string;
  branch_code: string;
  variant_id: string;
  sku: string;
  product_name: string;
  serialization_type: "NONE" | "SERIAL" | "IMEI";
  available_qty: number;
  reserved_qty: number;
  in_transit_qty: number;
  reorder_level: number | null;
};

/** One stock movement (the inventory ledger): what changed, by how much, and why. */
export type StockMovement = {
  id: string;
  branch_code: string;
  sku: string;
  product_name: string;
  movement_type: string;
  available_delta: number;
  reserved_delta: number;
  in_transit_delta: number;
  available_after: number;
  ref_type: string | null;
  reason: string | null;
  created_at: string;
};

/** The stock list, paged and searched (product, variant, SKU) on the server. Empty `branch_id` = every branch. */
export function useStockLevels(filters: {
  branch_id?: string | null;
  low_stock?: boolean;
  q?: string;
}) {
  return usePagedQuery<StockLevel>(
    queryKeys.stockLevels,
    "/api/v1/inventory",
    filters,
  );
}

/** The stock movements, newest first, paged on the server. `enabled: false` fetches nothing (e.g. while its tab is hidden). */
export function useStockMovements(
  filters: { branch_id?: string | null },
  enabled = true,
) {
  return usePagedQuery<StockMovement>(
    queryKeys.stockMovements,
    "/api/v1/inventory/ledger",
    filters,
    enabled,
  );
}

/** Stock of just these products (the ones on screen), at one branch, or across every branch when `branchId` is empty. Nothing is fetched
 * while `variantIds` is empty. */
export function useStockFor(variantIds: string[], branchId = "") {
  const ids = [...new Set(variantIds)].sort().join(",");
  const params = branchId
    ? { branch_id: branchId, variant_ids: ids, limit: 500 }
    : { variant_ids: ids };
  return useQuery({
    queryKey: branchId
      ? queryKeys.stockLevels(params)
      : queryKeys.stockConsolidated(params),
    queryFn: () =>
      erpGet<StockSummary[]>(
        `/api/v1/inventory${branchId ? "" : "/consolidated"}${qs(params)}`,
      ),
    enabled: ids !== "",
    placeholderData: keepPreviousData,
  });
}

/** Products at or below their reorder level, for the dashboard. */
export function useLowStock(branchId: string | null, limit = 50) {
  const params = { branch_id: branchId, low_stock: true, limit };
  return useQuery({
    queryKey: queryKeys.lowStock(params),
    queryFn: () => erpGet<StockLevel[]>(`/api/v1/inventory${qs(params)}`),
  });
}

export type ReceiptLine = {
  variant_id: string;
  quantity: number;
  serial_numbers?: string[];
};

/** Every stock figure on screen (levels, movements, the stock shown beside products and on order / transfer forms), and the books
 * (stock value and write-offs are posted to the journal). */
function useRefreshStock() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.inventory }),
      qc.invalidateQueries({ queryKey: queryKeys.finance }),
    ]);
}

/** Stock received at a branch (goods in without a purchase order). */
export function useReceiveStock() {
  const refresh = useRefreshStock();
  return useMutation({
    mutationFn: (input: { branch_id: string; lines: ReceiptLine[] }) =>
      erpSend("/api/v1/inventory/receipts", "POST", input),
    onSuccess: refresh,
  });
}

export type StockAdjustment = {
  branch_id: string;
  variant_id: string;
  /** Units to add (positive) or remove (negative). */
  delta: number;
  reason: string;
  serial_numbers: string[];
  /** A removal that is a loss (damage, theft) rather than a correction. */
  write_off: boolean;
};

export function useAdjustStock() {
  const refresh = useRefreshStock();
  return useMutation({
    mutationFn: (input: StockAdjustment) =>
      erpSend("/api/v1/inventory/adjustments", "POST", input),
    onSuccess: refresh,
  });
}

/** The level below which a product counts as low stock at a branch (null = none). */
export function useSetReorderLevel() {
  const refresh = useRefreshStock();
  return useMutation({
    mutationFn: (input: {
      branch_id: string;
      variant_id: string;
      reorder_level: number | null;
    }) => erpSend("/api/v1/inventory/reorder-level", "PUT", input),
    onSuccess: refresh,
  });
}
