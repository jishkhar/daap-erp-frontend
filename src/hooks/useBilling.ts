"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BillingContact,
  BillingPlan,
  BillingView,
  TaxInvoice,
} from "@/app/portal/settings/billing/_components/billing-types";
import { erpBlob, erpGet, erpSend } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";
import type { Service } from "@/lib/services";

/** The business's plan, renewal, usage and payments for each service. */
export function useBilling() {
  return useQuery({
    queryKey: queryKeys.billing,
    queryFn: () => erpGet<BillingView>("/api/v1/billing"),
  });
}

/** The plans on sale for one service. Nothing is fetched until a service is chosen. */
export function useServicePlans(service: Service | null) {
  return useQuery({
    queryKey: queryKeys.servicePlans(service ?? ""),
    queryFn: () =>
      erpGet<BillingPlan[]>(`/api/v1/billing/plans?service=${service}`),
    enabled: service !== null,
  });
}

/** A plan change shows in billing, the setup guide's plan step, and (through the session) what each channel page unlocks; callers refresh
 * the session with refreshStaffSession(). */
function useRefreshBilling() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.billing }),
      qc.invalidateQueries({ queryKey: queryKeys.onboarding }),
    ]);
}

/** Schedule a service's cancellation for the end of the billing period. */
export function useCancelService() {
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: (service: Service) =>
      erpSend(`/api/v1/billing/${service}/cancel`, "POST", {
        at_cycle_end: true,
      }),
    onSuccess: refresh,
  });
}

/** Start a checkout for a service's plan (returns Razorpay's hosted page), or, for a service already paid, schedule a plan change. */
export function useChoosePlan() {
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: (input: {
      service: Service;
      plan_code: string;
      /** The service already has a paid subscription: change plan at the cycle end instead of a new checkout. */
      change: boolean;
      billing_cycle: "monthly" | "annual";
    }) =>
      input.change
        ? erpSend<unknown>(
            `/api/v1/billing/${input.service}/change-plan`,
            "POST",
            {
              plan_code: input.plan_code,
            },
          )
        : erpSend<{ short_url: string }>(
            `/api/v1/billing/${input.service}/subscribe`,
            "POST",
            { plan_code: input.plan_code, billing_cycle: input.billing_cycle },
          ),
    onSuccess: refresh,
  });
}

/** DAAP's tax invoices and credit notes to this business, newest first. */
export function useTaxInvoices() {
  return useQuery({
    queryKey: queryKeys.billingInvoices,
    queryFn: () => erpGet<TaxInvoice[]>("/api/v1/billing/invoices?limit=200"),
  });
}

/** Opens an invoice's PDF in a new tab (or downloads it where the browser cannot show PDFs). */
export async function openInvoicePdf(invoice: { id: string; number: string }) {
  // Opened before the request so the popup is not blocked; pointed at the file when it arrives.
  const tab = window.open("", "_blank");
  const res = await erpBlob(`/api/v1/billing/invoices/${invoice.id}/pdf`);
  if (!res.data) {
    tab?.close();
    throw new Error(res.error ?? "Couldn't open the invoice.");
  }
  const url = URL.createObjectURL(res.data);
  if (tab) tab.location.href = url;
  else {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.number.replaceAll("/", "-")}.pdf`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Sends an invoice again to the sign-up email (and the billing email). */
export function useEmailInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      erpSend<{ sent: boolean; to: string | null; cc: string[] }>(
        `/api/v1/billing/invoices/${id}/email`,
        "POST",
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.billingInvoices }),
  });
}

export function useBillingContact() {
  return useQuery({
    queryKey: queryKeys.billingContact,
    queryFn: () => erpGet<BillingContact>("/api/v1/billing/contact"),
  });
}

export function useSaveBillingEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (billing_email: string | null) =>
      erpSend<BillingContact>("/api/v1/billing/contact", "PUT", {
        billing_email,
      }),
    onSuccess: (data) => qc.setQueryData(queryKeys.billingContact, data),
  });
}
