"use client";

import { Store } from "lucide-react";
import { ChannelStatusStrip } from "@/components/portal/channels/ChannelStatusStrip";
import { LearnMore } from "@/components/portal/help/HelpButton";
import { PosScreenEditor } from "@/components/portal/channels/PosScreenEditor";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { PageHeader } from "@/components/ui/PageHeader";

/** POS: how the till screen looks and what it says. Orders from it are in Orders (filter: POS). */
export default function PosChannelPage() {
  const { tenant, ready } = usePortalGuard();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="channel-pos">
      <PageHeader
        icon={<Store size={20} />}
        title="POS"
        description="Choose how the till screen looks and what it says."
        actions={<LearnMore doc="pos" />}
      />
      <ChannelStatusStrip channel="pos" />
      <PosScreenEditor storeName={tenant?.name ?? "Your store"} />
    </PortalShell>
  );
}
