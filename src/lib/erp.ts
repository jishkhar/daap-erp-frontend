"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PoBilling, SupplierBill } from "@/lib/procurement";
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
    label: "Website",
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
  /** In list responses: the customer's name, so a list never needs the customer list to label its rows. */
  customer_name?: string | null;
  /** In list responses: where the next page starts after this row (usePagedQuery). */
  cursor?: string;
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
  /** A sale to a business customer (a dispatch of a sales order, or a business bill at a till), with its credit due date. */
  sale_type?: "retail" | "wholesale";
  sales_order_id?: string | null;
  due_date?: string | null;
  /** Present on the orders list: who bought it (with customer_name above), from which branch, and how many units. */
  customer_phone?: string | null;
  branch_name?: string | null;
  item_count?: number;
  /** Distinct recorded payment methods in list responses, excluding failed attempts. */
  payment_methods?: string[];
};

export type OrderItem = {
  image_url?: string | null;
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

/** One barcode that opens a product. The primary one is the shop's own label (DAAP00012345), issued by the server; the rest are the
 * manufacturers' barcodes, each optionally naming the supplier (or, failing that, the maker) it came from. */
export type ProductBarcode = {
  id: string;
  barcode: string;
  is_primary: boolean;
  source: "manufacturer" | "shop_label";
  created_at: string;
  supplier_id: string | null;
  supplier_name: string | null;
  maker_name: string | null;
};

export type Product = {
  manual_barcode_generation?: boolean;
  created_at?: string;
  id: string; // the variant id: the sellable, stockable unit
  parent_product_id: string;
  product_name: string;
  variant_name: string;
  resale_of_variant_id: string | null;
  sku: string;
  name: string; // product name, plus the variant when it is not the only one
  description: string | null;
  tax_code: string | null;
  /** Packed size for shipments: grams and centimetres (the editor shows the weight in kg). */
  ship_weight_g?: number | null;
  ship_length_cm?: number | null;
  ship_width_cm?: number | null;
  ship_height_cm?: number | null;
  category_id?: string | null;
  category_name?: string | null;
  brand_id?: string | null;
  variant_attributes?: Record<string, unknown>;
  serialization_type: "NONE" | "SERIAL" | "IMEI";
  price_minor: number;
  mrp_minor: number | null;
  cost_minor: number | null;
  barcode: string | null; // the primary barcode: the shop's label
  barcodes?: ProductBarcode[]; // every barcode that opens this product, primary first
  images?: string[]; // public image URLs, first = cover
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
  customer_code: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  status: "active" | "blocked";
  notes: string | null;
  gstin?: string | null;
  tags?: string[];
  whatsapp_opt_in?: boolean;
  total_orders?: number;
  total_spent_minor?: number;
  last_order_at?: string | null;
  created_at: string;
};
export type CustomerAddress = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_default: boolean;
  /** Who the address delivers to, when it differs from the customer. */
  name: string | null;
  phone: string | null;
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
  online: "Website",
  other: "Website",
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

/** Display a channel without changing the API value used for filtering and routing. */
export const channelLabel = (channel: string) =>
  CHANNELS[channel as Channel]?.label ?? humanize(channel);

// ------------------------------------------------------------------------------------------------ API calls
export type ApiResult<T> = {
  data: T | null;
  error: string | null;
  unauthorized: boolean;
  status?: number; // the HTTP status of a refused call (none for a network error)
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
    return result.unauthorized
      ? {
          data: null,
          error: "Session expired — please sign in again.",
          unauthorized: true,
        }
      : {
          data: null,
          error: result.error,
          unauthorized: false,
          status: result.status,
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

/** A failed ERP call, for TanStack Query: queries and mutations fail by throwing. `message` is the server's message, ready to show. */
export class ErpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

function orThrow<T>(res: ApiResult<T>): T {
  if (res.unauthorized) {
    // Hard navigation on purpose: it discards all in-memory state of a session that no longer exists.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/portal/login";
  }
  if (res.error !== null) throw new ErpError(res.error, res.status);
  return res.data as T;
}

/** A GET for a query's queryFn: the data, or throws an ErpError (and goes to sign-in if the session has ended). */
export async function erpGet<T>(path: string): Promise<T> {
  return orThrow(await erp<T>(path));
}

/** A write for a mutation's mutationFn: the response, or throws an ErpError. */
export async function erpSend<T = unknown>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  return orThrow(await erp<T>(path, method, body, headers));
}

/** A multipart form (fields and files) for a mutation's mutationFn: the response, or throws an ErpError. */
export async function erpSendForm<T = unknown>(
  path: string,
  form: FormData,
): Promise<T> {
  const result = await staffFetch(path, { method: "POST", body: form });
  return orThrow<T>(
    result.ok
      ? { data: result.data as T, error: null, unauthorized: false }
      : {
          data: null,
          error: result.unauthorized
            ? "Session expired — please sign in again."
            : result.error,
          unauthorized: result.unauthorized,
        },
  );
}

/** A file upload for a mutation's mutationFn: the response, or throws an ErpError. */
export async function erpSendFile<T = unknown>(
  path: string,
  file: File,
): Promise<T> {
  return orThrow(await erpUpload<T>(path, file));
}

/** Load-on-mount (and on reload / path change) GET. Redirects to sign-in if the session has ended.
 * Removed from main in favour of the TanStack Query hooks in src/hooks; kept here only for the CRM screens that still call it. */
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
  /** Its goods receipts: each is the supplier's bill, with what is paid and still owed. */
  receipts?: SupplierBill[];
  /** The bills added up (on the list and on the order). */
  billing?: PoBilling;
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

export type StoreCredit = {
  balance_minor: number;
  entries: {
    id: string;
    delta_minor: number;
    reason: string;
    created_at: string;
  }[];
};
export type DiscountKind = "percent" | "flat" | "free_delivery" | "bogo";

export type DiscountTarget =
  "all" | "category" | "collection" | "membership" | "individual";

export type Discount = {
  target_type: DiscountTarget;
  category_id: string | null;
  collection_id: string | null;
  membership: import("@/lib/crm").Segment | null;
  customer_id: string | null;
  contact: (Customer & { birthday: string | null }) | null;
  id: string;
  code: string | null;
  name: string;
  kind: DiscountKind;
  /** percent: 0–100; flat: minor units. */
  value: number;
  max_discount_minor: number | null;
  min_order_minor: number;
  channels: Channel[];
  branch_ids: string[] | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  times_used: number;
};
