"use client";

import { Globe, ShoppingCart, Store } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { ChannelConnections } from "@/components/erp/ChannelConnections";
import { OrdersView } from "@/components/erp/OrdersView";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatTile } from "@/components/portal/StatTile";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { WhatsAppIcon } from "@/components/portal/WhatsAppIcon";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useActiveBranch } from "@/lib/branch";
import {
  CHANNELS,
  channelFromSlug,
  formatMoney,
  qs,
  useErpQuery,
  type Order,
} from "@/lib/erp";

const ICONS = { online: Globe, pos: Store, whatsapp: WhatsAppIcon } as const;

/** One sales channel: its own orders, headline numbers, and the credentials that connect it to the ERP. */
export default function ChannelPage() {
  const { slug } = useParams<{ slug: string }>();
  const channel = channelFromSlug(slug);
  const { tenant, ready } = usePortalGuard();
  const { branchId } = useActiveBranch();
  const stats = useErpQuery<Order[]>(
    channel
      ? `/api/v1/orders${qs({ channel, branch_id: branchId, limit: 200 })}`
      : null,
  );

  const summary = useMemo(() => {
    const live = (stats.data ?? []).filter((o) => o.status !== "cancelled");
    return {
      count: live.length,
      revenue: live.reduce((sum, o) => sum + o.total_minor, 0),
      open: live.filter(
        (o) => o.status === "pending" || o.status === "confirmed",
      ).length,
    };
  }, [stats.data]);

  if (!ready) return null;
  if (!channel) {
    return (
      <PortalShell tenant={tenant} active="">
        <PageHeader
          title="Channel not found"
          description="That sales channel doesn't exist."
        />
        <Link
          href="/portal/dashboard"
          className="text-[14px] font-semibold text-brand-600 hover:underline"
        >
          Back to the dashboard
        </Link>
      </PortalShell>
    );
  }
  const Icon = ICONS[slug as keyof typeof ICONS];
  const info = CHANNELS[channel];

  return (
    <PortalShell tenant={tenant} active={`channel-${slug}`}>
      <PageHeader
        scopedToBranch
        icon={<Icon size={20} />}
        title={`${info.label} sales`}
        description={info.blurb}
        actions={
          <Button href={`/portal/orders/new?channel=${channel}`}>
            New order
          </Button>
        }
      />
      <div className="mb-space-5 grid gap-space-3 sm:grid-cols-3">
        <StatTile
          label="Orders"
          value={summary.count}
          deltaPct={null}
          hint="excluding cancelled"
          icon={<ShoppingCart size={22} />}
        />
        <StatTile
          label="Revenue"
          value={formatMoney(summary.revenue, tenant?.currency)}
          deltaPct={null}
          hint="excluding cancelled"
          tone="success"
          icon={<Icon size={22} />}
        />
        <StatTile
          label="Open orders"
          value={summary.open}
          deltaPct={null}
          hint="awaiting payment or fulfilment"
          tone="warning"
          icon={<ShoppingCart size={22} />}
        />
      </div>
      <OrdersView channel={channel} />
      {channel !== "pos" && <ChannelConnections channel={channel} />}{" "}
      {/* the till connects by terminal pairing, not an API key */}
    </PortalShell>
  );
}
