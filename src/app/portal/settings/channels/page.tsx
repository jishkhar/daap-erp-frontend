"use client";

import { ChevronRight, Globe, Store } from "lucide-react";
import Link from "next/link";
import { useChannelStatuses } from "@/components/portal/channels/ChannelPanels";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { WhatsAppIcon } from "@/components/portal/WhatsAppIcon";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { CHANNELS, CHANNEL_ORDER } from "@/lib/erp";

const ICONS = { online: Globe, pos: Store, whatsapp: WhatsAppIcon } as const;

export default function SalesChannelsPage() {
  const { tenant, ready } = usePortalGuard();
  const status = useChannelStatuses();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="channels">
      <PageHeader
        title="Sales channels"
        description="Where your orders come from. Pick a channel to set up how it connects to the ERP."
      />
      <Card className="divide-y divide-line">
        {CHANNEL_ORDER.map((c) => {
          const Icon = ICONS[c];
          const s = status?.[c];
          return (
            <Link
              key={c}
              href={`/portal/settings/channels/${c}`}
              className="flex items-center gap-space-3 p-space-4 hover:bg-paper"
            >
              <Icon size={22} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink-900">
                  {CHANNELS[c].label}
                </span>
                <span className="block text-[12.5px] text-ink-600">
                  {CHANNELS[c].blurb}
                </span>
              </span>
              {s && <Badge tone={s.tone}>{s.label}</Badge>}
              <ChevronRight size={16} className="text-ink-400" />
            </Link>
          );
        })}
      </Card>
    </PortalShell>
  );
}
