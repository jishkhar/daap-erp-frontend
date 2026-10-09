"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { erp, useErpQuery } from "@/lib/erp";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

type Account =
  | { connected: false }
  | { connected: true; display_phone: string; approved_templates: number };
type Template = {
  name: string;
  status: string;
  category?: string;
  language?: string;
};

/** The business's WhatsApp message templates, read from Meta. The connection itself is managed in Settings → Sales channels. */
export function WhatsAppTemplates() {
  const session = useStaffSession();
  const allowed = hasPermission(session, "channels", "view");
  const account = useErpQuery<Account>(
    allowed ? "/api/v1/whatsapp/account" : null,
  );
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const a = account.data;
  if (!allowed || !a) return null;

  async function load() {
    const res = await erp<Template[]>("/api/v1/whatsapp/templates");
    if (res.error) return toast.error("Couldn't load templates", res.error);
    setTemplates(res.data ?? []);
  }

  return (
    <Card className="p-space-4">
      <div className="mb-space-2 flex flex-wrap items-center justify-between gap-space-2">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">
            Message templates
          </h2>
          <p className="text-[13px] text-ink-600">
            Anything you send outside the 24-hour customer window must be an
            approved template. Create them in Meta&apos;s WhatsApp Manager.
          </p>
        </div>
        {a.connected && (
          <Badge tone={a.approved_templates ? "success" : "warning"}>
            {a.approved_templates} approved
          </Badge>
        )}
      </div>
      {!a.connected ? (
        <p className="text-[13.5px] text-ink-600">
          Connect your number first, in{" "}
          <Link
            href="/portal/settings/channels/whatsapp"
            className="font-semibold text-brand-600 hover:underline"
          >
            Settings → Sales channels → WhatsApp
          </Link>
          .
        </p>
      ) : templates === null ? (
        <Button variant="secondary" onClick={load}>
          Show templates
        </Button>
      ) : templates.length === 0 ? (
        <p className="text-[13.5px] text-ink-400">No templates yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {templates.map((t) => (
            <li
              key={`${t.name}-${t.language}`}
              className="flex items-center justify-between gap-space-3 py-space-2 text-[13.5px]"
            >
              <span>
                <span className="font-medium text-ink-900">{t.name}</span>{" "}
                <span className="text-[12px] text-ink-400">
                  {[t.category, t.language].filter(Boolean).join(" · ")}
                </span>
              </span>
              <Badge
                tone={
                  t.status === "APPROVED"
                    ? "success"
                    : t.status === "REJECTED"
                      ? "warning"
                      : "neutral"
                }
              >
                {t.status.toLowerCase()}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
