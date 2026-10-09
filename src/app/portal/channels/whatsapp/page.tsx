"use client";

import { ChannelStatusStrip } from "@/components/portal/channels/ChannelStatusStrip";
import { ServiceLock } from "@/components/portal/channels/ServiceLock";
import { WhatsAppTemplates } from "@/components/portal/channels/WhatsAppTemplates";
import { LearnMore } from "@/components/portal/help/HelpButton";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { WhatsAppIcon } from "@/components/portal/WhatsAppIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { CHANNELS } from "@/lib/erp";

/** WhatsApp: day-to-day use (templates; the inbox and automation have their own menu items). The connection is managed in Settings → Sales channels. */
export default function WhatsAppChannelPage() {
  const { tenant, ready } = usePortalGuard();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="channel-whatsapp">
      <PageHeader
        icon={<WhatsAppIcon size={20} />}
        title={CHANNELS.whatsapp.label}
        description={CHANNELS.whatsapp.blurb}
        actions={<LearnMore doc="whatsapp" />}
      />
      <ServiceLock service="whatsapp">
        <ChannelStatusStrip channel="whatsapp" />
        <WhatsAppTemplates />
      </ServiceLock>
    </PortalShell>
  );
}
