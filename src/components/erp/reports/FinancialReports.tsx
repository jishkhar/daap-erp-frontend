"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { useActiveBranch } from "@/lib/branch";
import { GstReturnReport } from "@/components/erp/reports/GstReturnReport";
import { CHANNELS, formatMoney, humanize, monthRange, qs, useErpQuery, type Channel } from "@/lib/erp";
import { SkeletonLines , CardSkeleton } from "@/components/ui/Skeleton";
import { InfoTip } from "@/components/ui/InfoTip";
import { Help } from "@/components/erp/finance/Help";

type Sub = "pl" | "matrix" | "bs" | "gst" | "gstr1" | "products" | "aging";

const GST_HELP: Record<string, string> = {
  "Taxable sales (net of credit notes)": "Taxable sales", "CGST collected": "CGST", "SGST collected": "SGST", "IGST collected": "IGST", "Output tax": "Output tax",
  "Input credit: CGST": "Input credit", "Input credit: SGST": "Input credit", "Input credit: IGST": "Input credit",
};
const th = "p-space-3 text-left text-[12px] tracking-wide text-ink-400 uppercase";
const num = "p-space-3 text-right tabular-nums";
const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

function DateRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="mb-space-4 flex flex-wrap items-end gap-space-3">
      <Field label="From" htmlFor="r_from" className="!mb-0">
        <Input
          id="r_from"
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          className="w-44"
        />
      </Field>
      <Field label="To" htmlFor="r_to" className="!mb-0">
        <Input
          id="r_to"
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          className="w-44"
        />
      </Field>
    </div>
  );
}

const channelLabel = (c: string) =>
  c in CHANNELS ? CHANNELS[c as Channel].label : humanize(c);

// ------------------------------------------------------------------------------------------------ P&L
type PlRow = {
  branch?: string;
  channel?: string;
  gross_sales_minor: number;
  returns_minor: number;
  net_revenue_minor: number;
  cogs_minor: number;
  gross_profit_minor: number;
  gross_margin_pct: number | null;
  writeoffs_minor: number;
  operating_expenses_minor: number;
  other_income_minor: number;
  net_profit_minor: number;
};

