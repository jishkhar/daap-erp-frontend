"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SkeletonLines } from "@/components/ui/Skeleton";
import {
  useSaveWholesaleSettings,
  useWholesaleSettings,
} from "@/hooks/useWholesale";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import type { WholesaleSettings } from "@/lib/wholesale";

const MAX_DAYS = 365;

/** Wholesale > Credit settings: the credit terms new business customers start with, and when overdue invoices stop more credit. Editable
 * by a tenant-wide settings editor; Wholesale itself is switched on and off in Settings > Modules. */
export function CreditSettingsTab() {
  const session = useStaffSession();
  const current = useWholesaleSettings();
  const save = useSaveWholesaleSettings();
  const [edited, setDraft] = useState<WholesaleSettings | null>(null);
  const draft = edited ?? current.data ?? null;
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
    <Card className="max-w-2xl space-y-space-4 p-space-5">
      {!draft ? (
        <SkeletonLines rows={4} />
      ) : (
        <>
          <div>
            <h2 className="text-[15px] font-bold text-ink-900">
              Credit settings
            </h2>
            <p className="text-[13px] text-ink-600">
              The credit terms a new business customer starts with (you can
              change them per customer). Wholesale itself is switched on and off
              in{" "}
              <Link
                href="/portal/settings/modules"
                className="font-medium text-brand-600 hover:underline"
              >
                Settings &gt; Modules
              </Link>
              .
            </p>
          </div>
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
                      toast.success("Credit settings saved");
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
  );
}
