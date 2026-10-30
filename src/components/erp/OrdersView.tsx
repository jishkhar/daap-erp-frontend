"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ChannelBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/erp/StatusBadges";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CursorPager } from "@/components/ui/CursorPager";
import { DataTable } from "@/components/ui/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/Input";
import { AnchoredSelect } from "@/components/ui/AnchoredSelect";
import { useOrderList } from "@/hooks/useOrders";
import { useActiveBranch } from "@/lib/branch";
import { Switch } from "@/components/ui/Switch";
import { useGlobalFilter } from "@/lib/globalFilter";
import {
  formatDateTime,
  formatMoney,
  humanize,
  methodLabel,
  type Order,
} from "@/lib/erp";
import { useDebounced } from "@/lib/useDebounced";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";

const STATUSES: Order["status"][] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
];
const PAYMENT_STATUSES: Order["payment_status"][] = [
  "pending",
  "authorized",
  "paid",
  "failed",
  "partially_refunded",
  "refunded",
];

type Props = {
  /** Start on every date instead of the global filter's period (the page's ?all=1 link). */
  initialAllDates?: boolean;
};

/** The orders list: filters + table. Orders from every channel live here; the period and channel come from the header's global
 * filter ("All dates" ignores the period, so nothing older that still needs work can hide). Wholesale sales are not here: they have
 * their own list (Wholesale > Invoices). */
export function OrdersView({ initialAllDates = false }: Props) {
  const router = useRouter();
  const session = useStaffSession();
  const canUpdate = hasPermission(session, "orders", "write");
  const { branchId, branches } = useActiveBranch();
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const { params } = useGlobalFilter();
  const [allDates, setAllDates] = useState(initialAllDates);
  const [search, setSearch] = useState("");

  const q = useDebounced(search.trim());
  // paged on the server (newest first); each row carries its customer's name
  const orders = useOrderList({
    ...(allDates ? { channel: params.channel } : params),
    status,
    payment_status: paymentStatus,
    branch_id: branchId,
    q,
    sale_type: "retail",
  });
  const wholesaleOn = session?.modules?.wholesale === true;
  const branchCode = useMemo(
    () => new Map(branches.map((b) => [b.id, b.branch_code])),
    [branches],
  );

  const columns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      {
        header: "Order",
        cell: ({ row }) => (
          <span className="font-semibold text-ink-900">
            {row.original.order_number}
          </span>
        ),
      },
      {
        header: "Channel",
        cell: ({ row }) => <ChannelBadge channel={row.original.channel} />,
      },
      {
        header: "Branch",
        cell: ({ row }) =>
          branchCode.get(row.original.branch_id) ??
          `#${row.original.branch_id}`,
      },
      {
        header: "Customer",
        cell: ({ row }) =>
          row.original.customer_id ? (
            row.original.customer_name || `#${row.original.customer_id}`
          ) : (
            <span className="text-ink-400">Walk-in</span>
          ),
      },
      {
        header: "Total",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatMoney(row.original.total_minor, row.original.currency)}
          </span>
        ),
      },
      {
        header: "Payment",
        cell: ({ row }) => (
          <PaymentStatusBadge status={row.original.payment_status} />
        ),
      },
      {
        header: "Payment mode",
        cell: ({ row }) =>
          row.original.payment_methods?.length ? (
            <div className="flex flex-wrap gap-space-1">
              {row.original.payment_methods.map((method) => (
                <Badge key={method} tone="info" className="whitespace-nowrap">
                  {methodLabel(method)}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-ink-400">—</span>
          ),
      },
      {
        header: "Status",
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        header: "Return / Exchange",
        cell: ({ row }) => {
          const { return_kind: kind, return_status: status } = row.original;
          if (!kind || !status) return <span className="text-ink-400">—</span>;
          const label =
            status === "completed"
              ? kind === "exchange"
                ? "Exchanged"
                : "Returned"
              : `${kind === "exchange" ? "Exchange" : "Return"} ${status}`;
          const more = (row.original.return_count ?? 1) - 1;
          return (
            <div className="flex flex-wrap items-center gap-space-1">
              <Link
                href={`/portal/returns?q=${encodeURIComponent(row.original.order_number)}`}
                onClick={(event) => event.stopPropagation()}
                title={row.original.return_number ?? undefined}
              >
                <Badge
                  tone={
                    status === "completed"
                      ? kind === "exchange"
                        ? "info"
                        : "neutral"
                      : "warning"
                  }
                  className="whitespace-nowrap"
                >
                  {label}
                </Badge>
              </Link>
              {more > 0 && (
                <span className="text-[12px] text-ink-600">+{more} more</span>
              )}
            </div>
          );
        },
      },
      {
        header: "Placed At",
        cell: ({ row }) => (
          <span className="text-ink-600">
            {formatDateTime(row.original.placed_at)}
          </span>
        ),
      },
      {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Actions for ${row.original.order_number}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-600 hover:bg-black/[0.04] hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <MoreHorizontal size={20} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/portal/orders/${row.original.id}`)
                  }
                >
                  <Eye size={16} /> View
                </DropdownMenuItem>
                {canUpdate && (
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(
                        `/portal/orders/${row.original.id}#order-actions`,
                      )
                    }
                  >
                    <Pencil size={16} /> Edit
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [branchCode, canUpdate, router],
  );

  return (
    <>
      <Card className="mb-space-4 flex flex-wrap items-center gap-space-3 p-space-3">
        <Input
          placeholder="Search order number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          aria-label="Search orders"
        />
        <AnchoredSelect
          value={status}
          onValueChange={setStatus}
          className="w-44"
          label="Order status"
          options={[
            { value: "", label: "Any status" },
            ...STATUSES.map((status) => ({
              value: status,
              label: status === "confirmed" ? "Placed" : humanize(status),
            })),
          ]}
        />
        <AnchoredSelect
          value={paymentStatus}
          onValueChange={setPaymentStatus}
          className="w-48"
          label="Payment status"
          options={[
            { value: "", label: "Any payment" },
            ...PAYMENT_STATUSES.map((status) => ({
              value: status,
              label: humanize(status),
            })),
          ]}
        />
        <span className="flex items-center gap-space-2 text-[13px] font-medium text-ink-600">
          <Switch
            checked={allDates}
            onChange={() => setAllDates((v) => !v)}
            aria-label="Show orders from every date"
          />
          All dates
        </span>
      </Card>

      {orders.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {orders.error.message}
        </p>
      )}
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={orders.rows}
          getRowId={(o) => String(o.id)}
          paginate={false}
          onRowClick={(o) => router.push(`/portal/orders/${o.id}`)}
          loading={orders.isFetching}
          emptyMessage={
            orders.isLoading
              ? "Loading orders…"
              : "No orders match these filters."
          }
        />
        <CursorPager {...orders.pager} />
      </Card>
      {wholesaleOn && (
        <p className="mt-space-2 text-[12px] text-ink-400">
          Sales to business customers are under{" "}
          <Link
            href="/portal/wholesale?tab=invoices"
            className="font-medium text-ink-600 hover:underline"
          >
            Wholesale &gt; Invoices
          </Link>
          .
        </p>
      )}
    </>
  );
}
