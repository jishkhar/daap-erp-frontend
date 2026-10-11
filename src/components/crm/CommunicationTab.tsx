"use client";

import { useState } from "react";
import { MessageList } from "@/components/crm/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { MESSAGE_CHANNELS, type CrmMessage, type CrmNote, type MessageChannel } from "@/lib/crm";
import { erp, formatDateTime, useErpQuery } from "@/lib/erp";
import { toast } from "@/lib/toast";

export function CommunicationTab({ canEdit, onChanged, onOpenCustomer }: { canEdit: boolean; onChanged: () => void; onOpenCustomer: (id: string) => void }) {
  const [channel, setChannel] = useState<"" | MessageChannel>("");
  const messages = useErpQuery<CrmMessage[]>("/api/v1/crm/messages");
  const followUps = useErpQuery<CrmNote[]>("/api/v1/crm/follow-ups");
  const shown = (messages.data ?? []).filter((m) => !channel || m.channel === channel);

  async function done(n: CrmNote) {
    const res = await erp(`/api/v1/crm/notes/${n.id}`, "PATCH", { done: true });
    if (res.error) return toast.error("Couldn't update the follow-up", res.error);
    followUps.reload();
    onChanged();
  }

  return (
    <div className="grid gap-space-4 lg:grid-cols-3">
      <Card className="p-space-4 lg:col-span-2">
        <div className="mb-space-3 flex flex-wrap items-center justify-between gap-space-2">
          <h2 className="text-[15px] font-bold text-ink-900">Message history</h2>
          <span className="flex gap-space-1">
            <Button variant={channel === "" ? "primary" : "ghost"} onClick={() => setChannel("")}>All</Button>
            {(Object.keys(MESSAGE_CHANNELS) as MessageChannel[]).map((c) => (
              <Button key={c} variant={channel === c ? "primary" : "ghost"} onClick={() => setChannel(c)}>{MESSAGE_CHANNELS[c]}</Button>
            ))}
          </span>
        </div>
        {messages.loading ? <SkeletonLines rows={3} /> : <MessageList messages={shown} showCustomer empty="No messages yet. Message a customer from their profile, or send a campaign." />}
      </Card>
      <Card className="p-space-4">
        <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">Follow-ups</h2>
        {followUps.loading && <SkeletonLines rows={2} />}
        {!followUps.loading && (followUps.data ?? []).length === 0 && <p className="text-[13px] text-ink-400">Nothing to follow up.</p>}
        <ul className="space-y-space-3">
          {(followUps.data ?? []).map((n) => {
            const overdue = n.follow_up_at !== null && new Date(n.follow_up_at) < new Date();
            return (
              <li key={n.id} className="text-[13.5px]">
                <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => onOpenCustomer(n.customer_id)}>{n.customer_name}</button>
                <p className="text-ink-900">{n.body}</p>
                <p className="flex items-center gap-space-2 text-[12px] text-ink-400">
                  <Badge tone={overdue ? "error" : "warning"}>{overdue ? "Overdue" : "Due"} {n.follow_up_at ? formatDateTime(n.follow_up_at) : ""}</Badge>
                  {canEdit && <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => done(n)}>Mark done</button>}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
