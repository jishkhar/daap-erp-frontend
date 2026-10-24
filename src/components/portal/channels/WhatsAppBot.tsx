"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import {
  type TenantView,
  useSaveSettings,
  useTenantView,
} from "@/hooks/useTenantSettings";
import { useWhatsAppAccount } from "@/hooks/useWhatsApp";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

const DEFAULT_TIMEOUT = 30;

/** The WhatsApp ordering bot: customers browse, order and pay in the chat. Off until the business switches it on here
 * (tenant setting `whatsapp_bot_enabled`); it needs a connected number. */
export function WhatsAppBot() {
  const session = useStaffSession();
  const canView = hasPermission(session, "settings", "view");
  const canEdit = hasPermission(session, "settings", "write");
  const view = useTenantView();
  const account = useWhatsAppAccount(
    hasPermission(session, "channels", "view"),
  );
  if (!canView || !view.data) return null;
  return (
    <BotCard
      key={JSON.stringify(view.data.settings)}
      settings={view.data.settings}
      connected={account.data?.connected ?? false}
      canEdit={canEdit}
    />
  );
}

function BotCard({
  settings,
  connected,
  canEdit,
}: {
  settings: TenantView["settings"];
  connected: boolean;
  canEdit: boolean;
}) {
  const enabled = settings.whatsapp_bot_enabled ?? false;
  const [timeout, setTimeoutValue] = useState(
    String(settings.whatsapp_bot_timeout_minutes ?? DEFAULT_TIMEOUT),
  );
  const [template, setTemplate] = useState(
    settings.whatsapp_order_update_template ?? "",
  );
  const [language, setLanguage] = useState(
    settings.whatsapp_order_update_template_language ?? "en",
  );
  const save = useSaveSettings();
  const busy = save.isPending;

  function saveTemplate() {
    save.mutate(
      {
        whatsapp_order_update_template: template.trim(),
        whatsapp_order_update_template_language: language.trim() || "en",
      },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (e) => toast.error("Couldn't save", e.message),
      },
    );
  }

  function toggle() {
    save.mutate(
      { whatsapp_bot_enabled: !enabled },
      {
        onSuccess: () =>
          toast.success(
            enabled ? "Ordering bot switched off" : "Ordering bot switched on",
            enabled
              ? "Customer messages are still recorded, but the bot won't reply."
              : "Customers who message your number can now shop in the chat.",
          ),
        onError: (e) => toast.error("Couldn't save", e.message),
      },
    );
  }

  function saveTimeout() {
    const minutes = parseInt(timeout, 10);
    if (!minutes || minutes < 5 || minutes > 1440)
      return toast.error(
        "Check the value",
        "Enter a whole number of minutes between 5 and 1440.",
      );
    save.mutate(
      { whatsapp_bot_timeout_minutes: minutes },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (e) => toast.error("Couldn't save", e.message),
      },
    );
  }

  return (
    <Card className="min-w-0 p-space-3 sm:p-space-4">
      <div className="mb-space-3 flex flex-wrap items-start justify-between gap-space-3">
        <div className="min-w-0 max-w-[60ch]">
          <h2 className="text-[15px] font-bold text-ink-900">Ordering bot</h2>
          <p className="text-[13px] text-ink-600">
            Customers who message your WhatsApp number can browse your products,
            see sale items, offers and their reward points, fill a cart and pay
            (cash on delivery or online) without leaving the chat. On first
            contact the bot asks for their name, email and date of birth, so
            they are the same customer as on your website.
          </p>
        </div>
        <div className="flex items-center gap-space-2">
          <Badge tone={enabled ? "success" : "neutral"}>
            {enabled ? "On" : "Off"}
          </Badge>
          <Switch
            checked={enabled}
            onChange={toggle}
            disabled={!canEdit || busy || (!connected && !enabled)}
            tone="success"
            aria-label="WhatsApp ordering bot"
          />
        </div>
      </div>

      {!connected && (
        <p className="mb-space-3 text-[13.5px] text-ink-600">
          Connect your number first, in{" "}
          <Link
            href="/portal/settings/channels/whatsapp"
            className="font-semibold text-brand-600 hover:underline"
          >
            Settings → Sales channels → WhatsApp
          </Link>
          .
        </p>
      )}

      <Field
        label="Start over after (minutes)"
        htmlFor="wa_bot_timeout"
        hint="A customer who goes quiet this long goes back to the main menu on their next message. Their cart is kept. 5–1440."
      >
        <div className="flex flex-col gap-space-2 sm:flex-row">
          <Input
            id="wa_bot_timeout"
            inputMode="numeric"
            disabled={!canEdit}
            value={timeout}
            onChange={(e) => setTimeoutValue(e.target.value)}
            className="sm:max-w-[140px]"
          />
          {canEdit && (
            <Button variant="secondary" disabled={busy} onClick={saveTimeout}>
              Save
            </Button>
          )}
        </div>
      </Field>

      <div className="border-t border-line pt-space-3">
        <h3 className="text-[14px] font-semibold text-ink-900">
          Order updates
        </h3>
        <p className="mb-space-3 text-[13px] text-ink-600">
          Customers get a message when their order is confirmed, packed, shipped
          or out for delivery, and delivered. If they haven&apos;t messaged you
          in the last 24 hours, WhatsApp only allows an approved template.
          Create one in WhatsApp Manager whose text uses{" "}
          <code className="text-[12px]">{"{{1}}"}</code> for the order number
          and <code className="text-[12px]">{"{{2}}"}</code> for the status, for
          example: &ldquo;Your order {"{{1}}"} is now {"{{2}}"}.&rdquo; Without
          a template, updates outside that window are skipped.
        </p>
        <div className="flex flex-wrap items-end gap-space-2">
          <Field
            label="Template name"
            htmlFor="wa_tpl_name"
            className="mb-0 w-full min-w-0 sm:w-auto sm:min-w-[220px] sm:flex-1"
          >
            <Input
              id="wa_tpl_name"
              placeholder="order_update"
              disabled={!canEdit}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            />
          </Field>
          <Field
            label="Language"
            htmlFor="wa_tpl_lang"
            className="mb-0 w-full min-w-0 sm:w-[110px]"
          >
            <Input
              id="wa_tpl_lang"
              placeholder="en"
              disabled={!canEdit}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </Field>
          {canEdit && (
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              disabled={busy}
              onClick={saveTemplate}
            >
              Save
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
