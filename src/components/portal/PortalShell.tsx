"use client";

import { CalendarDays, Menu } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { canOpenPath, landingPath, pageKeyForPath } from "@/lib/routeAccess";
import { BranchSwitcher } from "@/components/portal/BranchSwitcher";
import { GlobalFilter } from "@/components/portal/GlobalFilter";
import { HelpButton } from "@/components/portal/help/HelpButton";
import { SettingsMenu, SettingsNav } from "@/components/portal/SettingsNav";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { UserMenu } from "@/components/portal/UserMenu";
import type { PortalTenant } from "@/lib/portalAuth";
import { FILTER_PAGES, useGlobalFilterRequested } from "@/lib/globalFilter";
import { useStaffSession } from "@/lib/staffAuth";

const SharedShell = createContext(false);

/** Keep navigation mounted across portal page transitions. */
export function PersistentPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const session = useStaffSession();
  const section = pathname.split("/")[2] ?? "dashboard";
  if (section === "login" || !session) return children;
  const active =
    section === "channels"
      ? `channel-${pathname.split("/")[3]}`
      : ((
          {
            attendance: "my-attendance",
            "attendance-overview": "team-attendance",
          } as Record<string, string>
        )[section] ?? section);
  return (
    <PortalShell tenant={session.tenant} active={active}>
      <SharedShell.Provider value={true}>{children}</SharedShell.Provider>
    </PortalShell>
  );
}

type Props = {
  tenant: PortalTenant | null;
  active: string;
  children: React.ReactNode;
};

/** Shared shell for every /portal/* page: sidebar (a static column at `lg`
 * and up, an off-canvas drawer below it, behind a mobile top bar with a
 * hamburger toggle) plus the scrollable main content area. Every portal page
 * used to compose this same three-element structure (`<div className="flex
 * h-screen ..."><PortalSidebar/><main>...`) directly -- centralized here so
 * the mobile drawer's open/close state has exactly one owner instead of each
 * page reinventing it. */
export function PortalShell({ tenant, active, children }: Props) {
  const shared = useContext(SharedShell);
  const pathname = usePathname();
  const router = useRouter();
  const session = useStaffSession();
  // A page the person's role does not allow is not rendered, even when they type its address. Until the session is known, a page that
  // needs a permission renders nothing (rather than flashing).
  const restricted = pageKeyForPath(pathname) !== null;
  const allowed = session ? canOpenPath(session, pathname) : false;
  const onDashboard = pathname === "/portal/dashboard";
  useEffect(() => {
    // Signing in lands on the dashboard; someone who cannot use it goes to the first page they can.
    if (session && !allowed && onDashboard)
      router.replace(landingPath(session));
  }, [session, allowed, onDashboard, router]);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    if (main.current) main.current.scrollTop = 0;
  }, [pathname]);
  // The drawer is "open for the page it was opened on": navigating anywhere (a link tap, back/forward) closes it
  // without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const inSettings = pathname.startsWith("/portal/settings");
  const filterRequested = useGlobalFilterRequested();
  const sidebarOpen = openOn === pathname;
  const setSidebarOpen = (open: boolean) => setOpenOn(open ? pathname : null);

  const body = !session ? (
    restricted ? null : (
      children
    )
  ) : allowed ? (
    children
  ) : onDashboard ? null : (
    <div className="mx-auto mt-space-8 flex max-w-[420px] flex-col items-center text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper text-ink-400">
        <Lock size={22} />
      </span>
      <h1 className="mt-space-3 text-[18px] font-bold text-ink-900">
        You do not have access to this page
      </h1>
      <p className="mt-space-1 text-[13px] text-ink-600">
        Your role does not include it. Ask an administrator if you need it.
      </p>
      {session && (
        <Button
          className="mobile-page-action mt-space-4"
          href={landingPath(session)}
        >
          Go to a page you can use
        </Button>
      )}
    </div>
  );

  // The layout owns the frame; retain permission checks for nested page content.
  if (shared) return body;

  return (
    <div
      className="flex h-dvh overflow-hidden bg-paper"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {!inSettings && (
        <PortalSidebar
          tenant={tenant}
          active={active}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-space-3 border-b border-line bg-card px-space-4">
          {inSettings ? (
            <SettingsMenu />
          ) : (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="-ml-space-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-600 hover:bg-paper lg:hidden"
            >
              <Menu size={20} strokeWidth={2} />
            </button>
          )}
          <span className="truncate text-[14px] font-bold text-ink-900 lg:hidden">
            {tenant?.name || "ERP"}
          </span>
          <div className="ml-auto flex items-center gap-space-2">
            {FILTER_PAGES.includes(pathname) || filterRequested ? (
              <GlobalFilter />
            ) : (
              <span
                // the server and the browser can be on different days/timezones for a moment; the browser's wins
                suppressHydrationWarning
                className="mr-space-2 hidden items-center gap-space-2 rounded-md border border-line px-space-3 py-1.5 text-[13px] font-medium text-ink-600 md:flex"
              >
                <CalendarDays size={15} className="text-ink-400" />
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
            <BranchSwitcher />
            <HelpButton />
            <UserMenu />
          </div>
        </header>
        <BranchSwitcher mobile />

        {/* Settings on a wide screen: the settings menu is a fixed full-height column and only the page beside it scrolls, so the
            menu never moves with the page. Below `lg` the header hamburger opens the same menu in a drawer. */}
        <main
          ref={main}
          className={
            inSettings
              ? "flex-1 overflow-y-auto p-space-3 xs:p-space-4 sm:p-space-6 lg:flex lg:flex-col lg:overflow-hidden lg:p-0"
              : "flex-1 overflow-y-auto p-space-3 xs:p-space-4 sm:p-space-6"
          }
        >
          {inSettings ? (
            <div className="flex flex-col gap-space-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-0">
              <div className="hidden lg:flex lg:shrink-0">
                <SettingsNav />
              </div>
              <div className="min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto lg:p-space-6">
                <div className="mx-auto max-w-[880px]">{body}</div>
              </div>
            </div>
          ) : (
            body
          )}
        </main>
      </div>
    </div>
  );
}
