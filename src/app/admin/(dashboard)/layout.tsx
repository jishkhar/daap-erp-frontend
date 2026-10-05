"use client";

import { usePathname } from "next/navigation";
import { AdminSecretGate } from "@/components/admin/AdminSecretGate";
import { AdminShell } from "@/components/admin/AdminShell";

const ACTIVE_BY_SEGMENT: Record<string, string> = {
  tenants: "tenants",
  plans: "plans",
};

/** Shared layout for the platform-admin pages: one sign-in gate and one shell instance that persist across navigation. */
export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segment = pathname.split("/")[2] || "";
  const active = ACTIVE_BY_SEGMENT[segment] || "";

  return (
    <AdminSecretGate title="Platform admin sign-in">
      <AdminShell active={active}>{children}</AdminShell>
    </AdminSecretGate>
  );
}
