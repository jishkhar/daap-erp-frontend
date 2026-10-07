"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { staffFetch } from "@/lib/staffAuth";

// ---------------------------------------------------------------------------------------------- channels
export type Channel = "online" | "pos" | "whatsapp";

/** How each sales channel is shown in the UI. The API codes are fixed (and immutable on an order); only the labels
 * are presentational. */
export const CHANNELS: Record<
  Channel,
  { label: string; slug: string; blurb: string }
> = {
  online: {
    label: "Online",
    slug: "online",
    blurb: "Orders placed on the merchant's website.",
  },
  pos: {
    label: "POS",
    slug: "pos",
    blurb: "Counter sales billed at a branch.",
  },
  whatsapp: {
    label: "WhatsApp",
    slug: "whatsapp",
    blurb: "Orders captured in WhatsApp conversations.",
  },
};

export const CHANNEL_ORDER: Channel[] = ["online", "pos", "whatsapp"];

export function channelFromSlug(slug: string): Channel | null {
  return CHANNEL_ORDER.find((c) => CHANNELS[c].slug === slug) ?? null;
}

// -------------------------------------------------------------------------------------------------- types
export type Order = {
  id: string;
  order_number: string;
  branch_id: string;
  fulfilment_branch_id: string | null;
  channel: Channel;
  customer_id: string | null;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "shipped"
    | "completed"
    | "cancelled"
    | "refunded";
  payment_status:
    | "pending"
    | "authorized"
    | "paid"
    | "failed"
    | "partially_refunded"
    | "refunded";
  order_type: "takeaway" | "pickup" | "delivery" | "shipping";
  currency: string;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  paid_minor: number;
  refunded_minor: number;
  placed_at: string;
  cancel_reason: string | null;
};

export type OrderItem = {
  id: string;
  variant_id: string;
  sku_snapshot: string;
  name_snapshot: string;
  serialization_type: "NONE" | "SERIAL" | "IMEI";
  quantity: number;
  returned_quantity: number;
  unit_price_minor: number;
  discount_minor: number;
  tax_minor: number;
  line_total_minor: number;
  serials?: { serial_number: string; status: string }[];
};

export type Payment = {
  id: string;
  method: string;
  provider: string;
  amount_minor: number;
  refunded_minor: number;
  status: string;
  payment_url: string | null;
  created_at: string;
};

export type OrderDetail = Order & { items: OrderItem[]; payments: Payment[] };

export type Product = {
  id: string; // the variant id: the sellable, stockable unit
  parent_product_id: string;
  product_name: string;
  variant_name: string;
  resale_of_variant_id: string | null;
  sku: string;
  name: string; // product name, plus the variant when it is not the only one
  description: string | null;
  tax_code: string | null;
  serialization_type: "NONE" | "SERIAL" | "IMEI";
  price_minor: number;
  mrp_minor: number | null;
  cost_minor: number | null;
  barcode: string | null;
  lifecycle_status: "draft" | "active" | "discontinued" | "archived";
};

export type StockSummary = {
  variant_id: string;
  available_qty: number;
  reserved_qty: number;
  in_transit_qty: number;
  branches: number;
};
export type TaxRule = {
  id: string;
  code: string;
  name: string;
  rate_bps: number;
};
export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: "active" | "blocked";
  notes: string | null;
  created_at: string;
};
export type Interaction = {
  id: string;
  channel: Channel;
  kind: string;
  summary: string | null;
  occurred_at: string;
};
export type ChannelClient = {
  id: string;
  channel: Channel;
  name: string;
  branch_id: string | null;
  key_prefix: string;
  status: string;
  last_used_at: string | null;
  created_at: string;
};

