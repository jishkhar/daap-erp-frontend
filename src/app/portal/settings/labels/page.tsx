"use client";

import { Tag } from "lucide-react";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { useLabelSettings, useSaveLabelSettings } from "@/hooks/useLabels";
import { MAKER_BARCODE_CHOICES, type LabelSettings } from "@/lib/labels";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

/** Settings > Barcode labels: which products the tills are asked to label, and whether a price change asks for new labels. Labels are
 * printed on the till (it has the label printer); goods received, price changes and "Send labels to till" ask for them. */
export default function LabelSettingsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const current = useLabelSettings();
  const save = useSaveLabelSettings();
  const [edited, setDraft] = useState<LabelSettings | null>(null);
  const draft = edited ?? current.data ?? null;
  if (!ready) return null;
  const canEdit = hasTenantWide(session, "tenant:update");
  const changed =
    !!draft &&
    !!current.data &&
    JSON.stringify(draft) !== JSON.stringify(current.data);

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader
        icon={<Tag size={20} />}
        title="Barcode labels"
        description="Your shop's own barcode stickers. Tills print them; goods received, price changes and labels you send ask for them."
      />
      <Card className="max-w-2xl space-y-space-4 p-space-5">
        {!draft ? (
          <SkeletonLines rows={5} />
        ) : (
          <>
            <fieldset disabled={!canEdit}>
              <legend className="text-[15px] font-bold text-ink-900">
                Product barcode labels
              </legend>
              <p className="mb-space-3 text-[13px] text-ink-600">
                Products with a manufacturer barcode already scan at the till.
                Choose how they get shop labels, or select “Never label them” to
                turn off automatic shop barcodes and labels for all products.
              </p>
              <div className="space-y-space-2">
                {MAKER_BARCODE_CHOICES.map((c) => (
                  <label
                    key={c.value}
                    className="flex cursor-pointer items-start gap-space-3 rounded-lg border border-line p-space-3 has-[:checked]:border-brand-400"
                  >
                    <input
                      type="radio"
                      name="maker_barcode"
                      value={c.value}
                      checked={draft.maker_barcode === c.value}
                      onChange={() =>
                        setDraft({ ...draft, maker_barcode: c.value })
                      }
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-[14px] font-medium text-ink-900">
                        {c.label}
                      </span>
                      <span className="block text-[12.5px] text-ink-600">
                        {c.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex items-start justify-between gap-space-4 border-t border-line pt-space-4">
              <div>
                <h2 className="text-[15px] font-bold text-ink-900">
                  Relabel when a price changes
                </h2>
                <p className="text-[13px] text-ink-600">
                  Each branch holding the product is asked to print new labels
                  for everything it has, so shelves never show an old price.
                  Turn off if your labels do not show prices.
                </p>
              </div>
              <Switch
                checked={draft.relabel_on_price_change}
                disabled={!canEdit}
                onChange={() =>
                  setDraft({
                    ...draft,
                    relabel_on_price_change: !draft.relabel_on_price_change,
                  })
                }
              />
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
                  disabled={!changed || save.isPending}
                  onClick={() =>
                    save.mutate(draft, {
                      onSuccess: (s) => {
                        setDraft(s);
                        toast.success("Label settings saved");
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
