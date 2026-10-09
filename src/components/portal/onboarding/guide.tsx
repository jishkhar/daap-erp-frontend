"use client";

import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { erp, useErpQuery } from "@/lib/erp";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

export type GuideStep = {
  key: string;
  title: string;
  why: string;
  href: string;
  status: "done" | "in_progress" | "todo" | "skipped";
  detail: string | null;
  warning: string | null;
  skippable: boolean;
  confirmable: boolean;
  channels?: {
    channel: string;
    label: string;
    in_plan: boolean;
    met: number;
    total: number;
    ready: boolean;
  }[];
};
export type Guide = {
  steps: GuideStep[];
  done: number;
  total: number;
  essentials_done: boolean;
  complete: boolean;
  dismissed: boolean;
  planned_channels: string[];
};

/** The setup guide for the signed-in owner/admin. Null data (and no request) for people who can't see tenant settings. */
export function useGuide() {
  const session = useStaffSession();
  const allowed = hasPermission(session, "settings", "view");
  const q = useErpQuery<Guide>(allowed ? "/api/v1/onboarding" : null);
  return { ...q, allowed };
}

export function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-space-3">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.06]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[12.5px] font-semibold tabular-nums text-ink-600">
        {done} of {total}
      </span>
    </div>
  );
}

/** Where each setup area is explained, and where each sales channel is configured. */
const STEP_DOC: Record<string, string> = {
  profile: "/portal/help/getting-started#first-steps",
  gst: "/portal/help/gst#registrations",
  prices: "/portal/help/gst#prices",
  locations: "/portal/help/getting-started#first-steps",
  team: "/portal/help/getting-started#team",
  products: "/portal/help/getting-started#first-steps",
  stock: "/portal/help/getting-started#first-steps",
  channels: "/portal/help/getting-started#channels",
};
const CHANNEL_SETUP: Record<string, { href: string; doc: string }> = {
  online: {
    href: "/portal/settings/channels/online",
    doc: "/portal/help/online-store",
  },
  pos: { href: "/portal/settings/channels/pos", doc: "/portal/help/pos" },
  whatsapp: {
    href: "/portal/settings/channels/whatsapp",
    doc: "/portal/help/whatsapp",
  },
};

const STATUS: Record<
  GuideStep["status"],
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  done: { label: "Set up", tone: "success" },
  in_progress: { label: "Needs attention", tone: "warning" },
  todo: { label: "Not set up", tone: "neutral" },
  skipped: { label: "Not applicable", tone: "neutral" },
};