// ------------------------------------------------------------------------------------------------ helpers
export function formatMoney(minor: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

/** "1,299.50" typed by a person -> 129950 minor units. Returns null when it isn't a valid non-negative amount. */
export function toMinor(input: string): number | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

export function fromMinor(minor: number | null | undefined): string {
  return minor == null ? "" : (minor / 100).toFixed(2);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export type Tone =
  "brand" | "clay" | "success" | "neutral" | "warning" | "violet";

export const ORDER_STATUS_TONE: Record<Order["status"], Tone> = {
  pending: "warning",
  confirmed: "clay",
  preparing: "violet",
  ready: "violet",
  out_for_delivery: "violet",
  shipped: "violet",
  completed: "success",
  cancelled: "neutral",
  refunded: "clay",
};
export const PAYMENT_STATUS_TONE: Record<Order["payment_status"], Tone> = {
  pending: "warning",
  authorized: "violet",
  paid: "success",
  failed: "neutral",
  partially_refunded: "clay",
  refunded: "neutral",
};
const ACRONYMS = new Set(["COD", "UPI", "IMEI", "POS", "GST"]);
/** How a payment method is shown: the schema's `wallet` is the customer's store credit, `netbanking` a bank transfer. */
export const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  netbanking: "Bank transfer",
  wallet: "Store credit",
  cod: "Cash on delivery",
  other: "Online",
};
export const methodLabel = (m: string) => METHOD_LABEL[m] ?? humanize(m);
/** "BANK_TRANSFER" -> "Bank Transfer", "UPI" -> "UPI". */
export const humanize = (code: string) =>
  code
    .split("_")
    .map((w) =>
      ACRONYMS.has(w.toUpperCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join(" ");

// ------------------------------------------------------------------------------------------------ API calls
export type ApiResult<T> = {
  data: T | null;
  error: string | null;
  unauthorized: boolean;
};

/** One JSON call to the ERP API as the signed-in user. */
export async function erp<T = unknown>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" = "GET",
  body?: unknown,
  headers?: Record<string, string>,
): Promise<ApiResult<T>> {
  const result = await staffFetch(path, {
    method,
    ...(body !== undefined || headers
      ? {
          headers: {
            ...(body !== undefined
              ? { "Content-Type": "application/json" }
              : {}),
            ...headers,
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        }
      : {}),
  });
  if (!result.ok) {
    return {
      data: null,
      error: result.unauthorized
        ? "Session expired — please sign in again."
        : result.error,
      unauthorized: result.unauthorized,
    };
  }
  return { data: result.data as T, error: null, unauthorized: false };
}

/** A multipart file upload (the browser sets the boundary header itself). */
export async function erpUpload<T = unknown>(
  path: string,
  file: File,
): Promise<ApiResult<T>> {
  const form = new FormData();
  form.append("file", file);
  const result = await staffFetch(path, { method: "POST", body: form });
  if (!result.ok) {
    return {
      data: null,
      error: result.unauthorized
        ? "Session expired — please sign in again."
        : result.error,
      unauthorized: result.unauthorized,
    };
  }
  return { data: result.data as T, error: null, unauthorized: false };
}

/** Load-on-mount (and on reload / path change) GET. Redirects to sign-in if the session has ended. */
export function useErpQuery<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (path === null) return;
    const id = ++latest.current;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await erp<T>(path);
      if (cancelled || id !== latest.current) return;
      if (res.unauthorized) {
        // Hard navigation on purpose: it discards all in-memory state of a session that no longer exists.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/portal/login";
        return;
      }
      setData(res.data);
      setError(res.error);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

export function qs(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== null && v !== undefined && v !== "" && v !== false)
      sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ------------------------------------------------------------------------------- procurement & finance
export type Supplier = {
  id: string;
  supplier_code: string;
  name: string;
  gstin: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  state: string | null;
  payment_terms_days: number;
  status: "active" | "inactive";
};
export type PoItem = {
  id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  serialization_type: "NONE" | "SERIAL" | "IMEI";
  quantity: number;
  received_quantity: number;
  returned_quantity: number;
  unit_cost_minor: number;
  tax_rate_bps: number;
  tax_minor: number;
  line_total_minor: number;
};
export type PurchaseOrder = {
  id: string;
  po_number: string;
  branch_id: string;
  supplier_id: string;
  status:
    | "DRAFT"
    | "APPROVED"
    | "PARTIALLY_RECEIVED"
    | "RECEIVED"
    | "CLOSED"
    | "CANCELLED";
  subtotal_minor: number;
  tax_minor: number;
  additional_costs_minor: number;
  total_minor: number;
  currency: string;
  expected_date: string | null;
  created_at: string;
  items?: PoItem[];
  receipts?: {
    id: string;
    grn_number: string;
    supplier_invoice_number: string | null;
    total_minor: number;
    received_at: string;
  }[];
};
export type PurchaseRequest = {
  id: string;
  request_number: string;
  branch_id: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "CONVERTED" | "CANCELLED";
  notes: string | null;
  created_at: string;
  items?: {
    variant_id: string;
    sku: string;
    product_name: string;
    quantity: number;
  }[];
};
export type Expense = {
  id: string;
  expense_number: string;
  branch_id: string;
  category_name: string;
  amount_minor: number;
  expense_date: string;
  description: string;
  vendor: string | null;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "PAID";
  rejection_reason: string | null;
};
export type TaxDocument = {
  id: string;
  doc_type: "INVOICE" | "CREDIT_NOTE";
  doc_number: string;
  order_id: string;
  order_number?: string;
  branch_id: string;
  issued_at: string;
  customer_name: string | null;
  customer_gstin: string | null;
  place_of_supply: string | null;
  supply_type: "INTRA" | "INTER";
  seller_gstin?: string | null;
  seller_state_code?: string | null;
  seller_legal_name?: string | null;
  seller_address?: string | null;
  taxable_minor: number;
  cgst_minor: number;
  sgst_minor: number;
  igst_minor: number;
  total_minor: number;
  reason: string | null;
  lines: {
    name: string;
    sku: string;
    hsn?: string | null;
    quantity: number;
    unit_price_minor?: number;
    taxable_minor: number;
    tax_rate_bps: number;
    tax_minor: number;
  }[];
};
export type JournalEntry = {
  id: string;
  entry_number: string;
  entry_date: string;
  source_type: string;
  memo: string | null;
  branch_id: string | null;
  channel: Channel | null;
  reversal_of: number | null;
  lines?: {
    account_code: string;
    account_name: string;
    debit_minor: number;
    credit_minor: number;
  }[];
};
export type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
};

export const PO_STATUS_TONE: Record<PurchaseOrder["status"], Tone> = {
  DRAFT: "warning",
  APPROVED: "clay",
  PARTIALLY_RECEIVED: "violet",
  RECEIVED: "success",
  CLOSED: "neutral",
  CANCELLED: "neutral",
};
export const EXPENSE_STATUS_TONE: Record<Expense["status"], Tone> = {
  SUBMITTED: "warning",
  APPROVED: "clay",
  REJECTED: "neutral",
  PAID: "success",
};

/** Today and the first of this month, as YYYY-MM-DD (local). */
export function monthRange(): { from: string; to: string } {
  const now = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    from: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: iso(now),
  };
}

// ---- Phase 8: ReCommerce -------------------------------------------------------------------------------------------
export type AssetStatus =
  | "INSPECTED"
  | "REJECTED"
  | "ACQUIRED"
  | "GRADED"
  | "IN_REFURBISHMENT"
  | "QC_PENDING"
  | "QC_FAILED"
  | "IN_STOCK"
  | "SOLD"
  | "SCRAPPED";
export type RecommerceAsset = {
  id: string;
  asset_number: string;
  variant_id: string;
  product_name: string;
  product_sku: string;
  serial_number: string;
  source_type: "BUYBACK" | "TRADE_IN";
  status: AssetStatus;
  grade: "A" | "B" | "C" | null;
  suggested_grade: "A" | "B" | "C" | null;
  quoted_price_minor: number;
  cost_basis_minor: number;
  acquisition_cost_minor: number;
  parts_cost_minor: number;
  labour_cost_minor: number;
  acquisition_branch_id: string;
  current_branch_id: string;
  customer_id: string | null;
  payout_method: string | null;
  rejection_reason: string | null;
  created_at: string;
};
export type AssetEvent = {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  branch_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};
export type WorkItem = {
  id: string;
  kind: "PART" | "LABOUR";
  description: string;
  product_name: string | null;
  quantity: number;
  cost_minor: number;
  branch_id: string;
};
export type RecommerceAssetDetail = RecommerceAsset & {
  inspection: Record<string, unknown>;
  resale_sku: string | null;
  resale_price_minor: number | null;
  unit_status: string | null;
  events: AssetEvent[];
  work_items: WorkItem[];
  id_proof_type: string | null;
  id_proof_last4: string | null;
  payout_reference: string | null;
  qc: Record<string, unknown> | null;
};
export type PipelineSummary = {
  by_status: Record<string, { units: number; cost_minor: number }>;
  wip_cost_minor: number;
  in_stock_units: number;
};
export type PriceGuide = {
  id: string;
  variant_id: string;
  product_name?: string;
  grade: "A" | "B" | "C";
  max_price_minor: number;
};
export type StoreCredit = {
  balance_minor: number;
  entries: {
    id: string;
    delta_minor: number;
    reason: string;
    created_at: string;
  }[];
};
export const ASSET_STATUS_TONE: Record<AssetStatus, Tone> = {
  INSPECTED: "warning",
  REJECTED: "neutral",
  ACQUIRED: "clay",
  GRADED: "clay",
  IN_REFURBISHMENT: "violet",
  QC_PENDING: "warning",
  QC_FAILED: "neutral",
  IN_STOCK: "success",
  SOLD: "neutral",
  SCRAPPED: "neutral",
};
export const QC_CHECKS: { key: string; label: string }[] = [
  { key: "powers_on", label: "Powers on and boots" },
  { key: "display", label: "Display is clean" },
  { key: "touch", label: "Touch works across the screen" },
  { key: "cameras", label: "Cameras work" },
  { key: "factory_reset", label: "Factory reset done" },
  { key: "no_activation_lock", label: "No activation lock" },
];
