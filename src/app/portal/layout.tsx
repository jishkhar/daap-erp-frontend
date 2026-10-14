import { PersistentPortalShell } from "@/components/portal/PortalShell";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PersistentPortalShell>{children}</PersistentPortalShell>;
}