/** One area on the Setup page: its state, what it is for, what is missing, and where to configure it. Informational, never a blocker. */
export function SetupStatusRow({
  step,
  onAction,
  busy,
}: {
  step: GuideStep;
  onAction?: (action: "skip" | "unskip" | "confirm") => void;
  busy?: boolean;
}) {
  const st = STATUS[step.status];
  const open = step.status === "todo" || step.status === "in_progress";
  return (
    <li className="px-space-4 py-space-3">
      <div className="flex flex-wrap items-start gap-space-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-space-2 text-[14px] font-semibold text-ink-900">
            {step.title} <Badge tone={st.tone}>{st.label}</Badge>
          </p>
          <p className="text-[13px] text-ink-600">{step.why}</p>
          {step.detail && (open || step.key === "prices") && (
            <p className="mt-0.5 text-[12.5px] text-ink-600">{step.detail}</p>
          )}
          {step.warning && (
            <p className="mt-0.5 flex items-center gap-1 text-[12.5px] font-medium text-warning">
              <AlertTriangle size={13} /> {step.warning}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-space-3">
          {onAction && step.confirmable && step.status === "todo" && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => onAction("confirm")}
            >
              Looks right
            </Button>
          )}
          {onAction && step.skippable && open && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => onAction("skip")}
            >
              {step.key === "gst" ? "Not GST registered" : "Skip"}
            </Button>
          )}
          {onAction && step.status === "skipped" && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => onAction("unskip")}
            >
              Undo
            </Button>
          )}
          {STEP_DOC[step.key] && (
            <Link
              href={STEP_DOC[step.key]}
              className="text-[12.5px] font-semibold text-ink-600 hover:underline"
            >
              Docs
            </Link>
          )}
          {step.status !== "skipped" && (
            <Link href={step.href}>
              <Button variant={open ? "secondary" : "ghost"}>
                {open ? "Configure" : "Review"}
              </Button>
            </Link>
          )}
        </div>
      </div>
      {step.channels && (
        <ul className="mt-space-2 divide-y divide-line rounded-md border border-line">
          {step.channels.map((c) => {
            const target = CHANNEL_SETUP[c.channel];
            return (
              <li
                key={c.channel}
                className="flex flex-wrap items-center gap-space-3 px-space-3 py-2 text-[13px]"
              >
                <span className="min-w-0 flex-1 font-medium text-ink-900">
                  {c.label}
                </span>
                <Badge
                  tone={c.ready ? "success" : c.in_plan ? "warning" : "neutral"}
                >
                  {c.ready
                    ? "Ready"
                    : c.in_plan
                      ? `${c.met} of ${c.total} done`
                      : "Not in your plan"}
                </Badge>
                {target && (
                  <Link
                    href={target.doc}
                    className="text-[12.5px] font-semibold text-ink-600 hover:underline"
                  >
                    Docs
                  </Link>
                )}
                {target && c.in_plan && (
                  <Link
                    href={target.href}
                    className="text-[12.5px] font-semibold text-brand-600 hover:underline"
                  >
                    {c.ready ? "Review" : "Configure"}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export async function sendStepAction(
  key: string,
  action: "skip" | "unskip" | "confirm",
  reload: () => void,
) {
  const res = await erp(`/api/v1/onboarding/steps/${key}`, "POST", { action });
  if (res.error) return toast.error("Couldn't update the step", res.error);
  reload();
}

/** The four things a brand-new business needs before anything else works. Shown on the dashboard until they are done or dismissed;
 * everything else lives on Settings → Setup and in the Help centre. */
const FIRST_RUN = ["profile", "locations", "products", "channels"];

export function FirstRunChecklist() {
  const { data, reload, allowed } = useGuide();
  if (!allowed || !data || data.dismissed) return null;
  const steps = FIRST_RUN.map((k) =>
    data.steps.find((s) => s.key === k),
  ).filter((s): s is GuideStep => Boolean(s));
  const done = steps.filter((s) => s.status === "done").length;
  if (steps.length === 0 || done === steps.length) return null;
  async function hide() {
    const res = await erp("/api/v1/onboarding/dismissed", "PUT", {
      dismissed: true,
    });
    if (res.error) return toast.error("Couldn't hide this", res.error);
    toast.success("Hidden", "The full list stays under Settings → Setup.");
    reload();
  }
  return (
    <Card className="mb-space-4 p-space-4">
      <div className="mb-space-3 flex flex-wrap items-start justify-between gap-space-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">
            Getting started
          </h2>
          <p className="text-[13px] text-ink-600">
            Four things to get your store running.
          </p>
        </div>
        <div className="flex items-center gap-space-2">
          <Link href="/portal/help/getting-started">
            <Button variant="ghost">Read the guide</Button>
          </Link>
          <Button variant="ghost" onClick={hide}>
            Hide
          </Button>
        </div>
      </div>
      <ProgressBar done={done} total={steps.length} />
      <ul className="mt-space-2 divide-y divide-line">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-space-3 py-space-2">
            {s.status === "done" ? (
              <CheckCircle2 size={18} className="shrink-0 text-success" />
            ) : (
              <Circle size={18} className="shrink-0 text-ink-400" />
            )}
            <span
              className={`min-w-0 flex-1 text-[13.5px] ${s.status === "done" ? "text-ink-400 line-through" : "font-medium text-ink-900"}`}
            >
              {s.title}
            </span>
            {s.status !== "done" && (
              <Link href={s.href}>
                <Button variant="secondary">
                  {s.status === "in_progress" ? "Continue" : "Start"}
                </Button>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** A notice that is not dismissible: invoices need the seller's GSTIN, so say so until a registration exists (or "not GST registered" is chosen). */
export function GstNotice() {
  const { data, allowed } = useGuide();
  const gst = data?.steps.find((s) => s.key === "gst");
  if (!allowed || !gst || gst.status === "done" || gst.status === "skipped")
    return null;
  return (
    <div className="mb-space-4 flex flex-wrap items-center justify-between gap-space-3 rounded-md border border-warning/30 bg-warning-tint px-space-4 py-space-3 text-[13.5px]">
      <span className="flex items-center gap-space-2 text-ink-900">
        <AlertTriangle size={16} className="text-warning" />{" "}
        {gst.detail ?? "Invoices show no seller GSTIN."} Add your GST
        registration, or say you aren&apos;t GST registered.
      </span>
      <Link
        href="/portal/settings/taxes"
        className="font-semibold text-brand-700 hover:underline"
      >
        Set up GST
      </Link>
    </div>
  );
}
