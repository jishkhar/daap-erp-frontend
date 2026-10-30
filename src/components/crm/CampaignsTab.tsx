"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
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
import { CustomerSelect } from "@/components/erp/CustomerSelect";
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
import {
  useWhatsAppTemplates,
  type WhatsAppTemplate,
} from "@/hooks/useWhatsApp";
import { erp, useErpQuery, type Customer, type Discount } from "@/lib/erp";
import { toast } from "@/lib/toast";

type Form = {
  name: string;
  channel: MessageChannel;
  audienceType: "membership" | "individual";
  customer: Customer | null;
  segment: string;
  tag: string;
  discountId: string;
  subject: string;
  message: string;
  /** WhatsApp: the approved template, as "name|language", and one value per {{n}}. */
  template: string;
  params: string[];
};
const EMPTY: Form = {
  name: "",
  channel: "whatsapp",
  audienceType: "membership",
  customer: null,
  segment: "",
  tag: "",
  discountId: "",
  subject: "",
  message: "Hi {{name}}, ",
  template: "",
  params: [],
};

const templateKey = (t: { name: string; language?: string | null }) =>
  `${t.name}|${t.language ?? ""}`;

/** The template's body with the values typed so far in place of {{1}}, {{2}} … (tokens like {{name}} left as they are). */
function fillPreview(body: string, params: string[]) {
  return body.replace(
    /\{\{\s*(\d+)\s*\}\}/g,
    (whole, n) => params[Number(n) - 1] || whole,
  );
}

