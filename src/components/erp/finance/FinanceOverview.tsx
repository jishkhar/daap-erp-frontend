"use client";

import { useState } from "react";
import { StatTile } from "@/components/portal/StatTile";
import {
  Banknote,
  Landmark,
  PackageOpen,
  Percent,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useActiveBranch } from "@/lib/branch";
import { erp, formatMoney, qs, useErpQuery } from "@/lib/erp";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { Help } from "@/components/erp/finance/Help";

type Summary = {
  month: string;
  net_revenue_minor: number;
  gross_profit_minor: number;
  gross_margin_pct: number | null;
  net_profit_minor: number;
  cash_and_bank_minor: number;
  gateway_clearing_minor: number;
  receivable_minor: number;
  payable_minor: number;
  inventory_minor: number;
  gst_payable_minor: number;
};

export function FinanceOverview({ currency }: { currency: string }) {
  const { branchId } = useActiveBranch();
  const s = useErpQuery<Summary>(
    `/api/v1/finance/reports/summary${qs({ branch_id: branchId })}`,
  );
  const session = useStaffSession();
  const [lock, setLock] = useState("");
  const d = s.data;
  const m = (v: number) => formatMoney(v, currency);

  async function setPeriodLock(value: string | null) {
    const res = await erp("/api/v1/finance/period-lock", "PUT", {
      closed_through: value,
    });
    if (res.error)
      return toast.error("Couldn't change the period lock", res.error);
    toast.success(value ? `Books closed through ${value}` : "Books reopened");
    setLock("");
  }

  return (
    <>
<<<<<<< HEAD
      {s.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {s.error}
        </p>
=======
      {s.error && <p className="mb-space-3 text-[13px] font-medium text-error">{s.error}</p>}
      {!d && s.loading && (
        <div className="mb-space-5 grid gap-space-3 sm:grid-cols-2 xl:grid-cols-4">
          {["Net revenue", "Gross profit", "Net profit", "Cash & bank", "Customers owe us", "We owe suppliers", "Stock value", "GST payable"].map((label) => <StatTile key={label} loading label={label} value="" deltaPct={null} hint="" />)}
        </div>
>>>>>>> main
      )}
      {d && (
        <>
          <p className="mb-space-3 text-[13px] text-ink-600">
            Month to date, from {d.month}.
          </p>
          <div className="mb-space-5 grid gap-space-3 sm:grid-cols-2 xl:grid-cols-4">
<<<<<<< HEAD
            <StatTile
              label="Net revenue"
              value={m(d.net_revenue_minor)}
              deltaPct={null}
              hint="after returns"
              tone="success"
              icon={<TrendingUp size={22} />}
            />
            <StatTile
              label="Gross profit"
              value={m(d.gross_profit_minor)}
              deltaPct={null}
              hint={
                d.gross_margin_pct !== null
                  ? `${d.gross_margin_pct}% margin`
                  : "no sales yet"
              }
              icon={<Percent size={22} />}
            />
            <StatTile
              label="Net profit"
              value={m(d.net_profit_minor)}
              deltaPct={null}
              hint="after expenses"
              tone={d.net_profit_minor >= 0 ? "success" : "warning"}
              icon={<Banknote size={22} />}
            />
            <StatTile
              label="Cash & bank"
              value={m(d.cash_and_bank_minor)}
              deltaPct={null}
              hint={`+ ${m(d.gateway_clearing_minor)} with the gateway`}
              tone="violet"
              icon={<Wallet size={22} />}
            />
            {d.receivable_minor >= 0 ? (
              <StatTile
                label="Customers owe us"
                value={m(d.receivable_minor)}
                deltaPct={null}
                hint="delivered, not yet paid"
                tone="warning"
                icon={<Receipt size={22} />}
              />
            ) : (
              <StatTile
                label="We owe customers"
                value={m(-d.receivable_minor)}
                deltaPct={null}
                hint="returns not yet refunded, advances"
                tone="clay"
                icon={<Receipt size={22} />}
              />
            )}
            <StatTile
              label="We owe suppliers"
              value={m(d.payable_minor)}
              deltaPct={null}
              hint="goods received, unpaid"
              tone="clay"
              icon={<Landmark size={22} />}
            />
            <StatTile
              label="Stock value"
              value={m(d.inventory_minor)}
              deltaPct={null}
              hint="at cost, incl. in transit"
              icon={<PackageOpen size={22} />}
            />
            {d.gst_payable_minor >= 0 ? (
              <StatTile
                label="GST payable"
                value={m(d.gst_payable_minor)}
                deltaPct={null}
                hint="output tax less input credit"
                tone="info"
                icon={<Percent size={22} />}
              />
            ) : (
              <StatTile
                label="GST credit"
                value={m(-d.gst_payable_minor)}
                deltaPct={null}
                hint="input credit exceeds output tax"
                tone="info"
                icon={<Percent size={22} />}
              />
            )}
=======
            <StatTile info={<Help term="Net revenue" />} label="Net revenue" value={m(d.net_revenue_minor)} deltaPct={null} hint="after returns" tone="success" icon={<TrendingUp size={22} />} />
            <StatTile info={<Help term="Gross profit" />} label="Gross profit" value={m(d.gross_profit_minor)} deltaPct={null} hint={d.gross_margin_pct !== null ? `${d.gross_margin_pct}% margin` : "no sales yet"} icon={<Percent size={22} />} />
            <StatTile info={<Help term="Net profit" />} label="Net profit" value={m(d.net_profit_minor)} deltaPct={null} hint="after expenses" tone={d.net_profit_minor >= 0 ? "success" : "warning"} icon={<Banknote size={22} />} />
            <StatTile info={<Help term="Cash & bank" />} label="Cash & bank" value={m(d.cash_and_bank_minor)} deltaPct={null} hint={`+ ${m(d.gateway_clearing_minor)} with the gateway`} tone="violet" icon={<Wallet size={22} />} />
            {d.receivable_minor >= 0
              ? <StatTile info={<Help term="Customers owe us" />} label="Customers owe us" value={m(d.receivable_minor)} deltaPct={null} hint="delivered, not yet paid" tone="warning" icon={<Receipt size={22} />} />
              : <StatTile info={<Help term="We owe customers" />} label="We owe customers" value={m(-d.receivable_minor)} deltaPct={null} hint="returns not yet refunded, advances" tone="clay" icon={<Receipt size={22} />} />}
            <StatTile info={<Help term="We owe suppliers" />} label="We owe suppliers" value={m(d.payable_minor)} deltaPct={null} hint="goods received, unpaid" tone="clay" icon={<Landmark size={22} />} />
            <StatTile info={<Help term="Stock value" />} label="Stock value" value={m(d.inventory_minor)} deltaPct={null} hint="at cost, incl. in transit" icon={<PackageOpen size={22} />} />
            {d.gst_payable_minor >= 0
              ? <StatTile info={<Help term="GST payable" />} label="GST payable" value={m(d.gst_payable_minor)} deltaPct={null} hint="output tax less input credit" tone="info" icon={<Percent size={22} />} />
              : <StatTile info={<Help term="GST credit" />} label="GST credit" value={m(-d.gst_payable_minor)} deltaPct={null} hint="input credit exceeds output tax" tone="info" icon={<Percent size={22} />} />}
>>>>>>> main
          </div>
        </>
      )}
      {hasTenantWide(session, "finance:manage") && (
        <Card className="p-space-4">
<<<<<<< HEAD
          <h2 className="text-[15px] font-bold text-ink-900">
            Close the books
          </h2>
          <p className="mb-space-3 text-[13px] text-ink-600">
            Stops back-dated manual journal entries on or before a date. Sales,
            payments and other automatic postings are never blocked.
          </p>
=======
          <h2 className="text-[15px] font-bold text-ink-900">Close the books<Help term="Close the books" /></h2>
          <p className="mb-space-3 text-[13px] text-ink-600">Stops back-dated manual journal entries on or before a date. Sales, payments and other automatic postings are never blocked.</p>
>>>>>>> main
          <div className="flex flex-wrap items-end gap-space-2">
            <Field label="Closed through" htmlFor="lock_date" className="!mb-0">
              <Input
                id="lock_date"
                type="date"
                value={lock}
                onChange={(e) => setLock(e.target.value)}
                className="w-48"
              />
            </Field>
            <Button disabled={!lock} onClick={() => setPeriodLock(lock)}>
              Close books
            </Button>
            <Button variant="ghost" onClick={() => setPeriodLock(null)}>
              Reopen all periods
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
