"use client";

import type { ReactNode } from "react";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import {
  digitsOnly,
  formatPhone,
  type BranchDraft,
  type BranchErrors,
} from "@/lib/branchSchema";
import { INDIAN_STATES } from "@/lib/indianStates";

export type GstOption = { id: string; label: string };
export type ManagerOption = { id: string; name: string };

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-space-5 border-b border-line pb-space-2 last:mb-0 last:border-0">
      <h3 className="text-[14.5px] font-semibold text-ink-900">{title}</h3>
      {description && (
        <p className="mb-space-3 mt-0.5 text-[12.5px] text-ink-400">
          {description}
        </p>
      )}
      {!description && <div className="mb-space-3" />}
      <div className="grid gap-x-space-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="mb-space-4 flex items-start gap-space-3">
      <Switch
        checked={checked}
        onChange={() => onChange(!checked)}
        aria-label={label}
      />
      <span>
        <span className="block text-[14px] text-ink-900">{label}</span>
        {hint && <span className="text-hint block">{hint}</span>}
      </span>
    </div>
  );
}

const timeZones = (): string[] => {
  try {
    return (
      Intl as unknown as { supportedValuesOf(key: string): string[] }
    ).supportedValuesOf("timeZone");
  } catch {
    return ["Asia/Kolkata"];
  }
};

/**
 * The add/edit branch form, in sections. Fields marked * are required; the values are checked with zod (lib/branchSchema.ts) when the
 * form is saved, and each error appears under its field. Typing into a field clears that field's error.
 */
