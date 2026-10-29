"use client";

import { ArrowLeft, Bot, MessageCircle, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SetupRequired } from "@/components/portal/channels/SetupRequired";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import {
  type WhatsAppConversation,
  type WhatsAppMessage,
  useHandBackWhatsApp,
  useReplyWhatsApp,
  useWhatsAppConversation,
  useWhatsAppConversations,
} from "@/hooks/useWhatsApp";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/erp";
import { formatShortDateTime, formatTimeOnly } from "@/lib/formatDate";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { formatPhone } from "@/lib/phone";

type Filter = "waiting" | "all";

function who(c: WhatsAppConversation): string {
  return c.customer?.name || c.customer?.phone || `+${c.wa_contact_id}`;
}

/** The team's WhatsApp inbox: customers who asked for a person wait at the top; reply here and hand the chat back to the bot when done. */
export default function WhatsAppInboxPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const canReply = hasPermission(session, "whatsapp", "write");
  const [filter, setFilter] = useState<Filter>("waiting");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const list = useWhatsAppConversations({ waiting: filter === "waiting", q });

  if (!ready) return null;
  const rows = list.data ?? [];

  return (
    <PortalShell tenant={tenant} active="whatsapp-inbox">
      <PageHeader
        icon={<MessageCircle size={20} />}
        title="WhatsApp Inbox"
        description="Customers who ask to talk to you wait here. Reply, then hand the chat back to the ordering bot."
      />
      <SetupRequired channel="whatsapp" what="read WhatsApp conversations" />
      <div className="grid gap-space-4 md:grid-cols-[320px_1fr]">
        <Card
          className={cn(
            "flex max-h-[75vh] flex-col p-space-3",
            selected && "hidden md:flex",
          )}
        >
          <Tabs
            className="mb-space-2"
            tabs={[
              { key: "waiting", label: "Waiting" },
              { key: "all", label: "All" },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <div className="relative mb-space-2">
            <Search
              size={14}
              className="pointer-events-none absolute left-space-2 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <Input
              placeholder="Name or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-space-5"
            />
          </div>
          <div className="-mx-space-3 flex-1 overflow-y-auto">
            {list.isError ? (
              <p className="px-space-3 py-space-4 text-[13.5px] text-ink-600">
                {list.error.message}
              </p>
            ) : rows.length === 0 ? (
              <p className="px-space-3 py-space-4 text-[13.5px] text-ink-400">
                {list.isLoading
                  ? "Loading…"
                  : filter === "waiting"
                    ? "Nobody is waiting. 🎉"
                    : "No conversations yet."}
              </p>
            ) : (
              <ul>
                {rows.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c.id)}
                      className={cn(
                        "w-full border-b border-line px-space-3 py-space-2 text-left hover:bg-black/[0.03]",
                        selected === c.id && "bg-brand-50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-space-2">
                        <span className="truncate text-[14px] font-semibold text-ink-900">
                          {who(c)}
                        </span>
                        {c.last_message_at && (
                          <span className="shrink-0 text-[11.5px] text-ink-400">
                            {formatShortDateTime(c.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-space-2">
                        <span className="truncate text-[12.5px] text-ink-600">
                          {c.last_message
                            ? `${c.last_message.direction === "out" ? "You: " : ""}${c.last_message.text}`
                            : ""}
                        </span>
                        {c.waiting && (
                          <Badge tone="warning" className="shrink-0">
                            Waiting
                          </Badge>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {selected ? (
          <Thread
            key={selected}
            id={selected}
            canReply={canReply}
            onBack={() => setSelected(null)}
          />
        ) : (
          <Card className="hidden items-center justify-center p-space-6 text-[13.5px] text-ink-400 md:flex">
            Choose a conversation.
          </Card>
        )}
      </div>
    </PortalShell>
  );
}

function Thread({
  id,
  canReply,
  onBack,
}: {
  id: string;
  canReply: boolean;
  onBack: () => void;
}) {
  const conv = useWhatsAppConversation(id);
  const send = useReplyWhatsApp(id);
  const handBack = useHandBackWhatsApp(id);
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const c = conv.data;
  const count = c?.messages.length ?? 0;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [count]);

  if (!c)
    return (
      <Card className="p-space-6 text-[13.5px] text-ink-400">
        {conv.isError ? conv.error.message : "Loading…"}
      </Card>
    );

  function submit() {
    const text = draft.trim();
    if (!text) return;
    send.mutate(text, {
      onSuccess: () => setDraft(""),
      onError: (e) => toast.error("Couldn't send", e.message),
    });
  }

  function release() {
    handBack.mutate(undefined, {
      onSuccess: () =>
        toast.success(
          "Handed back to the bot",
          "The bot will answer this customer again.",
        ),
      onError: (e) => toast.error("Couldn't hand back", e.message),
    });
  }

  return (
    <div className="grid gap-space-4 lg:grid-cols-[1fr_260px]">
      <Card className="flex max-h-[75vh] flex-col">
        <div className="flex flex-wrap items-center justify-between gap-space-2 border-b border-line px-space-4 py-space-3">
          <div className="flex items-center gap-space-2">
            <button
              type="button"
              onClick={onBack}
              className="text-ink-600 md:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="text-[15px] font-bold text-ink-900">{who(c)}</div>
              <div className="text-[12px] text-ink-400">
                +{c.wa_contact_id}
                {c.assigned_to?.name ? ` · with ${c.assigned_to.name}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-space-2">
            {c.with_staff ? (
              <Badge tone={c.waiting ? "warning" : "info"}>
                {c.waiting ? "Waiting for you" : "With your team"}
              </Badge>
            ) : (
              <Badge tone="neutral">With the bot</Badge>
            )}
            {canReply && c.with_staff && (
              <Button
                variant="secondary"
                disabled={handBack.isPending}
                onClick={release}
              >
                <Bot size={14} /> Hand back to bot
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-space-2 overflow-y-auto bg-black/[0.02] px-space-4 py-space-3">
          {c.messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
          <div ref={end} />
        </div>

        {canReply && (
          <div className="border-t border-line p-space-3">
            {c.window_open ? (
              <div className="flex items-end gap-space-2">
                <Textarea
                  rows={2}
                  placeholder={
                    c.with_staff
                      ? "Type a reply…"
                      : "Replying takes the chat over from the bot…"
                  }
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  disabled={send.isPending || !draft.trim()}
                  onClick={submit}
                >
                  Send
                </Button>
              </div>
            ) : (
              <p className="text-[13px] text-ink-600">
                The customer last wrote more than 24 hours ago, so WhatsApp
                won&apos;t deliver a normal reply. You can reply again once they
                message you.
              </p>
            )}
          </div>
        )}
      </Card>

      <Card className="h-fit p-space-4">
        <h3 className="mb-space-2 flex items-center gap-space-1 text-[14px] font-semibold text-ink-900">
          <UserRound size={15} /> Customer
        </h3>
        {c.customer ? (
          <div className="mb-space-3 text-[13px] text-ink-600">
            <Link
              href={`/portal/customers/${c.customer.id}`}
              className="font-semibold text-brand-600 hover:underline"
            >
              {c.customer.name || "Customer"}
            </Link>
            <div>{formatPhone(c.customer.phone)}</div>
            {c.customer.email && <div>{c.customer.email}</div>}
          </div>
        ) : (
          <p className="mb-space-3 text-[13px] text-ink-400">
            Not linked to a customer yet.
          </p>
        )}
        <h3 className="mb-space-2 text-[14px] font-semibold text-ink-900">
          Recent orders
        </h3>
        {c.orders.length === 0 ? (
          <p className="text-[13px] text-ink-400">No orders yet.</p>
        ) : (
          <ul className="space-y-space-1">
            {c.orders.map((o) => (
              <li key={o.id} className="text-[13px]">
                <Link
                  href={`/portal/orders/${o.id}`}
                  className="font-semibold text-brand-600 hover:underline"
                >
                  {o.order_number}
                </Link>{" "}
                <span className="text-ink-600">
                  · {o.status.replaceAll("_", " ")} ·{" "}
                  {formatMoney(o.total_minor)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Bubble({ m }: { m: WhatsAppMessage }) {
  const mine = m.direction === "out";
  const by =
    m.sent_by === "bot"
      ? "Bot"
      : m.sent_by && typeof m.sent_by === "object"
        ? m.sent_by.name || "Team"
        : null;
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-lg px-space-3 py-space-2 text-[13.5px]",
          mine
            ? m.sent_by === "bot"
              ? "bg-black/[0.05] text-ink-900"
              : "bg-success-tint text-ink-900"
            : "bg-white text-ink-900 shadow-sm",
        )}
      >
        {m.text}
        <div className="mt-space-1 text-right text-[11px] text-ink-400">
          {by ? `${by} · ` : ""}
          {formatTimeOnly(m.created_at)}
          {m.status === "failed" ? " · not delivered" : ""}
        </div>
      </div>
    </div>
  );
}
