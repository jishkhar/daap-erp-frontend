"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { erpGet, erpSend, qs } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";
import type {
  RefundMode,
  ReturnCounts,
  ReturnDetail,
  ReturnKind,
  ReturnPolicy,
  ReturnQuote,
  ReturnReason,
  ReturnRow,
  Returnable,
} from "@/lib/returns";

export type ReturnFilters = {
  kind?: ReturnKind | null;
  status?: string | null;
  channel?: string | null;
  branch_id?: string | null;
  /** the global filter's period; with "custom", from/to are its dates */
  period?: string | null;
  from?: string | null;
  to?: string | null;
  q?: string | null;
};

/** Returns and exchanges, newest first, with the counts for the tabs. */
export function useReturnList(filters: ReturnFilters) {
  return useQuery({
    queryKey: queryKeys.returnList(filters),
    queryFn: () =>
      erpGet<{ items: ReturnRow[]; counts: ReturnCounts }>(
        `/api/v1/returns${qs({ ...filters, limit: 100 })}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useReturn(id: string | null) {
  return useQuery({
    queryKey: queryKeys.returnDetail(id ?? ""),
    queryFn: () => erpGet<ReturnDetail>(`/api/v1/returns/${id}`),
    enabled: Boolean(id),
  });
}

export function useOrderReturns(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orderReturns(orderId),
    queryFn: () => erpGet<ReturnRow[]>(`/api/v1/orders/${orderId}/returns`),
    enabled: Boolean(orderId),
  });
}

/** What of an order can still come back, until when, and how the money can go back. */
export function useReturnable(orderId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.returnable(orderId),
    queryFn: () => erpGet<Returnable>(`/api/v1/orders/${orderId}/returnable`),
    enabled: Boolean(orderId) && enabled,
  });
}

export type ReturnLine = {
  order_item_id: string;
  quantity: number;
  disposition: "RESTOCK" | "WRITE_OFF";
  serial_numbers?: string[];
};
export type ReplacementLine = { variant_id: string; quantity: number };

/** What a return / exchange would come to; recomputed as the lines change. */
export function useReturnQuote(
  orderId: string,
  items: ReturnLine[],
  exchangeItems: ReplacementLine[],
) {
  const key = JSON.stringify({ items, exchangeItems });
  return useQuery({
    queryKey: ["erp", "returns", "quote", orderId, key],
    queryFn: () =>
      erpSend<ReturnQuote>(`/api/v1/orders/${orderId}/returns/quote`, "POST", {
        items,
        exchange_items: exchangeItems,
      }),
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
  });
}

/** A return touches nearly everything: the order and its payments, stock, the books, the customer and the dashboard. */
function refreshAfterReturn(qc: QueryClient) {
  return Promise.all(
    [
      queryKeys.returns,
      queryKeys.orders,
      queryKeys.customers,
      queryKeys.inventory,
      queryKeys.finance,
      queryKeys.activity,
      queryKeys.analytics,
    ].map((queryKey) => qc.invalidateQueries({ queryKey })),
  );
}

export type ReturnBody = {
  kind: ReturnKind;
  items: ReturnLine[];
  reason_code: ReturnReason;
  reason_note?: string | null;
  refund_mode: RefundMode;
  branch_id?: string | null;
  customer?: { name?: string | null; phone: string } | null;
  exchange?: {
    items: ReplacementLine[];
    payments: {
      method: "cash" | "card" | "upi";
      amount_minor: number;
      reference?: string | null;
    }[];
  } | null;
};

export function useCreateReturn(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReturnBody) =>
      erpSend<ReturnDetail>(`/api/v1/orders/${orderId}/returns`, "POST", body),
    onSuccess: () => refreshAfterReturn(qc),
  });
}

export function useDecideReturn(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      action,
      note,
    }: {
      action: "approve" | "reject";
      note?: string;
    }) =>
      erpSend<ReturnDetail>(`/api/v1/returns/${id}/${action}`, "POST", {
        note: note || null,
      }),
    onSuccess: () => refreshAfterReturn(qc),
  });
}

export function useReceiveReturn(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      refund_mode: RefundMode;
      branch_id?: string | null;
      items?: { order_item_id: string; disposition: "RESTOCK" | "WRITE_OFF" }[];
    }) => erpSend<ReturnDetail>(`/api/v1/returns/${id}/receive`, "POST", body),
    onSuccess: () => refreshAfterReturn(qc),
  });
}

export function useReturnPolicy() {
  return useQuery({
    queryKey: queryKeys.returnPolicy,
    queryFn: () => erpGet<ReturnPolicy>("/api/v1/tenant/return-policy"),
  });
}

export function useSaveReturnPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ReturnPolicy>) =>
      erpSend<ReturnPolicy>("/api/v1/tenant/return-policy", "PUT", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.returns }),
  });
}
