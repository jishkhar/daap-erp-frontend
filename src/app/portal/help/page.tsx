"use client";

import { ArrowRight, CircleHelp, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { DOCS } from "@/content/help";

/** Help centre index: one card per doc, searchable by title, summary and section headings. */
export default function HelpPage() {
  const { tenant, ready } = usePortalGuard();
  const [q, setQ] = useState("");
  if (!ready) return null;
  const needle = q.trim().toLowerCase();
  const docs = DOCS.filter(
    (d) =>
      !needle ||
      [d.title, d.summary, ...d.sections.map((s) => s.title)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
  );
  return (
    <PortalShell tenant={tenant} active="help">
      <PageHeader
        icon={<CircleHelp size={20} />}
        title="Help"
        description="How each part of the system works and what you can configure."
      />
      <div className="relative mb-space-4 max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-400"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the help"
          aria-label="Search the help"
          className="pl-9"
        />
      </div>
      {docs.length === 0 && (
        <p className="text-[14px] text-ink-400">Nothing matches “{q}”.</p>
      )}
      <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((d) => (
          <Link key={d.slug} href={`/portal/help/${d.slug}`}>
            <Card elevation="interactive" className="h-full p-space-5">
              <h2 className="text-[16px] font-bold text-ink-900">{d.title}</h2>
              <p className="mt-space-1 text-[13.5px] text-ink-600">
                {d.summary}
              </p>
              <p className="mt-space-3 flex items-center gap-1 text-[13px] font-semibold text-brand-600">
                Read <ArrowRight size={14} />
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </PortalShell>
  );
}
