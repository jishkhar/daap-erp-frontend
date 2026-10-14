"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useDispatch, type DispatchResult } from "@/hooks/useWholesale";
import { formatMoney, toMinor } from "@/lib/erp";
import { toast } from "@/lib/toast";
import type { SalesOrder } from "@/lib/wholesale";

type Pay = { key: string; method: string; amount: string; reference: string };

/** Send goods on a confirmed order. Each dispatch becomes one tax invoice. Quantities default to what is still to go. A credit customer
 * can pay part or nothing now; a customer without credit pays the invoice in full. */
export function DispatchModal({
  so,
  open,
  onClose,
  onDone,
}: {
  so: SalesOrder;
  open: boolean;
  onClose: () => void;
  onDone: (r: DispatchResult) => void;
}) {
  const left = (i: SalesOrder["items"][number]) =>
    i.quantity - i.dispatched_quantity;
  const [qty, setQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(so.items.map((i) => [i.id, String(left(i))])),
  );
  const [pays, setPays] = useState<Pay[]>([]);
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const dispatch = useDispatch(so.id);
  const noCredit = so.account.credit_limit_minor === null;
  const cur = so.currency;

  const bad = so.items.some((i) => {
    const n = Number(qty[i.id] ?? 0);
    return !Number.isInteger(n) || n < 0 || n > left(i);
  });
  const lines = so.items
    .map((i) => ({ item_id: i.id, quantity: Number(qty[i.id] ?? 0) }))
    .filter((l) => l.quantity > 0);
  // a rough figure for the person: the order's own line totals, pro rata (the server works out the exact invoice)
  const estimate = so.items.reduce(
    (sum, i) =>
      sum +
      Math.round((i.line_total_minor * Number(qty[i.id] ?? 0)) / i.quantity),
    0,
  );
  const payBad = pays.some(
    (p) =>
      toMinor(p.amount) === null ||
      (p.method !== "cash" && !p.reference.trim()),
  );
  const paid = pays.reduce((s, p) => s + (toMinor(p.amount) ?? 0), 0);

  function submit() {
    dispatch.mutate(
      {
        lines,
        payments: pays.map((p) => ({
          method: p.method,
          amount_minor: toMinor(p.amount) ?? 0,
          reference: p.reference.trim() || null,
        })),
        vehicle_number: vehicle.trim() || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: (r) => {
          toast.success(
            `Dispatched: invoice ${r.invoice_number ?? r.order_number}`,
          );
          onDone(r);
        },
        onError: (e) => toast.error("Couldn't dispatch", e.message),
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="lg"
      title={`Dispatch on ${so.so_number}`}
      description="The goods leave the branch and a tax invoice is issued for them."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={bad || payBad || lines.length === 0 || dispatch.isPending}
            onClick={submit}
          >
            {dispatch.isPending ? "Dispatching…" : "Dispatch and invoice"}
          </Button>
        </>
      }
    >
      <table className="w-full text-[13.5px]">
        <thead>
          <tr className="text-left text-label">
            <th className="py-space-2 pr-space-2">Product</th>
            <th className="w-28 pr-space-2 text-right">Still to go</th>
            <th className="w-28">Dispatch now</th>
          </tr>
        </thead>
        <tbody>
          {so.items.map((i) => {
            const n = Number(qty[i.id] ?? 0);
            const wrong = !Number.isInteger(n) || n < 0 || n > left(i);
            return (
              <tr key={i.id} className="border-t border-line">
                <td className="py-space-2 pr-space-2">
                  <p className="font-medium text-ink-900">{i.name}</p>
                  <p className="text-[12px] text-ink-400">
                    {i.sku} · {i.reserved_quantity} held on the shelf
                  </p>
                </td>
                <td className="pr-space-2 text-right">{left(i)}</td>
                <td className="py-space-1">
                  <Input
                    aria-label={`Dispatch quantity of ${i.sku}`}
                    inputMode="numeric"
                    disabled={left(i) === 0}
                    invalid={wrong}
                    value={qty[i.id] ?? "0"}
                    onChange={(e) => setQty({ ...qty, [i.id]: e.target.value })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-space-2 text-right text-[13.5px] text-ink-600">
        About{" "}
        <span className="font-semibold text-ink-900">
          {formatMoney(estimate, cur)}
        </span>{" "}
        incl. GST
      </p>

      <div className="mt-space-3 rounded-lg border border-line p-space-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-ink-900">
              Payment now
            </p>
            <p className="text-[12.5px] text-ink-600">
              {noCredit
                ? "This customer has no credit: take the full invoice amount."
                : `Optional. Anything not paid is due in ${so.credit_days} days.`}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() =>
              setPays([
                ...pays,
                {
                  key: crypto.randomUUID(),
                  method: "cash",
                  amount: "",
                  reference: "",
                },
              ])
            }
          >
            <Plus size={15} /> Add payment
          </Button>
        </div>
        {pays.map((p) => {
          const set = (patch: Partial<Pay>) =>
            setPays(
              pays.map((x) => (x.key === p.key ? { ...x, ...patch } : x)),
            );
          return (
            <div
              key={p.key}
              className="mt-space-2 grid grid-cols-[130px_1fr_1fr_36px] gap-space-2"
            >
              <Select
                aria-label="Method"
                value={p.method}
                onChange={(e) => set({ method: e.target.value })}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="netbanking">Bank transfer</option>
              </Select>
              <Input
                aria-label="Amount"
                inputMode="decimal"
                placeholder="Amount (₹)"
                invalid={toMinor(p.amount) === null}
                value={p.amount}
                onChange={(e) => set({ amount: e.target.value })}
              />
              <Input
                aria-label="Reference"
                placeholder={
                  p.method === "cash"
                    ? "Reference (optional)"
                    : "UTR / approval code"
                }
                invalid={p.method !== "cash" && !p.reference.trim()}
                value={p.reference}
                onChange={(e) => set({ reference: e.target.value })}
              />
              <button
                type="button"
                aria-label="Remove payment"
                className="text-ink-400 hover:text-error"
                onClick={() => setPays(pays.filter((x) => x.key !== p.key))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
        {pays.length > 0 && (
          <p className="mt-space-2 text-[12.5px] text-ink-600">
            Paying {formatMoney(paid, cur)} now.
          </p>
        )}
      </div>
      <div className="mt-space-3 grid gap-x-space-4 sm:grid-cols-2">
        <Field
          label="Vehicle number"
          htmlFor="d_vehicle"
          hint="Printed on the invoice notes."
        >
          <Input
            id="d_vehicle"
            maxLength={20}
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Notes" htmlFor="d_notes">
          <Input
            id="d_notes"
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
