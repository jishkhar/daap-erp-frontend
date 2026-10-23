"use client";

import { Truck } from "lucide-react";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { useReturnPolicy, useSaveReturnPolicy } from "@/hooks/useReturns";
import {
  useSaveShippingSettings,
  useShippingSettings,
  type ShippingSettings,
} from "@/hooks/useShipping";
import { formatMoney } from "@/lib/erp";
import type { ReturnPolicy } from "@/lib/returns";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

const MAX_DAYS = 365;

/** Shipping and delivery settings: what the website charges for delivery and how long it says delivery takes, and the return policy
 * every channel follows (the till, the website and the portal). */
export default function ShippingSettingsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const policy = useReturnPolicy();
  const save = useSaveReturnPolicy();
  const [edited, setDraft] = useState<ReturnPolicy | null>(null);
  const draft = edited ?? policy.data ?? null; // what is saved until the person changes something
  if (!ready) return null;
  const canEdit = hasTenantWide(session, "tenant:update");
  const days = (v: number) => Number.isInteger(v) && v >= 0 && v <= MAX_DAYS;
  const valid =
    !!draft && days(draft.pos_window_days) && days(draft.online_window_days);
  const changed =
    !!draft &&
    !!policy.data &&
    JSON.stringify(draft) !== JSON.stringify(policy.data);

  const dayField = (
    key: "pos_window_days" | "online_window_days",
    label: string,
    hint: string,
  ) => (
    <Field label={label} htmlFor={key} hint={hint}>
      <div className="flex items-center gap-space-2">
        <Input
          id={key}
          type="number"
          min={0}
          max={MAX_DAYS}
          disabled={!canEdit}
          value={draft ? draft[key] : ""}
          onChange={(e) =>
            draft &&
            setDraft({
              ...draft,
              [key]:
                e.target.value === "" ? 0 : Math.floor(Number(e.target.value)),
            })
          }
          className="w-28"
        />
        <span className="text-[13px] text-ink-600">days</span>
      </div>
    </Field>
  );
  const toggle = (
    key: "exchanges_enabled" | "store_credit_enabled",
    label: string,
    hint: string,
  ) => (
    <div className="flex items-start justify-between gap-space-4 py-space-2">
      <div>
        <p className="text-[14px] font-semibold text-ink-900">{label}</p>
        <p className="text-[12.5px] text-ink-600">{hint}</p>
      </div>
      <Switch
        checked={!!draft?.[key]}
        disabled={!canEdit}
        onChange={() => draft && setDraft({ ...draft, [key]: !draft[key] })}
      />
    </div>
  );

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader
        icon={<Truck size={20} />}
        title="Shipping and delivery"
        description="What your website charges for delivery, how long it takes, and how you handle returns."
      />
      <WebsiteDelivery canEdit={canEdit} />
      <Card className="mt-space-4 max-w-2xl space-y-space-4 p-space-5">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">Return policy</h2>
          <p className="text-[13px] text-ink-600">
            Returns are refused once the window has passed — on the till, on the
            website and here in the portal. Set 0 days to stop returns on that
            channel.
          </p>
        </div>
        {!draft ? (
          <SkeletonLines rows={4} />
        ) : (
          <>
            <div className="grid gap-space-4 sm:grid-cols-2">
              {dayField(
                "pos_window_days",
                "Counter (POS) bills",
                "Counted from the day of the bill.",
              )}
              {dayField(
                "online_window_days",
                "Website and WhatsApp orders",
                "Counted from the day the order was delivered.",
              )}
            </div>
            <div className="divide-y divide-line border-t border-line pt-space-2">
              {toggle(
                "exchanges_enabled",
                "Take exchanges",
                "Swap returned items for others; the customer pays any difference.",
              )}
              {toggle(
                "store_credit_enabled",
                "Refund as store credit",
                "Let staff (and customers asking on the website) choose store credit instead of money.",
              )}
            </div>
            {canEdit ? (
              <div className="mobile-page-actions flex justify-end gap-space-2">
                <Button
                  variant="ghost"
                  disabled={!changed}
                  onClick={() => setDraft(null)}
                >
                  Discard
                </Button>
                <Button
                  disabled={!changed || !valid || save.isPending}
                  onClick={() =>
                    save.mutate(draft, {
                      onSuccess: (p) => {
                        setDraft(p);
                        toast.success("Return policy saved");
                      },
                      onError: (e: Error) =>
                        toast.error("Couldn't save", e.message),
                    })
                  }
                >
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : (
              <p className="text-[12.5px] text-ink-400">
                Only an administrator can change the return policy.
              </p>
            )}
          </>
        )}
      </Card>
    </PortalShell>
  );
}

/** Rupees typed by the person -> minor units; "" -> null. */
const toMinor = (v: string) =>
  v.trim() === "" ? null : Math.round(Number(v) * 100);
const toRupees = (m: number | null) => (m == null ? "" : String(m / 100));
const toDays = (v: string) => (v.trim() === "" ? null : Math.floor(Number(v)));

type Draft = { fee: string; above: string; min: string; max: string };