function ProfitAndLoss({ currency }: { currency: string }) {
  const range = monthRange();
  const [from, setFrom] = useState(range.from),
    [to, setTo] = useState(range.to),
    [group, setGroup] = useState("none");
  const { branchId } = useActiveBranch();
  const pl = useErpQuery<{ rows: PlRow[]; total: PlRow }>(
    `/api/v1/finance/reports/profit-and-loss${qs({ date_from: from, date_to: to, group_by: group, branch_id: branchId })}`,
  );
  const m = (v: number) => formatMoney(v, currency);
  const label = (r: PlRow) =>
    group === "branch"
      ? r.branch
      : group === "channel"
        ? channelLabel(r.channel ?? "")
        : group === "branch_channel"
          ? `${r.branch} · ${channelLabel(r.channel ?? "")}`
          : "Whole company";
  const lines: [string, (r: PlRow) => string, boolean?][] = [
    ["Gross sales", (r) => m(r.gross_sales_minor)],
    ["Returns", (r) => `− ${m(r.returns_minor)}`],
    ["Net revenue", (r) => m(r.net_revenue_minor), true],
    ["Cost of goods sold", (r) => `− ${m(r.cogs_minor)}`],
    [
      "Gross profit",
      (r) => `${m(r.gross_profit_minor)} (${pct(r.gross_margin_pct)})`,
      true,
    ],
    ["Stock write-offs", (r) => `− ${m(r.writeoffs_minor)}`],
    ["Operating expenses", (r) => `− ${m(r.operating_expenses_minor)}`],
    ["Other income", (r) => m(r.other_income_minor)],
    ["Net profit", (r) => m(r.net_profit_minor), true],
  ];
<<<<<<< HEAD
  const rows = pl.data
    ? group === "none"
      ? [pl.data.total]
      : [...pl.data.rows]
    : [];
  return (
    <>
      <div className="flex flex-wrap items-end gap-space-3">
        <DateRange
          from={from}
          to={to}
          onChange={(a, b) => {
            setFrom(a);
            setTo(b);
          }}
        />
        <Field label="Break down by" htmlFor="r_group" className="mb-space-4">
          <Select
            id="r_group"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="w-52"
          >
            <option value="none">Whole company</option>
            <option value="branch">Branch</option>
            <option value="channel">Channel</option>
            <option value="branch_channel">Branch × channel</option>
          </Select>
        </Field>
      </div>
      {pl.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {pl.error}
        </p>
      )}
      <Card className="overflow-x-auto p-space-2">
        <table className="w-full min-w-[640px] text-[14px]">
          <thead>
            <tr>
              <th className={th}>&nbsp;</th>
              {rows.map((r, i) => (
                <th key={i} className={`${th} text-right`}>
                  {label(r)}
                </th>
              ))}
              {group !== "none" && pl.data && (
                <th className={`${th} text-right`}>Total</th>
              )}
            </tr>
          </thead>
          <tbody>
            {lines.map(([name, fmt, bold]) => (
              <tr
                key={name}
                className={`border-t border-line ${bold ? "bg-black/[0.02] font-semibold text-ink-900" : "text-ink-700"}`}
              >
                <td className="p-space-3">{name}</td>
                {rows.map((r, i) => (
                  <td key={i} className={num}>
                    {fmt(r)}
                  </td>
                ))}
                {group !== "none" && pl.data && (
                  <td className={num}>{fmt(pl.data.total)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!pl.data && !pl.error && (
          <p className="p-space-3 text-ink-400">Loading…</p>
        )}
=======
  const INFO: Record<string, [string, string]> = {
    "Gross sales": ["Gross sales", "Total value of all orders in this period, before returns, excluding cancelled orders."],
    "Returns": ["Returns", "Value of goods customers sent back and were credited or refunded for."],
    "Net revenue": ["Net revenue", "Gross sales minus returns: what you actually earned from selling."],
    "Cost of goods sold": ["Cost of goods sold (COGS)", "What the items you sold cost you to buy, taken from your stock cost at the time of sale."],
    "Gross profit": ["Gross profit", "Net revenue minus cost of goods sold. The percentage is the margin: gross profit as a share of net revenue."],
    "Stock write-offs": ["Stock write-offs", "Value of stock lost, damaged or expired and written off the books."],
    "Operating expenses": ["Operating expenses", "Running costs for the period such as rent, salaries and utilities (approved and paid expenses)."],
    "Other income": ["Other income", "Money earned outside of sales, for example supplier rebates or miscellaneous income."],
    "Net profit": ["Net profit", "Gross profit minus write-offs and operating expenses, plus other income. What is left after all costs."],
  };
  const rows = pl.data ? (group === "none" ? [pl.data.total] : [...pl.data.rows]) : [];
  return (
    <>
      <div className="flex flex-wrap items-end gap-space-3"><DateRange from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); }} />
        <Field label="Break down by" htmlFor="r_group" className="mb-space-4"><Select id="r_group" value={group} onChange={(e) => setGroup(e.target.value)} className="w-52"><option value="none">Whole company</option><option value="branch">Branch</option><option value="channel">Channel</option><option value="branch_channel">Branch × channel</option></Select></Field></div>
      {pl.error && <p className="mb-space-3 text-[13px] font-medium text-error">{pl.error}</p>}
      <Card className="no-scrollbar overflow-x-auto p-space-2">
        <table className="w-full min-w-[640px] text-[14px]">
          <thead><tr><th className={th}>&nbsp;</th>{rows.map((r, i) => <th key={i} className={`${th} text-right`}>{label(r)}</th>)}{group !== "none" && pl.data && <th className={`${th} text-right`}>Total</th>}</tr></thead>
          <tbody>{lines.map(([name, fmt, bold], li) => (
            <tr key={name} className={`border-t border-line ${bold ? "bg-black/[0.02] font-semibold text-ink-900" : "text-ink-700"}`}><td className="p-space-3">{name}{INFO[name] && <InfoTip above={li >= 4} title={INFO[name][0]}>{INFO[name][1]}</InfoTip>}</td>{rows.map((r, i) => <td key={i} className={num}>{fmt(r)}</td>)}{group !== "none" && pl.data && <td className={num}>{fmt(pl.data.total)}</td>}</tr>
          ))}</tbody>
        </table>
        {!pl.data && !pl.error && <SkeletonLines rows={3} />}
>>>>>>> main
      </Card>
    </>
  );
}

// ------------------------------------------------------------------------------------- branch × channel
type Matrix = {
  channels: string[];
  rows: ({ branch: string; total_minor: number } & Record<
    string,
    number | string | null
  >)[];
  totals: Record<string, number>;
};

function SalesMatrix({ currency }: { currency: string }) {
  const range = monthRange();
  const [from, setFrom] = useState(range.from),
    [to, setTo] = useState(range.to);
  const mx = useErpQuery<Matrix>(
    `/api/v1/finance/reports/sales-matrix${qs({ date_from: from, date_to: to })}`,
  );
  const m = (v: unknown) => formatMoney(Number(v) || 0, currency);
  return (
    <>
<<<<<<< HEAD
      <DateRange
        from={from}
        to={to}
        onChange={(a, b) => {
          setFrom(a);
          setTo(b);
        }}
      />
      {mx.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {mx.error}
        </p>
      )}
      {mx.data && (
        <Card className="overflow-x-auto p-space-2">
          <table className="w-full min-w-[560px] text-[14px]">
            <thead>
              <tr>
                <th className={th}>Branch</th>
                {mx.data.channels.map((c) => (
                  <th key={c} className={`${th} text-right`}>
                    {channelLabel(c)}
                  </th>
                ))}
                <th className={`${th} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {mx.data.rows.map((r) => (
                <tr key={r.branch} className="border-t border-line">
                  <td className="p-space-3 font-medium text-ink-900">
                    {r.branch}
                  </td>
                  {mx.data!.channels.map((c) => (
                    <td key={c} className={num}>
                      {m(r[c])}
                    </td>
                  ))}
                  <td className={`${num} font-semibold`}>{m(r.total_minor)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-line bg-black/[0.02] font-semibold">
                <td className="p-space-3">Company</td>
                {mx.data.channels.map((c) => (
                  <td key={c} className={num}>
                    {m(mx.data!.totals[c])}
                  </td>
                ))}
                <td className={num}>{m(mx.data.totals.total_minor)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
=======
      <DateRange from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); }} />
      {mx.error && <p className="mb-space-3 text-[13px] font-medium text-error">{mx.error}</p>}
      {!mx.data && !mx.error && <CardSkeleton rows={5} />}
      {mx.data && (
        <Card className="no-scrollbar overflow-x-auto p-space-2"><table className="w-full min-w-[560px] text-[14px]">
          <thead><tr><th className={th}>Branch</th>{mx.data.channels.map((c) => <th key={c} className={`${th} text-right`}>{channelLabel(c)}</th>)}<th className={`${th} text-right`}>Total</th></tr></thead>
          <tbody>{mx.data.rows.map((r) => <tr key={r.branch} className="border-t border-line"><td className="p-space-3 font-medium text-ink-900">{r.branch}</td>{mx.data!.channels.map((c) => <td key={c} className={num}>{m(r[c])}</td>)}<td className={`${num} font-semibold`}>{m(r.total_minor)}</td></tr>)}
            <tr className="border-t-2 border-line bg-black/[0.02] font-semibold"><td className="p-space-3">Company</td>{mx.data.channels.map((c) => <td key={c} className={num}>{m(mx.data!.totals[c])}</td>)}<td className={num}>{m(mx.data.totals.total_minor)}</td></tr></tbody>
        </table></Card>
>>>>>>> main
      )}
    </>
  );
}

// --------------------------------------------------------------------------------------- balance sheet
type BsLine = { code: string; name: string; amount_minor: number };
type Bs = {
  as_of: string;
  assets: BsLine[];
  liabilities: BsLine[];
  equity: BsLine[];
  retained_earnings_minor: number;
  total_assets_minor: number;
  total_liabilities_minor: number;
  total_equity_minor: number;
  balanced: boolean;
};

function BsSection({
  title,
  lines,
  total,
  extra,
  currency,
}: {
  title: string;
  lines: BsLine[];
  total: number;
  extra?: [string, number][];
  currency: string;
}) {
  const m = (v: number) => formatMoney(v, currency);
  return (
<<<<<<< HEAD
    <Card className="p-space-4">
      <h3 className="mb-space-2 text-[15px] font-bold text-ink-900">{title}</h3>
      <ul className="divide-y divide-line text-[14px]">
        {lines.map((l) => (
          <li key={l.code} className="flex justify-between py-1.5">
            <span>
              {l.code} · {l.name}
            </span>
            <span className="tabular-nums">{m(l.amount_minor)}</span>
          </li>
        ))}
        {(extra ?? []).map(([k, v]) => (
          <li key={k} className="flex justify-between py-1.5">
            <span>{k}</span>
            <span className="tabular-nums">{m(v)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-space-2 flex justify-between border-t border-line pt-space-2 font-bold">
        <span>Total {title.toLowerCase()}</span>
        <span className="tabular-nums">{m(total)}</span>
      </div>
    </Card>
=======
    <Card className="p-space-4"><h3 className="mb-space-2 text-[15px] font-bold text-ink-900">{title}<Help term={title} /></h3>
      <ul className="divide-y divide-line text-[14px]">{lines.map((l) => <li key={l.code} className="flex justify-between py-1.5"><span>{l.code} · {l.name}</span><span className="tabular-nums">{m(l.amount_minor)}</span></li>)}{(extra ?? []).map(([k, v]) => <li key={k} className="flex justify-between py-1.5"><span>{k}{k.startsWith("Retained earnings") && <Help term="Retained earnings" />}</span><span className="tabular-nums">{m(v)}</span></li>)}</ul>
      <div className="mt-space-2 flex justify-between border-t border-line pt-space-2 font-bold"><span>Total {title.toLowerCase()}</span><span className="tabular-nums">{m(total)}</span></div></Card>
>>>>>>> main
  );
}

function BalanceSheet({ currency }: { currency: string }) {
  const { branchId } = useActiveBranch();
  const bs = useErpQuery<Bs>(
    `/api/v1/finance/reports/balance-sheet${qs({ branch_id: branchId })}`,
  );
  const d = bs.data;
  return (
    <>
<<<<<<< HEAD
      {bs.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {bs.error}
        </p>
      )}
=======
      {bs.error && <p className="mb-space-3 text-[13px] font-medium text-error">{bs.error}</p>}
      {!d && !bs.error && <div className="grid gap-space-4 lg:grid-cols-2"><CardSkeleton rows={5} /><CardSkeleton rows={5} /></div>}
>>>>>>> main
      {d && (
        <>
          <p
            className={`mb-space-3 text-[13px] font-medium ${d.balanced ? "text-success" : "text-error"}`}
          >
            As of {d.as_of} —{" "}
            {d.balanced
              ? "assets equal liabilities plus equity ✓"
              : "does not balance — contact support"}
          </p>
          <div className="grid gap-space-4 lg:grid-cols-2">
            <BsSection
              currency={currency}
              title="Assets"
              lines={d.assets}
              total={d.total_assets_minor}
            />
            <div className="space-y-space-4">
              <BsSection
                currency={currency}
                title="Liabilities"
                lines={d.liabilities}
                total={d.total_liabilities_minor}
              />
              <BsSection
                currency={currency}
                title="Equity"
                lines={d.equity}
                total={d.total_equity_minor}
                extra={[
                  [
                    "Retained earnings (profit to date)",
                    d.retained_earnings_minor,
                  ],
                ]}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ----------------------------------------------------------------------------------------------- GST
type Tax3 = { cgst: number; sgst: number; igst: number; total_minor: number };
type Gst = {
  outward_taxable_minor: number;
  output_tax: Tax3;
  input_credit: Tax3;
  by_rate: {
    rate_bps: number;
    doc_type: string;
    taxable_minor: number;
    tax_minor: number;
  }[];
  net_payable_minor: number;
  by_registration: {
    registration_id: string | null;
    gstin: string | null;
    state_name: string | null;
    outward_taxable_minor: number;
    output_tax: Tax3;
    input_credit: Tax3;
    net_payable_minor: number;
  }[];
};
type RegistrationOption = {
  id: string;
  gstin: string;
  state_name: string | null;
  state_code: string;
};

function GstReport({ currency }: { currency: string }) {
  const range = monthRange();
  const [from, setFrom] = useState(range.from),
    [to, setTo] = useState(range.to);
  const [registration, setRegistration] = useState(""),
    [branch, setBranch] = useState("");
  const regs = useErpQuery<{ registrations: RegistrationOption[] }>(
    "/api/v1/tenant/gst-registrations",
  );
  const branches =
    useErpQuery<{ id: string; branch_code: string; branch_name: string }[]>(
      "/api/v1/branches",
    );
  const g = useErpQuery<Gst>(
    `/api/v1/finance/reports/gst${qs({ date_from: from, date_to: to, registration_id: registration || null, branch_id: branch || null })}`,
  );
  const m = (v: number) => formatMoney(v, currency);
  const d = g.data;
<<<<<<< HEAD
  const line = (k: string, v: number) => (
    <div key={k} className="flex justify-between py-1.5 text-[14px]">
      <span className="text-ink-600">{k}</span>
      <span className="tabular-nums">{m(v)}</span>
    </div>
  );
=======
  const line = (k: string, v: number) => <div key={k} className="flex justify-between py-1.5 text-[14px]"><span className="text-ink-600">{k}{GST_HELP[k] && <Help term={GST_HELP[k]} />}</span><span className="tabular-nums">{m(v)}</span></div>;
>>>>>>> main
  return (
    <>
      <div className="flex flex-wrap items-end gap-space-3">
        <DateRange
          from={from}
          to={to}
          onChange={(a, b) => {
            setFrom(a);
            setTo(b);
          }}
        />
        <Field label="GST registration" htmlFor="r_reg" className="!mb-space-4">
          <Select
            id="r_reg"
            value={registration}
            onChange={(e) => setRegistration(e.target.value)}
            className="w-64"
          >
            <option value="">All registrations</option>
            {(regs.data?.registrations ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.gstin} — {r.state_name ?? r.state_code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Branch" htmlFor="r_branch" className="!mb-space-4">
          <Select
            id="r_branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-52"
          >
            <option value="">All branches</option>
            {(branches.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.branch_name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
<<<<<<< HEAD
      {g.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {g.error}
        </p>
      )}
      {d && (
        <div className="grid gap-space-4 lg:grid-cols-2">
          <Card className="p-space-4">
            <h3 className="mb-space-2 text-[15px] font-bold text-ink-900">
              GST summary
            </h3>
            {line(
              "Taxable sales (net of credit notes)",
              d.outward_taxable_minor,
            )}
            {line("CGST collected", d.output_tax.cgst)}
            {line("SGST collected", d.output_tax.sgst)}
            {line("IGST collected", d.output_tax.igst)}
            <div className="border-t border-line">
              {line("Output tax", d.output_tax.total_minor)}
            </div>
            {line("Input credit: CGST", -d.input_credit.cgst)}
            {line("Input credit: SGST", -d.input_credit.sgst)}
            {line("Input credit: IGST", -d.input_credit.igst)}
            <div className="mt-space-2 flex justify-between border-t border-line pt-space-2 text-[16px] font-bold">
              <span>Net GST payable</span>
              <span className="tabular-nums">{m(d.net_payable_minor)}</span>
            </div>
          </Card>
          <Card className="p-space-4">
            <h3 className="mb-space-2 text-[15px] font-bold text-ink-900">
              By tax rate
            </h3>
            <table className="w-full text-[14px]">
              <thead>
                <tr>
                  <th className={`${th} !p-1`}>Rate</th>
                  <th className={`${th} !p-1`}>Document</th>
                  <th className={`${th} !p-1 text-right`}>Taxable</th>
                  <th className={`${th} !p-1 text-right`}>Tax</th>
                </tr>
              </thead>
              <tbody>
                {d.by_rate.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1.5">{r.rate_bps / 100}%</td>
                    <td>
                      {r.doc_type === "INVOICE" ? "Invoices" : "Credit notes"}
                    </td>
                    <td className="text-right tabular-nums">
                      {m(r.taxable_minor)}
                    </td>
                    <td className="text-right tabular-nums">
                      {m(r.tax_minor)}
                    </td>
                  </tr>
                ))}
                {d.by_rate.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-ink-400">
                      No tax documents in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
          <Card className="p-space-4 lg:col-span-2">
            <h3 className="mb-space-2 text-[15px] font-bold text-ink-900">
              By GST registration
            </h3>
            <p className="mb-space-2 text-[12.5px] text-ink-400">
              GST returns are filed per GSTIN, so each registration has its own
              payable. Input credit set off only within the same GSTIN.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr>
                    <th className={`${th} !p-1`}>GSTIN</th>
                    <th className={`${th} !p-1 text-right`}>Taxable sales</th>
                    <th className={`${th} !p-1 text-right`}>CGST</th>
                    <th className={`${th} !p-1 text-right`}>SGST</th>
                    <th className={`${th} !p-1 text-right`}>IGST</th>
                    <th className={`${th} !p-1 text-right`}>Input credit</th>
                    <th className={`${th} !p-1 text-right`}>Net payable</th>
                  </tr>
                </thead>
                <tbody>
                  {d.by_registration.map((r) => (
                    <tr
                      key={r.registration_id ?? "none"}
                      className="border-t border-line"
                    >
                      <td className="py-1.5">
                        {r.gstin ? (
                          <>
                            {r.gstin}
                            <span className="block text-[11.5px] text-ink-400">
                              {r.state_name}
                            </span>
                          </>
                        ) : (
                          <span className="text-ink-400">
                            Unassigned (no GSTIN on the document)
                          </span>
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        {m(r.outward_taxable_minor)}
                      </td>
                      <td className="text-right tabular-nums">
                        {m(r.output_tax.cgst)}
                      </td>
                      <td className="text-right tabular-nums">
                        {m(r.output_tax.sgst)}
                      </td>
                      <td className="text-right tabular-nums">
                        {m(r.output_tax.igst)}
                      </td>
                      <td className="text-right tabular-nums">
                        {m(r.input_credit.total_minor)}
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {m(r.net_payable_minor)}
                      </td>
                    </tr>
                  ))}
                  {d.by_registration.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-3 text-center text-ink-400">
                        Nothing in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
=======
      {g.error && <p className="mb-space-3 text-[13px] font-medium text-error">{g.error}</p>}
      {!d && !g.error && <div className="grid gap-space-4 lg:grid-cols-2"><CardSkeleton rows={5} /><CardSkeleton rows={5} /></div>}
      {d && (
        <div className="grid gap-space-4 lg:grid-cols-2">
          <Card className="p-space-4"><h3 className="mb-space-2 text-[15px] font-bold text-ink-900">GST summary</h3>
            {line("Taxable sales (net of credit notes)", d.outward_taxable_minor)}
            {line("CGST collected", d.output_tax.cgst)}{line("SGST collected", d.output_tax.sgst)}{line("IGST collected", d.output_tax.igst)}
            <div className="border-t border-line">{line("Output tax", d.output_tax.total_minor)}</div>
            {line("Input credit: CGST", -d.input_credit.cgst)}{line("Input credit: SGST", -d.input_credit.sgst)}{line("Input credit: IGST", -d.input_credit.igst)}
            <div className="mt-space-2 flex justify-between border-t border-line pt-space-2 text-[16px] font-bold"><span>Net GST payable<Help term="Net GST payable" above /></span><span className="tabular-nums">{m(d.net_payable_minor)}</span></div></Card>
          <Card className="p-space-4"><h3 className="mb-space-2 text-[15px] font-bold text-ink-900">By tax rate<Help term="By tax rate" /></h3>
            <table className="w-full text-[14px]"><thead><tr><th className={`${th} !p-1`}>Rate</th><th className={`${th} !p-1`}>Document</th><th className={`${th} !p-1 text-right`}>Taxable</th><th className={`${th} !p-1 text-right`}>Tax</th></tr></thead>
              <tbody>{d.by_rate.map((r, i) => <tr key={i} className="border-t border-line"><td className="py-1.5">{r.rate_bps / 100}%</td><td>{r.doc_type === "INVOICE" ? "Invoices" : "Credit notes"}</td><td className="text-right tabular-nums">{m(r.taxable_minor)}</td><td className="text-right tabular-nums">{m(r.tax_minor)}</td></tr>)}{d.by_rate.length === 0 && <tr><td colSpan={4} className="py-3 text-center text-ink-400">No tax documents in this period.</td></tr>}</tbody></table></Card>
          <Card className="p-space-4 lg:col-span-2"><h3 className="mb-space-2 text-[15px] font-bold text-ink-900">By GST registration<Help term="By GST registration" /></h3>
            <p className="mb-space-2 text-[12.5px] text-ink-400">GST returns are filed per GSTIN, so each registration has its own payable. Input credit set off only within the same GSTIN.</p>
            <div className="overflow-x-auto"><table className="w-full text-[14px]"><thead><tr><th className={`${th} !p-1`}>GSTIN</th><th className={`${th} !p-1 text-right`}>Taxable sales</th><th className={`${th} !p-1 text-right`}>CGST</th><th className={`${th} !p-1 text-right`}>SGST</th><th className={`${th} !p-1 text-right`}>IGST</th><th className={`${th} !p-1 text-right`}>Input credit</th><th className={`${th} !p-1 text-right`}>Net payable</th></tr></thead>
              <tbody>{d.by_registration.map((r) => <tr key={r.registration_id ?? "none"} className="border-t border-line"><td className="py-1.5">{r.gstin ? <>{r.gstin}<span className="block text-[11.5px] text-ink-400">{r.state_name}</span></> : <span className="text-ink-400">Unassigned (no GSTIN on the document)</span>}</td><td className="text-right tabular-nums">{m(r.outward_taxable_minor)}</td><td className="text-right tabular-nums">{m(r.output_tax.cgst)}</td><td className="text-right tabular-nums">{m(r.output_tax.sgst)}</td><td className="text-right tabular-nums">{m(r.output_tax.igst)}</td><td className="text-right tabular-nums">{m(r.input_credit.total_minor)}</td><td className="text-right font-semibold tabular-nums">{m(r.net_payable_minor)}</td></tr>)}{d.by_registration.length === 0 && <tr><td colSpan={7} className="py-3 text-center text-ink-400">Nothing in this period.</td></tr>}</tbody></table></div></Card>
>>>>>>> main
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------------------------------------- product margin
type ProductRow = {
  key_id: string;
  code: string;
  name: string;
  units_sold: number;
  revenue_minor: number;
  gross_margin_minor: number;
  gross_margin_pct: number | null;
  return_rate_pct: number;
  units_in_stock: number;
  stock_value_minor: number;
  stock_turn: number | null;
  days_since_last_receipt: number | null;
};

function ProductReport({ currency }: { currency: string }) {
  const range = monthRange();
  const [from, setFrom] = useState(range.from),
    [to, setTo] = useState(range.to),
    [group, setGroup] = useState("product");
  const r = useErpQuery<{ rows: ProductRow[] }>(
    `/api/v1/finance/reports/product-performance${qs({ date_from: from, date_to: to, group_by: group })}`,
  );
  const m = (v: number) => formatMoney(v, currency);
  return (
    <>
<<<<<<< HEAD
      <div className="flex flex-wrap items-end gap-space-3">
        <DateRange
          from={from}
          to={to}
          onChange={(a, b) => {
            setFrom(a);
            setTo(b);
          }}
        />
        <Field label="Group by" htmlFor="p_group" className="mb-space-4">
          <Select
            id="p_group"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="w-44"
          >
            <option value="product">Product</option>
            <option value="category">Category</option>
          </Select>
        </Field>
      </div>
      {r.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {r.error}
        </p>
      )}
      <Card className="overflow-x-auto p-space-2">
        <table className="w-full min-w-[820px] text-[13.5px]">
          <thead>
            <tr>
              <th className={th}>
                {group === "product" ? "Product" : "Category"}
              </th>
              <th className={`${th} text-right`}>Sold</th>
              <th className={`${th} text-right`}>Revenue</th>
              <th className={`${th} text-right`}>Margin</th>
              <th className={`${th} text-right`}>Returns</th>
              <th className={`${th} text-right`}>In stock</th>
              <th className={`${th} text-right`}>Stock value</th>
              <th className={`${th} text-right`}>Turn</th>
              <th className={`${th} text-right`}>Last receipt</th>
            </tr>
          </thead>
          <tbody>
            {(r.data?.rows ?? []).map((p) => (
              <tr key={`${p.key_id}`} className="border-t border-line">
                <td className="p-space-3">
                  <span className="font-medium text-ink-900">{p.name}</span>
                  <span className="block text-[11.5px] text-ink-400">
                    {p.code}
                  </span>
                </td>
                <td className={num}>{p.units_sold}</td>
                <td className={num}>{m(p.revenue_minor)}</td>
                <td className={num}>
                  {m(p.gross_margin_minor)}{" "}
                  <span className="text-ink-400">
                    ({pct(p.gross_margin_pct)})
                  </span>
                </td>
                <td className={num}>{pct(p.return_rate_pct)}</td>
                <td className={num}>{p.units_in_stock}</td>
                <td className={num}>{m(p.stock_value_minor)}</td>
                <td className={num}>{p.stock_turn ?? "—"}</td>
                <td className={num}>
                  {p.days_since_last_receipt !== null
                    ? `${p.days_since_last_receipt}d ago`
                    : "—"}
                </td>
              </tr>
            ))}
            {r.data?.rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-space-4 text-center text-ink-400">
                  No sales or stock in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
=======
      <div className="flex flex-wrap items-end gap-space-3"><DateRange from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); }} />
        <Field label="Group by" htmlFor="p_group" className="mb-space-4"><Select id="p_group" value={group} onChange={(e) => setGroup(e.target.value)} className="w-44"><option value="product">Product</option><option value="category">Category</option></Select></Field></div>
      {r.error && <p className="mb-space-3 text-[13px] font-medium text-error">{r.error}</p>}
      <Card className="no-scrollbar overflow-x-auto p-space-2"><table className="w-full min-w-[820px] text-[13.5px]">
        <thead><tr><th className={th}>{group === "product" ? "Product" : "Category"}</th><th className={`${th} text-right`}>Sold</th><th className={`${th} text-right`}>Revenue</th><th className={`${th} text-right`}>Margin</th><th className={`${th} text-right`}>Returns</th><th className={`${th} text-right`}>In stock</th><th className={`${th} text-right`}>Stock value</th><th className={`${th} text-right`}>Turn</th><th className={`${th} text-right`}>Last receipt</th></tr></thead>
        <tbody>{(r.data?.rows ?? []).map((p) => <tr key={`${p.key_id}`} className="border-t border-line"><td className="p-space-3"><span className="font-medium text-ink-900">{p.name}</span><span className="block text-[11.5px] text-ink-400">{p.code}</span></td><td className={num}>{p.units_sold}</td><td className={num}>{m(p.revenue_minor)}</td><td className={num}>{m(p.gross_margin_minor)} <span className="text-ink-400">({pct(p.gross_margin_pct)})</span></td><td className={num}>{pct(p.return_rate_pct)}</td><td className={num}>{p.units_in_stock}</td><td className={num}>{m(p.stock_value_minor)}</td><td className={num}>{p.stock_turn ?? "—"}</td><td className={num}>{p.days_since_last_receipt !== null ? `${p.days_since_last_receipt}d ago` : "—"}</td></tr>)}
          {r.data?.rows.length === 0 && <tr><td colSpan={9} className="p-space-4 text-center text-ink-400">No sales or stock in this period.</td></tr>}</tbody></table></Card>
>>>>>>> main
    </>
  );
}

// ------------------------------------------------------------------------------------------- aging
type Aging = { buckets: Record<string, number>; total_minor: number };

const AGING_ORDER = ["current", "1-30", "31-60", "61-90", "90+"];

function Buckets({
  title,
  hint,
  a,
  error,
  currency,
}: {
  title: string;
  hint: string;
  a: Aging | null;
  error: string | null;
  currency: string;
}) {
  const m = (v: number) => formatMoney(v, currency);
  return (
<<<<<<< HEAD
    <Card className="p-space-4">
      <h3 className="text-[15px] font-bold text-ink-900">{title}</h3>
      <p className="mb-space-3 text-[12.5px] text-ink-600">{hint}</p>
      {error && <p className="text-[13px] text-error">{error}</p>}
      {a && (
        <>
          <div className="grid grid-cols-5 gap-space-2 text-center">
            {AGING_ORDER.map((b) => (
              <div key={b} className="rounded-md border border-line p-space-2">
                <p className="text-[11px] text-ink-400 uppercase">
                  {b === "current" ? "Not due" : `${b} days`}
                </p>
                <p className="text-[14px] font-semibold tabular-nums text-ink-900">
                  {m(a.buckets[b] ?? 0)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-space-2 text-right text-[14px] font-bold">
            Total {m(a.total_minor)}
          </p>
        </>
      )}
    </Card>
=======
    <Card className="p-space-4"><h3 className="text-[15px] font-bold text-ink-900">{title}<Help term={title} /></h3><p className="mb-space-3 text-[12.5px] text-ink-600">{hint}</p>
      {error && <p className="text-[13px] text-error">{error}</p>}
      {!a && !error && <SkeletonLines rows={2} />}
      {a && <><div className="grid grid-cols-5 gap-space-2 text-center">{AGING_ORDER.map((b) => <div key={b} className="rounded-md border border-line p-space-2"><p className="text-[11px] text-ink-400 uppercase">{b === "current" ? "Not due" : `${b} days`}</p><p className="text-[14px] font-semibold tabular-nums text-ink-900">{m(a.buckets[b] ?? 0)}</p></div>)}</div><p className="mt-space-2 text-right text-[14px] font-bold">Total {m(a.total_minor)}</p></>}</Card>
>>>>>>> main
  );
}

function AgingReports({ currency }: { currency: string }) {
  const ar = useErpQuery<
    Aging & {
      customer_credits_minor: number;
      items: {
        order_number: string;
        outstanding_minor: number;
        days_since_delivery: number;
        channel: string;
      }[];
    }
  >("/api/v1/finance/reports/receivables-aging");
  const ap = useErpQuery<
    Aging & {
      suppliers: {
        supplier: string;
        total_minor: number;
        buckets: Record<string, number>;
      }[];
    }
  >("/api/v1/finance/reports/payables-aging");
  const m = (v: number) => formatMoney(v, currency);
  return (
    <div className="space-y-space-4">
      <Buckets
        currency={currency}
        title="Customers owe us"
        hint="Delivered orders not yet fully paid (e.g. cash on delivery), aged from delivery."
        a={ar.data}
        error={ar.error}
      />
      {ar.data && ar.data.customer_credits_minor > 0 && (
        <p className="text-[13px] text-ink-600">
          Customer credits we owe back (returns not yet refunded, advances):{" "}
          <strong>{m(ar.data.customer_credits_minor)}</strong>
        </p>
      )}
      <Buckets
        currency={currency}
        title="We owe suppliers"
        hint="Goods received and not yet paid, aged from each bill's due date; payments are applied to the oldest bill first."
        a={ap.data}
        error={ap.error}
      />
      {ap.data && ap.data.suppliers.length > 0 && (
        <Card className="p-space-4">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr>
                <th className={`${th} !p-1`}>Supplier</th>
                {AGING_ORDER.map((b) => (
                  <th key={b} className={`${th} !p-1 text-right`}>
                    {b === "current" ? "Not due" : b}
                  </th>
                ))}
                <th className={`${th} !p-1 text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {ap.data.suppliers.map((s) => (
                <tr key={s.supplier} className="border-t border-line">
                  <td className="py-1.5 font-medium">{s.supplier}</td>
                  {AGING_ORDER.map((b) => (
                    <td key={b} className="text-right tabular-nums">
                      {s.buckets[b] ? m(s.buckets[b]) : "—"}
                    </td>
                  ))}
                  <td className="text-right font-semibold tabular-nums">
                    {m(s.total_minor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------------------------- tabs
export function FinancialReports({ currency }: { currency: string }) {
  const [sub, setSub] = useState<Sub>("pl");
  const { branchId } = useActiveBranch();
  return (
    <>
      {branchId && ["matrix", "products", "aging"].includes(sub) && (
        <p className="mb-space-3 text-[12.5px] text-ink-400">
          This report always covers the whole company; the branch filter applies
          to Profit &amp; loss and the Balance sheet.
        </p>
      )}
      <Tabs<Sub>
        tabs={[
          { key: "pl", label: "Profit & loss" },
          { key: "matrix", label: "Branch × channel" },
          { key: "bs", label: "Balance sheet" },
          { key: "gst", label: "GST" },
          { key: "gstr1", label: "GSTR-1 view" },
          { key: "products", label: "Product margin" },
          { key: "aging", label: "Receivables & payables" },
        ]}
        value={sub}
        onChange={setSub}
      />
      {sub === "pl" && <ProfitAndLoss currency={currency} />}
      {sub === "matrix" && <SalesMatrix currency={currency} />}
      {sub === "bs" && <BalanceSheet currency={currency} />}
      {sub === "gst" && <GstReport currency={currency} />}
      {sub === "gstr1" && <GstReturnReport currency={currency} />}
      {sub === "products" && <ProductReport currency={currency} />}
      {sub === "aging" && <AgingReports currency={currency} />}
    </>
  );
}
