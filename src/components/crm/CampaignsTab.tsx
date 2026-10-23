"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { MessageList } from "@/components/crm/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  MESSAGE_CHANNELS,
  SEGMENT_META,
  SEGMENT_ORDER,
  TEXTAREA_CLASS,
  formatDate,
  type Campaign,
  type CrmMessage,
  type MessageChannel,
  type Segment,
} from "@/lib/crm";
import { erp, useErpQuery, type Discount } from "@/lib/erp";
import { toast } from "@/lib/toast";

type Form = {
  name: string;
  channel: MessageChannel;
  segment: string;
  tag: string;
  discountId: string;
  subject: string;
  message: string;
};
const EMPTY: Form = {
  name: "",
  channel: "whatsapp",
  segment: "",
  tag: "",
  discountId: "",
  subject: "",
  message: "Hi {{name}}, ",
};

function audienceLabel(a: Campaign["audience"]) {
  const parts = [
    a.segment ? SEGMENT_META[a.segment].label : null,
    a.tag ? `tag: ${a.tag}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" + ") : "All customers";
}

export function CampaignsTab({
  canEdit,
  onChanged,
}: {
  canEdit: boolean;
  onChanged: () => void;
}) {
  const campaigns = useErpQuery<Campaign[]>("/api/v1/crm/campaigns");
  const tags =
    useErpQuery<{ tag: string; customers: number }[]>("/api/v1/crm/tags");
  const discounts = useErpQuery<Discount[]>("/api/v1/discounts");
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);
  const [viewing, setViewing] = useState<Campaign | null>(null);
  const log = useErpQuery<CrmMessage[]>(
    viewing ? `/api/v1/crm/messages?campaign_id=${viewing.id}` : null,
  );
  const [preview, setPreview] = useState<{
    total: number;
    reachable: number;
  } | null>(null);

  useEffect(() => {
    if (editing === null) return;
    let cancelled = false;
    const audience = {
      ...(form.segment ? { segment: form.segment } : {}),
      ...(form.tag ? { tag: form.tag } : {}),
    };
    erp<{ total: number; reachable: number }>(
      "/api/v1/crm/audience-preview",
      "POST",
      { channel: form.channel, audience },
    ).then((r) => {
      if (!cancelled) setPreview(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, [editing, form.channel, form.segment, form.tag]);

  function openNew() {
    setForm(EMPTY);
    setEditing("new");
  }
  function openEdit(k: Campaign) {
    setForm({
      name: k.name,
      channel: k.channel,
      segment: k.audience.segment ?? "",
      tag: k.audience.tag ?? "",
      discountId: k.discount_id ?? "",
      subject: k.subject ?? "",
      message: k.message,
    });
    setEditing(k);
  }

  async function save() {
    setBusy(true);
    const body = {
      name: form.name.trim(),
      channel: form.channel,
      audience: { segment: form.segment || null, tag: form.tag || null },
      subject: form.channel === "email" ? form.subject.trim() || null : null,
      message: form.message,
      discount_id: form.discountId || null,
    };
    const res =
      editing === "new"
        ? await erp("/api/v1/crm/campaigns", "POST", body)
        : await erp(
            `/api/v1/crm/campaigns/${(editing as Campaign).id}`,
            "PUT",
            body,
          );
    setBusy(false);
    if (res.error) return toast.error("Couldn't save the campaign", res.error);
    toast.success(editing === "new" ? "Campaign created" : "Campaign saved");
    setEditing(null);
    campaigns.reload();
  }

  async function send() {
    if (!sending) return;
    setBusy(true);
    const res = await erp<Campaign>(
      `/api/v1/crm/campaigns/${sending.id}/send`,
      "POST",
    );
    setBusy(false);
    setSending(null);
    if (res.error) return toast.error("Couldn't send the campaign", res.error);
    const k = res.data!;
    if (k.delivered_count === k.recipient_count)
      toast.success(`Sent to ${k.delivered_count} customers`);
    else
      toast.info(
        `${k.recipient_count} messages recorded`,
        `${k.delivered_count} delivered. The rest were saved but not delivered — see Messages for the reason.`,
      );
    campaigns.reload();
    onChanged();
  }

  async function remove() {
    if (!deleting) return;
    const res = await erp(`/api/v1/crm/campaigns/${deleting.id}`, "DELETE");
    setDeleting(null);
    if (res.error) return toast.error("Couldn't delete", res.error);
    toast.success("Campaign deleted");
    campaigns.reload();
  }

  const columns = useMemo<ColumnDef<Campaign, unknown>[]>(
    () => [
      {
        header: "Campaign",
        cell: ({ row }) => (
          <span className="font-semibold text-ink-900">
            {row.original.name}
          </span>
        ),
      },
      {
        header: "Channel",
        cell: ({ row }) => MESSAGE_CHANNELS[row.original.channel],
      },
      {
        header: "Audience",
        cell: ({ row }) => (
          <span className="text-ink-600">
            {audienceLabel(row.original.audience)}
          </span>
        ),
      },
      {
        header: "Offer",
        cell: ({ row }) =>
          row.original.discount_code ?? <span className="text-ink-400">—</span>,
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={row.original.status === "sent" ? "success" : "neutral"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        header: "Reach",
        cell: ({ row }) =>
          row.original.status === "sent" ? (
            `${row.original.delivered_count} / ${row.original.recipient_count} delivered`
          ) : (
            <span className="text-ink-400">—</span>
          ),
      },
      {
        header: "Sent",
        cell: ({ row }) => (
          <span className="text-ink-600">
            {formatDate(row.original.sent_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const k = row.original;
          return (
            <span className="flex justify-end gap-space-1">
              {k.status === "sent" && (
                <Button variant="ghost" onClick={() => setViewing(k)}>
                  Messages
                </Button>
              )}
              {canEdit && k.status === "draft" && (
                <>
                  <Button variant="ghost" onClick={() => openEdit(k)}>
                    Edit
                  </Button>
                  <Button onClick={() => setSending(k)}>Send</Button>
                  <Button variant="ghost" onClick={() => setDeleting(k)}>
                    Delete
                  </Button>
                </>
              )}
            </span>
          );
        },
      },
    ],
    [canEdit],
  );

  const withCode = (discounts.data ?? []).filter((d) => d.code && d.is_active);

  return (
    <div>
      <div className="mb-space-3 flex flex-col items-stretch justify-between gap-space-3 md:flex-row md:items-center">
        <p className="min-w-0 text-[13px] text-ink-600">
          Send an offer or announcement to a group of customers, optionally with
          one of your discount codes.
        </p>
        {canEdit && (
          <Button
            onClick={openNew}
            className="mobile-page-action shrink-0 self-end whitespace-nowrap md:self-auto"
          >
            <HugeiconsIcon icon={Add01Icon} size={16} className="shrink-0" />{" "}
            New campaign
          </Button>
        )}
      </div>
      {campaigns.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {campaigns.error}
        </p>
      )}
      <Card className="p-space-2">
        <div className="whitespace-nowrap">
          <DataTable
            columns={columns}
            data={campaigns.data ?? []}
            getRowId={(k) => k.id}
            loading={campaigns.loading}
            emptyMessage={
              campaigns.loading ? "Loading campaigns…" : "No campaigns yet."
            }
          />
        </div>
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New campaign" : "Edit campaign"}
        description="Use {{name}} for the customer's first name and {{code}} for the discount code."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !form.name.trim() || !form.message.trim()}
              onClick={save}
            >
              {editing === "new" ? "Create draft" : "Save"}
            </Button>
          </>
        }
      >
        <Field label="Name" htmlFor="k_name" required>
          <Input
            id="k_name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Channel" htmlFor="k_channel">
          <Select
            id="k_channel"
            value={form.channel}
            onValueChange={(value) =>
              setForm({ ...form, channel: value as MessageChannel })
            }
          >
            {(Object.keys(MESSAGE_CHANNELS) as MessageChannel[]).map((c) => (
              <option key={c} value={c}>
                {MESSAGE_CHANNELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-space-3">
          <Field label="Segment" htmlFor="k_seg">
            <Select
              id="k_seg"
              value={form.segment}
              onValueChange={(value) => setForm({ ...form, segment: value })}
            >
              <option value="">Everyone</option>
              {SEGMENT_ORDER.map((s: Segment) => (
                <option key={s} value={s}>
                  {SEGMENT_META[s].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tag" htmlFor="k_tag">
            <Select
              id="k_tag"
              value={form.tag}
              onValueChange={(value) => setForm({ ...form, tag: value })}
            >
              <option value="">Any</option>
              {(tags.data ?? []).map((t) => (
                <option key={t.tag} value={t.tag}>
                  {t.tag}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {preview && (
          <p className="text-[12.5px] text-ink-600">
            {preview.reachable} of {preview.total} customers can be reached
            {form.channel === "whatsapp"
              ? " (WhatsApp needs the customer's opt-in)"
              : ""}
            .
          </p>
        )}
        <Field label="Discount code to include" htmlFor="k_disc">
          <Select
            id="k_disc"
            value={form.discountId}
            onValueChange={(value) => setForm({ ...form, discountId: value })}
          >
            <option value="">None</option>
            {withCode.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </Select>
        </Field>
        {form.channel === "email" && (
          <Field label="Subject" htmlFor="k_subject">
            <Input
              id="k_subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </Field>
        )}
        <Field label="Message" htmlFor="k_msg" required>
          <textarea
            id="k_msg"
            rows={5}
            className={TEXTAREA_CLASS}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={sending !== null}
        title="Send this campaign?"
        message={`“${sending?.name ?? ""}” goes to everyone in its audience now. A campaign can only be sent once.`}
        confirmLabel="Send"
        busy={busy}
        onConfirm={send}
        onCancel={() => setSending(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this draft?"
        message={`“${deleting?.name ?? ""}” will be removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ""}
        description="Every message in this campaign"
        footer={
          <Button variant="ghost" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        <MessageList
          messages={log.data ?? []}
          showCustomer
          empty={log.loading ? "Loading…" : "No messages."}
        />
      </Modal>
    </div>
  );
}
