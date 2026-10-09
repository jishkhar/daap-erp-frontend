"use client";

import { Globe, Store } from "lucide-react";
import { notFound } from "next/navigation";
import { use } from "react";
import {
  ChannelBranches,
  OnlineChannelPanel,
  PosChannelPanel,
  WhatsAppChannelPanel,
} from "@/components/portal/channels/ChannelPanels";
import { LearnMore } from "@/components/portal/help/HelpButton";
import { Button } from "@/components/ui/Button";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { WhatsAppIcon } from "@/components/portal/WhatsAppIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { CHANNELS, channelFromSlug } from "@/lib/erp";

const ICONS = { online: Globe, pos: Store, whatsapp: WhatsAppIcon } as const;
const PANELS = {
  online: OnlineChannelPanel,
  pos: PosChannelPanel,
  whatsapp: WhatsAppChannelPanel,
} as const;

export default function ChannelSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const channel = channelFromSlug(slug);
  const { tenant, ready } = usePortalGuard();
  if (!channel) notFound();
  if (!ready) return null;
  const Icon = ICONS[channel];
  const Panel = PANELS[channel];

  return (
    <PortalShell tenant={tenant} active="channels">
      <PageHeader
        icon={<Icon size={20} />}
        title={CHANNELS[channel].label}
        description={CHANNELS[channel].blurb}
        actions={
          <>
            <LearnMore doc={channel === "online" ? "online-store" : channel} />
            <Button variant="secondary" href={`/portal/channels/${channel}`}>
              Open {CHANNELS[channel].label}
            </Button>
          </>
        }
      />
      <Panel />
      <ChannelBranches channel={channel} />
    </PortalShell>
  );
}
