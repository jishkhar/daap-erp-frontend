"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  erp,
  formatDateTime,
  formatMoney,
  toMinor,
  useErpQuery,
  type Supplier,
} from "@/lib/erp";
import { hasGrant, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

type Statement = {
  supplier: Supplier;
  balance: {
    billed: number;
    returned: number;
    paid: number;
    outstanding_minor: number;
  };
  entries: {
    kind: "GRN" | "RETURN" | "PAYMENT";
    number: string;
    at: string;
    amount_minor: number;
  }[];
};

/** One supplier's account: what we bought, returned and paid, the balance, and a way to pay. */
export function SupplierPanel({
  supplierId,
  currency,
  onClose,
}: {
  supplierId: string | null;
  currency: string;
  onClose: () => void;
}) {
  const session = useStaffSession();
  const statement = useErpQuery<Statement>(
    supplierId ? `/api/v1/suppliers/${supplierId}/statement` : null,
  );
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const canPay = hasGrant(session, "procurement:pay");
  const d = statement.data;

  async function pay() {
    const minor = toMinor(amount);
    if (minor === null || minor === 0)
      return toast.error("Enter a valid amount");
    setBusy(true);
    const res = await erp(
      `/api/v1/suppliers/${supplierId}/payments`,
      "POST",
      { amount_minor: minor, method, reference: reference.trim() || null },
      { "Idempotency-Key": crypto.randomUUID() },
    );
    setBusy(false);
    if (res.error) return toast.error("Couldn't record the payment", res.error);
    toast.success("Payment recorded");
    setAmount("");
    setReference("");
    statement.reload();
  }

  return (
    <Modal
      open={supplierId !== null}
      onClose={onClose}
      width="lg"
      title={d?.supplier.name ?? "Supplier"}
      description={
        d
          ? `${d.supplier.supplier_code}${d.supplier.gstin ? ` · GSTIN ${d.supplier.gstin}` : ""} · ${d.supplier.payment_terms_days}-day terms`
          : undefined
      }
    >
      {statement.error && (
        <p className="text-[13px] font-medium text-error">{statement.error}</p>
      )}
      {d && (
        <>
          <div className="mb-space-4 grid grid-cols-3 gap-space-3 text-center">
            {[
              ["Billed", d.balance.billed],
              ["Returned + paid", d.balance.returned + d.balance.paid],
              ["We owe", d.balance.outstanding_minor],
            ].map(([label, v]) => (
              <div
                key={label as string}
                className="rounded-md border border-line p-space-3"
              >
                <p className="text-[12px] text-ink-600">{label}</p>
                <p className="text-[18px] font-bold text-ink-900">
                  {formatMoney(v as number, currency)}
                </p>
              </div>
            ))}
          </div>
          <ul className="max-h-56 divide-y divide-line overflow-y-auto text-[13.5px]">
            {d.entries.length === 0 && (
              <li className="py-2 text-ink-400">No activity yet.</li>
            )}
            {d.entries.map((e) => (
              <li
                key={`${e.kind}-${e.number}`}
                className="flex items-center justify-between py-2"
              >
                <span>
                  <strong>{e.number}</strong>{" "}
                  <span className="text-ink-400">
                    {e.kind === "GRN"
                      ? "goods received"
                      : e.kind === "RETURN"
                        ? "returned"
                        : "payment"}{" "}
                    · {formatDateTime(e.at)}
                  </span>
                </span>
                <span
                  className={
                    e.amount_minor < 0 ? "text-success" : "text-ink-900"
                  }
                >
                  {formatMoney(Math.abs(e.amount_minor), currency)}
                  {e.amount_minor < 0 ? " cr" : ""}
                </span>
              </li>
            ))}
          </ul>
          {canPay && d.balance.outstanding_minor > 0 && (
            <div className="mt-space-4 border-t border-line pt-space-3">
              <p className="text-label mb-space-2">Pay this supplier</p>
              <div className="flex flex-wrap items-end gap-space-2">
                <Field
                  label={`Amount (${currency})`}
                  htmlFor="sp_amt"
                  className="!mb-0"
                >
                  <Input
                    id="sp_amt"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-36"
                  />
                </Field>
                <Field label="Method" htmlFor="sp_m" className="!mb-0">
                  <Select
                    id="sp_m"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-44"
                  >
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="CASH">Cash</option>
                  </Select>
                </Field>
                <Field label="Reference" htmlFor="sp_ref" className="!mb-0">
                  <Input
                    id="sp_ref"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-44"
                  />
                </Field>
                <Button disabled={busy || !amount} onClick={pay}>
                  Pay
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
