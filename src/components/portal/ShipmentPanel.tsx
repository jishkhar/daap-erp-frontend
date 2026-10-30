"use client";

import { ExternalLink, Truck } from "lucide-react";
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
import { PhoneInput } from "@/components/ui/PhoneInput";
import { formatPhone, phoneError, toE164 } from "@/lib/phone";

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
  rider_phone: toE164(d.phone),
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
  const [link, setLink] = useState("");
  const [shipping, setShipping] = useState(false);
  if (!delivers) return null;

  const shipments = list.data?.items ?? [];
  const live =
    shipments.find(
      (s) => s.status !== "cancelled" && s.status !== "rto_delivered",
    ) ?? null;
  const past = shipments.filter((s) => s !== live);
  const canShip = canUpdate && !live && SHIPPABLE.includes(order.status);

  const packedOnly = live?.status === "ready_to_ship" ? live : null;
  const showMarkShipped = canUpdate && (canShip || !!packedOnly);

  /** One step for a DTDC parcel: pack it if it isn't packed yet, save the tracking link, and hand it to the courier. */
  const markShipped = async () => {
    const url = link.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      toast.error(
        "Enter the DTDC tracking link",
        "It should start with http:// or https://",
      );
      return;
    }
    setShipping(true);
    try {
      let shipment = packedOnly;
      if (shipment) {
        if (shipment.tracking_url !== url)
          await edit.mutateAsync({ id: shipment.id, tracking_url: url });
      } else {
        shipment = await create.mutateAsync({
          carrier_name: "DTDC",
          tracking_url: url,
          weight_g: list.data?.packed.weight_g ?? null,
        });
      }
      await move.mutateAsync({ id: shipment.id, status: "in_transit" });
      toast.success("Marked as shipped");
      setLink("");
    } catch (e) {
      toast.error("Couldn't mark it as shipped", (e as Error).message);
    } finally {
      setShipping(false);
    }
  };

  const save = () => {
    if (!form) return;
    const bad = phoneError(form.draft.phone);
    if (bad) return toast.error("Check the rider's phone", bad);
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
      <div className="mb-space-3 flex items-center justify-between gap-space-2">
        <h2 className="flex items-center gap-1 text-[15px] font-bold text-ink-900">
          <Truck size={16} /> Shipment
        </h2>
      </div>
      {list.data && showMarkShipped && (
        <div className="mb-space-3 rounded-lg border border-line bg-ink-50 p-space-3">
          <label
            htmlFor="sh-dtdc-link"
            className="mb-1 block text-[13px] font-semibold text-ink-800"
          >
            DTDC tracking link
          </label>
          <Input
            id="sh-dtdc-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.dtdc.in/tracking/…"
            inputMode="url"
          />
          <p className="mt-1 text-[12px] text-ink-400">
            The customer can follow their parcel with this link.
          </p>
          <Button
            className="mt-space-3 w-full"
            onClick={markShipped}
            disabled={shipping || !link.trim()}
          >
            <Truck size={16} /> Mark as Shipped
          </Button>
          {canShip && (
            <button
              type="button"
              className="mt-space-2 w-full text-center text-[12.5px] font-medium text-ink-600 hover:text-ink-900 hover:underline"
              onClick={() =>
                setForm({
                  shipment: null,
                  draft: draftOf(null, list.data?.packed.weight_g),
                })
              }
            >
              Own rider or other courier? Pack with full details
            </button>
          )}
        </div>
      )}
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
        <div className="space-y-space-3 text-[13.5px]">
          <div className="flex flex-wrap items-center justify-between gap-space-2">
            <div className="flex flex-wrap items-center gap-space-2">
              <Badge tone={TONE[live.status] ?? "neutral"}>
                {STATUS_LABEL[live.status]}
              </Badge>
              {live.carrier_name && (
                <span className="font-semibold text-ink-800">
                  {live.carrier_name}
                </span>
              )}
            </div>
            {live.tracking_url && (
              <a
                href={live.tracking_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
              >
                Track parcel <ExternalLink size={13} />
              </a>
            )}
          </div>
          {live.tracking_number && (
            <p className="text-ink-600">
              Tracking no.{" "}
              <span className="font-semibold text-ink-900">
                {live.tracking_number}
              </span>
            </p>
          )}
          {(() => {
            const facts = [
              live.rider_name &&
                `Rider ${live.rider_name}${live.rider_phone ? ` (${formatPhone(live.rider_phone)})` : ""}`,
              live.weight_g && `${live.weight_g} g`,
              live.cost_minor != null &&
                `costs us ${formatMoney(live.cost_minor, currency)}`,
            ].filter(Boolean);
            return (
              (facts.length > 0 || live.cod_amount_minor > 0) && (
                <div className="flex flex-wrap gap-space-2">
                  {live.cod_amount_minor > 0 && (
                    <span className="rounded-md bg-warning-tint px-2 py-1 text-[12.5px] font-semibold text-ink-800">
                      Collect {formatMoney(live.cod_amount_minor, currency)} on
                      delivery
                    </span>
                  )}
                  {facts.map((f) => (
                    <span
                      key={String(f)}
                      className="rounded-md bg-ink-50 px-2 py-1 text-[12.5px] text-ink-700"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )
            );
          })()}
          <ol className="space-y-space-2 pt-space-1">
            {live.events.map((e, i) => (
              <li
                key={i}
                className="relative pl-space-4 text-[12.5px] text-ink-600"
              >
                <span
                  className={`absolute left-0 top-[5px] h-2 w-2 rounded-full ${
                    i === live.events.length - 1 ? "bg-brand-600" : "bg-ink-300"
                  }`}
                />
                <span className="font-semibold text-ink-800">
                  {STATUS_LABEL[e.status]}
                </span>
                <span className="block text-ink-500">
                  {formatDateTime(e.at)}
                  {e.location && ` · ${e.location}`}
                  {e.note && ` — ${e.note}`}
                </span>
              </li>
            ))}
          </ol>
          {canUpdate && (
            <div className="space-y-space-2 border-t border-line pt-space-3">
              {(() => {
                const steps = NEXT_SHIPMENT_STEP[live.status] ?? [];
                const main =
                  steps.find((s) => s.to === "delivered") ??
                  steps.find((s) => s.to === "in_transit") ??
                  steps[0];
                const danger = ["cancelled", "lost"];
                const run = (s: (typeof steps)[number]) => {
                  setNote("");
                  setStep({ shipment: live, ...s });
                };
                return (
                  <>
                    {main && (
                      <Button
                        className="w-full"
                        disabled={move.isPending || shipping}
                        onClick={() => run(main)}
                      >
                        {main.label}
                      </Button>
                    )}
                    <div className="flex flex-wrap gap-space-2">
                      {steps
                        .filter((s) => s !== main)
                        .map((s) => (
                          <Button
                            key={s.to}
                            variant={
                              danger.includes(s.to)
                                ? "destructive"
                                : "secondary"
                            }
                            className="h-9 flex-1 whitespace-nowrap px-space-3 text-[13px]"
                            disabled={move.isPending || shipping}
                            onClick={() => run(s)}
                          >
                            {s.label}
                          </Button>
                        ))}
                    </div>
                    {!["delivered", "lost"].includes(live.status) && (
                      <button
                        type="button"
                        className="w-full text-center text-[12.5px] font-medium text-ink-600 hover:text-ink-900 hover:underline"
                        onClick={() =>
                          setForm({ shipment: live, draft: draftOf(live) })
                        }
                      >
                        Edit details
                      </button>
                    )}
                  </>
                );
              })()}
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
            <Field label="Rider's phone" htmlFor="sh-phone">
              <PhoneInput
                id="sh-phone"
                value={form?.draft.phone ?? ""}
                onChange={(phone) =>
                  form && setForm({ ...form, draft: { ...form.draft, phone } })
                }
              />
            </Field>
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
