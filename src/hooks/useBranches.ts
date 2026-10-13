"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import type { BranchRow } from "@/lib/branchSchema";
import { queryKeys } from "@/lib/queryKeys";

/** Every branch of the business with its settings (the session's branch list carries only ids, codes and names). */
export function useBranches(enabled = true) {
  return useQuery({
    queryKey: queryKeys.branches,
    queryFn: () => erpGet<BranchRow[]>("/api/v1/branches"),
    enabled,
  });
}

/** One branch, with its manager's name and GST registration summary. */
export function useBranch(id: string) {
  return useQuery({
    queryKey: queryKeys.branch(id),
    queryFn: () => erpGet<BranchRow>(`/api/v1/branches/${id}`),
    enabled: Boolean(id),
  });
}

/** Branch changes show everywhere branches are read: the lists, the detail pages, schedules and terminals. The signed-in session also
 * carries a copy of the branch list (the branch switcher); callers refresh it with refreshStaffSession(). */
function useRefreshBranches() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.branches }),
      qc.invalidateQueries({ queryKey: queryKeys.activity }), // the branch's activity panel
    ]);
}

/** Add a branch (no id) or edit one, then link its GST registration when that changed. A failed link does not undo the saved branch:
 * it comes back as `linkError`. */
export function useSaveBranch() {
  const refresh = useRefreshBranches();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      body: Record<string, unknown>;
      /** Set when the GST registration should be (re)linked; null unlinks. */
      gstRegistrationId?: string | null;
    }) => {
      const saved = input.id
        ? await erpSend<BranchRow>(
            `/api/v1/branches/${input.id}`,
            "PATCH",
            input.body,
          )
        : await erpSend<BranchRow>("/api/v1/branches", "POST", input.body);
      const branchId = input.id ?? saved?.id;
      let linkError: string | null = null;
      if (input.gstRegistrationId !== undefined && branchId) {
        try {
          await erpSend(
            `/api/v1/branches/${branchId}/gst-registration`,
            "PUT",
            {
              gst_registration_id: input.gstRegistrationId,
            },
          );
        } catch (e) {
          linkError = (e as Error).message;
        }
      }
      return { saved, linkError };
    },
    onSuccess: refresh,
  });
}

/** Point a branch at one of the business's GST registrations (null unlinks it). */
export function useLinkBranchGst() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      branchId: string;
      gstRegistrationId: string | null;
    }) =>
      erpSend(`/api/v1/branches/${input.branchId}/gst-registration`, "PUT", {
        gst_registration_id: input.gstRegistrationId,
      }),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.branches }),
        qc.invalidateQueries({ queryKey: queryKeys.gstRegistrations }),
      ]),
  });
}

// ------------------------------------------------------------------ opening hours and delivery areas
export type Hour = {
  weekday: number;
  opens_at: string;
  closes_at: string;
  channel: string | null;
};
export type Area = { pincode: string; delivery_fee_minor: number | null };

/** A branch's opening hours and serviceable pincodes. */
export function useBranchSchedule(branchId: string) {
  return useQuery({
    queryKey: queryKeys.branchSchedule(branchId),
    queryFn: () =>
      erpGet<{ hours: Hour[]; areas: Area[] }>(
        `/api/v1/branches/${branchId}/schedule`,
      ),
    enabled: Boolean(branchId),
  });
}

/** Replace the branch's opening hours; returns the saved list. */
export function useSaveHours(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hours: Hour[]) =>
      erpSend<Hour[]>(`/api/v1/branches/${branchId}/hours`, "PUT", { hours }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.branchSchedule(branchId) }),
  });
}

/** Replace the branch's serviceable pincodes; returns the saved list. */
export function useSaveAreas(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (areas: Area[]) =>
      erpSend<Area[]>(`/api/v1/branches/${branchId}/serviceable-areas`, "PUT", {
        areas,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.branchSchedule(branchId) }),
  });
}

// ------------------------------------------------------------------ POS terminals and cashiers
export type TerminalEvent = {
  id: number;
  event: string;
  actor_type: string;
  ip: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};
