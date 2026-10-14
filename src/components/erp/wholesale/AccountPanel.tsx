"use client";

import Link from "next/link";
import { useState } from "react";
import { CreditSummary } from "@/components/erp/wholesale/CreditSummary";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import {
  useAccountCredit,
  useReceivePayment,
  useStatement,
} from "@/hooks/useWholesale";
import { formatDateTime, formatMoney, fromMinor, toMinor } from "@/lib/erp";
import { hasGrant, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import {
  RECEIPT_METHOD_LABEL,
  STATEMENT_KIND_LABEL,
  type CustomerAccount,
  type ReceiptMethod,
} from "@/lib/wholesale";

type View = "statement" | "pay";

/** One business customer's account: credit position, the statement (invoices, credit notes, payments, their credit) with a running
 * balance, and recording money they paid. A payment goes to the oldest invoices first unless amounts are typed against invoices. */
export function AccountPanel({
  accountId,
  currency,
  onClose,
  onEdit,
}: {
  accountId: string | null;
  currency: string;
  onClose: () => void;
  onEdit?: (a: CustomerAccount) => void;
}) {
  const session = useStaffSession();
  const statement = useStatement(accountId ?? "");
  const credit = useAccountCredit(accountId ?? "");
  const pay = useReceivePayment(accountId ?? "");
  const canPay = hasGrant(session, "wholesale:receive_payment");
  const [view, setView] = useState<View>("statement");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<ReceiptMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState("");
  const [split, setSplit] = useState<Record<string, string>>({});
  const s = statement.data;
  const invoices = credit.data?.invoices ?? [];
  const cur = currency;

  const minor = toMinor(amount);
  const typed = Object.entries(split).filter(([, v]) => v.trim() !== "");
  const typedBad = typed.some(([id, v]) => {
    const m = toMinor(v);
    const inv = invoices.find((i) => i.id === id);
    return m === null || m === 0 || !inv || m > inv.outstanding_minor;
  });
  const typedSum = typed.reduce((n, [, v]) => n + (toMinor(v) ?? 0), 0);
  const owed = invoices.reduce((n, i) => n + i.outstanding_minor, 0);
  const advance =
    minor === null
      ? 0
      : typed.length
        ? minor - typedSum
        : Math.max(minor - owed, 0);
  const invalid =
    minor === null ||
    minor === 0 ||
    typedBad ||
    (typed.length > 0 && typedSum > (minor ?? 0)) ||
    (method !== "cash" && !reference.trim());

  function submit() {
    if (minor === null) return;
    pay.mutate(
      {
        amount_minor: minor,
        method,
        reference: reference.trim() || null,
        received_on: date || null,
        allocations: typed.length
          ? typed.map(([order_id, v]) => ({
              order_id,
              amount_minor: toMinor(v) ?? 0,
            }))
          : null,
        notes: null,
      },
      {
        onSuccess: (r) => {
          toast.success(`Payment ${r.receipt_number} recorded`);
          setAmount("");
          setReference("");
          setSplit({});
          setView("statement");
        },
        onError: (e) => toast.error("Couldn't record the payment", e.message),
      },
    );
  }

  return (
    <Modal
      open={accountId !== null}
      onClose={onClose}
      width="lg"
      title={s?.account.legal_name ?? "Business customer"}
      description={
        s
          ? `${s.account.account_code} · ${s.account.gstin ?? "Unregistered"} · ${s.account.price_list_name ?? "Normal prices"}`
          : undefined
      }
      footer={
        <>
          {s && onEdit && (
            <Button variant="ghost" onClick={() => onEdit(s.account)}>
              Edit terms
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {statement.error && (
        <p className="text-[13px] font-medium text-error">
          {statement.error.message}
        </p>
      )}
      {!s && !statement.error && <SkeletonLines rows={5} />}
      {s && accountId && (
        <>
          <CreditSummary accountId={accountId} currency={cur} compact />
          <div className="mt-space-3">
            <Tabs<View>
              tabs={[
                { key: "statement", label: "Statement" },
                ...(canPay
                  ? [{ key: "pay" as const, label: "Record payment" }]
                  : []),
              ]}
              value={view}
              onChange={setView}
            />
          </div>

          {view === "statement" &&
            (s.entries.length === 0 ? (
              <p className="py-space-3 text-[13.5px] text-ink-400">
                Nothing billed yet.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-[13.5px]">
                  <thead>
                    <tr className="text-left text-label">
                      <th className="py-space-2 pr-space-2">Date</th>
                      <th className="pr-space-2">What</th>
                      <th className="pr-space-2 text-right">Amount</th>
                      <th className="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.entries.map((e, n) => (
                      <tr key={n} className="border-t border-line">
                        <td className="py-space-2 pr-space-2 whitespace-nowrap text-ink-600">
                          {formatDateTime(e.at)}
                        </td>
                        <td className="pr-space-2">
                          {e.order_id ? (
                            <Link
                              href={`/portal/orders/${e.order_id}`}
                              className="hover:underline"
                            >
                              {STATEMENT_KIND_LABEL[e.kind]} {e.number}
                            </Link>
                          ) : (
                            <span>
                              {STATEMENT_KIND_LABEL[e.kind]}
                              <span className="text-ink-400">
                                {" "}
                                · {e.number}
                              </span>
                            </span>
                          )}
                        </td>
                        <td
                          className={`pr-space-2 text-right ${e.amount_minor < 0 ? "text-success" : ""}`}
                        >
                          {formatMoney(e.amount_minor, cur)}
                        </td>
                        <td className="text-right font-medium">
                          {formatMoney(e.balance_minor, cur)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-space-2 text-right text-[13.5px]">
                  {s.closing_balance_minor >= 0
                    ? "They owe "
                    : "We hold their credit of "}
                  <span className="font-semibold">
                    {formatMoney(Math.abs(s.closing_balance_minor), cur)}
                  </span>
                </p>
              </div>
            ))}

          {view === "pay" && (
            <div className="pt-space-2">
              <div className="grid gap-x-space-4 sm:grid-cols-2">
                <Field label="Amount received (₹)" htmlFor="r_amount" required>
                  <Input
                    id="r_amount"
                    inputMode="decimal"
                    value={amount}
                    invalid={amount !== "" && minor === null}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
                <Field label="How" htmlFor="r_method">
                  <Select
                    id="r_method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as ReceiptMethod)}
                  >
                    {(Object.keys(RECEIPT_METHOD_LABEL) as ReceiptMethod[]).map(
                      (m) => (
                        <option key={m} value={m}>
                          {RECEIPT_METHOD_LABEL[m]}
                        </option>
                      ),
                    )}
                  </Select>
                </Field>
                <Field
                  label="Reference"
                  htmlFor="r_ref"
                  required={method !== "cash"}
                  hint={
                    method === "cheque"
                      ? "Cheque number and bank"
                      : method === "cash"
                        ? "Optional"
                        : "UTR or approval code"
                  }
                >
                  <Input
                    id="r_ref"
                    maxLength={64}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </Field>
                <Field
                  label="Received on"
                  htmlFor="r_date"
                  hint="Leave empty for today."
                >
                  <Input
                    id="r_date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>
              </div>
              <h4 className="mt-space-2 text-[13px] font-semibold text-ink-900">
                Invoices it pays
              </h4>
              <p className="text-[12.5px] text-ink-600">
                Leave the amounts empty to pay the oldest invoices first, or
                type what goes to each.
              </p>
              {invoices.length === 0 ? (
                <p className="py-space-2 text-[13px] text-ink-400">
                  No open invoices: the whole amount is kept as their credit.
                </p>
              ) : (
                <table className="mt-space-1 w-full text-[13.5px]">
                  <tbody>
                    {invoices.map((i) => (
                      <tr key={i.id} className="border-t border-line">
                        <td className="py-space-2 pr-space-2">
                          <p className="font-medium text-ink-900">
                            {i.invoice_number ?? i.order_number}
                          </p>
                          <p className="text-[12px] text-ink-400">
                            {i.due_date ? `Due ${i.due_date}` : "No due date"}
                          </p>
                        </td>
                        <td className="pr-space-2 text-right">
                          {formatMoney(i.outstanding_minor, cur)} owed
                        </td>
                        <td className="w-36 py-space-1">
                          <Input
                            aria-label={`Amount for ${i.invoice_number ?? i.order_number}`}
                            inputMode="decimal"
                            placeholder={fromMinor(i.outstanding_minor)}
                            value={split[i.id] ?? ""}
                            onChange={(e) =>
                              setSplit({ ...split, [i.id]: e.target.value })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {minor !== null && advance > 0 && (
                <p className="mt-space-2 text-[12.5px] text-ink-600">
                  {formatMoney(advance, cur)} is more than the invoices take: it
                  is kept as their credit for later bills.
                </p>
              )}
              <div className="mt-space-3 flex justify-end">
                <Button disabled={invalid || pay.isPending} onClick={submit}>
                  {pay.isPending ? "Recording…" : "Record payment"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
