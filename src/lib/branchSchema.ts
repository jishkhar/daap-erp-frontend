import { z } from "zod";
import { fromMinor, toMinor } from "@/lib/erp";
import { INDIAN_STATES } from "@/lib/indianStates";

/** What the branch form holds: every input as the string (or boolean) the person typed, so the form can show half-typed values. */
export type BranchDraft = {
  id?: string;
  branch_code: string;
  is_default: boolean;
  wasDefault: boolean;
  branch_name: string;
  status: "active" | "inactive";
  phone: string;
  email: string;
  manager_user_id: string;
  address_line: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
  gst_registration_id: string;
  fulfilment_enabled: boolean;
  fulfilment_priority: string;
  accepts_online: boolean;
  accepts_pos: boolean;
  accepts_whatsapp: boolean;
  is_open_override: "" | "open" | "closed";
  timezone: string;
  pickup_enabled: boolean;
  delivery_radius_km: string;
  min_order: string;
  delivery_fee: string;
  shipping_origin_pincode: string;
  receipt_header: string;
  receipt_footer: string;
};

export const EMPTY_BRANCH: BranchDraft = {
  branch_code: "",
  is_default: false,
  wasDefault: false,
  branch_name: "",
  status: "active",
  phone: "",
  email: "",
  manager_user_id: "",
  address_line: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  latitude: "",
  longitude: "",
  gst_registration_id: "",
  fulfilment_enabled: true,
  fulfilment_priority: "100",
  accepts_online: true,
  accepts_pos: true,
  accepts_whatsapp: true,
  is_open_override: "",
  timezone: "",
  pickup_enabled: false,
  delivery_radius_km: "",
  min_order: "",
  delivery_fee: "",
  shipping_origin_pincode: "",
  receipt_header: "",
  receipt_footer: "",
};

/** The branch row the API returns (v_branches). */
export type BranchRow = {
  id: string;
  branch_code: string;
  branch_name: string;
  status: "active" | "inactive";
  is_default: boolean;
  address_line: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  manager_user_id: string | null;
  gst_registration_id: string | null;
  fulfilment_enabled: boolean;
  fulfilment_priority: number;
  accepts_online: boolean;
  accepts_pos: boolean;
  accepts_whatsapp: boolean;
  is_open_override: boolean | null;
  timezone: string | null;
  pickup_enabled: boolean;
  delivery_radius_km: number | string | null;
  min_order_minor: number;
  delivery_fee_minor: number;
  shipping_origin_pincode: string | null;
  receipt_header: string | null;
  receipt_footer: string | null;
  /** Only on the single-branch response (GET /api/v1/branches/{id}), so a branch page needn't fetch the team and every GST registration. */
  manager_name?: string | null;
  gst_registration?: {
    gstin: string;
    state_code: string;
    state_name: string | null;
  } | null;
};

export function branchToDraft(b: BranchRow): BranchDraft {
  const s = (v: string | number | null | undefined) =>
    v == null ? "" : String(v);
  return {
    id: b.id,
    branch_code: b.branch_code,
    is_default: b.is_default,
    wasDefault: b.is_default,
    branch_name: b.branch_name,
    status: b.status,
    phone: s(b.phone),
    email: s(b.email),
    manager_user_id: s(b.manager_user_id),
    address_line: s(b.address_line),
    address_line2: s(b.address_line2),
    city: s(b.city),
    state: s(b.state),
    pincode: s(b.pincode),
    latitude: s(b.latitude),
    longitude: s(b.longitude),
    gst_registration_id: s(b.gst_registration_id),
    fulfilment_enabled: b.fulfilment_enabled,
    fulfilment_priority: String(b.fulfilment_priority),
    accepts_online: b.accepts_online,
    accepts_pos: b.accepts_pos,
    accepts_whatsapp: b.accepts_whatsapp,
    is_open_override:
      b.is_open_override === null ? "" : b.is_open_override ? "open" : "closed",
    timezone: s(b.timezone),
    pickup_enabled: b.pickup_enabled,
    delivery_radius_km:
      b.delivery_radius_km == null ? "" : String(Number(b.delivery_radius_km)),
    min_order: b.min_order_minor ? fromMinor(b.min_order_minor) : "",
    delivery_fee: b.delivery_fee_minor ? fromMinor(b.delivery_fee_minor) : "",
    shipping_origin_pincode: s(b.shipping_origin_pincode),
    receipt_header: s(b.receipt_header),
    receipt_footer: s(b.receipt_footer),
  };
}

// ---- formatting -------------------------------------------------------------------------------------
export const digitsOnly = (v: string, max?: number) =>
  v.replace(/\D/g, "").slice(0, max);

/** "98765 43210" / "+91 98765-43210" / "09876543210" -> "+919876543210". Anything else is only stripped of spaces and punctuation. */
export function formatPhone(v: string): string {
  const stripped = v.replace(/[\s().-]/g, "");
  if (/^\d{10}$/.test(stripped)) return `+91${stripped}`;
  if (/^0\d{10}$/.test(stripped)) return `+91${stripped.slice(1)}`;
  return stripped;
}

/** "+919876543210" -> "+91 98765 43210" for display in the list. */
export function displayPhone(v: string | null): string {
  const m = v?.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : (v ?? "");
}

