"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { erpGet, qs } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

export type DashboardRange = "7d" | "30d" | "3m" | "1y";

export type Attention = {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: "warning" | "error";
  amount_minor: number | null;
};

/** What the server returns for the dashboard. A section is missing when the signed-in person may not see it. */
export type Dashboard = {
  date: string;
  range: DashboardRange;
  granularity: "day" | "week" | "month";
  sales: {
    revenue_minor: number;
    revenue_prev_minor: number;
    /** before returns; revenue_minor is net of what came back today */
    gross_minor: number;
    returns_minor: number;
    orders: number;
    orders_prev: number;
    open_orders: number;
  };
  /** net of returns, by the day each return completed */
  trend: {
    date: string;
    revenue_minor: number;
    returns_minor: number;
    orders: number;
  }[];
  range_totals: {
    revenue_minor: number;
    gross_minor: number;
    returns_minor: number;
    orders: number;
  };
  returns: {
    count: number;
    amount_minor: number;
    count_prev: number;
    amount_prev_minor: number;
  };
  by_channel: { channel: string; orders: number; amount_minor: number }[];
  by_payment?: { method: string; orders: number; amount_minor: number }[];
  top_products: {
    key: string;
    name: string;
    units: number;
    amount_minor: number;
  }[];
  refunds?: { count: number; amount_minor: number };
  customers?: { total: number; new_today: number; new_yesterday: number };
  stock?: { value_minor: number; low_items: number };
  attention: Attention[];
  channels: {
    tills?: {
      paired: number;
      online: number;
      waiting_bills: number;
      last_seen_at: string | null;
    };
    whatsapp?: { connected: boolean; last_message_at: string | null };
  };
};

/** Everything on the dashboard in one request. The previous result stays on screen while another range loads. */
export function useDashboard(branchId: string | null, range: DashboardRange) {
  const params = { branch_id: branchId, range };
  return useQuery({
    queryKey: queryKeys.dashboard(params),
    queryFn: () =>
      erpGet<Dashboard>(`/api/v1/analytics/dashboard${qs(params)}`),
    placeholderData: keepPreviousData,
  });
}
