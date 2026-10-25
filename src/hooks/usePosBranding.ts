import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend, erpSendFile } from "@/lib/erp";
import type { PosBranding, PosBrandingInput } from "@/lib/posBranding";
import { queryKeys } from "@/lib/queryKeys";

const URL = "/api/v1/channels/pos/branding";

export function usePosBranding() {
  return useQuery({
    queryKey: queryKeys.posBranding,
    queryFn: () => erpGet<PosBranding>(URL),
  });
}

export function useSavePosBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PosBrandingInput) =>
      erpSend<PosBranding>(URL, "PUT", body),
    onSuccess: (b) => qc.setQueryData(queryKeys.posBranding, b),
  });
}

/** Upload the tills' logo (JPEG, PNG or WebP up to 1 MB); resolves to its public address, which Save then stores. */
export function useUploadPosLogo() {
  return useMutation({
    mutationFn: (file: File) =>
      erpSendFile<{ image_url: string }>(`${URL}/logo`, file),
  });
}
