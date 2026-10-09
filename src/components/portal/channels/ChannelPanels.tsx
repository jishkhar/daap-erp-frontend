"use client";

import Link from "next/link";
import { useState } from "react";
import { ChannelConnections } from "@/components/erp/ChannelConnections";
import { WhatsAppConnect } from "@/components/portal/channels/WhatsAppConnect";
import {
  CashiersPanel,
  TerminalsPanel,
} from "@/components/portal/BranchTerminals";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import {
  CHANNELS,
  erp,
  formatDateTime,
  useErpQuery,
  type Channel,
} from "@/lib/erp";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

/** What the Sales channels pages need of a branch: its name and its channel switches (GET /api/v1/channels/branches). */
export type ChannelBranch = {
  id: string;
  branch_code: string;
  branch_name: string;
  status: string;
  accepts_pos: boolean;
  fulfilment_enabled: boolean;
  fulfilment_priority: number;
  pickup_enabled: boolean;
};

export type ChannelStatus = {
  label: string;
  tone: "success" | "warning" | "neutral";
};

export type ReadinessItem = {
  key: string;
  label: string;
  done: boolean;
  hint: string;
  href: string;
  required: boolean;
  available: boolean;
};
export type Readiness = {
  channel: Channel;
  label: string;
  in_plan: boolean;
  items: ReadinessItem[];
  met: number;
  total: number;
  ready: boolean;
};

/** The checklist for one channel, worked out by the server from real data (see services/onboarding.py). Null without the channels permission. */
export function useReadiness(channel: Channel) {
  const session = useStaffSession();
  return useErpQuery<Readiness>(
    hasPermission(session, "channels", "view")
      ? `/api/v1/channels/${channel}/readiness`
      : null,
  );
}

export const readinessStatus = (r: Readiness | null): ChannelStatus =>
  !r
    ? { label: "Not set up", tone: "neutral" }
    : !r.in_plan
      ? { label: "Not in your plan", tone: "neutral" }
      : r.ready
        ? { label: "Ready", tone: "success" }
        : {
            label: r.met ? `${r.met} of ${r.total} done` : "Not set up",
            tone: r.met ? "warning" : "neutral",
          };

/** Setup state of every channel, for the list page. */
export function useChannelStatuses(): Record<Channel, ChannelStatus> | null {
  const online = useReadiness("online");
  const pos = useReadiness("pos");
  const whatsapp = useReadiness("whatsapp");
  if (online.loading || pos.loading || whatsapp.loading) return null;
  return {
    online: readinessStatus(online.data),
    pos: readinessStatus(pos.data),
    whatsapp: readinessStatus(whatsapp.data),
  };
}

