"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { erpGet, erpSend } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

export type TransferStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "DISPATCHED"
  | "RECEIVED"
  | "CANCELLED";

export type Transfer = {
  id: string;
  transfer_number: string;
  from_branch_id: string;
  to_branch_id: string;
  status: TransferStatus;
  total_value_minor: number;
  notes: string | null;
  rejection_reason: string | null;
  requested_at: string;
};

export type TransferItem = {
  id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  serialization_type: "NONE" | "SERIAL" | "IMEI";
  quantity: number;
  serials: { serial_number: string; received: boolean }[];
};

export type TransferDetail = Transfer & { items: TransferItem[] };

/** Stock transfers between branches, newest first, paged on the server. A `branch_id` narrows it to transfers out of or into it. */
export function useTransferList(filters: {
  status?: string;
  branch_id?: string | null;
}) {
  return usePagedQuery<Transfer>(
    queryKeys.transferList,
    "/api/v1/transfers",
    filters,
  );
}

export function useTransfer(id: string) {
  return useQuery({
    queryKey: queryKeys.transfer(id),
    queryFn: () => erpGet<TransferDetail>(`/api/v1/transfers/${id}`),
    enabled: Boolean(id),
  });
}

/** A transfer moves stock between branches (reserved on dispatch, in transit, then received), so every change refreshes stock and the
 * books too. */
function useRefreshTransfers() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.transfers }),
      qc.invalidateQueries({ queryKey: queryKeys.inventory }),
      qc.invalidateQueries({ queryKey: queryKeys.finance }),
    ]);
}

export function useCreateTransfer() {
  const refresh = useRefreshTransfers();
  return useMutation({
    mutationFn: (input: {
      from_branch_id: string;
      to_branch_id: string;
      lines: { variant_id: string; quantity: number }[];
      notes: string | null;
    }) => erpSend<Transfer>("/api/v1/transfers", "POST", input),
    onSuccess: refresh,
  });
}

export type TransferAction =
  "approve" | "reject" | "dispatch" | "receive" | "cancel";

/** One step of a transfer's workflow (approve, reject, dispatch, receive, cancel), with that step's body. */
export function useTransferAction(id: string) {
  const refresh = useRefreshTransfers();
  return useMutation({
    mutationFn: ({
      action,
      body,
    }: {
      action: TransferAction;
      body?: unknown;
    }) => erpSend(`/api/v1/transfers/${id}/${action}`, "POST", body ?? {}),
    onSuccess: refresh,
  });
}
