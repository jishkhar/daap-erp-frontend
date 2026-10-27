"use client";

import { ArrowLeftRight, Inbox, Search, Undo2 } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  ReturnDetailPanel,
  ReturnStatusBadge,
} from "@/components/portal/returns/ReturnDetailPanel";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { useReturnList } from "@/hooks/useReturns";
import { useActiveBranch } from "@/lib/branch";
import { cn } from "@/lib/cn";
import { formatMoney, humanize } from "@/lib/erp";
import { useGlobalFilter } from "@/lib/globalFilter";
import { REASON_LABEL, REFUND_LABEL } from "@/lib/returns";
import { useDebounced } from "@/lib/useDebounced";

type Tab = "return" | "exchange" | "requests";
function ReturnsView() {
  const { tenant, ready } = usePortalGuard();
  const params = useSearchParams();
  const { branchId } = useActiveBranch();
  const [tab, setTab] = useState<Tab>(
    params.get("status") === "open" ? "requests" : "return",
  );
  const [query, setQuery] = useState("");
  // the period and channel come from the header's global filter
  const { params: global } = useGlobalFilter();
  const [selected, setSelected] = useState<string | null>(params.get("id"));
  const q = useDebounced(query.trim(), 300);
  const filters = useMemo(
    () => ({
      kind: tab === "requests" ? null : tab,
      status: tab === "requests" ? "open" : null,
      channel: global.channel,
      branch_id: branchId,
      // website requests still to handle are listed whatever the period, so none hides behind it
      ...(tab === "requests"
        ? {}
        : {
            period: global.period,
            from: global.date_from,
            to: global.date_to,
          }),
      q: q || null,
    }),
    [tab, global, branchId, q],
  );
  const list = useReturnList(filters);
  const rows = list.data?.items ?? [];
  const shown = selected ?? rows[0]?.id ?? null; // the newest one until the person picks another
  if (!ready) return null;
  const cur = tenant?.currency ?? "INR";
  const counts = list.data?.counts;

  const tabs: {
    key: Tab;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      key: "return",
      label: "Sales returns",
      icon: <Undo2 size={16} />,
      count: counts?.returns,
    },
    {
      key: "exchange",
      label: "Exchanges",
      icon: <ArrowLeftRight size={16} />,
      count: counts?.exchanges,
    },
    {
      key: "requests",
      label: "Website requests",
      icon: <Inbox size={16} />,
      count: counts?.requests,
    },
  ];

  return (
    <PortalShell tenant={tenant} active="returns">
      <PageHeader
        icon={<Undo2 size={20} />}
        title="Returns & exchanges"
        description="Goods customers brought back, from the counter, the website and WhatsApp. Take a new one from the order's page."
      />
      <div
        aria-label="Return views"
        className="mb-space-4 grid grid-cols-3 gap-2 md:gap-space-3"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={tab === t.key}
            onClick={() => {
              setTab(t.key);
              setSelected(null);
            }}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 text-center text-[12px] leading-4 font-semibold md:flex-row md:gap-space-2 md:px-space-4 md:py-space-3 md:text-[14px] md:leading-normal",
              tab === t.key
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-line bg-card text-ink-700 hover:bg-black/[0.02]",
            )}
          >
            <span className="flex items-center gap-1.5 md:contents">
              {t.icon}
              {t.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-2 text-[12px] md:order-2",
                    t.key === "requests" && t.count > 0
                      ? "bg-warning-tint text-warning"
                      : "bg-black/[0.05]",
                  )}
                >
                  {t.count}
                </span>
              )}
            </span>
            <span className="flex min-h-8 items-center justify-center md:order-1 md:min-h-0">
              {t.label}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-space-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0 p-space-4">
          <div className="mb-space-3 flex flex-wrap gap-space-2">
            <label className="flex h-11 min-w-0 basis-full items-center gap-space-2 rounded-md border border-line bg-card px-space-3 text-ink-400 focus-within:border-brand-400 md:h-10 md:min-w-[220px] md:flex-1 md:basis-auto">
              <Search size={16} className="shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by bill, order, return number, customer or product…"
                className="min-w-0 w-full bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-400"
              />
            </label>
          </div>
          {list.error && (
            <p className="mb-space-2 text-[13px] text-error">
              {list.error.message}
            </p>
          )}
          {!list.data ? (
            <SkeletonLines rows={5} />
          ) : rows.length === 0 ? (
            <p className="py-space-6 text-center text-[13.5px] text-ink-400">
              {tab === "requests"
                ? "No website requests waiting."
                : "Nothing here for this period."}
            </p>
          ) : (
            <div
              className={cn(
                "overflow-x-auto transition-opacity",
                list.isPlaceholderData && "opacity-60",
              )}
            >
              <table className="w-full whitespace-nowrap text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wide text-ink-400">
                    <th className="py-space-2 pr-space-3">Date & time</th>
                    <th className="py-space-2 pr-space-3">Return</th>
                    <th className="py-space-2 pr-space-3">Bill</th>
                    <th className="py-space-2 pr-space-3">Customer</th>
                    <th className="py-space-2 pr-space-3">Item(s)</th>
                    <th className="py-space-2 pr-space-3">Reason</th>
                    <th className="py-space-2 pr-space-3 text-right">Qty</th>
                    <th className="py-space-2 pr-space-3">Refund mode</th>
                    <th className="py-space-2 pr-space-3 text-right">Amount</th>
                    <th className="py-space-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r.id)}
                      className={cn(
                        "cursor-pointer hover:bg-black/[0.02]",
                        shown === r.id && "bg-brand-50/60",
                      )}
                    >
                      <td className="py-space-2 pr-space-3 text-ink-600">
                        {new Date(r.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                        <br />
                        <span className="text-[12px]">
                          {new Date(r.created_at).toLocaleTimeString("en-IN", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="py-space-2 pr-space-3 font-semibold text-ink-900">
                        {r.return_number}
                      </td>
                      <td className="py-space-2 pr-space-3 font-semibold text-brand-700">
                        {r.bill_number ?? r.order_number}
                        <br />
                        <span className="text-[11.5px] font-normal text-ink-400">
                          {humanize(r.order_channel)}
                        </span>
                      </td>
                      <td className="max-w-[140px] truncate py-space-2 pr-space-3">
                        {r.customer_name ?? "Walk-in"}
                      </td>
                      <td className="max-w-[180px] truncate py-space-2 pr-space-3">
                        {r.first_item_name}
                        {r.line_count > 1 && (
                          <span className="text-ink-400">
                            {" "}
                            +{r.line_count - 1}
                          </span>
                        )}
                      </td>
                      <td className="py-space-2 pr-space-3">
                        {REASON_LABEL[r.reason_code]}
                      </td>
                      <td className="py-space-2 pr-space-3 text-right tabular-nums">
                        {r.quantity}
                      </td>
                      <td className="py-space-2 pr-space-3">
                        {r.kind === "exchange" && r.status === "completed"
                          ? "Exchange"
                          : r.refund_mode
                            ? REFUND_LABEL[r.refund_mode]
                            : "—"}
                      </td>
                      <td className="py-space-2 pr-space-3 text-right font-semibold tabular-nums">
                        {formatMoney(
                          r.status === "completed"
                            ? r.refund_minor
                            : r.items_value_minor,
                          cur,
                        )}
                      </td>
                      <td className="py-space-2">
                        <ReturnStatusBadge r={r} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <div>
          {shown ? (
            <ReturnDetailPanel id={shown} currency={cur} />
          ) : (
            <Card className="p-space-4 text-center text-[13px] text-ink-400">
              Pick a return to see its details.
            </Card>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense fallback={null}>
      <ReturnsView />
    </Suspense>
  );
}
