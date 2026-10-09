"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useStaffSession } from "@/lib/staffAuth";
import { SETTINGS_NAV } from "@/components/portal/settingsNav";

const initials = (s: string) =>
  s
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

/** Second-level sidebar shown on every /portal/settings/* page (rendered by PortalShell). */
export function SettingsNav() {
  const pathname = usePathname();
  const session = useStaffSession();
  const [q, setQ] = useState("");
  const items = SETTINGS_NAV.filter((i) =>
    i.label.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const isActive = (href: string, slug: string) =>
    slug === "general"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  const name = session?.tenant.name ?? "Settings";

  return (
    <aside className="w-full shrink-0 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-line lg:bg-card lg:p-space-3">
      <Link
        href="/portal/dashboard"
        className="mb-space-2 inline-flex shrink-0 items-center gap-space-2 text-[13px] font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={14} /> Back to portal
      </Link>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-card shadow-[var(--shadow-sm)] lg:flex-1 lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none">
        <div className="flex shrink-0 items-center gap-space-3 border-b border-line bg-paper px-space-3 py-space-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-600 text-[12px] font-bold text-white">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-ink-900">
              {name}
            </p>
            <p className="truncate text-[12px] text-ink-600">
              {session?.tenant.code ?? ""}
            </p>
          </div>
        </div>
        <div className="shrink-0 p-space-2">
          <label className="relative block">
            <Search
              size={14}
              className="absolute left-space-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              aria-label="Search settings"
              className="h-9 w-full rounded-md border border-line bg-card pl-8 pr-space-2 text-[13px] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-space-2 pb-space-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto">
          {items.map(({ slug, label, icon: Icon, href }) => (
            <Link
              key={slug}
              href={href}
              aria-current={isActive(href, slug) ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-space-3 whitespace-nowrap rounded-md px-space-3 py-2 text-[13px] font-medium text-ink-700 hover:bg-paper lg:whitespace-normal",
                isActive(href, slug) &&
                  "bg-brand-50 font-semibold text-brand-700",
              )}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          ))}
          {items.length === 0 && (
            <p className="px-space-3 py-2 text-[13px] text-ink-400">No match</p>
          )}
        </nav>
        {session && (
          <div className="hidden shrink-0 items-center gap-space-3 border-t border-line px-space-3 py-space-3 lg:flex">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-100 text-[11px] font-bold text-brand-700">
              {initials(session.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink-900">
                {session.name}
              </p>
              {session.email && (
                <p
                  className="truncate text-[12px] text-ink-600"
                  title={session.email}
                >
                  {session.email}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