export type Terminal = {
  id: string;
  code: string;
  name: string;
  status: "active" | "revoked";
  platform: string;
  install_id_hint: string;
  os_version: string | null;
  manufacturer: string | null;
  model: string | null;
  hardware_id: string | null;
  serial_number: string | null;
  app_version: string | null;
  app_build: string | null;
  locale: string | null;
  timezone: string | null;
  device_info: Record<string, unknown>;
  paired_at: string;
  paired_ip: string | null;
  last_seen_at: string | null;
  last_ip: string | null;
  last_sync_at: string | null;
  /** What the till itself says it still holds (its last heartbeat); null before the first report. */
  queue_unsent: number | null;
  queue_refused: number | null;
  queue_oldest_at: string | null;
  queue_reported_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  events?: TerminalEvent[];
  /** What this till has sent the server (list only). */
  uploads?: {
    accepted: number;
    rejected: number;
    flagged: number;
    last_received_at: string | null;
  };
  /** Bills this (revoked) till handed over that still wait for a manager (list only). */
  handover_held?: number;
};
export type PairingCode = {
  id: string;
  terminal_name: string | null;
  created_at: string;
  expires_at: string;
};
export type Issued = {
  id: string;
  code: string;
  terminal_name: string | null;
  expires_at: string;
};
export type Listing = { terminals: Terminal[]; pairing_codes: PairingCode[] };
export type Cashier = {
  id: string;
  name: string;
  email: string;
  status: "active" | "disabled";
  roles: string[];
  has_pin: boolean;
  pin_updated_at: string | null;
};

/** One paired terminal with its device details and event history. */
export function useTerminal(id: string) {
  return useQuery({
    queryKey: queryKeys.terminal(id),
    queryFn: () => erpGet<Terminal>(`/api/v1/terminals/${id}`),
    enabled: Boolean(id),
  });
}

/** A branch's paired terminals and live pairing codes. */
export function useBranchTerminals(branchId: string) {
  return useQuery({
    queryKey: queryKeys.branchTerminals(branchId),
    queryFn: () => erpGet<Listing>(`/api/v1/branches/${branchId}/terminals`),
    enabled: Boolean(branchId),
  });
}

function useRefreshTerminals() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.terminals });
}

/** A one-time pairing code for a new terminal (optionally named). */
export function useIssuePairingCode(branchId: string) {
  const refresh = useRefreshTerminals();
  return useMutation({
    mutationFn: (terminalName: string | null) =>
      erpSend<Issued>(
        `/api/v1/branches/${branchId}/terminals/pairing-codes`,
        "POST",
        terminalName ? { terminal_name: terminalName } : {},
      ),
    onSuccess: refresh,
  });
}

export function useCancelPairingCode() {
  const refresh = useRefreshTerminals();
  return useMutation({
    mutationFn: (id: string) =>
      erpSend(`/api/v1/terminals/pairing-codes/${id}`, "DELETE"),
    onSuccess: refresh,
  });
}

/** Lock a terminal for good: it locks at its next contact, hands over any bills it never uploaded (held for a manager), then wipes itself. */
export function useRevokeTerminal() {
  const refresh = useRefreshTerminals();
  return useMutation({
    mutationFn: (input: { id: string; reason: string | null }) =>
      erpSend(`/api/v1/terminals/${input.id}/revoke`, "POST", {
        reason: input.reason,
      }),
    onSuccess: refresh,
  });
}

export function useRenameTerminal() {
  const refresh = useRefreshTerminals();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      erpSend(`/api/v1/terminals/${input.id}`, "PATCH", { name: input.name }),
    onSuccess: refresh,
  });
}

/** The people who can bill at a branch and whether each has a terminal PIN. */
export function useBranchCashiers(branchId: string) {
  return useQuery({
    queryKey: queryKeys.branchCashiers(branchId),
    queryFn: () => erpGet<Cashier[]>(`/api/v1/branches/${branchId}/cashiers`),
    enabled: Boolean(branchId),
  });
}

function useRefreshCashiers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.cashiers });
}

export function useSetCashierPin() {
  const refresh = useRefreshCashiers();
  return useMutation({
    mutationFn: (input: { userId: string; pin: string }) =>
      erpSend(`/api/v1/users/${input.userId}/pin`, "PUT", { pin: input.pin }),
    onSuccess: refresh,
  });
}

export function useClearCashierPin() {
  const refresh = useRefreshCashiers();
  return useMutation({
    mutationFn: (userId: string) =>
      erpSend(`/api/v1/users/${userId}/pin`, "DELETE"),
    onSuccess: refresh,
  });
}

// ------------------------------------------------------------------ sync health
export type Flag = { code: string; message: string };
export type Upload = {
  id: string;
  event_id: string;
  status: "accepted" | "rejected";
  occurred_at: string;
  received_at: string;
  invoice_number: string | null;
  total_minor: number | null;
  cashier_name: string | null;
  order_number: string | null;
  flags: Flag[];
  error_code: string | null;
  error_message: string | null;
};
export type Health = {
  summary: {
    accepted: number;
    rejected: number;
    flagged: number;
    last_received_at: string | null;
  };
  missing_invoice_numbers: string[];
  uploads: Upload[];
};

