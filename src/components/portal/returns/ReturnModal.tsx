"use client";

import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { useProductSearch, type ProductWithTax } from "@/hooks/useProducts";
import {
  useCreateReturn,
  useReturnable,
  useReturnQuote,
  type ReturnLine,
} from "@/hooks/useReturns";
import { cn } from "@/lib/cn";
import { formatMoney, type OrderDetail } from "@/lib/erp";
import {
  REASON_LABEL,
  REASONS,
  REFUND_LABEL,
  type RefundMode,
  type ReturnKind,
  type ReturnReason,
} from "@/lib/returns";
import { useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { useDebounced } from "@/lib/useDebounced";

type Picked = { product: ProductWithTax; quantity: number };
const NOTE_MAX = 500;

/** Take a return or an exchange on a delivered order: what comes back, why, and how the money goes back (or what replaces it). */
export function ReturnModal({
  order,
  onClose,
}: {
  order: OrderDetail;
  onClose: () => void;
}) {
  const session = useStaffSession();
  const returnable = useReturnable(order.id);
  const create = useCreateReturn(order.id);
  const cur = order.currency;
  const r = returnable.data;

  const [kind, setKind] = useState<ReturnKind>("return");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [writeOff, setWriteOff] = useState<Record<string, boolean>>({});
  const [serials, setSerials] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<ReturnReason>("defective");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<RefundMode>(
    order.channel === "pos" ? "cash" : "original",
  );
  const [branchId, setBranchId] = useState(
    order.fulfilment_branch_id ?? order.branch_id,
  );
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "upi">("cash");
  const [payRef, setPayRef] = useState("");

  const lines: ReturnLine[] = useMemo(
    () =>
      Object.entries(qty)
        .filter(([, n]) => n > 0)
        .map(([order_item_id, quantity]) => ({
          order_item_id,
          quantity,
          disposition: writeOff[order_item_id] ? "WRITE_OFF" : "RESTOCK",
          serial_numbers: (serials[order_item_id] ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        })),
    [qty, writeOff, serials],
  );
  const replacement = useMemo(
    () =>
      kind === "exchange"
        ? picked.map((p) => ({
            variant_id: p.product.id,
            quantity: p.quantity,
          }))
        : [],
    [kind, picked],
  );
  const quote = useReturnQuote(order.id, lines, replacement);
  const q = useDebounced(search.trim());
  const products = useProductSearch(
    { q, lifecycle_status: "active", limit: 6 },
    kind === "exchange" && q.length > 1,
  );

  const needsCustomer =
    !order.customer_id && (kind === "exchange" || mode === "store_credit");
  const due = kind === "exchange" ? (quote.data?.due_minor ?? 0) : 0;
  const isPos = order.channel === "pos";
  const ready =
    lines.length > 0 &&
    (reason !== "other" || note.trim().length > 0) &&
    (!needsCustomer || phone.trim().length >= 10) &&
    (kind === "return" || picked.length > 0) &&
    (!isPos || due === 0 || payMethod === "cash" || payRef.trim().length > 0) &&
    !quote.isFetching;

  const submit = () =>
    create.mutate(
      {
        kind,
        items: lines,
        reason_code: reason,
        reason_note: note.trim() || null,
        refund_mode: mode,
        branch_id: branchId,
        customer: needsCustomer
          ? { name: name.trim() || null, phone: phone.trim() }
          : null,
        exchange:
          kind === "exchange"
            ? {
                items: replacement,
                payments:
                  isPos && due > 0
                    ? [
                        {
                          method: payMethod,
                          amount_minor: due,
                          reference: payRef.trim() || null,
                        },
                      ]
                    : [],
              }
            : null,
      },
      {
        onSuccess: (ret) => {
          toast.success(
            `${ret.return_number} done`,
            ret.kind === "exchange"
              ? `Replacement order ${ret.exchange_order_number}.`
              : ret.refund_minor > 0
                ? `${formatMoney(ret.refund_minor, cur)} refunded.`
                : "Stock and credit note updated.",
          );
          onClose();
        },
        onError: (e: Error) =>
          toast.error("Couldn't take the return", e.message),
      },
    );

  const modes = r?.refund_modes ?? [];

  return (
    <Modal
      open
      width="lg"
      onClose={onClose}
      title="Return or exchange"
      description={
        r?.window.closes_on
          ? `Returns on this order are accepted until ${new Date(r.window.closes_on).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={!ready || create.isPending || !r?.window.open}
            onClick={submit}
          >
            {create.isPending
              ? "Saving…"
              : kind === "exchange"
                ? "Complete exchange"
                : "Complete return"}
          </Button>
        </>
      }
    >
      {!r ? (
        returnable.error ? (
          <p className="text-[13px] font-medium text-error">
            {returnable.error.message}
          </p>
        ) : (
          <SkeletonLines rows={4} />
        )
      ) : !r.window.open ? (
        <p className="rounded-md bg-warning-tint p-space-3 text-[13.5px] text-warning">
          {r.window.days <= 0
            ? "Returns are switched off for these orders (Settings → Shipping and delivery)."
            : r.window.closes_on
              ? `The return window closed on ${new Date(r.window.closes_on).toLocaleDateString("en-IN")}.`
              : "Only a delivered order can be returned."}
        </p>
      ) : (
        <div className="space-y-space-4">
          {r.policy.exchanges_enabled && (
            <div className="inline-flex rounded-md border border-line p-0.5">
              {(["return", "exchange"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setKind(k);
                    if (k === "exchange") setMode(isPos ? "cash" : "original");
                  }}
                  className={cn(
                    "rounded px-space-3 py-1.5 text-[13px] font-semibold",
                    kind === k ? "bg-brand-600 text-white" : "text-ink-600",
                  )}
                >
                  {k === "return" ? "Return" : "Exchange"}
                </button>
              ))}
            </div>
          )}

          <div>
            <p className="mb-space-2 text-[13px] font-bold text-ink-900">
              What is coming back?
            </p>
            <ul className="divide-y divide-line rounded-md border border-line">
              {r.lines.map((l) => {
                const n = qty[l.order_item_id] ?? 0;
                const set = (v: number) =>
                  setQty({
                    ...qty,
                    [l.order_item_id]: Math.max(
                      0,
                      Math.min(l.returnable_quantity, v),
                    ),
                  });
                return (
                  <li key={l.order_item_id} className="p-space-3">
                    <div className="flex items-center justify-between gap-space-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-900">
                          {l.name}
                        </p>
                        <p className="text-[12px] text-ink-600">
                          {l.sku} · bought {l.quantity}
                          {l.returned_quantity > 0 &&
                            ` · ${l.returned_quantity} returned`}
                          {l.held_quantity > 0 &&
                            ` · ${l.held_quantity} in a request`}{" "}
                          · {formatMoney(l.unit_refund_minor, cur)} each
                        </p>
                      </div>
                      {l.returnable_quantity === 0 ? (
                        <span className="text-[12px] text-ink-400">
                          Nothing left to return
                        </span>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            aria-label="Fewer"
                            onClick={() => set(n - 1)}
                            disabled={n === 0}
                          >
                            <Minus size={14} />
                          </Button>
                          <span className="w-8 text-center font-semibold tabular-nums">
                            {n}
                          </span>
                          <Button
                            variant="ghost"
                            aria-label="More"
                            onClick={() => set(n + 1)}
                            disabled={n >= l.returnable_quantity}
                          >
                            <Plus size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                    {n > 0 && (
                      <div className="mt-space-2 flex flex-wrap items-center gap-space-3 text-[12.5px]">
                        <label className="inline-flex items-center gap-1.5 text-ink-600">
                          <input
                            type="checkbox"
                            checked={Boolean(writeOff[l.order_item_id])}
                            onChange={(e) =>
                              setWriteOff({
                                ...writeOff,
                                [l.order_item_id]: e.target.checked,
                              })
                            }
                          />
                          Can&apos;t be sold again (write off)
                        </label>
                        {l.serialization_type !== "NONE" && (
                          <Input
                            aria-label={`Serial numbers coming back for ${l.name}`}
                            placeholder={`${n} serial / IMEI, comma separated`}
                            value={serials[l.order_item_id] ?? ""}
                            onChange={(e) =>
                              setSerials({
                                ...serials,
                                [l.order_item_id]: e.target.value,
                              })
                            }
                            className="max-w-xs"
                          />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid gap-space-3 sm:grid-cols-2">
            <Field label="Reason" htmlFor="ret_reason" required>
              <Select
                id="ret_reason"
                value={reason}
                onValueChange={(value) => setReason(value as ReturnReason)}
              >
                {REASONS.map((x) => (
                  <option key={x} value={x}>
                    {REASON_LABEL[x]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Goods received at" htmlFor="ret_branch">
              <Select
                id="ret_branch"
                value={branchId}
                onValueChange={(value) => setBranchId(value)}
              >
                {(session?.branches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Note"
            htmlFor="ret_note"
            required={reason === "other"}
            hint={`${note.length} / ${NOTE_MAX} characters`}
          >
            <Textarea
              id="ret_note"
              rows={2}
              maxLength={NOTE_MAX}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's wrong with it? (optional unless the reason is Other)"
            />
          </Field>

          {kind === "exchange" && (
            <div>
              <p className="mb-space-2 text-[13px] font-bold text-ink-900">
                Replacement
              </p>
              <label className="flex h-10 items-center gap-space-2 rounded-md border border-line px-space-3 text-ink-400 focus-within:border-brand-400">
                <Search size={15} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search a product by name, SKU or barcode…"
                  className="w-full bg-transparent text-[13.5px] text-ink-900 outline-none"
                />
              </label>
              {q.length > 1 && (products.data ?? []).length > 0 && (
                <ul className="mt-1 divide-y divide-line rounded-md border border-line">
                  {(products.data ?? []).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="flex w-full justify-between px-space-3 py-2 text-left text-[13px] hover:bg-brand-50"
                        onClick={() => {
                          const at = picked.findIndex(
                            (x) => x.product.id === p.id,
                          );
                          setPicked(
                            at >= 0
                              ? picked.map((x, i) =>
                                  i === at
                                    ? { ...x, quantity: x.quantity + 1 }
                                    : x,
                                )
                              : [...picked, { product: p, quantity: 1 }],
                          );
                          setSearch("");
                        }}
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="text-ink-600">
                          {formatMoney(p.price_minor, cur)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {picked.length > 0 && (
                <ul className="mt-space-2 space-y-1">
                  {picked.map((x, i) => (
                    <li
                      key={x.product.id}
                      className="flex items-center justify-between gap-space-2 text-[13px]"
                    >
                      <span className="min-w-0 truncate">{x.product.name}</span>
                      <span className="flex items-center gap-1">
                        <Input
                          aria-label={`Quantity of ${x.product.name}`}
                          type="number"
                          min={1}
                          value={x.quantity}
                          onChange={(e) =>
                            setPicked(
                              picked.map((y, j) =>
                                j === i
                                  ? {
                                      ...y,
                                      quantity: Math.max(
                                        1,
                                        Number(e.target.value) || 1,
                                      ),
                                    }
                                  : y,
                              ),
                            )
                          }
                          className="w-16"
                        />
                        <Button
                          variant="ghost"
                          aria-label="Remove"
                          onClick={() =>
                            setPicked(picked.filter((_, j) => j !== i))
                          }
                        >
                          <Trash2 size={14} />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="grid gap-space-3 sm:grid-cols-2">
            <Field
              label={
                kind === "exchange"
                  ? "If the replacement costs less, refund the rest as"
                  : "Refund"
              }
              htmlFor="ret_mode"
            >
              <Select
                id="ret_mode"
                value={mode}
                onValueChange={(value) => setMode(value as RefundMode)}
              >
                {modes.map((m) => (
                  <option key={m} value={m}>
                    {REFUND_LABEL[m]}
                  </option>
                ))}
              </Select>
            </Field>
            {kind === "exchange" && isPos && due > 0 && (
              <Field
                label={`Collect ${formatMoney(due, cur)} by`}
                htmlFor="ret_pay"
              >
                <div className="flex gap-space-2">
                  <Select
                    id="ret_pay"
                    value={payMethod}
                    onValueChange={(value) =>
                      setPayMethod(value as "cash" | "card" | "upi")
                    }
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                  </Select>
                  {payMethod !== "cash" && (
                    <Input
                      aria-label="Card machine reference"
                      placeholder="Reference"
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                    />
                  )}
                </div>
              </Field>
            )}
          </div>
          {needsCustomer && (
            <div className="grid gap-space-3 sm:grid-cols-2">
              <Field
                label="Customer phone"
                htmlFor="ret_phone"
                required
                hint="Store credit and exchanges need a customer."
              >
                <Input
                  id="ret_phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Field label="Customer name" htmlFor="ret_name">
                <Input
                  id="ret_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            </div>
          )}

          {lines.length > 0 && quote.data && (
            <div className="rounded-md bg-black/[0.03] p-space-3 text-[13.5px]">
              <div className="flex justify-between">
                <span className="text-ink-600">Returned items</span>
                <span className="font-semibold">
                  {formatMoney(quote.data.items_value_minor, cur)}
                </span>
              </div>
              {quote.data.refundable_minor < quote.data.items_value_minor && (
                <p className="mt-1 text-[12px] text-warning">
                  Only {formatMoney(quote.data.refundable_minor, cur)} was paid
                  on this order, so no more than that can go back.
                </p>
              )}
              {kind === "exchange" && (
                <div className="flex justify-between">
                  <span className="text-ink-600">Replacement</span>
                  <span className="font-semibold">
                    {formatMoney(quote.data.replacement_total_minor, cur)}
                  </span>
                </div>
              )}
              {kind === "exchange" && due > 0 && (
                <div className="flex justify-between text-brand-700">
                  <span>
                    {isPos ? "Customer pays" : "Collected on delivery"}
                  </span>
                  <span className="font-bold">{formatMoney(due, cur)}</span>
                </div>
              )}
              {quote.data.refund_minor > 0 && (
                <div className="flex justify-between text-success">
                  <span>
                    {mode === "none"
                      ? "Owed to the customer (refund later)"
                      : `Refund (${REFUND_LABEL[mode]})`}
                  </span>
                  <span className="font-bold">
                    {formatMoney(quote.data.refund_minor, cur)}
                  </span>
                </div>
              )}
              <p className="mt-1 text-[12px] text-ink-400">
                A credit note is issued and the stock goes back to the branch
                above.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
