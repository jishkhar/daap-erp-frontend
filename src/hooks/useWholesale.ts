"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { erpGet, erpSend, qs } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";
import { refreshStaffSession } from "@/lib/staffAuth";
import type {
  CreditStatus,
  CustomerAccount,
  PriceList,
  PriceListDetail,
  Quote,
  Receipt,
  Receivables,
  SalesOrder,
  SalesOrderRow,
  Statement,
  WholesaleInvoice,
  WholesaleSettings,
} from "@/lib/wholesale";

function useRefreshWholesale() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.wholesale });
}

// ------------------------------------------------------------------ the switch
export function useWholesaleSettings() {
  return useQuery({
    queryKey: queryKeys.wholesaleSettings,
    queryFn: () =>
      erpGet<WholesaleSettings>("/api/v1/tenant/wholesale-settings"),
  });
}

/** Saving the switch also reloads the session, so the Wholesale menu appears or disappears at once. */
export function useSaveWholesaleSettings() {
  const refresh = useRefreshWholesale();
  return useMutation({
    // only what a person can change; `active` is the server's verdict, not a setting
    mutationFn: (body: Partial<WholesaleSettings>) =>
      erpSend<WholesaleSettings>("/api/v1/tenant/wholesale-settings", "PUT", {
        enabled: body.enabled,
        default_credit_days: body.default_credit_days,
        hold_after_overdue_days: body.hold_after_overdue_days,
      }),
    onSuccess: async () => {
      await refreshStaffSession();
      await refresh();
    },
  });
}

// ------------------------------------------------------------------ price lists
export function usePriceLists(enabled = true) {
  return useQuery({
    queryKey: queryKeys.priceLists,
    queryFn: () => erpGet<PriceList[]>("/api/v1/price-lists"),
    enabled,
  });
}

/** One price list with its prices; nothing is fetched while `id` is empty. */
export function usePriceList(id: string, q = "") {
  return useQuery({
    queryKey: queryKeys.priceList(id, q),
    queryFn: () =>
      erpGet<PriceListDetail>(
        `/api/v1/price-lists/${id}${qs({ q: q || undefined })}`,
      ),
    enabled: Boolean(id),
  });
}

export type PriceListInput = {
  name: string;
  prices_include_tax: boolean;
  notes?: string | null;
};

export function useCreatePriceList() {
  const refresh = useRefreshWholesale();
  return useMutation({
    mutationFn: (body: PriceListInput) =>
      erpSend<PriceList>("/api/v1/price-lists", "POST", body),
    onSuccess: refresh,
  });
}

export function useUpdatePriceList(id: string) {
  const refresh = useRefreshWholesale();
  return useMutation({
    mutationFn: (
      body: Partial<PriceListInput> & { status?: "active" | "inactive" },
    ) => erpSend<PriceList>(`/api/v1/price-lists/${id}`, "PATCH", body),
    onSuccess: refresh,
  });
}

export type PriceRow = {
  variant_id: string;
  min_qty: number;
  price_minor?: number;
  remove?: boolean;
};

export function useSavePrices(id: string) {
  const refresh = useRefreshWholesale();
  return useMutation({
    mutationFn: (prices: PriceRow[]) =>
      erpSend<{ saved: number; removed: number }>(
        `/api/v1/price-lists/${id}/prices`,
        "POST",
        { prices },
      ),
    onSuccess: refresh,
  });
}

// ------------------------------------------------------------------ business customers
export function useCustomerAccounts(
  filters: { q?: string; status?: string },
  enabled = true,
) {
  return usePagedQuery<CustomerAccount>(
    queryKeys.customerAccountList,
    "/api/v1/customer-accounts",
    filters,
    enabled,
  );
}

export type AccountInput = {
  customer_id?: string | null;
  customer?: { name: string; phone: string | null; email: string | null };
  legal_name?: string | null;
  gstin?: string | null;
  billing_state?: string | null;
  billing_address?: string | null;
  price_list_id?: string | null;
  credit_limit_minor?: number | null;
  credit_days?: number | null;
  status?: string;
  hold_reason?: string | null;
  notes?: string | null;
};

export function useSaveAccount(id: string | null) {
  const refresh = useRefreshWholesale();
  return useMutation({
    mutationFn: (body: AccountInput) =>
      id
        ? erpSend<CustomerAccount>(
            `/api/v1/customer-accounts/${id}`,
            "PATCH",
            body,
          )
        : erpSend<CustomerAccount>("/api/v1/customer-accounts", "POST", body),
    onSuccess: refresh,
  });
}

/** Up to 8 active business customers matching `q` (all of them, newest first, while `q` is empty). */
export function useAccountSearch(q: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customerAccountSearch(q),
    queryFn: () =>
      erpGet<CustomerAccount[]>(
        `/api/v1/customer-accounts${qs({ q: q || undefined, status: "active", limit: 8 })}`,
      ),
    enabled,
  });
}

export function useAccountCredit(id: string) {
  return useQuery({
    queryKey: queryKeys.accountCredit(id),
    queryFn: () =>
      erpGet<CreditStatus>(`/api/v1/customer-accounts/${id}/credit`),
    enabled: Boolean(id),
  });
}

// ------------------------------------------------------------------ quotations and sales orders
export function useSalesOrders(filters: {
  status?: string;
  branch_id?: string | null;
  q?: string;
}) {
  return usePagedQuery<SalesOrderRow>(
    queryKeys.salesOrderList,
    "/api/v1/sales-orders",
    filters,
  );
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.salesOrder(id),
    queryFn: () => erpGet<SalesOrder>(`/api/v1/sales-orders/${id}`),
    enabled: Boolean(id),
  });
}

