"use client";

import { Paintbrush } from "lucide-react";
import { useParams } from "next/navigation";
import { ThemeEditor } from "@/components/portal/channels/theme-editor/ThemeEditor";
import { ServiceLock } from "@/components/portal/channels/ServiceLock";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { PageHeader } from "@/components/ui/PageHeader";

/** Customize one installed theme of the online store. */
export default function ThemeEditorPage() {
  const { key } = useParams<{ key: string }>();
  const { tenant, ready } = usePortalGuard();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="channel-online">
      <PageHeader
        icon={<Paintbrush size={20} />}
        title="Customize theme"
        description="Change the look and text of your website, preview it, then publish."
      />
      <ServiceLock service="online">
        <ThemeEditor themeKey={key} />
      </ServiceLock>
    </PortalShell>
  );
}
