"use client";

import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import { DocView } from "@/components/portal/help/DocView";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import { DOCS, docBySlug } from "@/content/help";

export default function HelpDocPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = use(params);
  const doc = docBySlug(topic);
  const { tenant, ready } = usePortalGuard();
  if (!doc) notFound();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="help">
      <PageHeader
        icon={<CircleHelp size={20} />}
        title={doc.title}
        description={doc.summary}
        actions={
          doc.setup && <Button href={doc.setup.href}>{doc.setup.label}</Button>
        }
      />
      <div className="grid gap-space-6 lg:grid-cols-[200px_minmax(0,1fr)_200px]">
        <nav
          aria-label="Help topics"
          className="lg:sticky lg:top-0 lg:self-start"
        >
          <Link
            href="/portal/help"
            className="mb-space-2 block text-[12px] font-semibold text-ink-400 hover:text-ink-900"
          >
            All help
          </Link>
          <ul className="space-y-0.5">
            {DOCS.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/portal/help/${d.slug}`}
                  className={cn(
                    "block rounded-md px-space-2 py-1.5 text-[13.5px]",
                    d.slug === doc.slug
                      ? "bg-brand-50 font-semibold text-brand-700"
                      : "text-ink-600 hover:bg-black/[0.04]",
                  )}
                >
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 max-w-3xl">
          <DocView doc={doc} />
        </div>
        <nav
          aria-label="On this page"
          className="hidden lg:sticky lg:top-0 lg:block lg:self-start"
        >
          <p className="mb-space-2 text-[12px] font-semibold text-ink-400">
            On this page
          </p>
          <ul className="space-y-1">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block text-[13px] text-ink-600 hover:text-brand-600"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </PortalShell>
  );
}
