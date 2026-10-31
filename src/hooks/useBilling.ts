"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BillingContact,
  BillingPlan,
  BillingView,
  CheckoutQuote,
  CheckoutStart,
} from "@/app/portal/settings/billing/_components/billing-types";
import type { SubscriptionPaid } from "@/lib/razorpayCheckout";
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

/** The checkout page's order summary for a plan and cycle. */
export function useCheckoutQuote(
  service: Service | null,
  planCode: string | null,
  cycle: "monthly" | "annual",
) {
  return useQuery({
    queryKey: queryKeys.checkoutQuote(service ?? "", planCode ?? "", cycle),
    queryFn: () =>
      erpGet<CheckoutQuote>(
        `/api/v1/billing/${service}/quote?plan_code=${encodeURIComponent(planCode ?? "")}&billing_cycle=${cycle}`,
      ),
    enabled: !!service && !!planCode,
  });
}

/** Starts buying a plan: Razorpay's window details, or a cheaper plan scheduled for the period end. */
export function useStartCheckout() {
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: (input: {
      service: Service;
      plan_code: string;
      billing_cycle: "monthly" | "annual";
    }) =>
      erpSend<CheckoutStart>(
        `/api/v1/billing/${input.service}/checkout`,
        "POST",
        {
          plan_code: input.plan_code,
          billing_cycle: input.billing_cycle,
        },
      ),
    onSuccess: (data) => {
      if (data.kind === "scheduled") void refresh();
    },
  });
}

/** A new card or UPI AutoPay for a billed plan: what Razorpay's window opens with (charged now only when the last charge failed). */
export function useStartPaymentMethod() {
  return useMutation({
    mutationFn: (service: Service) =>
      erpSend<Exclude<CheckoutStart, { kind: "scheduled" }>>(
        `/api/v1/billing/${service}/payment-method`,
        "POST",
      ),
  });
}

/** Razorpay's signed answer: the plan goes live at once. */
export function useConfirmCheckout() {
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: (input: { checkoutId: string; paid: SubscriptionPaid }) =>
      erpSend(
        `/api/v1/billing/checkouts/${input.checkoutId}/confirm`,
        "POST",
        input.paid,
      ),
    onSuccess: refresh,
  });
}

/** The window was closed without paying: the checkout is dropped (best effort, nothing was charged). */
export function abandonCheckout(checkoutId: string) {
  return erpSend(
    `/api/v1/billing/checkouts/${checkoutId}/abandon`,
    "POST",
  ).catch(() => undefined);
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
