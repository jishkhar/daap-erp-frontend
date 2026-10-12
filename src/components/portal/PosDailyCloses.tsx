"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { useTerminalDayCloses, type DayCloseRow } from "@/hooks/useBranches";
import { formatDateTime, formatMoney } from "@/lib/erp";

function status(r: DayCloseRow) {
  switch (r.status) {
    case "matched":
      return <Badge tone="success">Matched</Badge>;
    case "missing":
      return (
        <Badge tone="error">
          {r.bills_missing} bill{r.bills_missing === 1 ? "" : "s"} missing
        </Badge>
      );
    case "after_close":
      return (
        <Badge tone="warning">
          {r.bills_after_close} bill{r.bills_after_close === 1 ? "" : "s"} after
          close
        </Badge>
      );
    case "open":
      return <Badge tone="neutral">Open today</Badge>;
    default:
      return <Badge tone="error">Not closed</Badge>;
  }
}

/** The POS end-of-day closes: per branch, one row per till and day. The server's figures come from the bills it has booked; the till's
 * are what the cashier closed with, so a bill still on the till shows as missing and a cash count that differs shows as over or short. */
export function PosDailyCloses({
  range,
  branchId,
  currency,
}: {
  range: { date_from: string; date_to: string };
  branchId: string | null;
  currency: string;
}) {
  const q = useTerminalDayCloses(range, branchId);
  // A user who may not see terminals gets a refusal; the section is then simply not there.
  if (q.error) return null;
  const branches = q.data?.branches ?? [];
  const money = (n: number) => formatMoney(n, currency);
  return (
    <Card className="mb-space-5 p-space-4">
      <h2 className="text-[15px] font-bold text-ink-900">POS daily closes</h2>
      <p className="mb-space-3 text-[13px] text-ink-600">
        What each till took each day, set beside what the server has booked.
        Cash difference is the cash counted in the drawer minus the cash on the
        till&apos;s bills.
      </p>
      {q.isFetching && !q.data && <SkeletonLines rows={3} />}
      {q.data && branches.length === 0 && (
        <p className="text-[13.5px] text-ink-400">
          No till has sold or closed a day in this period.
        </p>
      )}
      {branches.map((b) => (
        <div key={b.branch_id} className="mt-space-3">
          <div className="flex flex-wrap items-center justify-between gap-space-2">
            <h3 className="text-[14px] font-semibold text-ink-900">
              {b.branch_name}
            </h3>
            <p className="text-[12.5px] text-ink-600">
              {b.bills} bills · {money(b.total_minor)} · cash{" "}
              {money(b.cash_minor)} · card {money(b.card_minor)} · UPI{" "}
              {money(b.upi_minor)}
              {b.not_closed > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-error">{b.not_closed} not closed</span>
                </>
              )}
            </p>
          </div>
          <div className="mt-space-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="text-ink-400">
                <tr>
                  <th className="py-space-1 pr-space-3 font-medium">Date</th>
                  <th className="pr-space-3 font-medium">Till</th>
                  <th className="pr-space-3 text-right font-medium">Bills</th>
                  <th className="pr-space-3 text-right font-medium">Total</th>
                  <th className="pr-space-3 text-right font-medium">Cash</th>
                  <th className="pr-space-3 text-right font-medium">Counted</th>
                  <th className="pr-space-3 text-right font-medium">
                    Difference
                  </th>
                  <th className="font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...b.rows].reverse().map((r) => (
                  <tr key={`${r.terminal_id}-${r.date}`}>
                    <td className="py-space-2 pr-space-3">{r.date}</td>
                    <td className="pr-space-3">
                      {r.terminal_name}{" "}
                      <span className="text-ink-400">{r.terminal_code}</span>
                      {r.close && (
                        <span
                          className="block text-[11.5px] text-ink-400"
                          title={r.close.note ?? undefined}
                        >
                          closed {formatDateTime(r.close.closed_at)}
                          {r.close.closed_by_name
                            ? ` by ${r.close.closed_by_name}`
                            : ""}
                          {r.close.close_count > 1
                            ? ` · closed ${r.close.close_count} times`
                            : ""}
                        </span>
                      )}
                    </td>
                    <td className="pr-space-3 text-right">
                      {r.server.bills}
                      {r.close && r.close.bills !== r.server.bills && (
                        <span className="block text-[11.5px] text-ink-400">
                          till: {r.close.bills}
                        </span>
                      )}
                    </td>
                    <td className="pr-space-3 text-right">
                      {money(r.server.total_minor)}
                    </td>
                    <td className="pr-space-3 text-right">
                      {money(r.server.cash_minor)}
                    </td>
                    <td className="pr-space-3 text-right">
                      {r.close ? money(r.close.counted_cash_minor) : "—"}
                    </td>
                    <td
                      className={`pr-space-3 text-right ${
                        r.cash_difference_minor
                          ? "font-semibold text-error"
                          : ""
                      }`}
                    >
                      {r.cash_difference_minor === null
                        ? "—"
                        : r.cash_difference_minor === 0
                          ? "None"
                          : `${r.cash_difference_minor > 0 ? "Over " : "Short "}${money(Math.abs(r.cash_difference_minor))}`}
                    </td>
                    <td>{status(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </Card>
  );
}