/** What a till has sent to the server: totals, refused bills with reasons, flagged bills and missing bill numbers. */
export function useTerminalSyncHealth(
  terminalId: string,
  onlyProblems: boolean,
  limit: number,
) {
  return useQuery({
    queryKey: queryKeys.terminalSyncHealth(terminalId, onlyProblems, limit),
    queryFn: () =>
      erpGet<Health>(
        `/api/v1/terminals/${terminalId}/uploads?problems_only=${onlyProblems}&limit=${limit}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export type DayFigures = {
  bills: number;
  total_minor: number;
  cash_minor: number;
  card_minor: number;
  upi_minor: number;
  other_minor: number;
};
export type DayCloseRow = {
  date: string;
  terminal_id: string;
  terminal_name: string;
  terminal_code: string;
  branch_id: string;
  branch_name: string;
  /** What the server booked for this till on this date. */
  server: DayFigures;
  /** What the till stated when it closed; null if it has not closed this day. */
  close:
    | (Omit<DayFigures, "bills"> & {
        bills: number;
        closed_at: string;
        closed_by_name: string | null;
        counted_cash_minor: number;
        unsent_bills: number;
        close_count: number;
        note: string | null;
      })
    | null;
  status: "open" | "not_closed" | "matched" | "missing" | "after_close";
  bills_missing: number;
  bills_after_close: number;
  cash_difference_minor: number | null;
};
export type DayCloseBranch = DayFigures & {
  branch_id: string;
  branch_name: string;
  not_closed: number;
  rows: DayCloseRow[];
};

/** Each till's end-of-day close beside what the server booked, grouped by branch. */
export function useTerminalDayCloses(
  range: { date_from: string; date_to: string },
  branchId: string | null,
) {
  return useQuery({
    queryKey: queryKeys.terminalDayCloses(
      range.date_from,
      range.date_to,
      branchId,
    ),
    queryFn: () =>
      erpGet<{
        date_from: string;
        date_to: string;
        branches: DayCloseBranch[];
      }>(
        `/api/v1/terminals/day-closes?date_from=${range.date_from}&date_to=${range.date_to}${branchId ? `&branch_id=${branchId}` : ""}`,
      ),
    retry: false,
  });
}

// ------------------------------------------------------------------ bills handed over by revoked tills
export type HandoverBill = {
  id: string;
  terminal_id: string;
  terminal_code: string;
  terminal_name: string;
  event_id: string;
  invoice_number: string | null;
  occurred_at: string | null;
  received_at: string;
  total_minor: number | null;
  cashier_name: string | null;
  status: "held" | "approved" | "rejected" | "refused";
  decided_by_name: string | null;
  decided_at: string | null;
  decision_note: string | null;
  order_id: string | null;
  order_number: string | null;
  error_message: string | null;
  items: {
    variant_id: string | null;
    sku: string | null;
    name: string | null;
    quantity: number | null;
    line_total_minor: number | null;
  }[];
  payments: {
    method: string | null;
    amount_minor: number | null;
    reference: string | null;
  }[];
  customer: { name?: string | null; phone?: string | null } | null;
};

/** Bills that revoked tills handed over: `held` waits for a manager's decision. Optionally for one terminal. */
export function useHandoverBills(
  status: HandoverBill["status"],
  terminalId: string | null,
) {
  return useQuery({
    queryKey: queryKeys.terminalHandover(status, terminalId),
    queryFn: () =>
      erpGet<{ total: number; bills: HandoverBill[] }>(
        `/api/v1/terminals/handover-bills?status=${status}&limit=100${terminalId ? `&terminal_id=${terminalId}` : ""}`,
      ),
  });
}

/** Approve books the bill (flagged as from a revoked terminal); reject keeps it on record and books nothing. */
export function useDecideHandoverBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      decision: "approve" | "reject";
      note?: string;
    }) =>
      erpSend<{
        status: string;
        error?: string;
        order_number?: string | null;
      }>(
        `/api/v1/terminals/handover-bills/${input.id}/${input.decision}`,
        "POST",
        {
          note: input.note || null,
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.terminals });
      qc.invalidateQueries({ queryKey: queryKeys.orders }); // an approved bill is a new order
      qc.invalidateQueries({ queryKey: queryKeys.inventory }); // and takes stock off the shelf
    },
  });
}
