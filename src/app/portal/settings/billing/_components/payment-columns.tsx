"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/erp";
import { formatDate } from "@/lib/formatDate";
import { PlanBadge, ServiceBadge } from "@/components/ui/ServicePlanBadge";
import type { BillingPayment } from "./billing-types";
import { viewInvoice } from "./InvoicesSection";

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

/** Column defs for the payment history table: one row per charge; the invoice is DAAP's tax invoice PDF (Razorpay's receipt for older charges). */
export function createPaymentColumns(): ColumnDef<BillingPayment, unknown>[] {
  return [
    {
      header: "Date",
      cell: ({ row }) =>
        formatDate(row.original.paid_at ?? row.original.created_at),
    },
    {
      header: "Service",
      cell: ({ row }) =>
        row.original.service ? (
          <ServiceBadge service={row.original.service} />
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      header: "Plan",
      cell: ({ row }) =>
        row.original.plan_name ? (
          <>
            <PlanBadge name={row.original.plan_name} />
            {row.original.billing_cycle && (
              <span className="block text-[11.5px] capitalize text-ink-400">
                {row.original.billing_cycle}
              </span>
            )}
          </>
        ) : (
          <span className="text-ink-400">—</span>
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
      cell: ({ row }) => {
        const p = row.original;
        if (p.tax_invoice_id && p.tax_invoice_number)
          return (
            <button
              type="button"
              onClick={() =>
                viewInvoice({
                  id: p.tax_invoice_id!,
                  number: p.tax_invoice_number!,
                })
              }
              className="inline-flex items-center gap-1 text-brand-600 hover:underline"
            >
              <FileText size={12} /> {p.tax_invoice_number}
            </button>
          );
        return p.invoice_url ? (
          <a
            href={p.invoice_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-600 hover:underline"
          >
            Receipt <ExternalLink size={12} />
          </a>
        ) : (
          <span className="text-ink-400">—</span>
        );
      },
    },
  ];
}