// ---- validation -------------------------------------------------------------------------------------
const blank = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;
const optional = (schema: z.ZodType) => z.preprocess(blank, schema.optional());
const text = (label: string, max: number) =>
  z.string().trim().max(max, `${label} can be at most ${max} characters.`);
const required = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} can be at most ${max} characters.`);
const pincode = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{6}$/, `${label} must be 6 digits.`);
const stateNames: readonly string[] = INDIAN_STATES;

/** Rules shared by add and edit. `gstRequired` is true when the business has a GST registration the branch could trade under. */
export function branchSchema({ gstRequired }: { gstRequired: boolean }) {
  return z.object({
    branch_name: required("Branch name", 120),
    phone: z
      .string()
      .trim()
      .min(1, "Phone is required.")
      .transform(formatPhone)
      .pipe(
        z
          .string()
          .regex(
            /^\+?\d{7,15}$/,
            "Enter a valid phone number, e.g. 98765 43210.",
          ),
      ),
    email: optional(
      z.string().trim().max(200).email("Enter a valid email address."),
    ),
    manager_user_id: optional(z.string()),
    address_line: required("Address", 200),
    address_line2: optional(text("Address line 2", 200)),
    city: required("City", 100),
    state: z
      .string()
      .min(1, "State is required.")
      .refine((v) => stateNames.includes(v), "Choose a state from the list."),
    pincode: z
      .string()
      .trim()
      .min(1, "Pincode is required.")
      .pipe(pincode("Pincode")),
    latitude: optional(
      z
        .string()
        .trim()
        .refine(
          (v) => !Number.isNaN(Number(v)) && Math.abs(Number(v)) <= 90,
          "Latitude must be between -90 and 90.",
        ),
    ),
    longitude: optional(
      z
        .string()
        .trim()
        .refine(
          (v) => !Number.isNaN(Number(v)) && Math.abs(Number(v)) <= 180,
          "Longitude must be between -180 and 180.",
        ),
    ),
    gst_registration_id: gstRequired
      ? z
          .string()
          .min(1, "Choose the GST registration this branch trades under.")
      : z.string(),
    fulfilment_priority: z
      .string()
      .trim()
      .regex(/^\d{1,6}$/, "Priority must be a whole number, 0 or more."),
    delivery_radius_km: optional(
      z
        .string()
        .trim()
        .refine(
          (v) => /^\d{1,4}(\.\d{1,2})?$/.test(v),
          "Enter a distance like 5 or 7.5.",
        ),
    ),
    min_order: optional(
      z
        .string()
        .trim()
        .refine(
          (v) => toMinor(v) !== null,
          "Enter an amount like 499 or 499.50.",
        ),
    ),
    delivery_fee: optional(
      z
        .string()
        .trim()
        .refine(
          (v) => toMinor(v) !== null,
          "Enter an amount like 49 or 49.50.",
        ),
    ),
    shipping_origin_pincode: optional(pincode("Pincode")),
    receipt_header: optional(text("Receipt header", 300)),
    receipt_footer: optional(text("Receipt footer", 300)),
  });
}

export type BranchErrors = Partial<Record<keyof BranchDraft, string>>;

/** Validates the draft; on success returns the request body (money in minor units, blanks as null so an edit can clear them). */
export function validateBranch(
  draft: BranchDraft,
  opts: { gstRequired: boolean },
):
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; errors: BranchErrors } {
  const parsed = branchSchema(opts).safeParse(draft);
  if (!parsed.success) {
    const errors: BranchErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof BranchDraft;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  const v = parsed.data;
  const nullable = <T>(x: T | undefined) => (x === undefined ? null : x);
  const body: Record<string, unknown> = {
    branch_name: v.branch_name,
    phone: v.phone,
    email: nullable(v.email),
    manager_user_id: nullable(v.manager_user_id),
    address_line: v.address_line,
    address_line2: nullable(v.address_line2),
    city: v.city,
    state: v.state,
    pincode: v.pincode,
    latitude: v.latitude === undefined ? null : Number(v.latitude),
    longitude: v.longitude === undefined ? null : Number(v.longitude),
    fulfilment_enabled: draft.fulfilment_enabled,
    fulfilment_priority: Number(v.fulfilment_priority),
    accepts_online: draft.accepts_online,
    accepts_pos: draft.accepts_pos,
    accepts_whatsapp: draft.accepts_whatsapp,
    is_open_override:
      draft.is_open_override === "" ? null : draft.is_open_override === "open",
    timezone: draft.timezone || null,
    pickup_enabled: draft.pickup_enabled,
    delivery_radius_km:
      v.delivery_radius_km === undefined ? null : Number(v.delivery_radius_km),
    min_order_minor: toMinor(String(v.min_order ?? "0")) ?? 0,
    delivery_fee_minor: toMinor(String(v.delivery_fee ?? "0")) ?? 0,
    shipping_origin_pincode: nullable(v.shipping_origin_pincode),
    receipt_header: nullable(v.receipt_header),
    receipt_footer: nullable(v.receipt_footer),
  };
  if (draft.id) {
    body.status = draft.status;
    if (draft.is_default && !draft.wasDefault) body.is_default = true;
  }
  return { ok: true, body };
}
