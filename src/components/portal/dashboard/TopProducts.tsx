import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SkeletonLines } from "@/components/ui/Skeleton";
import type { Dashboard } from "@/hooks/useDashboard";
import { formatMoney } from "@/lib/erp";
import { periodText } from "@/lib/globalFilter";
import { Refreshing } from "./Refreshing";

/** The five products that sold the most units in the chosen period. */
export function TopProducts({
  data,
  currency,
  refreshing,
}: {
  data: Dashboard | undefined;
  currency: string;
  refreshing: boolean;
}) {
  const rows = data?.top_products ?? [];
  return (
    <Card className="p-space-4">
      <div className="mb-space-2 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">
            Top selling products
          </h2>
          <p className="text-hint">{periodText(data?.period)}</p>
        </div>
        <Link
          href="/portal/products"
          className="text-[13px] font-semibold text-brand-600 hover:underline"
        >
          View all
        </Link>
      </div>
      <Refreshing active={refreshing}>
        {!data ? (
          <SkeletonLines rows={4} />
        ) : rows.length === 0 ? (
          <p className="text-[13.5px] text-ink-400">
            Nothing sold in this period yet.
          </p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wide text-ink-400">
                <th className="w-6 py-space-2">#</th>
                <th className="py-space-2">Product</th>
                <th className="py-space-2 text-right">Sold</th>
                <th className="py-space-2 text-right">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => (
                <tr key={r.key}>
                  <td className="py-space-2 text-ink-400">{i + 1}</td>
                  <td className="max-w-[160px] truncate py-space-2 font-medium text-ink-900">
                    {r.name}
                  </td>
                  <td className="py-space-2 text-right tabular-nums">
                    {r.units}
                  </td>
                  <td className="py-space-2 text-right font-medium tabular-nums">
                    {formatMoney(r.amount_minor, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Refreshing>
    </Card>
  );
}
