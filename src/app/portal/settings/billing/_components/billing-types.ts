// Shapes returned by /api/v1/billing (shopconnect-backend api/billing.py). Money is in paise.
import type { Service, ServiceState } from "@/lib/services";

export type BillingPlan = {
  id: string;
  code: string;
  /** The service this plan is for; a plan belongs to exactly one. */
  service: Service;
  name: string;
  description: string | null;
  price_monthly_minor: number;
  price_yearly_minor: number;
  annual_discount_pct: number | string;
  currency: string;
  max_branches: number | null;
  max_users: number | null;
  max_terminals: number | null;
  features: string[];
  feature_labels?: string[];
  is_popular: boolean;
  is_active: boolean;
  /** What is paid per cycle, GST included (the plan list only). */
  charge_monthly_minor?: number;
  charge_yearly_minor?: number;
  price_mode?: PriceMode;
  gst_rate?: number;
};

/** exclusive: the plan price is before GST (GST is added); inclusive: GST is inside the price. */
export type PriceMode = "exclusive" | "inclusive";

export type BillingSubscription = {
  id: string;
  service: Service;
  plan_id: string;
  status:
    | "trialing"
    | "authorization_pending"
    | "active"
    | "past_due"
    | "cancelled"
    | "expired";
  billing_cycle: "monthly" | "annual";
  payment_status: "paid" | "pending" | "failed";
  current_period_start: string | null;
  current_period_end: string | null;
  razorpay_short_url: string | null;
  pending_plan_id: string | null;
  cancel_at_period_end: boolean;
  /** Charged through Razorpay; false for a trial, a complimentary service or one paid outside. */
  billed: boolean;
};

export type BillingPayment = {
  id: string;
  service: Service | null;
  plan_name: string | null;
  amount_minor: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "partially_refunded" | "refunded";
  method: string | null;
  card_last4: string | null;
  card_network: string | null;
  razorpay_payment_id: string | null;
  invoice_url: string | null;
  /** DAAP's tax invoice for this charge. */
  tax_invoice_id: string | null;
  tax_invoice_number: string | null;
  tax_taxable_minor: number | null;
  tax_gst_minor: number | null;
  tax_gst_rate: number | string | null;
  /** Credit notes issued against this charge's invoice for refunds. */
  credit_notes: { id: string; number: string; total_minor: number }[];
  billing_cycle: "monthly" | "annual" | null;
  period_end: string | null;
  failure_reason: string | null;
  refunded_minor: number;
  paid_at: string | null;
  created_at: string;
};

/** One service as Plan & Billing shows it. */
export type BillingService = {
  state: ServiceState;
  locked: boolean;
  plan: BillingPlan | null;
  subscription: BillingSubscription | null;
  pending_plan: BillingPlan | null;
  /** What a billed plan is charged to (its last charge, or a payment method set up since). */
  pays_with: PaysWith | null;
  /** What the next renewal charges (with GST), for the plan due then. */
  next_charge_minor: number | null;
};

export type PaysWith = {
  method: string;
  card_last4: string | null;
  card_network: string | null;
};

export type BillingView = {
  billing_configured: boolean;
  services: Record<Service, BillingService>;
  tax: { price_mode: PriceMode; gst_rate: number };
  /** Branches and users are the business's, limited by its most generous live plan; terminals belong to POS. */
  usage: {
    branches: number;
    max_branches: number | null;
    users: number;
    max_users: number | null;
    terminals: number;
    max_terminals: number | null;
  };
  payments: BillingPayment[];
};

/** Where invoices are emailed (and whom they are made out to, as printed on them). */
export type BillingContact = {
  onboarding_email: string | null;
  billing_email: string | null;
  bill_to: {
    legal_name: string | null;
    gstin: string | null;
    address: string | null;
    state: string | null;
  };
};

/** The checkout page's order summary (GET /api/v1/billing/{service}/quote). */
export type CheckoutQuote = {
  /** new: first paid plan; upgrade: replaces the billed plan now; scheduled: a cheaper plan from the period end; current / unavailable: can't be bought (see reason). */
  kind: "new" | "upgrade" | "scheduled" | "current" | "unavailable";
  reason: string | null;
  service: Service;
  plan: {
    id: string;
    code: string;
    name: string;
    service: Service;
    currency: string;
  };
  billing_cycle: "monthly" | "annual";
  price_minor: number;
  taxable_minor: number;
  cgst_minor: number;
  sgst_minor: number;
  igst_minor: number;
  total_minor: number;
  due_now_minor: number;
  gst_rate: number | string;
  price_mode: PriceMode;
  supply_type: "INTRA" | "INTER";
  starts_at: string | null;
  renews_at: string | null;
  current: {
    plan_name: string;
    billing_cycle: "monthly" | "annual";
    status: string;
    period_end: string | null;
    billed: boolean;
  } | null;
  bill_to: {
    legal_name: string | null;
    gstin: string | null;
    address: string | null;
    state: string | null;
    email: string | null;
  };
  billing_configured: boolean;
};

/** POST /api/v1/billing/{service}/checkout: what Razorpay's window opens with, or a change scheduled for the period end. */
export type CheckoutStart =
  | {
      kind: "new" | "upgrade" | "payment_method";
      checkout_id: string;
      /** payment_method: false = only authorised now, first charge on starts_at (the renewal date). */
      charge_now: boolean;
      starts_at: string | null;
      key_id: string;
      razorpay_subscription_id: string;
      amount_minor: number;
      currency: string;
      description: string;
      prefill: {
        name: string | null;
        email: string | null;
        contact: string | null;
      };
    }
  | { kind: "scheduled"; subscription: BillingSubscription; plan: BillingPlan };
