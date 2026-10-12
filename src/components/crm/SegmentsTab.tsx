"use client";

import { useState } from "react";
import { SegmentBadge } from "@/components/crm/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SEGMENT_META, type CrmSettings, type Segment } from "@/lib/crm";
import { erp, formatMoney, fromMinor, toMinor, useErpQuery } from "@/lib/erp";
import { toast } from "@/lib/toast";

type Data = {
  settings: CrmSettings;
  segments: { key: Segment; customers: number; total_spent_minor: number }[];
};

export function SegmentsTab({
  currency,
  canConfigure,
  onOpenSegment,
  onChanged,
}: {
  currency: string;
  canConfigure: boolean;
  onOpenSegment: (s: Segment) => void;
  onChanged: () => void;
}) {
  const data = useErpQuery<Data>("/api/v1/crm/segments");
  const [vip, setVip] = useState<string | null>(null);
  const [days, setDays] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const s = data.data?.settings;

  async function save() {
    const minor = toMinor(vip ?? fromMinor(s?.vip_min_spend_minor));
    const d = Number.parseInt(
      days ?? String(s?.inactive_after_days ?? 180),
      10,
    );
    if (minor === null || !(d > 0))
      return toast.error(
        "Check the values",
        "Enter a valid amount and number of days.",
      );
    setBusy(true);
    const res = await erp("/api/v1/crm/settings", "PUT", {
      vip_min_spend_minor: minor,
      inactive_after_days: d,
    });
    setBusy(false);
    if (res.error) return toast.error("Couldn't save", res.error);
    toast.success("Segment rules saved");
    setVip(null);
    setDays(null);
    data.reload();
    onChanged();
  }

  return (
    <div className="space-y-space-4">
      <div className="grid gap-space-3 sm:grid-cols-2 xl:grid-cols-4">
        {(data.data?.segments ?? []).map((seg) => (
          <Card key={seg.key} className="p-space-4">
            <div className="flex items-center justify-between">
              <SegmentBadge segment={seg.key} />
              <span className="text-[22px] font-bold text-ink-900">
                {seg.customers}
              </span>
            </div>
            <p className="mt-space-2 text-[12.5px] text-ink-600">
              {SEGMENT_META[seg.key].rule}
            </p>
            <p className="mt-1 text-[12px] text-ink-400">
              Spent {formatMoney(seg.total_spent_minor, currency)}
            </p>
            <Button
              variant="ghost"
              className="mt-space-2"
              onClick={() => onOpenSegment(seg.key)}
            >
              View customers
            </Button>
          </Card>
        ))}
      </div>
      {s && (
        <Card className="p-space-4">
          <h2 className="mb-space-1 text-[15px] font-bold text-ink-900">
            Segment rules
          </h2>
          <p className="mb-space-3 text-[13px] text-ink-600">
            Segments are worked out automatically from each customer&apos;s
            orders. Adjust the limits to suit your shop.
          </p>
          <div className="grid max-w-xl gap-space-3 sm:grid-cols-2">
            <Field
              label="VIP when total spend is at least (₹)"
              htmlFor="vip_min"
            >
              <Input
                id="vip_min"
                inputMode="decimal"
                disabled={!canConfigure}
                value={vip ?? fromMinor(s.vip_min_spend_minor)}
                onChange={(e) => setVip(e.target.value)}
              />
            </Field>
            <Field
              label="Inactive after (days without an order)"
              htmlFor="inactive_days"
            >
              <Input
                id="inactive_days"
                inputMode="numeric"
                disabled={!canConfigure}
                value={days ?? String(s.inactive_after_days)}
                onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
              />
            </Field>
          </div>
          {canConfigure && (
            <Button
              className="mt-space-3"
              disabled={busy || (vip === null && days === null)}
              onClick={save}
            >
              Save rules
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
