"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

/** The business's own WhatsApp number as connected through Meta's Cloud API. */
export type WhatsAppAccount =
  | { connected: false; webhook_url: string }
  | {
      connected: true;
      waba_id: string;
      phone_number_id: string;
      display_phone: string;
      verified_name: string | null;
      quality_rating: string | null;
      access_token_hint: string;
      approved_templates: number;
      last_checked_at: string | null;
      last_error: string | null;
      webhook_url: string;
      verify_token: string;
      webhook_verified_at: string | null;
      last_message_at: string | null;
      connected_at: string;
    };

export type WhatsAppForm = {
  waba_id: string;
  phone_number_id: string;
  access_token: string;
  app_secret: string;
};
export type WhatsAppTemplate = {
  name: string;
  status: string;
  category?: string;
  language?: string;
};

/** `enabled: false` (no channels permission) fetches nothing. */
export function useWhatsAppAccount(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.whatsappAccount,
    queryFn: () => erpGet<WhatsAppAccount>("/api/v1/whatsapp/account"),
    enabled,
  });
}

/** Connecting or disconnecting changes the WhatsApp channel's checklist and its templates. */
function useRefreshWhatsApp() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.whatsapp }),
      qc.invalidateQueries({ queryKey: queryKeys.channels }),
      qc.invalidateQueries({ queryKey: queryKeys.onboarding }),
    ]);
}

/** Save the connection (Meta checks the details first). */
export function useSaveWhatsAppAccount() {
  const refresh = useRefreshWhatsApp();
  return useMutation({
    mutationFn: (form: WhatsAppForm) =>
      erpSend("/api/v1/whatsapp/account", "PUT", form),
    onSuccess: refresh,
  });
}

/** Ask Meta whether the saved details still work. */
export function useCheckWhatsAppAccount() {
  const refresh = useRefreshWhatsApp();
  return useMutation({
    mutationFn: () =>
      erpSend<WhatsAppAccount>("/api/v1/whatsapp/account/check", "POST"),
    onSuccess: refresh,
  });
}

export function useDisconnectWhatsApp() {
  const refresh = useRefreshWhatsApp();
  return useMutation({
    mutationFn: () => erpSend("/api/v1/whatsapp/account", "DELETE"),
    onSuccess: refresh,
  });
}

/** The message templates, read from Meta. Not fetched on its own: call `refetch()` when the person asks to see them. */
export function useWhatsAppTemplates() {
  return useQuery({
    queryKey: queryKeys.whatsappTemplates,
    queryFn: () => erpGet<WhatsAppTemplate[]>("/api/v1/whatsapp/templates"),
    enabled: false,
  });
}
