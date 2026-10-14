/** Wholesale / B2B: business customers, price lists and the switch (backend: services/wholesale.py). Money is whole paise. */

export type WholesaleSettings = {
  enabled: boolean;
  default_credit_days: number;
  hold_after_overdue_days: number;
  /** Switched on AND the business has a live service: what actually decides whether wholesale works. */
  active: boolean;
};

export type PriceList = {
  id: string;
  name: string;
  prices_include_tax: boolean;
  status: "active" | "inactive";
  notes: string | null;
  product_count: number;
  customer_count: number;
  created_at: string;
  updated_at: string;
};

export type PriceListItem = {
  id: string;
  variant_id: string;
  sku: string;
  name: string;
  min_qty: number;
  price_minor: number;
  /** The product's normal selling price, for comparison. */
  list_price_minor: number;
  tax_rate_bps: number | null;
  lifecycle_status: string;
};

export type PriceListDetail = Omit<
  PriceList,
  "product_count" | "customer_count"
> & {
  items: PriceListItem[];
};

export type AccountStatus = "active" | "on_hold" | "inactive";

export type CustomerAccount = {
  id: string;
  account_code: string;
  customer_id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  legal_name: string;
  gstin: string | null;
  billing_state_code: string | null;
  billing_state: string | null;
  billing_address: string | null;
  price_list_id: string | null;
  price_list_name: string | null;
  /** null = no credit: the customer pays at billing. */
  credit_limit_minor: number | null;
  credit_days: number;
  status: AccountStatus;
  hold_reason: string | null;
  sales_person_user_id: string | null;
  sales_person_name: string | null;
  notes: string | null;
  created_at: string;
  cursor?: string;
};

export const ACCOUNT_STATUS_TONE: Record<
  AccountStatus,
  "success" | "warning" | "neutral"
> = { active: "success", on_hold: "warning", inactive: "neutral" };

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  inactive: "Inactive",
};

/** The 15-character GSTIN: 2-digit state, PAN, entity number, Z, check character. */
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// ------------------------------------------------------------------ credit
export type CreditStatus = {
  credit_limit_minor: number | null;
  credit_days: number;
  outstanding_minor: number;
  overdue_minor: number;
  oldest_overdue_days: number;
  open_invoices: number;
  /** null when the customer has no credit at all. */
  available_minor: number | null;
  /** Why a new credit sale would be refused (none = allowed within the limit). */
  blocked_reason: string | null;
  /** Only from GET /customer-accounts/{id}/credit: the invoices still owed, oldest due first. */
  invoices?: OpenInvoice[];
};

// ------------------------------------------------------------------ quotations and sales orders
export type SoStatus =
  | "QUOTATION"
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIALLY_DISPATCHED"
  | "DISPATCHED"
  | "CLOSED"
  | "CANCELLED";

export const SO_STATUS_LABEL: Record<SoStatus, string> = {
  QUOTATION: "Quotation",
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PARTIALLY_DISPATCHED: "Part dispatched",
  DISPATCHED: "Dispatched",
  CLOSED: "Closed short",
  CANCELLED: "Cancelled",
};

export const SO_STATUS_TONE: Record<
  SoStatus,
  "warning" | "clay" | "violet" | "success" | "neutral" | "brand"
> = {
  QUOTATION: "brand",
  DRAFT: "warning",
  CONFIRMED: "clay",
  PARTIALLY_DISPATCHED: "violet",
  DISPATCHED: "success",
  CLOSED: "neutral",
  CANCELLED: "neutral",
};

export type SalesOrderItem = {
  id: string;
  variant_id: string;
  sku: string;
  name: string;
  quantity: number;
  dispatched_quantity: number;
  reserved_quantity: number;
  unit_price_minor: number;
  price_source: "price_list" | "product" | "override";
  discount_minor: number;
  tax_rate_bps: number;
  tax_minor: number;
  line_total_minor: number;
};

export type Dispatch = {
  id: string;
  order_number: string;
  invoice_number: string | null;
  total_minor: number;
  paid_minor: number;
  payment_status: string;
  due_date: string | null;
  created_at: string;
};

