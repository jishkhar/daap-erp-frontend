"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

export type RuleKind = "all" | "state" | "district" | "pincode";

/** A place a zone includes (or, with `exclude`, leaves out): all of India, a state (GST code), a district ("32:ernakulam") or a pincode. */
export type ZoneRule = {
  kind: RuleKind;
  value: string;
  exclude: boolean;
  label?: string;
};

/** Where a business delivers and what the shopper is promised there. The most specific zone covering a pincode prices the order. */
export type DeliveryZone = {
  id: string;
  name: string;
  is_active: boolean;
  fee_minor: number;
  free_above_minor: number | null;
  min_order_minor: number | null;
  min_days: number | null;
  max_days: number | null;
  cod_allowed: boolean;
  cod_max_minor: number | null;
  all_branches: boolean;
  branch_ids: string[];
  rules: ZoneRule[];
  sort_order: number;
};

export type ZoneInput = Omit<DeliveryZone, "id" | "sort_order"> & {
  sort_order?: number;
};

export type ZoneCheck = {
  pincode: string;
  place: {
    district: string;
    state: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  deliverable: boolean;
  reason: string | null;
  message: string | null;
  zone: Pick<
    DeliveryZone,
    | "id"
    | "name"
    | "fee_minor"
    | "free_above_minor"
    | "min_order_minor"
    | "min_days"
    | "max_days"
    | "cod_allowed"
    | "cod_max_minor"
  > | null;
  also_in: string[];
  branch: {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    distance_km: number | null;
  } | null;
};

export type DeliveryMap = {
  zones: { id: string; name: string }[];
  /** [pincode, latitude, longitude, index into zones] for every covered pincode. */
  points: [string, number, number, number][];
  covered: number;
  branches: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    delivers: boolean;
  }[];
};

export function useDeliveryZones() {
  return useQuery({
    queryKey: queryKeys.deliveryZones,
    queryFn: () =>
      erpGet<{
        items: DeliveryZone[];
        states: { code: string; name: string }[];
      }>("/api/v1/delivery-zones"),
  });
}

export function useDistricts(state: string) {
  return useQuery({
    queryKey: queryKeys.deliveryDistricts(state),
    queryFn: () =>
      erpGet<{ items: { key: string; name: string; pincodes: number }[] }>(
        `/api/v1/delivery-zones/districts?state=${state}`,
      ),
    enabled: /^\d{2}$/.test(state),
    staleTime: Infinity, // the pincode directory changes only with an import
  });
}

export function useZoneCheck(pincode: string) {
  return useQuery({
    queryKey: queryKeys.deliveryCheck(pincode),
    queryFn: () => erpGet<ZoneCheck>(`/api/v1/delivery-zones/check/${pincode}`),
    enabled: /^[1-9]\d{5}$/.test(pincode),
    placeholderData: keepPreviousData,
  });
}

export function useDeliveryMap(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.deliveryMap,
    queryFn: () => erpGet<DeliveryMap>("/api/v1/delivery-zones/map"),
    enabled,
  });
}

function useRefresh() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["erp", "shipping"] }),
      qc.invalidateQueries({ queryKey: ["erp", "branches", "schedule"] }),
    ]);
}

export function useSaveZone() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, ...body }: ZoneInput & { id?: string }) =>
      id
        ? erpSend<DeliveryZone>(`/api/v1/delivery-zones/${id}`, "PUT", body)
        : erpSend<DeliveryZone>("/api/v1/delivery-zones", "POST", body),
    onSuccess: refresh,
  });
}

export function useDeleteZone() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) =>
      erpSend<void>(`/api/v1/delivery-zones/${id}`, "DELETE"),
    onSuccess: refresh,
  });
}

export type DistrictHit = {
  key: string;
  name: string;
  state_code: string;
  state: string;
  pincodes: number;
};

/** Districts anywhere in India whose name contains `q` (at least two letters). */
export function useDistrictSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: queryKeys.districtSearch(term.toLowerCase()),
    queryFn: () =>
      erpGet<{ items: DistrictHit[] }>(
        `/api/v1/delivery-zones/districts?q=${encodeURIComponent(term)}`,
      ),
    enabled: term.length >= 2,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
}

export type ZonePreview = {
  pincodes: number;
  states: string[];
  unknown_pincodes: string[];
  clashes: { name: string; kind: RuleKind; value: string; label: string }[];
};

/** What a zone being edited covers (live, before saving). `rules` should already be debounced by the caller. */
export function useZonePreview(
  rules: ZoneRule[],
  zoneId: string | undefined,
  isActive: boolean,
) {
  const body = {
    zone_id: zoneId ?? null,
    is_active: isActive,
    rules: rules.map(({ kind, value, exclude }) => ({ kind, value, exclude })),
  };
  const key = JSON.stringify(body);
  return useQuery({
    queryKey: queryKeys.zonePreview(key),
    queryFn: () =>
      erpSend<ZonePreview>("/api/v1/delivery-zones/preview", "POST", body),
    enabled: rules.some((r) => !r.exclude),
    placeholderData: keepPreviousData,
  });
}
