"use client";

import { useQuery } from "@tanstack/react-query";
import { erpGet, qs } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

export type BranchSales = {
  branch_id: string;
  branch_code: string;
  branch_name: string;
  status: string;
  orders: number;
  revenue_minor: number;
  avg_order_minor: number;
  expenses_minor: number;
  stock_units: number;
  stock_value_minor: number;
  low_stock_items: number;
};
export type SalesOverview = {
  date_from: string;
  date_to: string;
  totals: {
    orders: number;
    revenue_minor: number;
    avg_order_minor: number;
    expenses_minor: number;
    stock_units: number;
    stock_value_minor: number;
    low_stock_items: number;
  };
  by_channel: { channel: string; orders: number; revenue_minor: number }[];
  by_branch: BranchSales[];
  daily: ({ date: string } & Record<string, number | string>)[];
};

export type TodaySummary = {
  orders: number;
  revenue_minor: number;
  by_channel: { channel: string; orders: number; revenue_minor: number }[];
  open_orders: number;
  low_stock_items: number | null;
};

/** Today's orders, revenue and open work, for one branch or the whole business. */
export function useTodaySummary(branchId: string | null) {
  const params = { branch_id: branchId };
  return useQuery({
    queryKey: queryKeys.today(params),
    queryFn: () => erpGet<TodaySummary>(`/api/v1/analytics/today${qs(params)}`),
  });
}

/** Sales over a period (cancelled orders excluded): revenue by day, channel and branch, plus each branch's expenses and stock. */
export function useSalesOverview(
  range: { date_from: string; date_to: string },
  branchId: string | null,
) {
  const params = { ...range, branch_id: branchId };
  return useQuery({
    queryKey: queryKeys.salesOverview(params),
    queryFn: () =>
      erpGet<SalesOverview>(`/api/v1/analytics/sales${qs(params)}`),
  });
}
