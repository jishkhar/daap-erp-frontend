"use client";

import { Truck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  NEXT_SHIPMENT_STEP,
  useCreateShipment,
  useEditShipment,
  useMoveShipment,
  useOrderShipments,
  type Shipment,
  type ShipmentDetails,
  type ShipmentStatus,
} from "@/hooks/useShipments";
import { formatDateTime, formatMoney, humanize } from "@/lib/erp";
import { toast } from "@/lib/toast";

const TONE: Partial<
  Record<ShipmentStatus, "success" | "warning" | "neutral" | "info" | "error">
> = {
  ready_to_ship: "info",
  in_transit: "info",
  out_for_delivery: "info",
  delivered: "success",
  failed_attempt: "warning",
  rto_in_transit: "warning",
  rto_delivered: "neutral",
  cancelled: "neutral",
  lost: "error",
};
const STATUS_LABEL: Record<ShipmentStatus, string> = {
  ready_to_ship: "Packed, not sent",
  in_transit: "With the courier",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  failed_attempt: "Delivery failed",
  rto_in_transit: "Coming back",
  rto_delivered: "Back at the shop",
  cancelled: "Cancelled",
  lost: "Lost",
};
const SHIPPABLE = ["confirmed", "preparing", "ready"];

type Draft = Record<
  | "carrier"
  | "tracking"
  | "url"
  | "rider"
  | "phone"
  | "weight"
  | "cost"
  | "notes",
  string
>;
const draftOf = (s?: Shipment | null, weight?: number | null): Draft => ({
  carrier: s?.carrier_name ?? "",
  tracking: s?.tracking_number ?? "",
  url: s?.tracking_url ?? "",
  rider: s?.rider_name ?? "",
  phone: s?.rider_phone ?? "",
  weight: (s?.weight_g ?? weight)?.toString() ?? "",
  cost: s?.cost_minor != null ? String(s.cost_minor / 100) : "",
  notes: s?.notes ?? "",
});
const bodyOf = (d: Draft): ShipmentDetails => ({
  carrier_name: d.carrier.trim() || null,
  tracking_number: d.tracking.trim() || null,
  tracking_url: d.url.trim() || null,
  rider_name: d.rider.trim() || null,
  rider_phone: d.phone.trim() || null,
  weight_g: d.weight.trim() ? Math.round(Number(d.weight)) : null,
  cost_minor: d.cost.trim() ? Math.round(Number(d.cost) * 100) : null,
  notes: d.notes.trim() || null,
});

/** The order's shipment: pack it, say who carries it (own rider or a courier with a tracking number), and move it along; the order's
 * status follows (shipped, out for delivery, delivered = completed; back at the shop = cancelled, stock released). */
