"use client";

import { Globe } from "lucide-react";
import { ChannelStatusStrip } from "@/components/portal/channels/ChannelStatusStrip";
import { LearnMore } from "@/components/portal/help/HelpButton";
import { OnlineStoreThemes } from "@/components/portal/channels/OnlineStoreThemes";
import { ServiceLock } from "@/components/portal/channels/ServiceLock";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { PageHeader } from "@/components/ui/PageHeader";

/** Website: how the website looks and reads. Orders from it are in Orders (filter: Website). */
export default function OnlineChannelPage() {
  const { tenant, ready } = usePortalGuard();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="channel-online">
      <PageHeader
        icon={<Globe size={20} />}
        title="Website"
        description="Pick a theme, customize it and publish it to your website."
        actions={<LearnMore doc="online-store" />}
      />
      <ServiceLock service="online">
        <ChannelStatusStrip channel="online" />
        <OnlineStoreThemes />
      </ServiceLock>
    </PortalShell>
  );
}
