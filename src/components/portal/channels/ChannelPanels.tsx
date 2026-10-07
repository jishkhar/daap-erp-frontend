"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { ChannelConnections } from "@/components/erp/ChannelConnections";
import { usePosTerminals } from "@/components/portal/channels/usePosTerminals";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { BranchRow } from "@/lib/branchSchema";
import {
  formatDateTime,
  useErpQuery,
  type Channel,
  type ChannelClient,
} from "@/lib/erp";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";

export type ChannelStatus = {
  label: "Connected" | "Action needed" | "Not set up";
  tone: "success" | "warning" | "neutral";
};

/** Setup state of every channel, for the list page. Keys are only readable with the channels permission, so
 * without it a channel shows as "Not set up" instead of guessing. */
export function useChannelStatuses(): Record<Channel, ChannelStatus> | null {
  const session = useStaffSession();
  const clients = useErpQuery<ChannelClient[]>(
    hasPermission(session, "channels", "view")
      ? "/api/v1/channel-clients"
      : null,
  );
  const branches = useErpQuery<BranchRow[]>("/api/v1/branches");
  const posBranches = (branches.data ?? []).filter(
    (b) => b.status === "active" && b.accepts_pos,
  );
  const terminals = usePosTerminals(posBranches.map((b) => b.id));
  if (branches.loading || !branches.data) return null;

  const keyed = (c: Channel): ChannelStatus => {
    const n = (clients.data ?? []).filter(
      (k) => k.channel === c && k.status === "active",
    ).length;
    return n
      ? { label: "Connected", tone: "success" }
      : {
          label: c === "online" ? "Action needed" : "Not set up",
          tone: c === "online" ? "warning" : "neutral",
        };
  };
  const paired = Object.values(terminals ?? {}).reduce(
    (sum, t) => sum + t.paired,
    0,
  );
  const pos: ChannelStatus = paired
    ? { label: "Connected", tone: "success" }
    : { label: "Action needed", tone: "warning" };
  return { online: keyed("online"), pos, whatsapp: keyed("whatsapp") };
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

/** Read-only roll-up. Terminals and cashiers belong to a branch, so they are managed on the branch page. */
export function PosChannelPanel() {
  const branches = useErpQuery<BranchRow[]>("/api/v1/branches");
  const posBranches = (branches.data ?? []).filter(
    (b) => b.status === "active" && b.accepts_pos,
  );
  const stats = usePosTerminals(posBranches.map((b) => b.id));
  const total = Object.values(stats ?? {}).reduce(
    (a, t) => ({ paired: a.paired + t.paired, online: a.online + t.online }),
    { paired: 0, online: 0 },
  );

  return (
    <>
      <p className="max-w-2xl text-[14px] text-ink-600">
        Each till is paired to one branch, so terminals and cashiers are managed
        on that branch&apos;s page. This is the overview.
      </p>
      <Card className="mt-space-5 p-space-4">
        <div className="mb-space-3 flex flex-wrap items-center justify-between gap-space-2">
          <div>
            <h2 className="text-[15px] font-bold text-ink-900">
              POS terminals
            </h2>
            <p className="text-[13px] text-ink-600">
              {stats
                ? `${total.paired} paired · ${total.online} online now`
                : "Loading…"}
            </p>
          </div>
          <Button variant="secondary" href="/portal/settings/branches">
            <Plus size={16} /> Add new
          </Button>
        </div>
        {branches.data && posBranches.length === 0 ? (
          <p className="text-[13.5px] text-ink-400">
            No active branch accepts POS sales. Turn on “Accepts POS sales” on a{" "}
            <Link
              href="/portal/settings/branches"
              className="font-semibold text-brand-600 hover:underline"
            >
              location
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {posBranches.map((b) => {
              const s = stats?.[b.id];
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
                  <span className="flex items-center gap-space-3 text-[12.5px] text-ink-600">
                    {s ? (
                      <>
                        <Badge tone={s.paired ? "success" : "warning"}>
                          {s.paired ? `${s.paired} paired` : "No terminal"}
                        </Badge>
                        {s.paired > 0 && (
                          <span>
                            {s.online} online · last seen{" "}
                            {s.lastSeen ? formatDateTime(s.lastSeen) : "never"}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-400">…</span>
                    )}
                    <Link
                      href={`/portal/settings/branches/${b.id}`}
                      className="font-semibold text-brand-600 hover:underline"
                    >
                      Manage
                    </Link>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

export function WhatsAppChannelPanel() {
  return (
    <>
      <p className="max-w-2xl text-[14px] text-ink-600">
        Orders captured in WhatsApp conversations are recorded on the{" "}
        <strong>WhatsApp</strong> channel. The bot or integration uses an API
        key to place them.
      </p>
      <Card className="mt-space-5 flex items-center justify-between gap-space-3 p-space-4">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">
            WhatsApp Business account
          </h2>
          <p className="text-[13px] text-ink-600">
            Linking your number, access token and message templates isn&apos;t
            available yet.
          </p>
        </div>
        <Badge tone="neutral">Coming soon</Badge>
      </Card>
      <ChannelConnections channel="whatsapp" />
    </>
  );
}
