"use client";

import { MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { useBranches } from "@/hooks/useBranches";
import {
  useDeleteZone,
  useDeliveryMap,
  useDeliveryZones,
  useZoneCheck,
  type DeliveryZone,
} from "@/hooks/useDeliveryZones";
import { formatMoney } from "@/lib/erp";
import { toast } from "@/lib/toast";
import { DeliveryMap, ZONE_COLOURS } from "./DeliveryMap";
import { ZoneEditor, type ZoneStart } from "./ZoneEditor";

/** Common reasons to add a second zone, as starting points for the editor. */
const STARTERS: { title: string; text: string; start: ZoneStart }[] = [
  {
    title: "Cheaper or faster in my city",
    text: "Pick your district(s): e.g. free delivery, next day.",
    start: { area: "district", fee_minor: 0, min_days: 1, max_days: 1 },
  },
  {
    title: "A different price for some states",
    text: "Pick states that cost more (or less) to reach.",
    start: { area: "state" },
  },
  {
    title: "Only certain pincodes",
    text: "Paste a list, e.g. the pincodes your own rider covers.",
    start: { area: "pincode" },
  },
];

/** "Free · 1–2 days · COD" — what a shopper in the zone is told. */
function promise(
  z: Pick<
    DeliveryZone,
    | "fee_minor"
    | "free_above_minor"
    | "min_days"
    | "max_days"
    | "cod_allowed"
    | "cod_max_minor"
  >,
) {
  const fee =
    z.fee_minor === 0
      ? "Free delivery"
      : `${formatMoney(z.fee_minor)}${z.free_above_minor != null ? `, free from ${formatMoney(z.free_above_minor)}` : ""}`;
  const days =
    z.min_days == null || z.max_days == null
      ? null
      : z.min_days === z.max_days
        ? `${z.min_days} days`
        : `${z.min_days}–${z.max_days} days`;
  const cod = z.cod_allowed
    ? `COD${z.cod_max_minor != null ? ` up to ${formatMoney(z.cod_max_minor)}` : ""}`
    : "No COD";
  return [fee, days, cod].filter(Boolean).join(" · ");
}

function where(z: DeliveryZone) {
  const inc = z.rules.filter((r) => !r.exclude);
  const exc = z.rules.filter((r) => r.exclude);
  const say = (rs: typeof inc) => {
    const pins = rs.filter((r) => r.kind === "pincode").length;
    const named = rs
      .filter((r) => r.kind !== "pincode")
      .map((r) => r.label ?? r.value);
    return [
      ...named.slice(0, 4),
      named.length > 4 ? `${named.length - 4} more` : null,
      pins ? `${pins} pincode${pins > 1 ? "s" : ""}` : null,
    ]
      .filter(Boolean)
      .join(", ");
  };
  return say(inc) + (exc.length ? ` — except ${say(exc)}` : "");
}

/** Delivery zones: the list, add/edit, "check a pincode" and the map. Shoppers only ever type a pincode; the system finds the zone (price,
 * days, COD) and the nearest branch that has the items. */
export function DeliveryZones({ canEdit }: { canEdit: boolean }) {
  const list = useDeliveryZones();
  const branches = useBranches();
  const remove = useDeleteZone();
  const [editing, setEditing] = useState<
    DeliveryZone | { start: ZoneStart } | null
  >(null);
  const [deleting, setDeleting] = useState<DeliveryZone | null>(null);
  const [pin, setPin] = useState("");
  const [showMap, setShowMap] = useState(false);
  const check = useZoneCheck(pin);
  const map = useDeliveryMap(showMap);
  const zones = list.data?.items ?? [];
  const branchName = (id: string) =>
    branches.data?.find((b) => b.id === id)?.branch_name ?? "a branch";
  const result = /^[1-9]\d{5}$/.test(pin) ? check.data : undefined;

  return (
    <Card className="space-y-space-4 p-space-5">
      <div className="flex flex-wrap items-start justify-between gap-space-3">
        <div className="max-w-2xl">
          <h2 className="text-[15px] font-bold text-ink-900">Delivery zones</h2>
          <p className="text-[13px] text-ink-600">
            A zone is an area plus what shoppers there pay and wait for
            delivery. <strong>Most shops need just one</strong>: “All India”,
            one price for everyone. Add another zone only when some area should
            get a different price or delivery time, e.g. free and next-day in
            your own city. A shopper&apos;s pincode uses the{" "}
            <strong>narrowest</strong> zone it falls in, so a city zone wins
            over “All India” for that city.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setEditing({ start: { area: "district" } })}>
            <Plus size={14} /> Add zone
          </Button>
        )}
      </div>

      {canEdit && list.data && zones.length <= 1 && (
        <div className="grid gap-space-2 sm:grid-cols-3">
          {STARTERS.map((s) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setEditing({ start: s.start })}
              className="rounded-md border border-dashed border-line p-space-3 text-left hover:border-brand-400 hover:bg-brand-50"
            >
              <span className="block text-[13.5px] font-semibold text-ink-900">
                {s.title}
              </span>
              <span className="block text-[12.5px] text-ink-600">{s.text}</span>
            </button>
          ))}
          <p className="text-[12.5px] text-ink-500 sm:col-span-3">
            Want to deliver only within your state or city? Edit “All India” and
            change its area instead of adding a zone.
          </p>
        </div>
      )}

      {list.error && (
        <p className="text-[13px] text-error">{list.error.message}</p>
      )}
      {!list.data ? (
        <SkeletonLines rows={3} />
      ) : zones.length === 0 ? (
        <p className="rounded-md border border-warning/40 bg-warning-tint px-space-3 py-space-2 text-[13px] text-ink-800">
          No delivery zones: the website and WhatsApp can&apos;t take delivery
          orders. Add a zone (for example “All of India”).
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {zones.map((z, i) => (
            <li
              key={z.id}
              className="flex flex-wrap items-start justify-between gap-space-3 p-space-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-space-2 text-[14px] font-semibold text-ink-900">
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{
                      background: ZONE_COLOURS[i % ZONE_COLOURS.length],
                    }}
                  />
                  {z.name}
                  {!z.is_active && (
                    <span className="text-[12px] font-normal text-ink-400">
                      (off)
                    </span>
                  )}
                </p>
                <p className="text-[13px] text-ink-700">{where(z)}</p>
                <p className="text-[12.5px] text-ink-500">
                  {promise(z)} ·{" "}
                  {z.all_branches
                    ? "every branch"
                    : z.branch_ids.map(branchName).join(", ")}
                  {z.min_order_minor != null &&
                    ` · minimum ${formatMoney(z.min_order_minor)}`}
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-space-1">
                  <Button variant="ghost" onClick={() => setEditing(z)}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleting(z)}>
                    Delete
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-space-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div>
          <h3 className="mb-space-1 text-[14px] font-bold text-ink-900">
            Check a pincode
          </h3>
          <p className="mb-space-2 text-[12.5px] text-ink-600">
            What a shopper there gets, and which branch would ship.
          </p>
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="e.g. 682001"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            aria-label="Pincode to check"
          />
          {result && (
            <div
              className={`mt-space-2 rounded-md border px-space-3 py-space-2 text-[13px] ${
                result.deliverable
                  ? "border-success/40 bg-success-tint"
                  : "border-error/40 bg-error-tint"
              }`}
              role="status"
            >
              {result.place && (
                <p className="font-semibold text-ink-900">
                  {result.place.district}, {result.place.state}
                </p>
              )}
              {result.deliverable && result.zone ? (
                <>
                  <p>
                    Zone <strong>{result.zone.name}</strong>:{" "}
                    {promise(result.zone)}
                  </p>
                  {result.branch && (
                    <p>
                      Ships from <strong>{result.branch.name}</strong>
                      {result.branch.distance_km != null &&
                        ` (${Math.round(result.branch.distance_km)} km)`}
                    </p>
                  )}
                  {result.also_in.length > 0 && (
                    <p className="text-ink-500">
                      Also in: {result.also_in.join(", ")}
                    </p>
                  )}
                </>
              ) : (
                <p>{result.message}</p>
              )}
            </div>
          )}
        </div>
        <div>
          <div className="mb-space-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1 text-[14px] font-bold text-ink-900">
              <MapPin size={14} /> Map
            </h3>
            <Button variant="ghost" onClick={() => setShowMap((s) => !s)}>
              {showMap ? "Hide map" : "Show map"}
            </Button>
          </div>
          {showMap &&
            (map.data ? (
              <>
                <DeliveryMap data={map.data} checked={result} />
                <p className="mt-1 text-[12px] text-ink-500">
                  {map.data.covered.toLocaleString("en-IN")} pincodes covered.
                  Branch positions come from each branch&apos;s address
                  (Settings &gt; Branches).
                </p>
              </>
            ) : (
              <SkeletonLines rows={4} />
            ))}
        </div>
      </div>

      {editing && (
        <ZoneEditor
          zone={"start" in editing ? null : editing}
          start={"start" in editing ? editing.start : undefined}
          states={list.data?.states ?? []}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name}?`}
        message="Shoppers in its places can no longer order delivery unless another zone covers them."
        confirmLabel="Delete"
        destructive
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Zone deleted", deleting.name);
              setDeleting(null);
            },
            onError: (e: Error) => toast.error("Couldn't delete it", e.message),
          })
        }
      />
    </Card>
  );
}
