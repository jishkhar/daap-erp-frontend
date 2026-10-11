"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { useErpQuery } from "@/lib/erp";

export function TagsTab({ onOpenTag }: { onOpenTag: (tag: string) => void }) {
  const tags = useErpQuery<{ tag: string; customers: number }[]>("/api/v1/crm/tags");
  return (
    <Card className="p-space-4">
      <h2 className="mb-space-1 text-[15px] font-bold text-ink-900">Tags in use</h2>
      <p className="mb-space-3 text-[13px] text-ink-600">
        Tag customers from their profile, or select several in All Customers and use “Add tag”. Click a tag to see its customers, or use it as the audience of a campaign.
      </p>
      {tags.loading && <SkeletonLines rows={2} />}
      {!tags.loading && (tags.data ?? []).length === 0 && <p className="text-[13px] text-ink-400">No tags yet.</p>}
      <div className="flex flex-wrap gap-space-2">
        {(tags.data ?? []).map((t) => (
          <Button key={t.tag} variant="ghost" onClick={() => onOpenTag(t.tag)}>
            <Badge tone="clay" className="normal-case">{t.tag}</Badge> {t.customers} customer{t.customers === 1 ? "" : "s"}
          </Button>
        ))}
      </div>
    </Card>
  );
}
