"use client";

import { LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { FirstRunChecklist } from "@/components/portal/onboarding/guide";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { BreakdownCard } from "@/components/portal/dashboard/BreakdownCard";
import { ChannelsCard } from "@/components/portal/dashboard/ChannelsCard";
import { KpiRow } from "@/components/portal/dashboard/KpiRow";
import { NeedsAttention } from "@/components/portal/dashboard/NeedsAttention";
import { RecentOrdersCard } from "@/components/portal/dashboard/RecentOrdersCard";
import { SalesTrend } from "@/components/portal/dashboard/SalesTrend";
import { TopProducts } from "@/components/portal/dashboard/TopProducts";
import { PageHeader } from "@/components/ui/PageHeader";
import { useDashboard, type DashboardRange } from "@/hooks/useDashboard";
import { useActiveBranch } from "@/lib/branch";
import { useStaffSession } from "@/lib/staffAuth";

export default function DashboardPage() {
  const { tenant, ready } = usePortalGuard();
  const { branchId } = useActiveBranch();
  const session = useStaffSession();
  const [range, setRange] = useState<DashboardRange>("7d");
  const dash = useDashboard(branchId, range);
  const currency = tenant?.currency ?? "INR";

  if (!ready) return null;
  const data = dash.data;
  // The range or branch just changed: the old figures stay on screen (faded, with a spinner) until the new ones arrive.
  const refreshing = dash.isPlaceholderData;

  return (
    <PortalShell tenant={tenant} active="dashboard">
      <PageHeader
        scopedToBranch
        icon={<LayoutDashboard size={20} />}
        title="Dashboard"
        description={`A snapshot of ${branchId === null ? "all your branches" : "this branch"}.`}
      />
      <FirstRunChecklist />
      {dash.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {dash.error.message}
        </p>
      )}

      <KpiRow data={data} currency={currency} />

      <div className="mb-space-4 grid gap-space-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesTrend
            refreshing={refreshing}
            data={data}
            range={range}
            onRange={setRange}
            currency={currency}
          />
        </div>
        <BreakdownCard
          refreshing={refreshing}
          data={data}
          range={range}
          currency={currency}
        />
      </div>

      <div className="mb-space-4 grid gap-space-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RecentOrdersCard branchId={branchId} />
        </div>
        <NeedsAttention data={data} currency={currency} />
      </div>

      <div className="grid gap-space-4 xl:grid-cols-3">
        <TopProducts
          refreshing={refreshing}
          data={data}
          range={range}
          currency={currency}
        />
        <div className="xl:col-span-2">
          <ChannelsCard data={data} services={session?.services} />
        </div>
      </div>
    </PortalShell>
  );
}
