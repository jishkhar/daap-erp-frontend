/** Card machines and UPI for the tills (backend api/payment_machines.py, docs/pos_payments.md). */

export type PaymentSettings = {
  upi_id: string | null;
  upi_name: string | null;
  manual_entry: boolean;
  /** show the Razorpay QR on the tills while Razorpay is connected */
  razorpay_qr: boolean;
};

/** The business's own Razorpay account: its website's and its tills' (never DAAP's plan billing). One set of keys; test or live is
 * told by the key id (rzp_test_ / rzp_live_). The secret is never sent back. */
export type RazorpayAccount = {
  keys: {
    key_id: string;
    mode: "test" | "live";
    has_webhook_secret: boolean;
    saved_at: string;
  } | null;
  qr_on_tills: boolean;
  webhook_url: string;
};

/** A test payment from the portal (Settings > Payments): a Razorpay QR or a connected machine, made the way a till does it; never a bill. */
export type TestPayment = {
  id: string;
  status:
    | "created"
    | "pending"
    | "succeeded"
    | "failed"
    | "cancelled"
    | "expired"
    | "unknown";
  final: boolean;
  is_test: boolean;
  method: "card" | "upi";
  amount_minor: number;
  qr_payload: string | null;
  provider_txn_id: string | null;
  rrn: string | null;
  card_last4: string | null;
  payer_vpa: string | null;
  failure_reason: string | null;
  /** the machine, or "Razorpay QR" */
  device_label: string;
  /** the provider can give the money back through us (else: void it on the machine, then mark it) */
  can_refund: boolean;
  refunded: boolean;
  resolved_note: string | null;
};

export type CredentialField = {
  key: string;
  label: string;
  secret: boolean;
  help: string;
};

export type PaymentProvider = {
  key: string;
  name: string;
  /** false: machines can be added (cashiers type references) but not connected yet */
  available: boolean;
  methods: ("card" | "upi")[];
  device_ref_label: string;
  note: string;
  credential_fields: CredentialField[];
};

export type PaymentConnection = {
  id: string;
  provider: string;
  provider_name: string;
  label: string;
  is_live: boolean;
  public_fields: Record<string, string>;
  is_active: boolean;
  can_connect: boolean;
  device_count: number;
  created_at: string;
};

export type PaymentDevice = {
  id: string;
  branch_id: string;
  branch_name: string;
  label: string;
  provider: string;
  provider_name: string;
  device_ref: string | null;
  connection_id: string | null;
  connection_label: string | null;
  connected: boolean;
  accepts_card: boolean;
  accepts_upi: boolean;
  is_active: boolean;
  created_at: string;
};

export type PaymentRequest = {
  id: string;
  device_id: string;
  device_label: string;
  branch_id: string;
  branch_name: string;
  terminal_name: string | null;
  cashier_name: string | null;
  provider: string;
  method: "card" | "upi";
  amount_minor: number;
  is_test: boolean;
  status:
    | "created"
    | "pending"
    | "succeeded"
    | "failed"
    | "cancelled"
    | "expired"
    | "unknown";
  final: boolean;
  rrn: string | null;
  card_last4: string | null;
  upi_utr: string | null;
  failure_reason: string | null;
  order_number: string | null;
  payment_id: string | null;
  resolved_at: string | null;
  resolved_note: string | null;
  created_at: string;
  cursor: string;
};

export type PaymentRequestPage = {
  items: PaymentRequest[];
  /** confirmed payments no bill used for 30 minutes and nobody dealt with */
  unused_count: number;
};

export const REQUEST_STATUS_LABEL: Record<PaymentRequest["status"], string> = {
  created: "Sending",
  pending: "Waiting",
  succeeded: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
  expired: "Timed out",
  unknown: "Check",
};

/** The UPI link in the shop's own QR (NPCI `upi://pay`), built exactly as the till builds it (shopconnect-pos
 * lib/features/payments/upi_qr.dart): the shop's UPI id and name, the exact amount, a letters-and-digits reference of at most 35. */
export function upiQrLink({
  upiId,
  payeeName,
  amountMinor,
  reference,
  note,
}: {
  upiId: string;
  payeeName?: string | null;
  amountMinor: number;
  reference: string;
  note?: string;
}): string {
  const rupees = `${Math.floor(amountMinor / 100)}.${String(amountMinor % 100).padStart(2, "0")}`;
  const tr = reference.replace(/[^A-Za-z0-9]/g, "").slice(0, 35);
  const params: [string, string][] = [
    ["pa", upiId],
    ...(payeeName ? [["pn", payeeName] as [string, string]] : []),
    ["am", rupees],
    ["cu", "INR"],
    ["tr", tr],
    ...(note ? [["tn", note] as [string, string]] : []),
  ];
  return `upi://pay?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}