export type SalesOrderRow = {
  id: string;
  branch_id: string;
  customer_account_id: string;
  status: SoStatus;
  quote_number: string | null;
  so_number: string | null;
  legal_name: string;
  account_code: string;
  gstin: string | null;
  customer_po_ref: string | null;
  valid_until: string | null;
  expected_date: string | null;
  total_minor: number;
  currency: string;
  units: number;
  dispatched_units: number;
  expired: boolean;
  created_at: string;
  cursor?: string;
};

export type SalesOrder = Omit<
  SalesOrderRow,
  "legal_name" | "account_code" | "gstin" | "units" | "dispatched_units"
> & {
  price_list_id: string | null;
  prices_include_tax: boolean;
  credit_days: number;
  notes: string | null;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  created_by: string | null;
  approved_by: string | null;
  confirmed_at: string | null;
  credit_override_by: string | null;
  cancel_reason: string | null;
  items: SalesOrderItem[];
  account: CustomerAccount;
  dispatches: Dispatch[];
  credit: CreditStatus;
};

/** The document's number as people say it: the SO number once confirmed, else the quotation number. */
export const soNumber = (s: {
  so_number: string | null;
  quote_number: string | null;
}) => s.so_number ?? s.quote_number ?? "Draft";

export type QuoteLine = {
  variant_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price_minor: number;
  product_price_minor: number;
  price_source: "price_list" | "product" | "override";
  discount_minor: number;
  tax_rate_bps: number;
  tax_minor: number;
  line_total_minor: number;
};

export type Quote = {
  price_list_id: string | null;
  prices_include_tax: boolean;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  lines: QuoteLine[];
};

// ------------------------------------------------------------------ payments received, statements, receivables
export type OpenInvoice = {
  id: string;
  order_number: string;
  invoice_number: string | null;
  branch_id: string;
  total_minor: number;
  outstanding_minor: number;
  due_date: string | null;
  sale_recognized_at: string;
};

export type ReceiptMethod =
  "cash" | "upi" | "card" | "bank_transfer" | "cheque";

export const RECEIPT_METHOD_LABEL: Record<ReceiptMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
};

export type Receipt = {
  id: string;
  receipt_number: string;
  customer_account_id: string;
  legal_name: string;
  account_code: string;
  amount_minor: number;
  method: ReceiptMethod;
  reference: string | null;
  received_on: string;
  advance_minor: number;
  notes: string | null;
  created_at: string;
  allocations?: {
    order_id: string;
    order_number: string;
    invoice_number: string | null;
    amount_minor: number;
  }[];
  cursor?: string;
};

export type StatementEntry = {
  at: string;
  kind:
    | "invoice"
    | "credit_note"
    | "payment"
    | "refund"
    | "credit_used"
    | "credit_added"
    | "credit_spent";
  number: string;
  amount_minor: number;
  order_id: string | null;
  balance_minor: number;
};

export const STATEMENT_KIND_LABEL: Record<StatementEntry["kind"], string> = {
  invoice: "Invoice",
  credit_note: "Credit note",
  payment: "Payment",
  refund: "Refund",
  credit_used: "Paid from their credit",
  credit_added: "Credit added",
  credit_spent: "Credit used",
};

export type Statement = {
  account: CustomerAccount;
  credit: CreditStatus;
  opening_balance_minor: number;
  closing_balance_minor: number;
  entries: StatementEntry[];
};

export const AGING_BUCKETS = [
  "not_due",
  "1-30",
  "31-60",
  "61-90",
  "90+",
] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];
export const AGING_LABEL: Record<AgingBucket, string> = {
  not_due: "Not yet due",
  "1-30": "1-30 days late",
  "31-60": "31-60",
  "61-90": "61-90",
  "90+": "Over 90",
};

export type Receivables = {
  as_of: string;
  buckets: Record<AgingBucket, number>;
  total_minor: number;
  overdue_minor: number;
  customers: {
    customer_account_id: string;
    account_code: string;
    legal_name: string;
    phone: string | null;
    credit_limit_minor: number | null;
    status: AccountStatus;
    buckets: Record<AgingBucket, number>;
    outstanding_minor: number;
    overdue_minor: number;
    invoices: number;
  }[];
};
