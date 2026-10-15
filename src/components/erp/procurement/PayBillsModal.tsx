"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { usePayPurchaseOrder, usePurchaseOrder } from "@/hooks/useProcurement";
import { formatMoney, toMinor } from "@/lib/erp";
import {
  SUPPLIER_PAYMENT_METHOD_LABEL,
  billName,
  type SupplierBill,
  type SupplierPaymentMethod,
} from "@/lib/procurement";
import { toast } from "@/lib/toast";

/** Pay the open bills of one purchase order: how much against each bill (all it owes, to start), how and when it was paid. Mount it
 * only while open, so each time starts from what is owed now. */
export function PayBillsModal({
  poId,
  poNumber,
  bills,
  currency,
  onClose,
}: {
  poId: string;
  poNumber: string;
  bills: SupplierBill[];
  currency: string;
  onClose: () => void;
}) {
  const pay = usePayPurchaseOrder(poId);
  const open = bills.filter((b) => b.owed_minor > 0);
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      open.map((b) => [b.id, (b.owed_minor / 100).toFixed(2)]),
    ),
  );
  const [method, setMethod] = useState<SupplierPaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState("");

  const parts = open.map((b) => {
    const text = (amounts[b.id] ?? "").trim();
    const minor = text === "" ? 0 : toMinor(text);
    return { bill: b, minor };
  });
  const invalid = parts.find(
    (p) => p.minor === null || p.minor > p.bill.owed_minor,
  );
  const total = parts.reduce((sum, p) => sum + (p.minor ?? 0), 0);

  function submit() {
    if (invalid)
      return toast.error(
        `${billName(invalid.bill)}: enter up to ${formatMoney(invalid.bill.owed_minor, currency)}`,
      );
    if (total <= 0) return toast.error("Enter what you are paying");
    if (method !== "CASH" && !reference.trim())
      return toast.error("Enter the payment reference (UTR, card slip…)");
    pay.mutate(
      {
        amount_minor: total,
        method,
        reference: reference.trim() || null,
        paid_on: paidOn || null,
        allocations: parts
          .filter((p) => (p.minor ?? 0) > 0)
          .map((p) => ({ grn_id: p.bill.id, amount_minor: p.minor ?? 0 })),
      },
      {
        onSuccess: (r) => {
          toast.success(
            `Payment ${r.payment_number} recorded`,
            `${formatMoney(total, currency)} paid on ${poNumber}`,
          );
          onClose();
        },
        onError: (e) => toast.error("Couldn't record the payment", e.message),
      },
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      width="md"
      title={`Pay bills of ${poNumber}`}
      description="Each goods receipt is the supplier's bill. Change an amount to pay part of a bill, or 0 to leave it."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={pay.isPending || total <= 0} onClick={submit}>
            {pay.isPending ? "Paying…" : `Pay ${formatMoney(total, currency)}`}
          </Button>
        </>
      }
    >
      {open.length === 0 ? (
        <p className="text-[13.5px] text-ink-600">
          Nothing is owed on this order.
        </p>
      ) : (
        <>
          <ul className="mb-space-4 divide-y divide-line">
            {open.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-space-3 py-space-2"
              >
                <div className="min-w-0 text-[13.5px]">
                  <p className="font-semibold text-ink-900">{billName(b)}</p>
                  <p className="text-[12px] text-ink-400">
                    Owes {formatMoney(b.owed_minor, currency)} · due{" "}
                    {b.due_date}
                    {b.payment_state === "overdue" ? " (overdue)" : ""}
                  </p>
                </div>
                <Input
                  aria-label={`Amount for ${billName(b)}`}
                  inputMode="decimal"
                  value={amounts[b.id] ?? ""}
                  onChange={(e) =>
                    setAmounts({ ...amounts, [b.id]: e.target.value })
                  }
                  className="w-32 text-right"
                />
              </li>
            ))}
          </ul>
          <div className="grid gap-x-space-3 sm:grid-cols-3">
            <Field label="Method" htmlFor="pb_method">
              <Select
                id="pb_method"
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value as SupplierPaymentMethod)
                }
              >
                {(
                  Object.keys(
                    SUPPLIER_PAYMENT_METHOD_LABEL,
                  ) as SupplierPaymentMethod[]
                ).map((m) => (
                  <option key={m} value={m}>
                    {SUPPLIER_PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Reference"
              htmlFor="pb_ref"
              required={method !== "CASH"}
            >
              <Input
                id="pb_ref"
                maxLength={64}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
            <Field label="Paid on" htmlFor="pb_date">
              <Input
                id="pb_date"
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
              />
            </Field>
          </div>
        </>
      )}
    </Modal>
  );
}

/** Opens the payment for one order from a list: loads the order's bills first, then shows the same form. `grnId` keeps only that bill. */
export function PayPurchaseOrder({
  poId,
  grnId,
  currency,
  onClose,
}: {
  poId: string;
  grnId?: string;
  currency: string;
  onClose: () => void;
}) {
  const po = usePurchaseOrder(poId);
  if (po.error)
    return (
      <Modal open onClose={onClose} width="sm" title="Couldn't open the order">
        <p className="text-[13.5px] text-error">{po.error.message}</p>
      </Modal>
    );
  if (!po.data) return null;
  const bills = (po.data.receipts ?? []).filter(
    (b) => !grnId || b.id === grnId,
  );
  return (
    <PayBillsModal
      poId={poId}
      poNumber={po.data.po_number}
      bills={bills}
      currency={currency}
      onClose={onClose}
    />
  );
}
