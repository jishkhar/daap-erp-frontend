/** Returns and exchanges: what the API sends and how the portal labels it. Money is in paise. */
export type ReturnStatus =
  "requested" | "approved" | "rejected" | "completed" | "cancelled";
export type ReturnKind = "return" | "exchange";
export type ReturnReason =
  | "defective"
  | "damaged"
  | "wrong_item"
  | "size_fit"
  | "changed_mind"
  | "other";
export type RefundMode =
  | "original"
  | "cash"
  | "card"
  | "upi"
  | "store_credit"
  | "loyalty_points"
  | "none";

export type ReturnRow = {
  id: string;
  return_number: string;
  kind: ReturnKind;
  source: "portal" | "pos" | "storefront";
  status: ReturnStatus;
  reason_code: ReturnReason;
  reason_note: string | null;
  customer_preference:
    "refund" | "exchange" | "store_credit" | "loyalty_points" | null;
  refund_mode: RefundMode | null;
  items_value_minor: number;
  refund_minor: number;
  /** Points credited when the refund went back as loyalty points. */
  loyalty_points?: number;
  difference_minor: number;
  branch_id: string;
  branch_name: string | null;
  order_id: string;
  order_number: string;
  bill_number: string | null;
  order_channel: "online" | "pos" | "whatsapp";
  order_placed_at: string;
  order_total_minor: number;
  customer_id: string | null;
  customer_code: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  quantity: number;
  first_item_name: string | null;
  line_count: number;
  exchange_order_id: string | null;
  exchange_order_number: string | null;
  exchange_total_minor: number | null;
  credit_note_number: string | null;
  created_by_name: string | null;
  decision_note: string | null;
  created_at: string;
  completed_at: string | null;
};

export type ReturnItem = {
  id: string;
  order_item_id: string;
  name: string;
  sku: string;
  quantity: number;
  disposition: "RESTOCK" | "WRITE_OFF";
  amount_minor: number;
  unit_price_minor: number;
  serial_numbers: string[];
};

export type ReturnDetail = ReturnRow & {
  /** A website exchange: the replacement the customer chose, and how they pay any difference (COD when the original order was COD). */
  requested_replacement: {
    variant_id: string;
    quantity: number;
    name: string;
    sku: string | null;
    unit_price_minor: number;
  }[];
  exchange_payment: "cod" | "online" | null;
  customer_email: string | null;
  customer_addresses: {
    id: string;
    label: string | null;
    name: string | null;
    phone: string | null;
    line1: string;
    line2: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    is_default: boolean;
  }[];
  items: ReturnItem[];
  refunds: {
    id: string;
    amount_minor: number;
    payout_method: Exclude<RefundMode, "none">;
    payment_method: string;
    provider_refund_id: string | null;
    created_at: string;
  }[];
  exchange_items: {
    name: string;
    sku: string;
    quantity: number;
    unit_price_minor: number;
    line_total_minor: number;
  }[];
  timeline: { at: string; event: string; note?: string | null }[];
};

export type ReturnCounts = {
  returns: number;
  exchanges: number;
  requests: number;
  waiting: number;
  refunded_minor: number;
  returned_value_minor: number;
};

export type Returnable = {
  order_id: string;
  order_number: string;
  channel: "online" | "pos" | "whatsapp";
  bill_number: string | null;
  total_minor: number;
  paid_minor: number;
  refundable_minor: number;
  customer: { id: string; name: string; phone: string | null } | null;
  window: { days: number; closes_on: string | null; open: boolean };
  policy: ReturnPolicy;
  refund_modes: RefundMode[];
  lines: {
    order_item_id: string;
    variant_id: string;
    sku: string;
    name: string;
    serialization_type: "NONE" | "SERIAL" | "IMEI";
    quantity: number;
    returned_quantity: number;
    held_quantity: number;
    returnable_quantity: number;
    unit_refund_minor: number;
    serials: string[];
  }[];
};

export type ReturnQuote = {
  items_value_minor: number;
  refundable_minor: number;
  replacement_total_minor: number;
  due_minor: number;
  refund_minor: number;
};

export type ReturnPolicy = {
  pos_window_days: number;
  online_window_days: number;
  exchanges_enabled: boolean;
  store_credit_enabled: boolean;
  loyalty_enabled: boolean;
};

export const REASONS: ReturnReason[] = [
  "defective",
  "damaged",
  "wrong_item",
  "size_fit",
  "changed_mind",
  "other",
];
export const REASON_LABEL: Record<ReturnReason, string> = {
  defective: "Defective product",
  damaged: "Damaged",
  wrong_item: "Wrong item",
  size_fit: "Size or fit",
  changed_mind: "Changed mind",
  other: "Other",
};

export const REFUND_LABEL: Record<RefundMode, string> = {
  original: "Back the way they paid",
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  store_credit: "Store credit",
  loyalty_points: "Loyalty points",
  none: "No refund now",
};

export const STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const STATUS_TONE = {
  requested: "warning",
  approved: "brand",
  rejected: "error",
  completed: "success",
  cancelled: "neutral",
} as const;

export const SOURCE_LABEL = {
  portal: "Portal",
  pos: "POS",
  storefront: "Website request",
} as const;

/** How a finished return reads in a status pill: an exchange shows "Exchanged". */
export function statusText(r: Pick<ReturnRow, "status" | "kind">): string {
  return r.status === "completed" && r.kind === "exchange"
    ? "Exchanged"
    : STATUS_LABEL[r.status];
}
