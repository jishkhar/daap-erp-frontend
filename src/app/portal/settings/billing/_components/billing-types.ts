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

/** A tax invoice or credit note DAAP issued to the business (/api/v1/billing/invoices). */
export type TaxInvoice = {
  id: string;
  kind: "invoice" | "credit_note";
  number: string;
  /** Credit note: the invoice it reduces. */
  invoice_number: string | null;
  service: Service | null;
  description: string;
  billing_cycle: "monthly" | "annual" | null;
  period_start: string | null;
  period_end: string | null;
  issued_at: string;
  currency: string;
  gst_rate: number | string;
  supply_type: "INTRA" | "INTER";
  taxable_minor: number;
  cgst_minor: number;
  sgst_minor: number;
  igst_minor: number;
  total_minor: number;
  buyer_gstin: string | null;
  emailed_to: string | null;
  emailed_at: string | null;
};

/** Where invoices are emailed and whom they are made out to. */
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
