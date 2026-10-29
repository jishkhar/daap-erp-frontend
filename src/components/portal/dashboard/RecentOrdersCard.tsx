import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChannelBadge, OrderStatusBadge } from "@/components/erp/StatusBadges";
import { Card } from "@/components/ui/Card";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { useRecentOrders } from "@/hooks/useOrders";
import { formatDateTime, formatMoney, humanize } from "@/lib/erp";
import type { useGlobalFilter } from "@/lib/globalFilter";
import { formatPhone } from "@/lib/phone";

/** The latest orders across the active branch scope, in the global filter's period and channel. */
export function RecentOrdersCard({
  branchId,
  filter,
}: {
  branchId: string | null;
  filter: ReturnType<typeof useGlobalFilter>["params"];
}) {
  const router = useRouter();
  const orders = useRecentOrders(branchId, 8, filter);
  const recent = orders.data ?? [];
  return (
    <Card className="p-space-4">
      <div className="mb-space-2 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-ink-900">Recent orders</h2>
        <Link
          href="/portal/orders"
          className="text-[13px] font-semibold text-brand-600 hover:underline"
        >
          View all
        </Link>
      </div>
      {recent.length === 0 &&
        (orders.isFetching ? (
          <SkeletonLines rows={2} />
        ) : (
          <p className="text-[13.5px] text-ink-400">
            {"No orders in this period."}
          </p>
        ))}
      {recent.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wide text-ink-400">
                <th className="py-space-2 pr-space-3">Order</th>
                <th className="py-space-2 pr-space-3">Customer</th>
                <th className="py-space-2 pr-space-3">Channel</th>
                <th className="py-space-2 pr-space-3">Date</th>
                <th className="py-space-2 pr-space-3 text-right">Qty</th>
                <th className="py-space-2 pr-space-3 text-right">Amount</th>
                <th className="py-space-2 pr-space-3">Payment</th>
                <th className="py-space-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recent.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => router.push(`/portal/orders/${o.id}`)}
                  className="cursor-pointer hover:bg-black/[0.02]"
                >
                  <td className="py-space-2 pr-space-3 font-semibold text-ink-900">
                    <Link href={`/portal/orders/${o.id}`}>
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="py-space-2 pr-space-3">
                    {o.customer_name || o.customer_phone ? (
                      <>
                        <span className="block font-medium text-ink-900">
                          {o.customer_name ?? o.customer_phone}
                        </span>
                        {o.customer_name && o.customer_phone && (
                          <span className="block text-[12px] text-ink-600">
                            {formatPhone(o.customer_phone)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-400">Walk-in</span>
                    )}
                  </td>
                  <td className="py-space-2 pr-space-3">
                    <ChannelBadge channel={o.channel} />
                  </td>
                  <td className="py-space-2 pr-space-3 text-ink-600">
                    {formatDateTime(o.placed_at)}
                  </td>
                  <td className="py-space-2 pr-space-3 text-right">
                    {o.item_count ?? 0}
                  </td>
                  <td className="py-space-2 pr-space-3 text-right font-medium">
                    {formatMoney(o.total_minor, o.currency)}
                  </td>
                  <td className="py-space-2 pr-space-3 capitalize text-ink-600">
                    {humanize(o.payment_status)}
                  </td>
                  <td className="py-space-2">
                    <OrderStatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
