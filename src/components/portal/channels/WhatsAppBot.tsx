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
  const save = useSaveSettings();
  const busy = save.isPending;

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
    <Card className="p-space-4">
      <div className="mb-space-3 flex flex-wrap items-start justify-between gap-space-3">
        <div className="max-w-[60ch]">
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
        <div className="flex gap-space-2">
          <Input
            id="wa_bot_timeout"
            inputMode="numeric"
            disabled={!canEdit}
            value={timeout}
            onChange={(e) => setTimeoutValue(e.target.value)}
            className="max-w-[140px]"
          />
          {canEdit && (
            <Button variant="secondary" disabled={busy} onClick={saveTimeout}>
              Save
            </Button>
          )}
        </div>
      </Field>
    </Card>
  );
}
