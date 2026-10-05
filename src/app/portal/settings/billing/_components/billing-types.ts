// Shapes returned by /api/v1/billing (erp-ecommerce-backend api/billing.py). Money is in paise.
export type BillingPlan = {
  id: string; code: string; name: string; description: string | null; price_monthly_minor: number; price_yearly_minor: number; annual_discount_pct: number | string;
  currency: string; max_branches: number | null; max_users: number | null; features: string[]; feature_labels?: string[]; is_popular: boolean; is_active: boolean;
};

export type BillingSubscription = {
  id: string; plan_id: string; status: "trialing" | "authorization_pending" | "active" | "past_due" | "cancelled" | "expired"; billing_cycle: "monthly" | "annual";
  payment_status: "paid" | "pending" | "failed"; current_period_start: string | null; current_period_end: string | null; razorpay_short_url: string | null;
  pending_plan_id: string | null; cancel_at_period_end: boolean;
};

export type BillingPayment = {
  id: string; plan_name: string | null; amount_minor: number; currency: string; status: "pending" | "paid" | "failed" | "partially_refunded" | "refunded";
  method: string | null; card_last4: string | null; card_network: string | null; razorpay_payment_id: string | null; invoice_url: string | null;
  billing_cycle: "monthly" | "annual" | null; period_end: string | null; failure_reason: string | null; refunded_minor: number; paid_at: string | null; created_at: string;
};

export type BillingView = {
  billing_configured: boolean;
  plan: BillingPlan | null;
  subscription: BillingSubscription | null;
  pending_plan: BillingPlan | null;
  usage: { branches: number; max_branches: number | null; users: number; max_users: number | null };
  payments: BillingPayment[];
};
