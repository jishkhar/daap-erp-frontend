"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Mail } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { ServiceBadge } from "@/components/ui/ServicePlanBadge";
import { SkeletonLines } from "@/components/ui/Skeleton";
import {
  openInvoicePdf,
  useBillingContact,
  useEmailInvoice,
  useSaveBillingEmail,
  useTaxInvoices,
} from "@/hooks/useBilling";
import { formatMoney } from "@/lib/erp";
import { formatDate } from "@/lib/formatDate";
import { toast } from "@/lib/toast";
import type { BillingContact, TaxInvoice } from "./billing-types";

export function viewInvoice(invoice: { id: string; number: string }) {
  openInvoicePdf(invoice).catch((e: Error) =>
    toast.error("Couldn't open the invoice", e.message),
  );
}

/** DAAP's tax invoices and credit notes, newest first: open the PDF or have it emailed again. */
export function InvoicesSection({ canManage }: { canManage: boolean }) {
  const invoices = useTaxInvoices();
  const resend = useEmailInvoice();
  const columns = useMemo<ColumnDef<TaxInvoice, unknown>[]>(
    () => [
      {
        header: "Number",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => viewInvoice(row.original)}
            className="font-semibold text-brand-600 hover:underline"
          >
            {row.original.number}
          </button>
        ),
      },
      {
        header: "Date",
        cell: ({ row }) => formatDate(row.original.issued_at),
      },
      {
        header: "Type",
        cell: ({ row }) =>
          row.original.kind === "credit_note" ? (
            <span title={`Against ${row.original.invoice_number ?? ""}`}>
              <Badge tone="violet">Credit note</Badge>
            </span>
          ) : (
            <Badge tone="neutral">Tax invoice</Badge>
          ),
      },
      {
        header: "For",
        cell: ({ row }) => (
          <div className="min-w-[180px]">
            {row.original.service && (
              <ServiceBadge service={row.original.service} />
            )}
            <span className="block text-[12.5px] text-ink-600">
              {row.original.description}
            </span>
            {row.original.period_start && (
              <span className="block text-[11.5px] text-ink-400">
                {formatDate(row.original.period_start)} –{" "}
                {formatDate(row.original.period_end)}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Taxable",
        cell: ({ row }) =>
          formatMoney(row.original.taxable_minor, row.original.currency.trim()),
      },
      {
        header: "GST",
        cell: ({ row }) => {
          const i = row.original;
          const gst = i.cgst_minor + i.sgst_minor + i.igst_minor;
          return (
            <span title={i.supply_type === "INTER" ? "IGST" : "CGST + SGST"}>
              {formatMoney(gst, i.currency.trim())}
              <span className="block text-[11.5px] text-ink-400">
                {Number(i.gst_rate)}%{" "}
                {i.supply_type === "INTER" ? "IGST" : "CGST+SGST"}
              </span>
            </span>
          );
        },
      },
      {
        header: "Total",
        cell: ({ row }) => (
          <span className="font-semibold text-ink-900">
            {row.original.kind === "credit_note" ? "−" : ""}
            {formatMoney(
              row.original.total_minor,
              row.original.currency.trim(),
            )}
          </span>
        ),
      },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-space-1">
            <Button variant="ghost" onClick={() => viewInvoice(row.original)}>
              <FileText size={15} /> PDF
            </Button>
            {canManage && (
              <Button
                variant="ghost"
                disabled={resend.isPending}
                title={
                  row.original.emailed_at
                    ? `Last sent ${formatDate(row.original.emailed_at)} to ${row.original.emailed_to}`
                    : "Not emailed yet"
                }
                onClick={() =>
                  resend.mutate(row.original.id, {
                    onSuccess: (r) =>
                      r.sent
                        ? toast.success(
                            "Invoice emailed",
                            [r.to, ...r.cc].join(", "),
                          )
                        : toast.error(
                            "Couldn't send the email",
                            "Email isn't available right now. Download the PDF instead.",
                          ),
                    onError: (e) => toast.error("Couldn't send", e.message),
                  })
                }
              >
                <Mail size={15} /> Email
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canManage, resend],
  );

  return (
    <>
      <h2 className="mt-space-5 mb-space-3 text-[15px] font-bold text-ink-900">
        Invoices
      </h2>
      <BillingContactCard canManage={canManage} />
      <Card className="mt-space-3 p-space-2">
        {invoices.error && (
          <p className="p-space-2 text-[13px] text-error">
            {invoices.error.message}
          </p>
        )}
        <DataTable
          columns={columns}
          data={invoices.data ?? []}
          getRowId={(i) => i.id}
          pageSize={10}
          loading={invoices.isFetching}
          emptyMessage={
            invoices.isFetching
              ? "Loading…"
              : "No invoices yet. One is issued for every payment."
          }
        />
      </Card>
    </>
  );
}

/** Where invoices are emailed (the sign-up email always; the billing email is copied) and whom they are made out to. */
function BillingContactCard({ canManage }: { canManage: boolean }) {
  const contact = useBillingContact();
  if (!contact.data)
    return (
      <Card className="p-space-4">
        {contact.error ? (
          <p className="text-[13px] text-error">{contact.error.message}</p>
        ) : (
          <SkeletonLines rows={2} />
        )}
      </Card>
    );
  return (
    <Card className="grid gap-space-4 p-space-4 md:grid-cols-2">
      <BillingEmailForm
        key={contact.data.billing_email ?? ""}
        contact={contact.data}
        canManage={canManage}
      />
      <div>
        <p className="text-label mb-space-1">Invoices are made out to</p>
        <p className="text-[14px] font-semibold text-ink-900">
          {contact.data.bill_to.legal_name}
        </p>
        {contact.data.bill_to.address && (
          <p className="text-[13px] text-ink-600">
            {contact.data.bill_to.address}
          </p>
        )}
        <p className="text-[13px] text-ink-600">
          {contact.data.bill_to.state && `${contact.data.bill_to.state} · `}
          GSTIN {contact.data.bill_to.gstin ?? "not added"}
        </p>
        <p className="text-hint mt-space-2">
          Add your GSTIN under{" "}
          <Link
            href="/portal/settings/taxes"
            className="text-brand-600 hover:underline"
          >
            Taxes
          </Link>{" "}
          to claim input tax credit. Changes apply to new invoices only.
        </p>
      </div>
    </Card>
  );
}

function BillingEmailForm({
  contact,
  canManage,
}: {
  contact: BillingContact;
  canManage: boolean;
}) {
  const save = useSaveBillingEmail();
  const [email, setEmail] = useState(contact.billing_email ?? "");
  const changed = email.trim() !== (contact.billing_email ?? "");
  return (
    <div>
      <p className="text-label mb-space-1">Invoices are emailed to</p>
      <p className="mb-space-3 text-[14px] font-semibold text-ink-900">
        {contact.onboarding_email ?? "—"}{" "}
        <span className="text-[12px] font-normal text-ink-400">
          (the email you signed up with)
        </span>
      </p>
      <Field
        label="Also send to (billing email)"
        htmlFor="billing-email"
        hint="Optional: your accountant or accounts team gets a copy of every invoice."
        className="mb-space-2"
      >
        <Input
          id="billing-email"
          type="email"
          placeholder="accounts@yourbusiness.com"
          value={email}
          disabled={!canManage}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      {canManage && (
        <Button
          variant="secondary"
          disabled={!changed || save.isPending}
          onClick={() =>
            save.mutate(email.trim() || null, {
              onSuccess: () => toast.success("Billing email saved"),
              onError: (e) => toast.error("Couldn't save", e.message),
            })
          }
        >
          Save
        </Button>
      )}
    </div>
  );
}
