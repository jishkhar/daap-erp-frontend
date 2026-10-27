import {
  AlertTriangle,
  Boxes,
  IndianRupee,
  RotateCcw,
  ShoppingCart,
  Users,
} from "lucide-react";
import Link from "next/link";
import { StatTile } from "@/components/portal/StatTile";
import type { Dashboard } from "@/hooks/useDashboard";
import { formatMoney } from "@/lib/erp";
import { prevText } from "@/lib/globalFilter";
import { pctChange } from "./format";

/** The headline numbers for the global filter's period, each against the period before it (stock is as of now). Each is a link to the
 * page behind it; a tile is left out when the person may not see its figure. */
export function KpiRow({
  data,
  currency,
}: {
  data: Dashboard | undefined;
  currency: string;
}) {
  const loading = !data;
  const s = data?.sales;
  const vs = prevText(data?.period);
  return (
    <div className="mb-space-4 grid gap-space-3 sm:grid-cols-2 xl:grid-cols-3">
      <Link href="/portal/orders">
        <StatTile
          loading={loading}
          label="Sales"
          value={formatMoney(s?.revenue_minor ?? 0, currency)}
          deltaPct={s ? pctChange(s.revenue_minor, s.revenue_prev_minor) : null}
          hint={s && s.returns_minor > 0 ? `after returns · ${vs}` : vs}
          tone="success"
          icon={<IndianRupee size={22} />}
        />
      </Link>
      <Link href="/portal/orders">
        <StatTile
          loading={loading}
          label="Orders"
          value={s?.orders ?? 0}
          deltaPct={s ? pctChange(s.orders, s.orders_prev) : null}
          hint={s ? `${vs} · ${s.open_orders} open now` : ""}
          icon={<ShoppingCart size={22} />}
        />
      </Link>
      {(loading || data.customers) && (
        <Link href="/portal/customers">
          <StatTile
            loading={loading}
            label="Customers"
            value={data?.customers?.total ?? 0}
            deltaPct={null}
            hint={
              data?.customers
                ? `${data.customers.new} new in this period (${data.customers.new_prev} before)`
                : ""
            }
            tone="violet"
            icon={<Users size={22} />}
          />
        </Link>
      )}
      {(loading || data.stock) && (
        <Link href="/portal/inventory">
          <StatTile
            loading={loading}
            label="Stock value"
            value={formatMoney(data?.stock?.value_minor ?? 0, currency)}
            deltaPct={null}
            hint="at cost, as of now"
            tone="clay"
            icon={<Boxes size={22} />}
          />
        </Link>
      )}
      <Link href="/portal/returns">
        <StatTile
          loading={loading}
          label="Returns"
          value={data?.returns.count ?? 0}
          deltaPct={
            data ? pctChange(data.returns.count, data.returns.count_prev) : null
          }
          upIsGood={false}
          hint={
            data
              ? `${formatMoney(data.returns.amount_minor, currency)} came back${data.refunds ? ` · ${formatMoney(data.refunds.amount_minor, currency)} refunded` : ""}`
              : ""
          }
          tone="info"
          icon={<RotateCcw size={22} />}
        />
      </Link>
      {(loading || data.stock) && (
        <Link href="/portal/inventory">
          <StatTile
            loading={loading}
            label="Low-stock items"
            value={data?.stock?.low_items ?? 0}
            deltaPct={null}
            hint="at or below reorder level"
            tone="warning"
            icon={<AlertTriangle size={22} />}
          />
        </Link>
      )}
    </div>
  );
}
