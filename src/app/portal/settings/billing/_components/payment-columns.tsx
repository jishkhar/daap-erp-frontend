"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { InfoTip } from "@/components/ui/InfoTip";
import { PlanBadge, ServiceBadge } from "@/components/ui/ServicePlanBadge";
import { openInvoicePdf } from "@/hooks/useBilling";
import { formatMoney } from "@/lib/erp";
import { formatDate } from "@/lib/formatDate";
import { toast } from "@/lib/toast";
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

function viewPdf(doc: { id: string; number: string }) {
  openInvoicePdf(doc).catch((e: Error) =>
    toast.error("Couldn't open the invoice", e.message),
  );
}

const link = "text-[13px] text-brand-600 hover:underline";

/** Column defs for the billing history: one row per charge, with its tax invoice PDF (and any credit notes for refunds). */
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
        <span className="inline-flex flex-wrap items-center gap-space-1">
          {row.original.service && (
            <ServiceBadge service={row.original.service} />
          )}
          {row.original.plan_name && (
            <PlanBadge name={row.original.plan_name} />
          )}
          {row.original.billing_cycle && (
            <span className="text-[12px] capitalize text-ink-400">
              {row.original.billing_cycle}
            </span>
          )}
        </span>
      ),
    },
    {
      header: "Total",
      cell: ({ row }) => {
        const p = row.original;
        const currency = p.currency.trim();
        return (
          <span className="inline-flex items-center font-semibold text-ink-900">
            {formatMoney(p.amount_minor, currency)}
            {(p.tax_invoice_id || p.method) && (
              <InfoTip title="Breakdown">
                {p.tax_taxable_minor !== null && p.tax_gst_minor !== null && (
                  <span className="block">
                    {formatMoney(p.tax_taxable_minor, currency)} +{" "}
                    {formatMoney(p.tax_gst_minor, currency)} GST (
                    {Number(p.tax_gst_rate)}%)
                  </span>
                )}
                {p.method && (
                  <span className="block capitalize">
                    Paid by {p.method}
                    {p.card_last4 ? ` ····${p.card_last4}` : ""}
                  </span>
                )}
                {p.refunded_minor > 0 && (
                  <span className="block">
                    Refunded {formatMoney(p.refunded_minor, currency)}
                  </span>
                )}
              </InfoTip>
            )}
          </span>
        );
      },
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
            <span className="flex flex-col items-start">
              <button
                type="button"
                className={link}
                title={p.tax_invoice_number}
                onClick={() =>
                  viewPdf({
                    id: p.tax_invoice_id!,
                    number: p.tax_invoice_number!,
                  })
                }
              >
                Invoice PDF
              </button>
              {p.credit_notes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={link}
                  title={`${n.number}: ${formatMoney(n.total_minor, p.currency.trim())} refunded`}
                  onClick={() => viewPdf(n)}
                >
                  Credit note PDF
                </button>
              ))}
            </span>
          );
        return p.invoice_url ? (
          <a
            href={p.invoice_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 ${link}`}
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