export type SoLineInput = {
  variant_id: string;
  quantity: number;
  unit_price_minor?: number | null;
  discount_minor?: number;
};

/** What these lines cost the customer right now (their price list, quantity breaks, tax). Read-only; refetches as the lines change. */
export function useQuote(accountId: string, lines: SoLineInput[]) {
  const body = JSON.stringify({ customer_account_id: accountId, items: lines });
  return useQuery({
    queryKey: queryKeys.wholesaleQuote(body),
    queryFn: () =>
      erpSend<Quote>("/api/v1/wholesale/quote", "POST", {
        customer_account_id: accountId,
        items: lines.map((l) => ({
          variant_id: l.variant_id,
          quantity: l.quantity,
          discount_minor: l.discount_minor ?? 0,
        })),
      }),
    enabled: Boolean(accountId) && lines.length > 0,
    placeholderData: keepPreviousData,
  });
}

export type NewSalesOrder = {
  kind: "quotation" | "order";
  branch_id: string;
  customer_account_id: string;
  lines: SoLineInput[];
  valid_until?: string | null;
  expected_date?: string | null;
  customer_po_ref?: string | null;
  notes?: string | null;
};

/** Sales orders reserve and dispatch stock and create invoices, so a change refreshes stock, orders and the books too. */
function useRefreshSales() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.wholesale }),
      qc.invalidateQueries({ queryKey: queryKeys.inventory }),
      qc.invalidateQueries({ queryKey: queryKeys.finance }),
    ]);
}

export function useCreateSalesOrder() {
  const refresh = useRefreshSales();
  return useMutation({
    mutationFn: (body: NewSalesOrder) =>
      erpSend<SalesOrder>("/api/v1/sales-orders", "POST", body),
    onSuccess: refresh,
  });
}

export function useUpdateSalesOrder(id: string) {
  const refresh = useRefreshSales();
  return useMutation({
    mutationFn: (
      body: Partial<
        Omit<NewSalesOrder, "kind" | "branch_id" | "customer_account_id">
      >,
    ) => erpSend<SalesOrder>(`/api/v1/sales-orders/${id}`, "PATCH", body),
    onSuccess: refresh,
  });
}

export function useSalesOrderAction(id: string) {
  const refresh = useRefreshSales();
  return useMutation({
    mutationFn: ({
      action,
      body,
    }: {
      action: "confirm" | "reserve" | "close-short" | "cancel";
      body?: { reason: string };
    }) =>
      erpSend<SalesOrder>(
        `/api/v1/sales-orders/${id}/${action}`,
        "POST",
        body ?? {},
      ),
    onSuccess: refresh,
  });
}

export type DispatchInput = {
  lines: { item_id: string; quantity: number }[];
  payments: {
    method: string;
    amount_minor: number;
    reference: string | null;
  }[];
  vehicle_number: string | null;
  notes: string | null;
};

export type DispatchResult = {
  order_id: string;
  order_number: string;
  invoice_number: string | null;
  total_minor: number;
  paid_minor: number;
  sales_order: SalesOrder;
};

export function useDispatch(id: string) {
  const refresh = useRefreshSales();
  return useMutation({
    mutationFn: (body: DispatchInput) =>
      erpSend<DispatchResult>(
        `/api/v1/sales-orders/${id}/dispatch`,
        "POST",
        body,
      ),
    onSuccess: refresh,
  });
}

// ------------------------------------------------------------------ payments received, statements, receivables
export function useStatement(accountId: string) {
  return useQuery({
    queryKey: queryKeys.statement(accountId),
    queryFn: () =>
      erpGet<Statement>(`/api/v1/customer-accounts/${accountId}/statement`),
    enabled: Boolean(accountId),
  });
}

export function useReceivables(enabled = true) {
  return useQuery({
    queryKey: queryKeys.receivables,
    queryFn: () => erpGet<Receivables>("/api/v1/wholesale/receivables"),
    enabled,
  });
}

export function useReceipts(filters: { q?: string }, enabled = true) {
  return usePagedQuery<Receipt>(
    queryKeys.receiptList,
    "/api/v1/customer-receipts",
    filters,
    enabled,
  );
}

/** Every wholesale sale with what is paid and still owed, newest first. */
export function useWholesaleInvoices(
  filters: {
    status?: string;
    branch_id?: string | null;
    customer_account_id?: string;
    q?: string;
  },
  enabled = true,
) {
  return usePagedQuery<WholesaleInvoice>(
    queryKeys.wholesaleInvoiceList,
    "/api/v1/wholesale/invoices",
    filters,
    enabled,
  );
}

export type ReceiptInput = {
  amount_minor: number;
  method: string;
  reference: string | null;
  received_on: string | null;
  allocations: { order_id: string; amount_minor: number }[] | null;
  notes: string | null;
};

/** Record money received; it pays invoices and moves the books, so orders and finance refresh too. */
export function useReceivePayment(accountId: string) {
  const refresh = useRefreshSales();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReceiptInput) =>
      erpSend<Receipt>(
        `/api/v1/customer-accounts/${accountId}/receipts`,
        "POST",
        body,
      ),
    onSuccess: () =>
      Promise.all([
        refresh(),
        qc.invalidateQueries({ queryKey: queryKeys.orders }),
      ]),
  });
}
