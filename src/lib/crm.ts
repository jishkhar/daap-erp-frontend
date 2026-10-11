import type { Channel, CustomerAddress } from "@/lib/erp";

export type Segment = "vip" | "new" | "regular" | "inactive";
export type MessageChannel = "whatsapp" | "sms" | "email";

export const SEGMENT_META: Record<
  Segment,
  { label: string; tone: "warning" | "violet" | "neutral" | "error"; rule: string }
> = {
  vip: {
    label: "VIP",
    tone: "warning",
    rule: "Spent at least the VIP threshold, or tagged “vip”.",
  },
  new: {
    label: "New",
    tone: "violet",
    rule: "Joined in the last 30 days with at most one order.",
  },
  regular: { label: "Regular", tone: "neutral", rule: "Everyone else who is buying." },
  inactive: {
    label: "Inactive",
    tone: "error",
    rule: "Has ordered before, but not within the inactive window.",
  },
};
export const SEGMENT_ORDER: Segment[] = ["vip", "new", "regular", "inactive"];

export const MESSAGE_CHANNELS: Record<MessageChannel, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

export type CrmCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: "active" | "blocked";
  tags: string[];
  whatsapp_opt_in: boolean;
  total_orders: number;
  total_spent_minor: number;
  last_order_at: string | null;
  created_at: string;
  segment: Segment;
  loyalty_points: number;
};

export type CrmProfile = CrmCustomer & {
  notes: string | null;
  gstin: string | null;
  birthday: string | null;
  gender: string | null;
  preferences: string | null;
  loyalty: { points: number; earned: number; adjusted: number };
  addresses: CustomerAddress[];
};

export type CrmSummary = {
  total_customers: number;
  active_customers: number;
  vip_customers: number;
  new_this_month: number;
  avg_purchase_value_minor: number;
  repeat_rate_pct: number;
  repeat_customers: number;
  follow_ups_due: number;
};

export type CrmSettings = {
  vip_min_spend_minor: number;
  inactive_after_days: number;
  points_per_100: number;
};

export type CrmNote = {
  id: string;
  customer_id: string;
  customer_name?: string;
  body: string;
  follow_up_at: string | null;
  done_at: string | null;
  created_at: string;
  author: string | null;
};

export type CrmMessage = {
  id: string;
  customer_id: string;
  customer_name: string;
  campaign_id: string | null;
  campaign_name: string | null;
  channel: MessageChannel;
  subject: string | null;
  body: string;
  status: "sent" | "queued" | "failed";
  error: string | null;
  created_at: string;
};

export type Campaign = {
  id: string;
  name: string;
  channel: MessageChannel;
  audience: { segment?: Segment; tag?: string };
  subject: string | null;
  message: string;
  discount_id: string | null;
  discount_code: string | null;
  status: "draft" | "sent";
  recipient_count: number;
  delivered_count: number;
  sent_at: string | null;
  created_at: string;
};

export type LoyaltyOverview = {
  settings: CrmSettings;
  members: number;
  points_earned: number;
  points_adjusted: number;
  top: { id: string; name: string; segment: Segment; loyalty_points: number }[];
  recent: { id: string; customer_id: string; customer_name: string; delta: number; reason: string; created_at: string }[];
};

export type CrmAnalytics = {
  customer_growth: { month: string; customers: number }[];
  top_customers: { id: string; name: string; segment: Segment; total_orders: number; total_spent_minor: number }[];
  avg_lifetime_value_minor: number;
  avg_orders_per_customer: number;
  orders_by_channel: { channel: Channel; orders: number; revenue_minor: number }[];
  segments: { key: Segment; customers: number }[];
};

export const initials = (name: string) =>
  (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

export const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export const TEXTAREA_CLASS =
  "w-full rounded-md border border-line bg-card px-space-3 py-space-2 text-[14px] text-ink-900 shadow-[var(--shadow-sm)] focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none";
