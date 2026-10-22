"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

export type PolicyKind = "returns" | "privacy" | "terms" | "shipping";

/** One written policy (Settings > Policies). `body_html` is sanitized by the ERP; empty = "No policy set". */
export type StorePolicy = {
  kind: PolicyKind;
  title: string;
  body_html: string;
  published: boolean;
  updated_at: string | null;
};

const BASE = "/api/v1/store-admin/policies";

export function usePolicies() {
  return useQuery({
    queryKey: queryKeys.storePolicies,
    queryFn: () => erpGet<StorePolicy[]>(BASE),
  });
}

export function useSavePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      body_html,
    }: {
      kind: PolicyKind;
      body_html: string;
    }) => erpSend<StorePolicy>(`${BASE}/${kind}`, "PUT", { body_html }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.storePolicies }),
  });
}
