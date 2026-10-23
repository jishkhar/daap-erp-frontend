"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { erp } from "@/lib/erp";
import { cn } from "@/lib/cn";
import {
  MESSAGE_CHANNELS,
  SEGMENT_META,
  TEXTAREA_CLASS,
  initials,
  type CrmMessage,
  type MessageChannel,
  type Segment,
} from "@/lib/crm";
import { toast } from "@/lib/toast";

export function SegmentBadge({ segment }: { segment: Segment }) {
  const m = SEGMENT_META[segment];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function KpiTile({
  label,
  value,
  hint,
  icon,
  stackOnMobile = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  /** Give narrow summary cards the full width for their labels and values. */
  stackOnMobile?: boolean;
}) {
  return (
    <Card
      className={cn(
        "flex p-space-3",
        stackOnMobile
          ? "min-w-0 flex-col items-start gap-space-2 md:flex-row md:items-center md:gap-space-3"
          : "items-center gap-space-3",
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700",
            stackOnMobile ? "h-9 w-9 md:h-10 md:w-10" : "h-10 w-10",
          )}
        >
          {icon}
        </span>
      )}
      <div className={cn("min-w-0", stackOnMobile && "w-full md:w-auto")}>
        <p
          className={cn(
            "text-[12px] text-ink-600",
            stackOnMobile
              ? "min-h-8 break-words md:min-h-0 md:truncate"
              : "truncate",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            stackOnMobile
              ? "break-words text-[18px] md:break-normal md:text-[20px]"
              : "text-[20px]",
            "font-bold leading-tight text-ink-900",
          )}
        >
          {value}
        </p>
        {hint && (
          <p
            className={cn(
              "text-[11px] text-ink-400",
              stackOnMobile ? "break-words md:truncate" : "truncate",
            )}
          >
            {hint}
          </p>
        )}
      </div>
    </Card>
  );
}

const STATUS_TONE = {
  sent: "success",
  queued: "warning",
  failed: "error",
} as const;
const STATUS_LABEL = {
  sent: "Sent",
  queued: "Saved, not sent",
  failed: "Failed",
} as const;

export function MessageList({
  messages,
  showCustomer,
  empty,
}: {
  messages: CrmMessage[];
  showCustomer?: boolean;
  empty: string;
}) {
  if (messages.length === 0)
    return <p className="text-[13px] text-ink-400">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {messages.map((m) => (
        <li key={m.id} className="py-space-2 text-[13.5px]">
          <div className="flex flex-wrap items-center gap-space-2">
            <Badge tone="clay">{MESSAGE_CHANNELS[m.channel]}</Badge>
            <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
            {showCustomer && (
              <span className="font-semibold text-ink-900">
                {m.customer_name}
              </span>
            )}
            {m.campaign_name && (
              <span className="text-[12px] text-ink-600">
                Campaign: {m.campaign_name}
              </span>
            )}
            <span className="ml-auto text-[12px] text-ink-400">
              {new Date(m.created_at).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {m.subject && (
            <p className="mt-1 font-medium text-ink-900">{m.subject}</p>
          )}
          <p className="mt-1 whitespace-pre-wrap text-ink-600">{m.body}</p>
          {m.error && (
            <p className="mt-1 text-[12px] text-ink-400">{m.error}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Write and send (or record) one message to one customer. */
export function ComposeModal({
  customer,
  onClose,
  onSent,
}: {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [channel, setChannel] = useState<MessageChannel>("whatsapp");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!customer) return;
    setBusy(true);
    const res = await erp<CrmMessage>(
      `/api/v1/crm/customers/${customer.id}/messages`,
      "POST",
      {
        channel,
        subject: channel === "email" ? subject.trim() || null : null,
        body,
      },
    );
    setBusy(false);
    if (res.error) return toast.error("Couldn't send the message", res.error);
    if (res.data?.status === "sent") toast.success("Message sent");
    else if (res.data?.status === "queued")
      toast.info("Message saved", res.data.error ?? "It was not delivered.");
    else toast.error("Message failed", res.data?.error ?? "Not delivered.");
    setBody("");
    setSubject("");
    onSent();
    onClose();
  }

  return (
    <Modal
      open={customer !== null}
      onClose={onClose}
      title={`Message ${customer?.name ?? ""}`}
      description={[customer?.phone, customer?.email]
        .filter(Boolean)
        .join(" · ")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy || !body.trim()} onClick={send}>
            Send
          </Button>
        </>
      }
    >
      <Field label="Channel" htmlFor="m_channel">
        <Select
          id="m_channel"
          value={channel}
          onValueChange={(value) => setChannel(value as MessageChannel)}
        >
          {(Object.keys(MESSAGE_CHANNELS) as MessageChannel[]).map((c) => (
            <option key={c} value={c}>
              {MESSAGE_CHANNELS[c]}
            </option>
          ))}
        </Select>
      </Field>
      {channel === "email" && (
        <Field label="Subject" htmlFor="m_subject">
          <Input
            id="m_subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
      )}
      <Field label="Message" htmlFor="m_body">
        <textarea
          id="m_body"
          rows={5}
          className={TEXTAREA_CLASS}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
    </Modal>
  );
}
