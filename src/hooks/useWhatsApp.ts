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

// ------------------------------------------------------------------ the team inbox
export type WhatsAppConversation = {
  id: string;
  wa_contact_id: string;
  /** open (with the bot or a person) / pending (waiting for the team) / resolved (closed by the team). */
  status: "open" | "pending" | "resolved";
  waiting: boolean;
  /** The bot is quiet for this customer: the team has the chat. */
  with_staff: boolean;
  last_message_at: string | null;
  /** WhatsApp lets a free-form reply through only within 24 hours of the customer's last message. */
  window_open: boolean;
  window_expires_at: string | null;
  assigned_to: { id: string; name: string | null } | null;
  customer: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  last_message: {
    direction: "in" | "out";
    text: string;
    created_at: string;
  } | null;
};

export type WhatsAppMessage = {
  id: string;
  direction: "in" | "out";
  type: string;
  text: string;
  status: string | null;
  created_at: string;
  /** null for the customer's own messages, "bot" for the bot's, the staff member otherwise. */
  sent_by: null | "bot" | { id: string; name: string | null };
};

export type WhatsAppConversationDetail = WhatsAppConversation & {
  messages: WhatsAppMessage[];
  orders: {
    id: string;
    order_number: string;
    status: string;
    channel: string;
    total_minor: number;
    placed_at: string;
  }[];
};

/** The inbox list, refreshed every 10 seconds; waiting-for-the-team conversations come first. */
export function useWhatsAppConversations(params: {
  waiting: boolean;
  q: string;
}) {
  return useQuery({
    queryKey: queryKeys.whatsappConversations(params),
    queryFn: () => {
      const qs = new URLSearchParams({ waiting: String(params.waiting) });
      if (params.q.trim()) qs.set("q", params.q.trim());
      return erpGet<WhatsAppConversation[]>(
        `/api/v1/whatsapp/conversations?${qs}`,
      );
    },
    refetchInterval: 10_000,
  });
}

/** One conversation with its messages and the customer's recent orders, refreshed every 5 seconds while open. */
export function useWhatsAppConversation(id: string | null) {
  return useQuery({
    queryKey: queryKeys.whatsappConversation(id ?? ""),
    queryFn: () =>
      erpGet<WhatsAppConversationDetail>(
        `/api/v1/whatsapp/conversations/${id}`,
      ),
    enabled: Boolean(id),
    refetchInterval: 5_000,
  });
}

function useRefreshInbox() {
  const qc = useQueryClient();
  return (detail: WhatsAppConversationDetail) => {
    qc.setQueryData(queryKeys.whatsappConversation(detail.id), detail);
    return qc.invalidateQueries({
      queryKey: ["erp", "whatsapp", "conversations"],
    });
  };
}

/** Reply as the team (the bot goes quiet for this customer). */
export function useReplyWhatsApp(id: string) {
  const refresh = useRefreshInbox();
  return useMutation({
    mutationFn: (text: string) =>
      erpSend<WhatsAppConversationDetail>(
        `/api/v1/whatsapp/conversations/${id}/messages`,
        "POST",
        { text },
      ),
    onSuccess: refresh,
  });
}

/** Done: the bot answers this customer again and the conversation is closed. */
export function useHandBackWhatsApp(id: string) {
  const refresh = useRefreshInbox();
  return useMutation({
    mutationFn: () =>
      erpSend<WhatsAppConversationDetail>(
        `/api/v1/whatsapp/conversations/${id}/hand-back`,
        "POST",
      ),
    onSuccess: refresh,
  });
}