export function BranchForm({
  draft,
  errors,
  set,
  gstOptions,
  gstVisible,
  managers,
}: {
  draft: BranchDraft;
  errors: BranchErrors;
  set: (patch: Partial<BranchDraft>) => void;
  gstOptions: GstOption[];
  gstVisible: boolean;
  managers: ManagerOption[] | null;
}) {
  const e = errors;
  const zones = timeZones();
  return (
    <div>
      <Section
        title="Basics"
        description="How this branch is named and identified across the portal."
      >
        <Field
          label="Branch name"
          htmlFor="b_name"
          required
          error={e.branch_name}
        >
          <Input
            id="b_name"
            invalid={!!e.branch_name}
            value={draft.branch_name}
            maxLength={120}
            onChange={(ev) => set({ branch_name: ev.target.value })}
          />
        </Field>
        <Field
          label="Branch code"
          htmlFor="b_code"
          hint="Generated from the platform's code format; it can't be changed."
        >
          <Input
            id="b_code"
            value={draft.branch_code}
            placeholder="Assigned when you save"
            disabled
          />
        </Field>
        {draft.id && (
          <Field
            label="Status"
            htmlFor="b_status"
            hint="A branch with open orders, or the only active branch, can't be deactivated."
            error={e.status}
          >
            <Select
              id="b_status"
              value={draft.status}
              onChange={(ev) =>
                set({ status: ev.target.value as BranchDraft["status"] })
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        )}
        {draft.id && (
          <Toggle
            checked={draft.is_default}
            onChange={(v) => set({ is_default: v })}
            label="Default branch"
            hint={
              draft.wasDefault
                ? "Make another branch the default to change this."
                : "Used when an order doesn't name a branch."
            }
          />
        )}
      </Section>

      <Section
        title="Contact"
        description="Shown on invoices and receipts, and used by the storefront."
      >
        <Field
          label="Phone"
          htmlFor="b_phone"
          required
          error={e.phone}
          hint="Mobile or landline, e.g. 98765 43210."
        >
          <Input
            id="b_phone"
            type="tel"
            inputMode="tel"
            invalid={!!e.phone}
            value={draft.phone}
            onChange={(ev) => set({ phone: ev.target.value })}
            onBlur={() => set({ phone: formatPhone(draft.phone) })}
          />
        </Field>
        <Field label="Email" htmlFor="b_email" error={e.email}>
          <Input
            id="b_email"
            type="email"
            invalid={!!e.email}
            value={draft.email}
            onChange={(ev) => set({ email: ev.target.value })}
          />
        </Field>
        <Field
          label="Branch manager"
          htmlFor="b_manager"
          hint={
            managers
              ? "Optional. Pick from your team."
              : "You need access to Team & Access to choose a manager."
          }
        >
          <Select
            id="b_manager"
            disabled={!managers}
            value={draft.manager_user_id}
            onChange={(ev) => set({ manager_user_id: ev.target.value })}
          >
            <option value="">No manager</option>
            {(managers ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section
        title="Address"
        description="Where the branch is. The state and pincode decide GST place of supply and which pincodes it can serve first."
      >
        <Field
          label="Address line 1"
          htmlFor="b_addr"
          required
          error={e.address_line}
          className="sm:col-span-2"
        >
          <Input
            id="b_addr"
            invalid={!!e.address_line}
            value={draft.address_line}
            maxLength={200}
            onChange={(ev) => set({ address_line: ev.target.value })}
          />
        </Field>
        <Field
          label="Address line 2"
          htmlFor="b_addr2"
          error={e.address_line2}
          className="sm:col-span-2"
        >
          <Input
            id="b_addr2"
            invalid={!!e.address_line2}
            value={draft.address_line2}
            maxLength={200}
            onChange={(ev) => set({ address_line2: ev.target.value })}
          />
        </Field>
        <Field label="City" htmlFor="b_city" required error={e.city}>
          <Input
            id="b_city"
            invalid={!!e.city}
            value={draft.city}
            maxLength={100}
            onChange={(ev) => set({ city: ev.target.value })}
          />
        </Field>
        <Field label="State" htmlFor="b_state" required error={e.state}>
          <Select
            id="b_state"
            value={draft.state}
            onChange={(ev) => set({ state: ev.target.value })}
          >
            <option value="">Choose a state…</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Pincode" htmlFor="b_pin" required error={e.pincode}>
          <Input
            id="b_pin"
            inputMode="numeric"
            invalid={!!e.pincode}
            value={draft.pincode}
            onChange={(ev) => set({ pincode: digitsOnly(ev.target.value, 6) })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-x-space-3">
          <Field label="Latitude" htmlFor="b_lat" error={e.latitude}>
            <Input
              id="b_lat"
              inputMode="decimal"
              invalid={!!e.latitude}
              value={draft.latitude}
              onChange={(ev) => set({ latitude: ev.target.value })}
            />
          </Field>
          <Field label="Longitude" htmlFor="b_lng" error={e.longitude}>
            <Input
              id="b_lng"
              inputMode="decimal"
              invalid={!!e.longitude}
              value={draft.longitude}
              onChange={(ev) => set({ longitude: ev.target.value })}
            />
          </Field>
        </div>
      </Section>

      {gstVisible && (
        <Section
          title="Tax"
          description="The GSTIN this branch sells under; it appears on its invoices."
        >
          <Field
            label="GST registration"
            htmlFor="b_gst"
            required={gstOptions.length > 0}
            error={e.gst_registration_id}
            className="sm:col-span-2"
            hint={
              gstOptions.length === 0
                ? "Add a GST registration under Settings → Taxes first."
                : undefined
            }
          >
            <Select
              id="b_gst"
              value={draft.gst_registration_id}
              onChange={(ev) => set({ gst_registration_id: ev.target.value })}
            >
              <option value="">
                {gstOptions.length ? "Choose a registration…" : "None"}
              </option>
              {gstOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </Section>
      )}

      <Section
        title="Sales & online orders"
        description="The online store and WhatsApp are switched on for the whole business (under Sales channels). Here you choose what this branch does."
      >
        <Toggle
          checked={draft.accepts_pos}
          onChange={(v) => set({ accepts_pos: v })}
          label="Takes POS sales"
          hint="Off for a warehouse or any branch with no counter."
        />
        <Toggle
          checked={draft.fulfilment_enabled}
          onChange={(v) => set({ fulfilment_enabled: v })}
          label="Delivers online and WhatsApp orders"
          hint="Off for a branch that only sells at the counter."
        />
        <p className="sm:col-span-2 mb-space-4 rounded-md bg-paper p-space-3 text-[12.5px] text-ink-600">
          <strong className="text-ink-900">
            How online orders reach a branch.
          </strong>{" "}
          The customer never picks a branch to order from. For{" "}
          <strong>delivery</strong>, the order goes to one branch that delivers
          to their pincode and has every item in stock. If none does, the
          customer is offered pickup. For <strong>pickup</strong>, they choose
          from branches where pickup is on and every item is in stock. An order
          is never split across branches. A branch set to &ldquo;Closed&rdquo;
          below gets no online or WhatsApp orders, but still takes POS sales.
        </p>
        <Field
          label="Delivery priority"
          htmlFor="b_prio"
          required
          error={e.fulfilment_priority}
          hint="When several branches can deliver an order, the lowest number is used first."
        >
          <Input
            id="b_prio"
            inputMode="numeric"
            invalid={!!e.fulfilment_priority}
            value={draft.fulfilment_priority}
            onChange={(ev) =>
              set({ fulfilment_priority: digitsOnly(ev.target.value, 6) })
            }
          />
        </Field>
        <Field
          label="Open or closed"
          htmlFor="b_open"
          hint="Normally follows the opening hours; force it open or closed here."
        >
          <Select
            id="b_open"
            value={draft.is_open_override}
            onChange={(ev) =>
              set({
                is_open_override: ev.target
                  .value as BranchDraft["is_open_override"],
              })
            }
          >
            <option value="">Follow opening hours</option>
            <option value="open">Always open</option>
            <option value="closed">Closed for now</option>
          </Select>
        </Field>
        <Field
          label="Timezone"
          htmlFor="b_tz"
          hint="Leave as the business default unless this branch is elsewhere."
        >
          <Select
            id="b_tz"
            value={draft.timezone}
            onChange={(ev) => set({ timezone: ev.target.value })}
          >
            <option value="">Same as the business</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section
        title="Delivery & pickup"
        description="Leave blank for no limit. Delivery pincodes and opening hours are set after saving, on the branch page. Until a branch lists any pincodes, delivery isn't limited by pincode."
      >
        <Toggle
          checked={draft.pickup_enabled}
          onChange={(v) => set({ pickup_enabled: v })}
          label="Customers can pick up here"
        />
        <Field
          label="Delivery radius (km)"
          htmlFor="b_radius"
          error={e.delivery_radius_km}
          hint="For information; delivery is decided by the pincodes you list."
        >
          <Input
            id="b_radius"
            inputMode="decimal"
            invalid={!!e.delivery_radius_km}
            value={draft.delivery_radius_km}
            onChange={(ev) => set({ delivery_radius_km: ev.target.value })}
          />
        </Field>
        <Field label="Minimum order (₹)" htmlFor="b_min" error={e.min_order}>
          <Input
            id="b_min"
            inputMode="decimal"
            invalid={!!e.min_order}
            value={draft.min_order}
            onChange={(ev) => set({ min_order: ev.target.value })}
          />
        </Field>
        <Field
          label="Delivery fee (₹)"
          htmlFor="b_fee"
          error={e.delivery_fee}
          hint="Not added to orders yet."
        >
          <Input
            id="b_fee"
            inputMode="decimal"
            invalid={!!e.delivery_fee}
            value={draft.delivery_fee}
            onChange={(ev) => set({ delivery_fee: ev.target.value })}
          />
        </Field>
        <Field
          label="Shipping origin pincode"
          htmlFor="b_origin"
          error={e.shipping_origin_pincode}
          hint="Where couriers collect from, if not the branch pincode."
        >
          <Input
            id="b_origin"
            inputMode="numeric"
            invalid={!!e.shipping_origin_pincode}
            value={draft.shipping_origin_pincode}
            onChange={(ev) =>
              set({ shipping_origin_pincode: digitsOnly(ev.target.value, 6) })
            }
          />
        </Field>
      </Section>

      <Section
        title="Receipt"
        description="Printed on this branch's POS receipts."
      >
        <Field
          label="Header"
          htmlFor="b_rh"
          error={e.receipt_header}
          hint="Up to 300 characters."
          className="sm:col-span-2"
        >
          <Textarea
            id="b_rh"
            rows={2}
            invalid={!!e.receipt_header}
            value={draft.receipt_header}
            maxLength={300}
            onChange={(ev) => set({ receipt_header: ev.target.value })}
          />
        </Field>
        <Field
          label="Footer"
          htmlFor="b_rf"
          error={e.receipt_footer}
          hint="Up to 300 characters, e.g. return policy or thank-you note."
          className="sm:col-span-2"
        >
          <Textarea
            id="b_rf"
            rows={2}
            invalid={!!e.receipt_footer}
            value={draft.receipt_footer}
            maxLength={300}
            onChange={(ev) => set({ receipt_footer: ev.target.value })}
          />
        </Field>
      </Section>
    </div>
  );
}
