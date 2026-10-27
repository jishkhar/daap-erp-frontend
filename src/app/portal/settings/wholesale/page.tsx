"use client";

import { Building2 } from "lucide-react";
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
import {
  useSaveWholesaleSettings,
  useWholesaleSettings,
} from "@/hooks/useWholesale";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import type { WholesaleSettings } from "@/lib/wholesale";

const MAX_DAYS = 365;

/** Settings > Wholesale: the business's own switch for selling in bulk (off by default), and the defaults new business customers get. */
export default function WholesaleSettingsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const current = useWholesaleSettings();
  const save = useSaveWholesaleSettings();
  const [edited, setDraft] = useState<WholesaleSettings | null>(null);
  const draft = edited ?? current.data ?? null;
  if (!ready) return null;
  const canEdit = hasTenantWide(session, "tenant:update");
  const days = (v: number) => Number.isInteger(v) && v >= 0 && v <= MAX_DAYS;
  const valid =
    !!draft &&
    days(draft.default_credit_days) &&
    days(draft.hold_after_overdue_days);
  const changed =
    !!draft &&
    !!current.data &&
    JSON.stringify(draft) !== JSON.stringify(current.data);

  const dayField = (
    key: "default_credit_days" | "hold_after_overdue_days",
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

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader
        icon={<Building2 size={20} />}
        title="Wholesale"
        description="Sell in bulk to retailers, dealers and contractors, with their own prices and credit terms."
      />
      <Card className="max-w-2xl space-y-space-4 p-space-5">
        {!draft ? (
          <SkeletonLines rows={4} />
        ) : (
          <>
            <div className="flex items-start justify-between gap-space-4">
              <div>
                <h2 className="text-[15px] font-bold text-ink-900">
                  Wholesale selling
                </h2>
                <p className="text-[13px] text-ink-600">
                  Adds Wholesale under Back office: business customers with a
                  GSTIN, credit limit and price list, and price lists with
                  quantity breaks. Off: nothing changes for your shop and tills.
                </p>
                {draft.enabled &&
                  current.data?.enabled &&
                  !current.data.active && (
                    <p className="mt-space-1 text-[12.5px] font-medium text-warning">
                      It needs a live plan (Website, POS or WhatsApp) to work.
                    </p>
                  )}
              </div>
              <Switch
                checked={draft.enabled}
                disabled={!canEdit}
                onChange={() => setDraft({ ...draft, enabled: !draft.enabled })}
              />
            </div>
            {draft.enabled && (
              <div className="grid gap-space-4 border-t border-line pt-space-4 sm:grid-cols-2">
                {dayField(
                  "default_credit_days",
                  "Default credit days",
                  "What a new business customer gets when you allow credit.",
                )}
                {dayField(
                  "hold_after_overdue_days",
                  "Stop credit when overdue by",
                  "No more credit sales once an invoice is this late. 0 = never stop.",
                )}
              </div>
            )}
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
                      onSuccess: (s) => {
                        setDraft(s);
                        toast.success(
                          s.enabled
                            ? "Wholesale is on"
                            : "Wholesale settings saved",
                        );
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
                Only an administrator can change these settings.
              </p>
            )}
          </>
        )}
      </Card>
    </PortalShell>
  );
}
