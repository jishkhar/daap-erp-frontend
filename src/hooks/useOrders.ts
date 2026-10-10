"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { erpGet, erpSend, qs, type OrderDetail, type Order } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

export type OrderFilters = {
  channel?: string;
  status?: string;
  payment_status?: string;
  branch_id?: string | null;
  customer_id?: string;
  q?: string;
};

/** The orders list, newest first, paged and filtered on the server. Each row carries its customer's name. */
export function useOrderList(filters: OrderFilters) {
  return usePagedQuery<Order>(queryKeys.orderList, "/api/v1/orders", filters);
}

/** The latest orders, newest first, for the dashboard. */
export function useRecentOrders(branchId: string | null, limit = 8) {
  const params = { branch_id: branchId, limit };
  return useQuery({
    queryKey: queryKeys.recentOrders(params),
    queryFn: () => erpGet<Order[]>(`/api/v1/orders${qs(params)}`),
  });
}

/** One order with its items and payments. */
export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => erpGet<OrderDetail>(`/api/v1/orders/${id}`),
    enabled: Boolean(id),
  });
}

/** What an order change can show elsewhere: the orders lists, the customer's history and store credit, stock (reserved, released,
 * sold) and the books (sales, payments and tax are posted to the journal). */
function refreshAfterOrderChange(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.orders }),
    qc.invalidateQueries({ queryKey: queryKeys.customers }),
    qc.invalidateQueries({ queryKey: queryKeys.inventory }),
    qc.invalidateQueries({ queryKey: queryKeys.finance }),
    qc.invalidateQueries({ queryKey: queryKeys.activity }), // the order's activity panel
    qc.invalidateQueries({ queryKey: queryKeys.analytics }), // sales and open orders on the dashboard
  ]);
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      erpSend<OrderDetail>("/api/v1/orders", "POST", body),
    onSuccess: () => refreshAfterOrderChange(qc),
  });
}

/** Move an order to its next fulfilment status (confirmed, preparing, ready, shipped ...). */
export function useAdvanceOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string) =>
      erpSend(`/api/v1/orders/${id}/fulfilment`, "POST", { status }),
    onSuccess: () => refreshAfterOrderChange(qc),
  });
}

/** Bind serial / IMEI units to an order line. */
export function useBindSerials(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { itemId: string; serials: string[] }) =>
      erpSend(
        `/api/v1/orders/${orderId}/items/${input.itemId}/serials`,
        "POST",
        {
          serial_numbers: input.serials,
        },
      ),
    onSuccess: () => refreshAfterOrderChange(qc),
  });
}

export function useRecordPayment(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { method: string; amount_minor: number }) =>
      erpSend(`/api/v1/orders/${orderId}/payments`, "POST", input),
    onSuccess: () => refreshAfterOrderChange(qc),
  });
}

/** Mark a cash-on-delivery payment as collected. */
export function useCapturePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      erpSend(`/api/v1/payments/${paymentId}/capture`, "POST", {}),
    onSuccess: () => refreshAfterOrderChange(qc),
  });
}

export function useCancelOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      erpSend(`/api/v1/orders/${id}/cancel`, "POST", { reason }),
    onSuccess: () => refreshAfterOrderChange(qc),
  });
}
