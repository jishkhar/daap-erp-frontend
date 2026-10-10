"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BillingPlan,
  BillingView,
} from "@/app/portal/settings/billing/_components/billing-types";
import { erpGet, erpSend } from "@/lib/erp";
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
