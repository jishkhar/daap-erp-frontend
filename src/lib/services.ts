import type { Channel } from "@/lib/erp";

/** The three services a business buys separately; they are also its sales channels. Each has its own plans, subscription and renewal. */
export type Service = Channel;
export const SERVICES: Service[] = ["online", "pos", "whatsapp"];

export const SERVICE_LABEL: Record<Service, string> = {
  online: "Online",
  pos: "POS",
  whatsapp: "WhatsApp",
};

export const SERVICE_BLURB: Record<Service, string> = {
  online: "Your online store and website orders.",
  pos: "Billing at the counter on the POS till.",
  whatsapp: "Orders and customer chats over WhatsApp.",
};

/** none | trialing | active | past_due | pending | ended | comped (the server's word for what each service is doing right now). */
export type ServiceState =
  "none" | "trialing" | "active" | "past_due" | "pending" | "ended" | "comped";

export type ServiceInfo = {
  state: ServiceState;
  /** The one rule the server enforces: the service does not work. */
  locked: boolean;
  plan_code: string | null;
  plan_name: string | null;
  billing_cycle: "monthly" | "annual" | null;
  /** When the current period, or the trial, ends. */
  ends_at: string | null;
  cancel_at_period_end: boolean;
};

export const STATE_LABEL: Record<ServiceState, string> = {
  none: "Not subscribed",
  trialing: "Trial",
  active: "Active",
  past_due: "Payment failed",
  pending: "Awaiting payment",
  ended: "Ended",
  comped: "Included",
};

export const STATE_TONE: Record<
  ServiceState,
  "success" | "warning" | "violet" | "neutral"
> = {
  none: "neutral",
  trialing: "violet",
  active: "success",
  past_due: "warning",
  pending: "warning",
  ended: "neutral",
  comped: "success",
};

/** What the one button on a service says, by where the service stands. */
export function buyLabel(state: ServiceState | undefined): string {
  if (state === "ended") return "Renew";
  if (state === "trialing" || state === "comped") return "Choose a plan";
  return "Buy a plan";
}
