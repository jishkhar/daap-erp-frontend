"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

export type TenantContact = {
  email: string | null;
  phone: string | null;
  website: string | null;
  registered_address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
};

/** The business's profile, contact details and company-wide settings (GET /api/v1/tenant). */
export type TenantView = {
  contact: TenantContact;
  tenant: {
    id: string;
    tenant_code: string;
    legal_name: string;
    display_name: string;
    currency: string;
    timezone: string;
    status: string;
  };
  settings: {
    reservation_ttl_minutes: number;
    transfer_high_value_threshold_minor: number;
    tax_inclusive_prices: boolean;
  };
};

export function useTenantView() {
  return useQuery({
    queryKey: queryKeys.tenantView,
    queryFn: () => erpGet<TenantView>("/api/v1/tenant"),
  });
}

/** The setup guide reads the profile, prices, branches, team, products and plan, so a change to any of them can change its steps. */
export function useRefreshOnboarding() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.onboarding });
}

export function useSaveContact() {
  const qc = useQueryClient();
  const refreshGuide = useRefreshOnboarding();
  return useMutation({
    mutationFn: (contact: Record<string, string>) =>
      erpSend("/api/v1/tenant/contact", "PATCH", contact),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.tenant }),
        refreshGuide(),
      ]),
  });
}

/** Change company-wide settings (hold time, transfer threshold, price mode). Send only the fields being changed. */
export function useSaveSettings() {
  const qc = useQueryClient();
  const refreshGuide = useRefreshOnboarding();
  return useMutation({
    mutationFn: (settings: Partial<TenantView["settings"]>) =>
      erpSend("/api/v1/tenant/settings", "PATCH", settings),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.tenant }),
        refreshGuide(),
      ]),
  });
}

// ------------------------------------------------------------------ setup guide
export type GuideStep = {
  key: string;
  title: string;
  why: string;
  href: string;
  status: "done" | "in_progress" | "todo" | "skipped";
  detail: string | null;
  warning: string | null;
  skippable: boolean;
  confirmable: boolean;
  channels?: {
    channel: string;
    label: string;
    in_plan: boolean;
    ended?: boolean;
    met: number;
    total: number;
    ready: boolean;
  }[];
};
export type Guide = {
  steps: GuideStep[];
  done: number;
  total: number;
  essentials_done: boolean;
  complete: boolean;
  dismissed: boolean;
  planned_channels: string[];
};

/** The setup guide. `enabled: false` (no permission to see tenant settings) fetches nothing. */
export function useOnboarding(enabled = true) {
  return useQuery({
    queryKey: queryKeys.onboarding,
    queryFn: () => erpGet<Guide>("/api/v1/onboarding"),
    enabled,
  });
}

/** Skip, un-skip or confirm one step of the guide. */
export function useOnboardingStep() {
  const refresh = useRefreshOnboarding();
  return useMutation({
    mutationFn: (input: {
      key: string;
      action: "skip" | "unskip" | "confirm";
    }) =>
      erpSend(`/api/v1/onboarding/steps/${input.key}`, "POST", {
        action: input.action,
      }),
    onSuccess: refresh,
  });
}

/** Hide the "getting started" list from the dashboard (or show it again). */
export function useDismissOnboarding() {
  const refresh = useRefreshOnboarding();
  return useMutation({
    mutationFn: (dismissed: boolean) =>
      erpSend("/api/v1/onboarding/dismissed", "PUT", { dismissed }),
    onSuccess: refresh,
  });
}
