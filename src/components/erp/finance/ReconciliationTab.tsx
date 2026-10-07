"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import {
  erp,
  formatDateTime,
  formatMoney,
  toMinor,
  useErpQuery,
} from "@/lib/erp";
import { toast } from "@/lib/toast";

type Unreconciled = {
  id: string;
  order_id: string;
  provider_txn_id: string | null;
  amount_minor: number;
  captured_at: string;
};
type Settlement = {
  id: string;
  external_ref: string;
  amount_minor: number;
  fee_minor: number;
  settled_on: string;
  status: "MATCHED" | "UNMATCHED" | "AMOUNT_MISMATCH";
};
const TONE = {
  MATCHED: "success",
  UNMATCHED: "warning",
  AMOUNT_MISMATCH: "clay",
} as const;

/** Match what the payment gateway paid out against the payments we recorded. Mismatches are never booked automatically. */
export function ReconciliationTab({ currency }: { currency: string }) {
  const open = useErpQuery<Unreconciled[]>(
    "/api/v1/finance/unreconciled-payments",
  );
  const settlements = useErpQuery<Settlement[]>("/api/v1/finance/settlements");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const m = (v: number) => formatMoney(v, currency);

  async function importLines() {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split(",").map((x) => x.trim()));
    const parsed = lines.map(([ref, amount, fee, date]) => ({
      external_ref: ref,
      amount_minor: toMinor(amount ?? ""),
      fee_minor: toMinor(fee ?? "0") ?? 0,
      settled_on: date,
    }));
    if (parsed.some((p) => !p.external_ref || !p.amount_minor || !p.settled_on))
      return toast.error(
        "Each line needs: reference, amount, fee, date (YYYY-MM-DD)",
      );
    setBusy(true);
    const res = await erp<{
      matched: number;
      unmatched: number;
      amount_mismatch: number;
      duplicate: number;
    }>("/api/v1/finance/settlements/import", "POST", {
      provider: "razorpay",
      lines: parsed,
    });
    setBusy(false);
    if (res.error || !res.data)
      return toast.error("Couldn't import", res.error ?? undefined);
    toast.success(
      `${res.data.matched} matched, ${res.data.amount_mismatch} amount mismatch, ${res.data.unmatched} unknown, ${res.data.duplicate} already imported`,
    );
    setText("");
    open.reload();
    settlements.reload();
  }

  return (
    <div className="grid gap-space-4 lg:grid-cols-2">
      <Card className="p-space-4">
        <h2 className="text-[15px] font-bold text-ink-900">
          Import a settlement report
        </h2>
        <p className="mb-space-2 text-[13px] text-ink-600">
          One line per payment:{" "}
          <code>gateway reference, amount, fee, date</code>. Lines are matched
          to captured payments by reference and amount; the gateway fee is
          booked as an expense.
        </p>
        <Textarea
          rows={6}
          aria-label="Settlement lines"
          placeholder={
            "pay_Nx12abc, 1180.00, 23.60, 2026-10-02\npay_Nx12abd, 499.00, 9.98, 2026-10-02"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button
          className="mt-space-2"
          disabled={busy || !text.trim()}
          onClick={importLines}
        >
          Import &amp; match
        </Button>
      </Card>
      <Card className="p-space-4">
        <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
          Paid by customers, not yet settled
        </h2>
        {open.error && <p className="text-[13px] text-error">{open.error}</p>}
        {(open.data ?? []).length === 0 && (
          <p className="text-[13px] text-ink-400">
            {open.loading
              ? "Loading…"
              : "Everything captured has been settled."}
          </p>
        )}
        <ul className="divide-y divide-line text-[13.5px]">
          {(open.data ?? []).map((u) => (
            <li key={u.id} className="flex justify-between py-2">
              <span>
                <strong>{u.provider_txn_id ?? `payment #${u.id}`}</strong>
                <span className="text-ink-400">
                  {" "}
                  · {formatDateTime(u.captured_at)}
                </span>
              </span>
              <span className="font-medium">{m(u.amount_minor)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-space-4 lg:col-span-2">
        <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
          Settlements
        </h2>
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[12px] tracking-wide text-ink-400 uppercase">
              <th className="py-1">Reference</th>
              <th>Amount</th>
              <th>Fee</th>
              <th>Settled</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(settlements.data ?? []).map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="py-2 font-medium">{s.external_ref}</td>
                <td>{m(s.amount_minor)}</td>
                <td>{m(s.fee_minor)}</td>
                <td>{s.settled_on}</td>
                <td>
                  <Badge tone={TONE[s.status]}>
                    {s.status.replace("_", " ").toLowerCase()}
                  </Badge>
                </td>
              </tr>
            ))}
            {settlements.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-center text-ink-400">
                  No settlements imported yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