function audienceLabel(a: Campaign["audience"]) {
  if (a.customer_id) return "Individual customer";
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
  const templates = useWhatsAppTemplates();
  const usable = (templates.data ?? []).filter((t) => t.usable);
  const chosen: WhatsAppTemplate | undefined = usable.find(
    (t) => templateKey(t) === form.template,
  );
  const whatsapp = form.channel === "whatsapp";
  const { refetch: loadTemplates } = templates;

  // Meta's templates are read when a WhatsApp campaign is being written (not on every page view)
  useEffect(() => {
    if (editing !== null && whatsapp) loadTemplates();
  }, [editing, whatsapp, loadTemplates]);

  // a campaign that is going out: refresh until it's done, so the counts move on their own
  const { reload: reloadCampaigns } = campaigns;
  const anySending = (campaigns.data ?? []).some((k) => k.status === "sending");
  useEffect(() => {
    if (!anySending) return;
    const timer = setInterval(reloadCampaigns, 5000);
    return () => clearInterval(timer);
  }, [anySending, reloadCampaigns]);

  useEffect(() => {
    if (editing === null) return;
    let cancelled = false;
    const individual = form.audienceType === "individual";
    if (individual && !form.customer) return; // nothing to count yet; the preview is hidden below
    const audience = individual
      ? { customer_id: form.customer!.id }
      : {
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
  }, [
    editing,
    form.channel,
    form.segment,
    form.tag,
    form.audienceType,
    form.customer,
  ]);

  function openNew() {
    setForm(EMPTY);
    setEditing("new");
  }
  function openEdit(k: Campaign) {
    setForm({
      name: k.name,
      channel: k.channel,
      audienceType: k.audience.customer_id ? "individual" : "membership",
      customer: null,
      segment: k.audience.segment ?? "",
      tag: k.audience.tag ?? "",
      discountId: k.discount_id ?? "",
      subject: k.subject ?? "",
      message: k.message,
      template: k.whatsapp_template
        ? templateKey({
            name: k.whatsapp_template,
            language: k.template_language,
          })
        : "",
      params: k.template_params ?? [],
    });
    setEditing(k);
    const id = k.audience.customer_id;
    if (id)
      erp<Customer>(`/api/v1/crm/customers/${id}`).then((r) => {
        if (r.data) setForm((f) => ({ ...f, customer: r.data! }));
      });
  }

  async function save() {
    setBusy(true);
    const body = {
      name: form.name.trim(),
      channel: form.channel,
      audience:
        form.audienceType === "individual"
          ? { customer_id: form.customer?.id ?? null }
          : { segment: form.segment || null, tag: form.tag || null },
      subject: form.channel === "email" ? form.subject.trim() || null : null,
      message: form.message,
      discount_id: form.discountId || null,
      ...(whatsapp && chosen
        ? {
            whatsapp_template: chosen.name,
            template_language: chosen.language ?? null,
            template_params: form.params.slice(0, chosen.variables ?? 0),
          }
        : {}),
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
    if (k.status === "sending")
      toast.success(
        `Sending to ${k.recipient_count} customers`,
        "The messages go out over the next minute. Delivered and read counts update here.",
      );
    else if (k.delivered_count === k.recipient_count)
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
          <Badge
            tone={
              row.original.status === "sent"
                ? "success"
                : row.original.status === "sending"
                  ? "warning"
                  : "neutral"
            }
          >
            {row.original.status === "sending"
              ? "Sending…"
              : row.original.status}
          </Badge>
        ),
      },
      {
        header: "Reach",
        cell: ({ row }) => {
          const k = row.original;
          if (k.status === "draft")
            return <span className="text-ink-400">—</span>;
          if (k.channel !== "whatsapp")
            return `${k.delivered_count} / ${k.recipient_count} delivered`;
          return (
            <span className="text-ink-600">
              {k.delivered_n} delivered · {k.read_n} read
              {k.failed_n ? ` · ${k.failed_n} failed` : ""}
              <span className="text-ink-400"> of {k.recipient_count}</span>
            </span>
          );
        },
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
              {k.status !== "draft" && (
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
        description={
          whatsapp
            ? "WhatsApp campaigns send one of your approved Meta templates, to customers who said yes to offers."
            : "Use {{name}} for the customer's first name and {{code}} for the discount code."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                !form.name.trim() ||
                !form.message.trim() ||
                (form.audienceType === "individual" && !form.customer) ||
                (whatsapp &&
                  (!chosen ||
                    form.params
                      .slice(0, chosen.variables ?? 0)
                      .filter((v) => v.trim()).length !==
                      (chosen.variables ?? 0)))
              }
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
        <Field label="Send to" htmlFor="k_audience">
          <div
            id="k_audience"
            role="radiogroup"
            aria-label="Audience type"
            className="grid grid-cols-2 gap-space-1 rounded-lg border border-line bg-ink-50 p-space-1"
          >
            {(
              [
                ["membership", "Membership group"],
                ["individual", "Individual customer"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={form.audienceType === key}
                onClick={() => setForm({ ...form, audienceType: key })}
                className={`h-9 rounded-md border text-[13.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600 ${
                  form.audienceType === key
                    ? "border-brand-600 bg-card text-brand-700 shadow-sm"
                    : "border-transparent text-ink-600 hover:text-ink-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        {form.audienceType === "individual" ? (
          <Field label="Customer" htmlFor="k_customer" required>
            <CustomerSelect
              id="k_customer"
              value={form.customer}
              onChange={(customer) => setForm({ ...form, customer })}
            />
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-space-3">
            <Field label="Membership" htmlFor="k_seg">
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
        )}
        {preview && !(form.audienceType === "individual" && !form.customer) && (
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
        {whatsapp && (
          <>
            <Field label="WhatsApp template" htmlFor="k_template" required>
              <Select
                id="k_template"
                value={form.template}
                onValueChange={(value) =>
                  setForm({ ...form, template: value, params: [] })
                }
              >
                <option value="">
                  {templates.isFetching
                    ? "Loading templates…"
                    : "Choose a template"}
                </option>
                {usable.map((t) => (
                  <option key={templateKey(t)} value={templateKey(t)}>
                    {t.name} ({t.language})
                  </option>
                ))}
              </Select>
            </Field>
            {templates.error && (
              <p className="text-[12.5px] text-error">
                Couldn&apos;t read your WhatsApp templates.{" "}
                <Link
                  href="/portal/settings/channels/whatsapp"
                  className="underline"
                >
                  Check the WhatsApp connection
                </Link>
                .
              </p>
            )}
            {!templates.isFetching && templates.data && usable.length === 0 && (
              <p className="text-[12.5px] text-ink-600">
                No approved marketing or utility templates yet. Create one in
                Meta&apos;s WhatsApp Manager (Message templates); once Meta
                approves it, it appears here.
              </p>
            )}
            {chosen && (
              <>
                <div className="rounded-md bg-ink-50 px-space-3 py-space-2 text-[13px] whitespace-pre-wrap text-ink-900">
                  {fillPreview(chosen.body ?? "", form.params)}
                </div>
                {Array.from({ length: chosen.variables ?? 0 }, (_, i) => (
                  <Field
                    key={i}
                    label={`Value for {{${i + 1}}}`}
                    htmlFor={`k_param_${i}`}
                    required
                  >
                    <Input
                      id={`k_param_${i}`}
                      value={form.params[i] ?? ""}
                      placeholder={
                        i === 0 ? "{{name}}" : "e.g. {{code}} or fixed text"
                      }
                      onChange={(e) => {
                        const params = [...form.params];
                        params[i] = e.target.value;
                        setForm({ ...form, params });
                      }}
                    />
                  </Field>
                ))}
                <p className="text-[12.5px] text-ink-600">
                  In a value, {"{{name}}"} becomes each customer&apos;s first
                  name and {"{{code}}"} the discount code.
                </p>
              </>
            )}
          </>
        )}
        {form.channel === "email" && (
          <Field label="Subject" htmlFor="k_subject">
            <Input
              id="k_subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </Field>
        )}
        <Field
          label={whatsapp ? "Internal note" : "Message"}
          htmlFor="k_msg"
          required
        >
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
