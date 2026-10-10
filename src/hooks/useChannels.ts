"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend, type Channel, type ChannelClient } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

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
  /** The channel's service works (it is on a live plan, a trial included). */
  in_plan: boolean;
  /** It had a plan that has ended. */
  ended: boolean;
  items: ReadinessItem[];
  met: number;
  total: number;
  ready: boolean;
};

/** The checklist for one channel, worked out by the server from real data. `enabled: false` (no channels permission) fetches nothing. */
export function useChannelReadiness(channel: Channel, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.channelReadiness(channel),
    queryFn: () => erpGet<Readiness>(`/api/v1/channels/${channel}/readiness`),
    enabled,
  });
}

/** The branches with just their names and channel switches (not whole branch rows). */
export function useChannelBranches() {
  return useQuery({
    queryKey: queryKeys.channelBranches,
    queryFn: () => erpGet<ChannelBranch[]>("/api/v1/channels/branches"),
  });
}

type TerminalSummary = {
  branch_id: string;
  paired: number;
  online: number;
  last_seen_at: string | null;
};

/** Paired and online terminals for every branch, in one request. */
export function useTerminalSummary() {
  return useQuery({
    queryKey: queryKeys.terminalSummary,
    queryFn: () => erpGet<TerminalSummary[]>("/api/v1/terminals/summary"),
  });
}

/** Switch one channel setting of a branch on or off. Readiness checklists depend on branches, so they refresh too. */
export function useToggleChannelBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { branchId: string; field: string; value: boolean }) =>
      erpSend(`/api/v1/branches/${input.branchId}`, "PATCH", {
        [input.field]: input.value,
      }),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.channels }),
        qc.invalidateQueries({ queryKey: queryKeys.branches }),
        qc.invalidateQueries({ queryKey: queryKeys.terminals }),
        qc.invalidateQueries({ queryKey: queryKeys.onboarding }),
      ]),
  });
}

/** The API keys the channels use to place orders. `enabled: false` fetches nothing. */
export function useChannelClients(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.channelClients,
    queryFn: () => erpGet<ChannelClient[]>("/api/v1/channel-clients"),
    enabled,
  });
}

/** Create a key for a channel (and optionally one branch). The full key is in the response and is shown only once. */
export function useCreateChannelClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      channel: Channel;
      name: string;
      branch_id: string | null;
    }) =>
      erpSend<{ api_key: string }>("/api/v1/channel-clients", "POST", input),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.channelClients }),
        qc.invalidateQueries({ queryKey: queryKeys.channels }),
      ]),
  });
}

export function useRevokeChannelClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      erpSend(`/api/v1/channel-clients/${id}`, "DELETE"),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.channelClients }),
        qc.invalidateQueries({ queryKey: queryKeys.channels }),
      ]),
  });
}
