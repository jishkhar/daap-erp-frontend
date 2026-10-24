"use client";

import { Truck } from "lucide-react";
import { useState } from "react";
import { DeliveryZones } from "@/components/portal/DeliveryZones";
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
import type { ReturnPolicy } from "@/lib/returns";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

const MAX_DAYS = 365;

/** Shipping and delivery settings: the delivery zones (where the website and WhatsApp deliver, fee, days, COD, which branches), and the
 * return policy every channel follows (the till, the website and the portal). */
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
        description="Where you deliver, what it costs and how long it takes, and how you handle returns."
      />
      <DeliveryZones canEdit={canEdit} />
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
