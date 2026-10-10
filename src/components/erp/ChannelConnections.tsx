"use client";

import { Copy, KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  useChannelClients,
  useCreateChannelClient,
  useRevokeChannelClient,
} from "@/hooks/useChannels";
import { CHANNELS, formatDateTime, type Channel } from "@/lib/erp";
import {
  activeBranches,
  hasPermission,
  useStaffSession,
} from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { SkeletonLines } from "@/components/ui/Skeleton";

/** The credentials a sales channel uses to talk to the ERP (an API key per backend/terminal). The key fixes the
 * channel and, optionally, the branch, so a channel can never claim a different source. */
export function ChannelConnections({ channel }: { channel: Channel }) {
  const session = useStaffSession();
  const allowed = hasPermission(session, "channels", "view");
  const clients = useChannelClients(allowed);
  const createKey = useCreateChannelClient();
  const revokeKey = useRevokeChannelClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const busy = createKey.isPending;
  const [newKey, setNewKey] = useState<string | null>(null);

  if (!allowed) return null;
  const mine = (clients.data ?? []).filter((c) => c.channel === channel);
  const canManage = hasPermission(session, "channels", "write");

  function create() {
    createKey.mutate(
      { channel, name: name.trim(), branch_id: branchId || null },
      {
        onSuccess: (created) => {
          setOpen(false);
          setName("");
          setBranchId("");
          setNewKey(created.api_key);
        },
        onError: (e) => toast.error("Couldn't create the key", e.message),
      },
    );
  }

  function revoke(id: string) {
    revokeKey.mutate(id, {
      onSuccess: () => toast.success("Key revoked"),
      onError: (e) => toast.error("Couldn't revoke", e.message),
    });
  }

  return (
    <Card className="mt-space-5 p-space-4">
      <div className="mb-space-3 flex flex-wrap items-center justify-between gap-space-2">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">
            {CHANNELS[channel].label} connection
          </h2>
          <p className="text-[13px] text-ink-600">
            API keys this channel uses to place orders. A key is bound to this
            channel and, optionally, one branch.
          </p>
        </div>
        {canManage && (
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <Plus size={16} /> New API key
          </Button>
        )}
      </div>
      {mine.length === 0 ? (
        <>
          {clients.isFetching ? (
            <SkeletonLines rows={2} />
          ) : (
            <p className="text-[13.5px] text-ink-400">{"No API keys yet."}</p>
          )}
        </>
      ) : (
        <ul className="divide-y divide-line">
          {mine.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-space-2 py-space-2 text-[13.5px]"
            >
              <span className="flex items-center gap-space-2">
                <KeyRound size={15} className="text-ink-400" />
                <span className="font-medium text-ink-900">{c.name}</span>
                <code className="text-[12px] text-ink-600">
                  daapk_{c.key_prefix}_…
                </code>
                <Badge tone={c.status === "active" ? "success" : "neutral"}>
                  {c.status}
                </Badge>
              </span>
              <span className="flex items-center gap-space-3 text-[12.5px] text-ink-600">
                {c.last_used_at
                  ? `Last used ${formatDateTime(c.last_used_at)}`
                  : "Never used"}
                {canManage && c.status === "active" && (
                  <Button variant="ghost" onClick={() => revoke(c.id)}>
                    Revoke
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`New ${CHANNELS[channel].label} API key`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy || !name.trim()} onClick={create}>
              Create key
            </Button>
          </>
        }
      >
        <Field
          label="Name"
          htmlFor="ck_name"
          hint="e.g. “Storefront backend” or “Patna counter 1”."
          required
        >
          <Input
            id="ck_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          label="Branch"
          htmlFor="ck_branch"
          hint="Leave on “Any branch” for a channel that serves the whole tenant."
        >
          <Select
            id="ck_branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Any branch</option>
            {activeBranches(session).map((b) => (
              <option key={b.id} value={b.id}>
                {b.branch_name} ({b.branch_code})
              </option>
            ))}
          </Select>
        </Field>
      </Modal>

      <Modal
        open={newKey !== null}
        onClose={() => setNewKey(null)}
        title="Copy your API key now"
        description="This is the only time it is shown. Store it somewhere safe."
        footer={<Button onClick={() => setNewKey(null)}>Done</Button>}
      >
        <div className="flex items-center gap-space-2 rounded-md border border-line bg-paper p-space-3">
          <code className="min-w-0 flex-1 break-all text-[13px] text-ink-900">
            {newKey}
          </code>
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(newKey ?? "");
              toast.success("Copied");
            }}
          >
            <Copy size={15} /> Copy
          </Button>
        </div>
        <p className="mt-space-3 text-[12.5px] text-ink-600">
          Send it as the <code>X-Channel-Key</code> header, together with an{" "}
          <code>Idempotency-Key</code> on every order.
        </p>
      </Modal>
    </Card>
  );
}