export function ShipmentPanel({
  order,
  canUpdate,
  currency,
}: {
  order: { id: string; status: string; order_type: string };
  canUpdate: boolean;
  currency: string;
}) {
  const delivers =
    order.order_type === "shipping" || order.order_type === "delivery";
  const list = useOrderShipments(order.id, delivers);
  const create = useCreateShipment(order.id);
  const edit = useEditShipment(order.id);
  const move = useMoveShipment(order.id);
  const [form, setForm] = useState<{
    shipment: Shipment | null;
    draft: Draft;
  } | null>(null);
  const [step, setStep] = useState<{
    shipment: Shipment;
    to: ShipmentStatus;
    label: string;
  } | null>(null);
  const [note, setNote] = useState("");
  if (!delivers) return null;

  const shipments = list.data?.items ?? [];
  const live =
    shipments.find(
      (s) => s.status !== "cancelled" && s.status !== "rto_delivered",
    ) ?? null;
  const past = shipments.filter((s) => s !== live);
  const canShip = canUpdate && !live && SHIPPABLE.includes(order.status);

  const save = () => {
    if (!form) return;
    const body = bodyOf(form.draft);
    const opts = {
      onSuccess: () => {
        toast.success(form.shipment ? "Shipment saved" : "Shipment created");
        setForm(null);
      },
      onError: (e: Error) =>
        toast.error("Couldn't save the shipment", e.message),
    };
    if (form.shipment) edit.mutate({ id: form.shipment.id, ...body }, opts);
    else create.mutate(body, opts);
  };

  const field = (
    key: keyof Draft,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <Field label={label} htmlFor={`sh-${key}`}>
      <Input
        id={`sh-${key}`}
        value={form?.draft[key] ?? ""}
        onChange={(e) =>
          form &&
          setForm({ ...form, draft: { ...form.draft, [key]: e.target.value } })
        }
        {...props}
      />
    </Field>
  );

  return (
    <Card className="min-w-0 p-space-3 md:p-space-4">
      <div className="mb-space-2 flex items-center justify-between gap-space-2">
        <h2 className="flex items-center gap-1 text-[15px] font-bold text-ink-900">
          <Truck size={16} /> Shipment
        </h2>
        {canShip && (
          <Button
            variant="secondary"
            onClick={() =>
              setForm({
                shipment: null,
                draft: draftOf(null, list.data?.packed.weight_g),
              })
            }
          >
            Pack and ship
          </Button>
        )}
      </div>
      {!list.data && <p className="text-[13px] text-ink-400">Loading…</p>}
      {list.data && !live && (
        <p className="text-[13px] text-ink-400">
          {SHIPPABLE.includes(order.status)
            ? "Not shipped yet."
            : order.status === "pending"
              ? "Ship it once it is paid (or confirmed as cash on delivery)."
              : "No shipment."}
        </p>
      )}
      {live && (
        <div className="space-y-space-2 text-[13.5px]">
          <div className="flex flex-wrap items-center gap-space-2">
            <Badge tone={TONE[live.status] ?? "neutral"}>
              {STATUS_LABEL[live.status]}
            </Badge>
            {live.carrier_name && (
              <span className="text-ink-700">{live.carrier_name}</span>
            )}
            {live.tracking_number &&
              (live.tracking_url ? (
                <a
                  href={live.tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-700 hover:underline"
                >
                  {live.tracking_number}
                </a>
              ) : (
                <span className="font-semibold">{live.tracking_number}</span>
              ))}
          </div>
          <p className="text-ink-600">
            {[
              live.rider_name &&
                `Rider ${live.rider_name}${live.rider_phone ? ` (${live.rider_phone})` : ""}`,
              live.weight_g && `${live.weight_g} g`,
              live.cod_amount_minor > 0 &&
                `collect ${formatMoney(live.cod_amount_minor, currency)}`,
              live.cost_minor != null &&
                `costs us ${formatMoney(live.cost_minor, currency)}`,
            ]
              .filter(Boolean)
              .join(" · ") || "No rider or courier yet."}
          </p>
          <ol className="space-y-0.5 border-l border-line pl-space-3 text-[12.5px] text-ink-600">
            {live.events.map((e, i) => (
              <li key={i}>
                <span className="font-medium text-ink-800">
                  {STATUS_LABEL[e.status]}
                </span>{" "}
                · {formatDateTime(e.at)}
                {e.location && ` · ${e.location}`}
                {e.note && ` — ${e.note}`}
              </li>
            ))}
          </ol>
          {canUpdate && (
            <div className="mobile-page-actions flex flex-wrap gap-space-2 pt-space-1">
              {(NEXT_SHIPMENT_STEP[live.status] ?? []).map((s) => (
                <Button
                  key={s.to}
                  variant={s.to === "delivered" ? "primary" : "secondary"}
                  disabled={move.isPending}
                  onClick={() => {
                    setNote("");
                    setStep({ shipment: live, ...s });
                  }}
                >
                  {s.label}
                </Button>
              ))}
              {!["delivered", "lost"].includes(live.status) && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setForm({ shipment: live, draft: draftOf(live) })
                  }
                >
                  Edit details
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      {past.length > 0 && (
        <p className="mt-space-2 text-[12px] text-ink-400">
          Earlier:{" "}
          {past
            .map(
              (s) =>
                `${STATUS_LABEL[s.status]}${s.tracking_number ? ` (${s.tracking_number})` : ""}`,
            )
            .join(", ")}
        </p>
      )}

      {form && (
        <Modal
          open
          title={form.shipment ? "Shipment details" : "Pack and ship"}
          description="Who carries it and how the customer can track it. The customer sees the carrier, tracking number and rider's name."
          onClose={() => setForm(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={create.isPending || edit.isPending}
              >
                {form.shipment ? "Save" : "Create shipment"}
              </Button>
            </>
          }
        >
          <div className="grid gap-x-space-3 sm:grid-cols-2">
            {field("carrier", "Carried by", {
              placeholder: "Own rider, DTDC, India Post…",
            })}
            {field("tracking", "Tracking number")}
            <div className="sm:col-span-2">
              {field("url", "Tracking link", {
                placeholder: "https://…",
                inputMode: "url",
              })}
            </div>
            {field("rider", "Rider's name")}
            {field("phone", "Rider's phone", { inputMode: "tel" })}
            {field("weight", "Weight (grams)", { inputMode: "numeric" })}
            {field("cost", `What it costs us (${currency})`, {
              inputMode: "decimal",
            })}
            <div className="sm:col-span-2">{field("notes", "Notes")}</div>
          </div>
        </Modal>
      )}
      {step && (
        <Modal
          open
          title={step.label}
          description={
            step.to === "delivered"
              ? "The order becomes delivered: its stock leaves the books and the sale and invoice are recorded."
              : step.to === "rto_delivered"
                ? "The parcel is back undelivered: the order is cancelled and its stock is free again. A prepaid order's refund becomes due."
                : `The shipment becomes “${humanize(step.to)}”.`
          }
          onClose={() => setStep(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setStep(null)}>
                Back
              </Button>
              <Button
                disabled={move.isPending}
                onClick={() =>
                  move.mutate(
                    { id: step.shipment.id, status: step.to, note },
                    {
                      onSuccess: () => {
                        toast.success(step.label);
                        setStep(null);
                      },
                      onError: (e: Error) =>
                        toast.error("Couldn't update the shipment", e.message),
                    },
                  )
                }
              >
                Confirm
              </Button>
            </>
          }
        >
          <Field
            label="Note (optional)"
            htmlFor="sh-note"
            hint="E.g. who received it, or why delivery failed."
          >
            <Input
              id="sh-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </Modal>
      )}
    </Card>
  );
}
