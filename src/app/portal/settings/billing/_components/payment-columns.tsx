"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/erp";
import { formatDate } from "@/lib/formatDate";
import type { BillingPayment } from "./billing-types";

const TONE = {
  paid: "success",
  pending: "warning",
  failed: "warning",
  partially_refunded: "violet",
  refunded: "neutral",
} as const;
const LABEL = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  partially_refunded: "Part refunded",
  refunded: "Refunded",
} as const;

/** Column defs for the payment history table: one row per charge; the invoice is Razorpay's hosted page. */
export function createPaymentColumns(): ColumnDef<BillingPayment, unknown>[] {
  return [
    {
      header: "Date",
      cell: ({ row }) =>
        formatDate(row.original.paid_at ?? row.original.created_at),
    },
    {
      header: "Plan",
      cell: ({ row }) => (
        <span className="text-ink-600">
          {row.original.plan_name ?? "—"}
          {row.original.billing_cycle ? ` (${row.original.billing_cycle})` : ""}
        </span>
      ),
    },
    {
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-semibold text-ink-900">
          {formatMoney(row.original.amount_minor, row.original.currency.trim())}
        </span>
      ),
    },
    {
      header: "Method",
      cell: ({ row }) => (
        <span className="capitalize text-ink-600">
          {row.original.method ?? "—"}
          {row.original.card_last4 ? ` ····${row.original.card_last4}` : ""}
        </span>
      ),
    },
    {
      header: "Status",
      cell: ({ row }) => (
        <span title={row.original.failure_reason ?? undefined}>
          <Badge tone={TONE[row.original.status]}>
            {LABEL[row.original.status]}
          </Badge>
        </span>
      ),
    },
    {
      header: "Invoice",
      cell: ({ row }) =>
        row.original.invoice_url ? (
          <a
            href={row.original.invoice_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-600 hover:underline"
          >
            View <ExternalLink size={12} />
          </a>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
  ];
}
