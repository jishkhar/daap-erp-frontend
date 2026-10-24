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
import { ServiceLock } from "@/components/portal/channels/ServiceLock";
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
        className={channel === "pos" ? "relative" : undefined}
        icon={<Icon size={20} />}
        title={
          <span
            className={channel === "pos" ? "block max-md:pr-28" : undefined}
          >
            {CHANNELS[channel].label}
          </span>
        }
        description={CHANNELS[channel].blurb}
        actions={
          <>
            <LearnMore
              doc={channel === "online" ? "online-store" : channel}
              className={
                channel === "pos"
                  ? "inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline max-md:absolute max-md:top-0 max-md:right-0 max-md:w-auto!"
                  : undefined
              }
            />
            <Button variant="secondary" href={`/portal/channels/${channel}`}>
              Open {CHANNELS[channel].label}
            </Button>
          </>
        }
      />
      <ServiceLock service={channel}>
        <Panel />
        <ChannelBranches channel={channel} />
      </ServiceLock>
    </PortalShell>
  );
}
