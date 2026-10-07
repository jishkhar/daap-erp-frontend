"use client";

import { Construction } from "lucide-react";
import { notFound } from "next/navigation";
import { use } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { SETTINGS_NAV } from "@/components/portal/settingsNav";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ComingSoonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { tenant, ready } = usePortalGuard();
  const item = SETTINGS_NAV.find((i) => i.slug === slug && i.soon);
  if (!item) notFound();
  if (!ready) return null;
  const Icon = item.icon;

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader icon={<Icon size={20} />} title={item.label} />
      <Card className="flex flex-col items-center gap-space-2 p-space-6 text-center">
        <Construction size={28} className="text-ink-400" />
        <p className="text-[15px] font-bold text-ink-900">Coming soon</p>
        <p className="text-[13px] text-ink-600">
          {item.label} settings aren&apos;t available yet.
        </p>
      </Card>
    </PortalShell>
  );
}
