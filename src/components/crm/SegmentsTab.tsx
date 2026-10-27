"use client";

import { useState } from "react";
import { SegmentBadge } from "@/components/crm/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  SEGMENT_META,
  SEGMENT_ORDER,
  type CrmSettings,
  type Segment,
} from "@/lib/crm";
import { erp, formatMoney, fromMinor, toMinor, useErpQuery } from "@/lib/erp";
import { toast } from "@/lib/toast";

type Data = {
  settings: CrmSettings;
  segments: { key: Segment; customers: number; loyalty_points: number }[];
};
const CARD_ORDER = SEGMENT_ORDER;

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
  const [thresholds, setThresholds] = useState<
    Partial<Record<"silver" | "gold" | "platinum", string>>
  >({});
  const [days, setDays] = useState<string | null>(null);
  const [redemptionPoints, setRedemptionPoints] = useState<string | null>(null);
  const [redemptionAmount, setRedemptionAmount] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const s = data.data?.settings;
  const conversionPoints = Number(
    redemptionPoints ?? s?.redemption_points ?? 100,
  );
  const conversionMinor = toMinor(
    redemptionAmount ?? fromMinor(s?.redemption_value_minor ?? 100),
  );
  const validConversion =
    Number.isSafeInteger(conversionPoints) &&
    conversionPoints > 0 &&
    conversionPoints <= 10 ** 9 &&
    conversionMinor !== null &&
    conversionMinor > 0 &&
    conversionMinor <= 10 ** 12 &&
    /^\d+(\.\d{1,2})?$/.test(
      redemptionAmount ?? fromMinor(s?.redemption_value_minor ?? 100),
    );

  async function save() {
    const tiers = ["silver", "gold", "platinum"] as const;
    const points = tiers.map((tier) =>
      Number(thresholds[tier] ?? s?.[`${tier}_min_points`]),
    );
    const d = Number(days ?? s?.inactive_after_days ?? 180);
    if (
      points.some(
        (value, index) =>
          !Number.isSafeInteger(value) ||
          value < 0 ||
          value > 10 ** 12 ||
          thresholds[tiers[index]] === "",
      ) ||
      !(points[0] <= points[1] && points[1] <= points[2]) ||
      !Number.isInteger(d) ||
      d < 1 ||
      d > 3650
    )
      return toast.error(
        "Check the values",
        "Enter whole points ordered Silver ≤ Gold ≤ Platinum, and 1–3650 inactive days.",
      );
    if (!validConversion)
      return toast.error(
        "Check the conversion",
        "Enter positive whole points and a positive amount with at most two decimal places.",
      );
    setBusy(true);
    const res = await erp("/api/v1/crm/settings", "PUT", {
      silver_min_points: points[0],
      gold_min_points: points[1],
      platinum_min_points: points[2],
      inactive_after_days: d,
      redemption_points: conversionPoints,
      redemption_value_minor: conversionMinor,
    });
    setBusy(false);
    if (res.error) return toast.error("Couldn't save", res.error);
    toast.success("Membership rules saved");
    setThresholds({});
    setDays(null);
    setRedemptionPoints(null);
    setRedemptionAmount(null);
    data.reload();
    onChanged();
  }

  return (
    <div className="space-y-space-4">
      <div className="grid gap-space-3 sm:grid-cols-2 xl:grid-cols-5">
        {[...(data.data?.segments ?? [])]
          .sort((a, b) => CARD_ORDER.indexOf(a.key) - CARD_ORDER.indexOf(b.key))
          .map((seg) => (
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
                {seg.loyalty_points.toLocaleString("en-IN")} loyalty points
              </p>
              <Button
                variant="ghost"
                className="mobile-page-action mt-space-2"
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
            Membership rules
          </h2>
          <p className="mb-space-3 text-[13px] text-ink-600">
            Customers must first join from their storefront Profile with their
            name, date of birth, phone and email. Regular, Silver, Gold and
            Platinum are based on current loyalty points, including adjustments
            and redemptions. Regular starts below Silver. Customers who have
            ordered but have no recent purchase are Inactive, regardless of
            their points. Set thresholds in ascending order.
          </p>
          <div className="grid max-w-xl gap-space-3 sm:grid-cols-2">
            {(["silver", "gold", "platinum"] as const).map((tier) => (
              <Field
                key={tier}
                label={`${SEGMENT_META[tier].label} when loyalty points are at least`}
                htmlFor={`${tier}_min`}
              >
                <Input
                  id={`${tier}_min`}
                  inputMode="numeric"
                  disabled={!canConfigure || busy}
                  value={thresholds[tier] ?? String(s[`${tier}_min_points`])}
                  onChange={(event) =>
                    setThresholds((current) => ({
                      ...current,
                      [tier]: event.target.value,
                    }))
                  }
                />
              </Field>
            ))}
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
          <div className="mt-space-2 border-t border-line pt-space-3">
            <h3 className="mb-space-1 text-[14px] font-semibold text-ink-900">
              Loyalty points to money conversion
            </h3>
            <p className="mb-space-3 text-[13px] text-ink-600">
              Set how many points equal a money deduction. This is separate from
              the rate at which customers earn points.
            </p>
            <div className="grid max-w-xl gap-space-3 sm:grid-cols-2">
              <Field
                label="Loyalty points"
                htmlFor="redemption_points"
                hint="A positive whole number of points."
              >
                <Input
                  id="redemption_points"
                  inputMode="numeric"
                  disabled={!canConfigure || busy}
                  value={redemptionPoints ?? String(s.redemption_points ?? 100)}
                  onChange={(e) => setRedemptionPoints(e.target.value)}
                />
              </Field>
              <Field
                label={`Deduction amount (${currency})`}
                htmlFor="redemption_amount"
                hint="The money value of those points."
              >
                <Input
                  id="redemption_amount"
                  inputMode="decimal"
                  disabled={!canConfigure || busy}
                  value={
                    redemptionAmount ??
                    fromMinor(s.redemption_value_minor ?? 100)
                  }
                  onChange={(e) => setRedemptionAmount(e.target.value)}
                />
              </Field>
            </div>
            {validConversion && (
              <p className="text-[13px] font-semibold text-brand-700">
                {conversionPoints.toLocaleString("en-IN")} points ={" "}
                {formatMoney(conversionMinor!, currency)} deduction.
              </p>
            )}
          </div>
          {canConfigure && (
            <Button
              className="mobile-page-action mt-space-3"
              disabled={
                busy ||
                (Object.keys(thresholds).length === 0 &&
                  days === null &&
                  redemptionPoints === null &&
                  redemptionAmount === null)
              }
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
