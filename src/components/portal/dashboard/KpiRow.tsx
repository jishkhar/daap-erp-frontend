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
import { pctChange } from "./format";

/** The headline numbers. Each is a link to the page behind it; a tile is left out when the person may not see its figure. */
export function KpiRow({
  data,
  currency,
}: {
  data: Dashboard | undefined;
  currency: string;
}) {
  const loading = !data;
  const s = data?.sales;
  return (
    <div className="mb-space-4 grid gap-space-3 sm:grid-cols-2 xl:grid-cols-3">
      <Link href="/portal/orders">
        <StatTile
          loading={loading}
          label="Sales today"
          value={formatMoney(s?.revenue_minor ?? 0, currency)}
          deltaPct={s ? pctChange(s.revenue_minor, s.revenue_prev_minor) : null}
          hint="vs yesterday"
          tone="success"
          icon={<IndianRupee size={22} />}
        />
      </Link>
      <Link href="/portal/orders">
        <StatTile
          loading={loading}
          label="Orders today"
          value={s?.orders ?? 0}
          deltaPct={s ? pctChange(s.orders, s.orders_prev) : null}
          hint={s ? `vs yesterday · ${s.open_orders} open` : "vs yesterday"}
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
            hint={`${data?.customers?.new_today ?? 0} new today`}
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
      {(loading || data.refunds) && (
        <Link href="/portal/orders">
          <StatTile
            loading={loading}
            label="Refunds today"
            value={data?.refunds?.count ?? 0}
            deltaPct={null}
            upIsGood={false}
            hint={
              data?.refunds
                ? `${formatMoney(data.refunds.amount_minor, currency)} refunded`
                : ""
            }
            tone="info"
            icon={<RotateCcw size={22} />}
          />
        </Link>
      )}
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
