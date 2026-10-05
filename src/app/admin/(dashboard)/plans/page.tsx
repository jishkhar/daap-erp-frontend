"use client";

import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAdminQuery } from "@/lib/adminQuery";
import type { Plan } from "../tenants/page";

export default function PlansPage() {
  const { data: plans, error } = useAdminQuery<Plan[]>("/api/platform/plans");

  return (
    <>
      <PageHeader icon={<Layers size={20} />} title="Plans" description="What each subscription includes. Plans are defined in code and synced at startup." />
      {error && <p className="mb-space-3 text-error">{error}</p>}
      <div className="grid gap-space-4 md:grid-cols-3">
        {(plans ?? []).map((p) => (
          <Card key={p.id} className="p-space-4">
            <h2 className="text-[17px] font-bold text-ink-900">{p.name}</h2>
            <p className="mt-1 text-[13px] text-ink-600">{p.max_branches ?? "Unlimited"} branches · {p.max_users ?? "Unlimited"} users</p>
            <div className="mt-space-3 flex flex-wrap gap-1.5">{p.features.map((f) => <Badge key={f} tone="neutral">{f.replace("channel.", "").replace(/_/g, " ")}</Badge>)}</div>
          </Card>
        ))}
      </div>
    </>
  );
}
