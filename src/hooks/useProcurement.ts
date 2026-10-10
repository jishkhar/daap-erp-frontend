"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import {
  erpGet,
  erpSend,
  type PurchaseOrder,
  type PurchaseRequest,
  type Supplier,
} from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

/** Buying moves stock (goods received or returned) and the books (supplier bills, returns and payments), so every procurement change
 * refreshes those too. */
function useRefreshProcurement() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.procurement }),
      qc.invalidateQueries({ queryKey: queryKeys.inventory }),
      qc.invalidateQueries({ queryKey: queryKeys.finance }),
    ]);
}

// ------------------------------------------------------------------ purchase orders
/** Purchase orders, newest first, paged on the server. */
export function usePurchaseOrders(filters: {
  status?: string;
  branch_id?: string | null;
}) {
  return usePagedQuery<PurchaseOrder>(
    queryKeys.purchaseOrderList,
    "/api/v1/purchase-orders",
    filters,
  );
}

/** One purchase order with its lines and receipts. */
export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.purchaseOrder(id),
    queryFn: () => erpGet<PurchaseOrder>(`/api/v1/purchase-orders/${id}`),
    enabled: Boolean(id),
  });
}

export type NewPurchaseOrder = {
  supplier_id: string;
  branch_id: string | undefined;
  lines: {
    variant_id: string;
    quantity: number;
    unit_cost_minor: number | null;
  }[];
  additional_costs_minor: number;
  notes: string | null;
};

export function useCreatePurchaseOrder() {
  const refresh = useRefreshProcurement();
  return useMutation({
    mutationFn: (input: NewPurchaseOrder) =>
      erpSend<PurchaseOrder>("/api/v1/purchase-orders", "POST", input),
    onSuccess: refresh,
  });
}

export type PurchaseOrderAction =
  "approve" | "close-short" | "cancel" | "receive";

/** One step of a purchase order: approve, receive goods (body: the receipt lines), close short, or cancel (body: reason). */
export function usePurchaseOrderAction(id: string) {
  const refresh = useRefreshProcurement();
  return useMutation({
    mutationFn: ({
      action,
      body,
    }: {
      action: PurchaseOrderAction;
      body?: unknown;
    }) => erpSend(`/api/v1/purchase-orders/${id}/${action}`, "POST", body),
    onSuccess: refresh,
  });
}

// ------------------------------------------------------------------ goods receipts
export type GoodsReceiptItem = {
  id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  returned_quantity: number;
  landed_unit_cost_minor: number;
  serial_numbers: string[];
};
export type GoodsReceipt = {
  id: string;
  grn_number: string;
  total_minor: number;
  items: GoodsReceiptItem[];
};

/** Reads a goods receipt fresh (e.g. before returning goods from it): a function that resolves to it, or throws an ErpError. */
export function useFetchGoodsReceipt() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) =>
      qc.fetchQuery({
        queryKey: queryKeys.goodsReceipt(id),
        queryFn: () => erpGet<GoodsReceipt>(`/api/v1/goods-receipts/${id}`),
      }),
    [qc],
  );
}

/** Return goods from a receipt to the supplier (body: reason and lines). */
export function useReturnGoods() {
  const refresh = useRefreshProcurement();
  return useMutation({
    mutationFn: ({ grnId, body }: { grnId: string; body: unknown }) =>
      erpSend(`/api/v1/goods-receipts/${grnId}/returns`, "POST", body),
    onSuccess: refresh,
  });
}

// ------------------------------------------------------------------ purchase requests
/** Purchase requests raised by branches, newest first, paged on the server. `enabled: false` fetches nothing. */
export function usePurchaseRequests(
  filters: { branch_id?: string | null },
  enabled = true,
) {
  return usePagedQuery<PurchaseRequest>(
    queryKeys.purchaseRequestList,
    "/api/v1/purchase-requests",
    filters,
    enabled,
  );
}

export function useDecidePurchaseRequest() {
  const refresh = useRefreshProcurement();
  return useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: "approve" | "reject";
      reason?: string | null;
    }) =>
      erpSend(
        `/api/v1/purchase-requests/${id}/${action}`,
        "POST",
        action === "reject" ? { reason } : undefined,
      ),
    onSuccess: refresh,
  });
}

// ------------------------------------------------------------------ suppliers
/** Every supplier. `enabled: false` (e.g. while a form is closed) fetches nothing. */
export function useSuppliers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.suppliers,
    queryFn: () => erpGet<Supplier[]>("/api/v1/suppliers"),
    enabled,
  });
}

export type NewSupplier = {
  name: string;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  state: string | null;
  payment_terms_days: number;
};

export function useCreateSupplier() {
  const refresh = useRefreshProcurement();
  return useMutation({
    mutationFn: (input: NewSupplier) =>
      erpSend<Supplier>("/api/v1/suppliers", "POST", input),
    onSuccess: refresh,
  });
}

/** A supplier's account: what we bought, returned and paid, and the balance. */
export type SupplierStatement = {
  supplier: Supplier;
  balance: {
    billed: number;
    returned: number;
    paid: number;
    outstanding_minor: number;
  };
  entries: {
    kind: "GRN" | "RETURN" | "PAYMENT";
    number: string;
    at: string;
    amount_minor: number;
  }[];
};

/** Nothing is fetched while `supplierId` is empty. */
export function useSupplierStatement(supplierId: string) {
  return useQuery({
    queryKey: queryKeys.supplierStatement(supplierId),
    queryFn: () =>
      erpGet<SupplierStatement>(`/api/v1/suppliers/${supplierId}/statement`),
    enabled: Boolean(supplierId),
  });
}

/** Pay a supplier. Each payment carries its own idempotency key, so a retried request is not booked twice. */
export function usePaySupplier(supplierId: string) {
  const refresh = useRefreshProcurement();
  return useMutation({
    mutationFn: (input: {
      amount_minor: number;
      method: string;
      reference: string | null;
    }) =>
      erpSend(`/api/v1/suppliers/${supplierId}/payments`, "POST", input, {
        "Idempotency-Key": crypto.randomUUID(),
      }),
    onSuccess: refresh,
  });
}
