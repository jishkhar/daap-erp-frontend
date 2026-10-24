"use client";

import { useQuery } from "@tanstack/react-query";
import { ErpError, erpGet } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

/** What the pincode directory (India Post data) says about a pincode: its district, its state and, for the few border pincodes, the other
 * states it reaches, plus its post-office names and centre. GET /api/v1/pincodes/{pincode}. */
export type PincodePlace = {
  pincode: string;
  district: string;
  state_code: string;
  state: string;
  states: { code: string; name: string }[];
  localities: string[];
  latitude: number | null;
  longitude: number | null;
};

export const PINCODE_RE = /^[1-9]\d{5}$/;

/** The place of a complete pincode. `unknown` is true when India Post has no such pincode (a typo, or a very new one); a network failure
 * is neither found nor unknown. The directory changes only on import, so a pincode is fetched once per session. */
export function usePincodePlace(pincode: string) {
  const pin = pincode.replace(/\s/g, "");
  const complete = PINCODE_RE.test(pin);
  const q = useQuery({
    queryKey: queryKeys.pincodePlace(pin),
    queryFn: async (): Promise<PincodePlace | null> => {
      try {
        return await erpGet<PincodePlace>(`/api/v1/pincodes/${pin}`);
      } catch (e) {
        if (e instanceof ErpError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: complete,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
  return {
    place: complete ? (q.data ?? undefined) : undefined,
    unknown: complete && q.data === null,
    checking: complete && q.isFetching,
  };
}