/** What is left before this channel can take orders. Each line says what to do and links to where. */
export function ChannelReadiness({ channel }: { channel: Channel }) {
  const { data, loading } = useReadiness(channel);
  if (loading || !data) return null;
  const status = readinessStatus(data);
  return (
    <Card className="mb-space-5 p-space-4">
      <div className="mb-space-3 flex flex-wrap items-center justify-between gap-space-2">
        <h2 className="text-[15px] font-bold text-ink-900">Setup checklist</h2>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      {!data.in_plan && (
        <p className="mb-space-3 text-[13.5px] text-ink-600">
          Your plan doesn&apos;t include this channel. Choose a plan under Plan
          and billing to switch it on.
        </p>
      )}
      <ul className="divide-y divide-line">
        {data.items.map((i) => (
          <li
            key={i.key}
            className="flex items-start gap-space-3 py-space-2 text-[13.5px]"
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i.done ? "bg-success-tint text-success" : "bg-black/[0.05] text-ink-400"}`}
              aria-label={i.done ? "done" : "not done"}
            >
              {i.done ? "✓" : ""}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block font-medium ${i.done ? "text-ink-600" : "text-ink-900"}`}
              >
                {i.label}
                {!i.required && (
                  <span className="ml-1 text-[12px] font-normal text-ink-400">
                    (optional)
                  </span>
                )}
              </span>
              {!i.done && (
                <span className="block text-[12.5px] text-ink-600">
                  {i.available ? i.hint : `${i.hint}`}
                </span>
              )}
            </span>
            {!i.done && i.available && (
              <Link
                href={i.href}
                className="shrink-0 font-semibold text-brand-600 hover:underline"
              >
                Go
              </Link>
            )}
            {!i.available && <Badge tone="neutral">Coming soon</Badge>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Which branches sell through this channel, switched here instead of opening each branch (the same fields the branch form edits). */
export function ChannelBranches({ channel }: { channel: Channel }) {
  const session = useStaffSession();
  const branches = useErpQuery<ChannelBranch[]>("/api/v1/channels/branches");
  const [busy, setBusy] = useState<string | null>(null);
  const canWrite = hasPermission(session, "branches", "write");
  const columns: {
    field: "accepts_pos" | "fulfilment_enabled" | "pickup_enabled";
    label: string;
  }[] =
    channel === "pos"
      ? [{ field: "accepts_pos", label: "Takes POS sales" }]
      : [
          {
            field: "fulfilment_enabled",
            label:
              channel === "online"
                ? "Delivers online orders"
                : "Delivers WhatsApp orders",
          },
          { field: "pickup_enabled", label: "Customers can pick up" },
        ];
  const rows = branches.data ?? [];

  async function toggle(
    b: ChannelBranch,
    field: (typeof columns)[number]["field"],
  ) {
    setBusy(`${b.id}:${field}`);
    const res = await erp(`/api/v1/branches/${b.id}`, "PATCH", {
      [field]: !b[field],
    });
    setBusy(null);
    if (res.error) return toast.error("Couldn't update the branch", res.error);
    branches.reload();
  }

  return (
    <Card className="mt-space-5 p-space-4">
      <h2 className="text-[15px] font-bold text-ink-900">
        Branches on this channel
      </h2>
      <p className="mb-space-3 text-[13px] text-ink-600">
        Switch a branch on or off for {CHANNELS[channel].label}. More detail
        (hours, pincodes, minimum order) is on each branch&apos;s page.
      </p>
      {rows.length === 0 ? (
        <p className="text-[13.5px] text-ink-400">
          {branches.loading ? "Loading…" : "No active branches."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left text-[12px] text-ink-400">
                <th className="py-1">Branch</th>
                {columns.map((c) => (
                  <th key={c.field} className="px-space-3">
                    {c.label}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t border-line">
                  <td className="py-2">
                    <span className="font-medium text-ink-900">
                      {b.branch_name}
                    </span>{" "}
                    <span className="text-[12px] text-ink-400">
                      {b.branch_code}
                    </span>
                  </td>
                  {columns.map((c) => (
                    <td key={c.field} className="px-space-3">
                      <Switch
                        checked={Boolean(b[c.field])}
                        disabled={!canWrite || busy === `${b.id}:${c.field}`}
                        onChange={() => toggle(b, c.field)}
                        aria-label={`${c.label}: ${b.branch_name}`}
                      />
                    </td>
                  ))}
                  <td className="text-right">
                    <Link
                      href={`/portal/settings/branches/${b.id}`}
                      className="font-semibold text-brand-600 hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function OnlineChannelPanel() {
  return (
    <>
      <p className="max-w-2xl text-[14px] text-ink-600">
        Your website talks to the ERP with an API key. Orders it places are
        recorded on the <strong>Online</strong> channel, reserve stock from the
        right branch, and appear in Orders and Customers like any other sale.
      </p>
      <ChannelConnections channel="online" />
    </>
  );
}

type TerminalSummary = {
  branch_id: string;
  paired: number;
  online: number;
  last_seen_at: string | null;
};

/** POS settings: every till branch at a glance (one summary request), then terminals and cashiers for the branch picked below it.
 * Nothing is fetched for a branch until it is picked, and the branch list is just names and switches, not whole branch rows. */
export function PosChannelPanel() {
  const branches = useErpQuery<ChannelBranch[]>("/api/v1/channels/branches");
  const summary = useErpQuery<TerminalSummary[]>("/api/v1/terminals/summary");
  const [picked, setPicked] = useState<string | null>(null);
  const posBranches = (branches.data ?? []).filter((b) => b.accepts_pos);
  const selected =
    posBranches.find((b) => b.id === picked) ?? posBranches[0] ?? null;
  const stats = new Map((summary.data ?? []).map((t) => [t.branch_id, t]));
  const total = [...stats.values()].reduce(
    (a, t) => ({ paired: a.paired + t.paired, online: a.online + t.online }),
    { paired: 0, online: 0 },
  );

  return (
    <>
      <p className="max-w-2xl text-[14px] text-ink-600">
        Each till is paired to one branch. Pick a branch to pair terminals and
        set cashier PINs for it.
      </p>
      <Card className="mt-space-5 p-space-4">
        <div className="mb-space-3">
          <h2 className="text-[15px] font-bold text-ink-900">
            Branches with a till
          </h2>
          <p className="text-[13px] text-ink-600">
            {summary.data
              ? `${total.paired} terminal${total.paired === 1 ? "" : "s"} paired · ${total.online} online now`
              : summary.error
                ? ""
                : "Loading…"}
          </p>
        </div>
        {branches.data && posBranches.length === 0 ? (
          <p className="text-[13.5px] text-ink-400">
            No active branch takes POS sales. Switch on “Takes POS sales” for a
            branch below.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {posBranches.map((b) => {
              const t = stats.get(b.id);
              const paired = t?.paired ?? 0;
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-space-2 py-space-2 text-[13.5px]"
                >
                  <span>
                    <span className="font-medium text-ink-900">
                      {b.branch_name}
                    </span>{" "}
                    <span className="text-[12px] text-ink-400">
                      {b.branch_code}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-space-3 text-[12.5px] text-ink-600">
                    {summary.data && (
                      <>
                        <Badge tone={paired ? "success" : "warning"}>
                          {paired ? `${paired} paired` : "No terminal"}
                        </Badge>
                        {paired > 0 && (
                          <span>
                            {t?.online ?? 0} online · last seen{" "}
                            {t?.last_seen_at
                              ? formatDateTime(t.last_seen_at)
                              : "never"}
                          </span>
                        )}
                      </>
                    )}
                    {selected?.id === b.id ? (
                      <Badge tone="brand">Showing below</Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => setPicked(b.id)}
                      >
                        Manage
                      </Button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {selected && (
        <>
          <div className="mt-space-5 flex flex-wrap items-center justify-between gap-space-3">
            <h2 className="text-[16px] font-bold text-ink-900">
              {selected.branch_name}{" "}
              <span className="text-[13px] font-normal text-ink-400">
                {selected.branch_code}
              </span>
            </h2>
            {posBranches.length > 1 && (
              <Select
                value={selected.id}
                onChange={(e) => setPicked(e.target.value)}
                className="w-56"
                aria-label="Branch"
              >
                {posBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <Card className="mt-space-3 p-space-4">
            <h3 className="mb-space-3 text-[15px] font-bold text-ink-900">
              POS terminals
            </h3>
            <TerminalsPanel key={selected.id} branchId={selected.id} />
          </Card>
          <Card className="mt-space-4 p-space-4">
            <h3 className="mb-space-3 text-[15px] font-bold text-ink-900">
              Cashiers
            </h3>
            <CashiersPanel key={selected.id} branchId={selected.id} />
          </Card>
        </>
      )}
    </>
  );
}

export function WhatsAppChannelPanel() {
  return (
    <>
      <p className="max-w-2xl text-[14px] text-ink-600">
        Orders and questions that arrive on WhatsApp are recorded on the{" "}
        <strong>WhatsApp</strong> channel. You connect your own WhatsApp
        Business number here. Templates are on the WhatsApp page in the sidebar.
      </p>
      <WhatsAppConnect />
    </>
  );
}
