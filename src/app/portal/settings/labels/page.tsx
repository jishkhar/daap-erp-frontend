"use client";

import { Tag } from "lucide-react";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { useLabelSettings, useSaveLabelSettings } from "@/hooks/useLabels";
import { MAKER_BARCODE_CHOICES, type LabelSettings } from "@/lib/labels";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

/** Settings > Barcode labels: which products the tills are asked to label. Labels are printed on the till (it has the label printer);
 * goods received and "Send labels to till" ask for them. One label per product, never reprinted for a price change: the till bills the
 * current price when the barcode is scanned. (The "relabel when a price changes" setting is kept on the server, switched off, and not
 * offered here; saving leaves it as it is.) */
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
        description="Your shop's own barcode stickers, one per product. Tills print them; goods received and labels you send ask for them. A price change needs no new label: the till bills the current price when the barcode is scanned."
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