const draftOf = (s: ShippingSettings): Draft => ({
  fee: toRupees(s.fee_minor),
  above: toRupees(s.free_above_minor),
  min: s.delivery_min_days == null ? "" : String(s.delivery_min_days),
  max: s.delivery_max_days == null ? "" : String(s.delivery_max_days),
});

/** What the shopper reads on the product page and at checkout, from the settings being edited. */
function preview(s: ShippingSettings): string {
  const fee =
    s.fee_minor === 0
      ? "Free delivery"
      : s.free_above_minor != null
        ? `Delivery ${formatMoney(s.fee_minor)}, free on orders of ${formatMoney(s.free_above_minor)} or more`
        : `Delivery ${formatMoney(s.fee_minor)}`;
  if (s.delivery_min_days == null || s.delivery_max_days == null) return fee;
  const days =
    s.delivery_min_days === s.delivery_max_days
      ? `${s.delivery_min_days}`
      : `${s.delivery_min_days}–${s.delivery_max_days}`;
  return `${fee} · arrives in ${days} business days`;
}

function WebsiteDelivery({ canEdit }: { canEdit: boolean }) {
  const saved = useShippingSettings();
  const save = useSaveShippingSettings();
  const [edited, setEdited] = useState<Draft | null>(null);
  const draft = edited ?? (saved.data ? draftOf(saved.data) : null);
  const set = (patch: Partial<Draft>) =>
    draft && setEdited({ ...draft, ...patch });

  const value: ShippingSettings | null = draft && {
    fee_minor: toMinor(draft.fee) ?? 0,
    free_above_minor: toMinor(draft.above),
    delivery_min_days: toDays(draft.min),
    delivery_max_days: toDays(draft.max),
  };
  const problem = (() => {
    if (!value) return null;
    if (!(value.fee_minor >= 0 && value.fee_minor <= 1_000_000))
      return "The delivery fee is between ₹0 and ₹10,000.";
    if (value.free_above_minor != null && !(value.free_above_minor > 0))
      return "Free delivery needs an order amount above ₹0.";
    const { delivery_min_days: lo, delivery_max_days: hi } = value;
    if ((lo == null) !== (hi == null))
      return "Give both the fewest and the most days, or leave both empty.";
    if (lo != null && hi != null && !(lo >= 1 && lo <= hi && hi <= 60))
      return "Delivery days run from 1 to 60, fewest first.";
    return null;
  })();
  const changed =
    !!value &&
    !!saved.data &&
    JSON.stringify(value) !== JSON.stringify(saved.data);

  const field = (
    key: keyof Draft,
    label: string,
    hint: string,
    unit: "₹" | "days",
  ) => (
    <Field label={label} htmlFor={`ship-${key}`} hint={hint}>
      <div className="flex items-center gap-space-2">
        {unit === "₹" && <span className="text-[13px] text-ink-600">₹</span>}
        <Input
          id={`ship-${key}`}
          type="number"
          min={unit === "₹" ? 0 : 1}
          step={unit === "₹" ? "0.01" : 1}
          disabled={!canEdit}
          value={draft ? draft[key] : ""}
          onChange={(e) => set({ [key]: e.target.value })}
          className="w-32"
        />
        {unit === "days" && (
          <span className="text-[13px] text-ink-600">days</span>
        )}
      </div>
    </Field>
  );

  return (
    <Card className="max-w-2xl space-y-space-4 p-space-5">
      <div>
        <h2 className="text-[15px] font-bold text-ink-900">Website delivery</h2>
        <p className="text-[13px] text-ink-600">
          Charged on website and WhatsApp orders that are delivered, never on
          orders collected from a store. The fee includes GST, and it isn&apos;t
          refunded when items are returned.
        </p>
      </div>
      {!draft || !value ? (
        <SkeletonLines rows={4} />
      ) : (
        <>
          <div className="grid gap-space-4 sm:grid-cols-2">
            {field("fee", "Delivery fee", "0 means free delivery.", "₹")}
            {field(
              "above",
              "Free delivery on orders of",
              "Leave empty to always charge the fee. Counted after coupons.",
              "₹",
            )}
            {field("min", "Delivery takes at least", "Business days.", "days")}
            {field(
              "max",
              "and at most",
              "Leave both empty to show no delivery time.",
              "days",
            )}
          </div>
          <p className="rounded-md border border-line bg-paper px-space-3 py-space-2 text-[13px] text-ink-700">
            Shoppers see: <strong>{preview(value)}</strong>
          </p>
          {problem && (
            <p className="text-[12.5px] text-error" role="alert">
              {problem}
            </p>
          )}
          {canEdit ? (
            <div className="mobile-page-actions flex justify-end gap-space-2">
              <Button
                variant="ghost"
                disabled={!changed}
                onClick={() => setEdited(null)}
              >
                Discard
              </Button>
              <Button
                disabled={!changed || !!problem || save.isPending}
                onClick={() =>
                  save.mutate(value, {
                    onSuccess: () => {
                      setEdited(null);
                      toast.success("Delivery settings saved");
                    },
                    onError: (e: Error) =>
                      toast.error("Couldn't save", e.message),
                  })
                }
              >
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-400">
              Only an administrator can change delivery settings.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
