"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";
import { refreshAfterOrderChange } from "@/hooks/useOrders";

export type ShipmentStatus =
  | "ready_to_ship"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed_attempt"
  | "rto_in_transit"
  | "rto_delivered"
  | "cancelled"
  | "lost";

/** A delivery order's parcel: who carries it, tracking, package, what the rider collects, and every status it went through. */
export type Shipment = {
  id: string;
  order_id: string;
  branch_id: string;
  method: "own" | "partner";
  carrier_name: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  rider_name: string | null;
  rider_phone: string | null;
  status: ShipmentStatus;
  weight_g: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  cod_amount_minor: number;
  cost_minor: number | null;
  notes: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_at: string;
  events: {
    status: ShipmentStatus;
    note: string | null;
    location: string | null;
    actor_type: string;
    at: string;
  }[];
};

export type ShipmentDetails = Partial<
  Pick<
    Shipment,
    | "carrier_name"
    | "tracking_number"
    | "tracking_url"
    | "rider_name"
    | "rider_phone"
    | "weight_g"
    | "length_cm"
    | "width_cm"
    | "height_cm"
    | "cost_minor"
    | "notes"
  >
>;

/** Where a shipment may go next (services/shipments.py TRANSITIONS), with the button label staff see. */
export const NEXT_SHIPMENT_STEP: Partial<
  Record<ShipmentStatus, { to: ShipmentStatus; label: string }[]>
> = {
  ready_to_ship: [
    { to: "out_for_delivery", label: "Out with our rider" },
    { to: "in_transit", label: "Handed to courier" },
    { to: "cancelled", label: "Cancel shipment" },
  ],
  in_transit: [
    { to: "out_for_delivery", label: "Out for delivery" },
    { to: "delivered", label: "Delivered" },
    { to: "failed_attempt", label: "Delivery failed" },
    { to: "rto_in_transit", label: "Coming back (RTO)" },
    { to: "lost", label: "Lost" },
  ],
  out_for_delivery: [
    { to: "delivered", label: "Delivered" },
    { to: "failed_attempt", label: "Delivery failed" },
    { to: "rto_in_transit", label: "Coming back (RTO)" },
    { to: "lost", label: "Lost" },
  ],
  failed_attempt: [
    { to: "out_for_delivery", label: "Try again" },
    { to: "rto_in_transit", label: "Send back (RTO)" },
    { to: "lost", label: "Lost" },
  ],
  rto_in_transit: [
    { to: "rto_delivered", label: "Back at the shop" },
    { to: "lost", label: "Lost" },
  ],
};

export function useOrderShipments(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.orderShipments(orderId),
    queryFn: () =>
      erpGet<{
        items: Shipment[];
        packed: {
          weight_g: number | null;
          length_cm: number | null;
          width_cm: number | null;
          height_cm: number | null;
        };
      }>(`/api/v1/orders/${orderId}/shipments`),
    enabled,
  });
}

function useRefresh(orderId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.orderShipments(orderId) }),
      refreshAfterOrderChange(qc),
    ]);
}

export function useCreateShipment(orderId: string) {
  const refresh = useRefresh(orderId);
  return useMutation({
    mutationFn: (body: ShipmentDetails) =>
      erpSend<Shipment>(`/api/v1/orders/${orderId}/shipments`, "POST", body),
    onSuccess: refresh,
  });
}

export function useEditShipment(orderId: string) {
  const refresh = useRefresh(orderId);
  return useMutation({
    mutationFn: ({ id, ...body }: ShipmentDetails & { id: string }) =>
      erpSend<Shipment>(`/api/v1/shipments/${id}`, "PATCH", body),
    onSuccess: refresh,
  });
}

export function useMoveShipment(orderId: string) {
  const refresh = useRefresh(orderId);
  return useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: ShipmentStatus;
      note?: string;
    }) =>
      erpSend<Shipment>(`/api/v1/shipments/${id}/status`, "POST", {
        status,
        note: note || null,
      }),
    onSuccess: refresh,
  });
}
