import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import type {
  PaymentConnection,
  PaymentDevice,
  PaymentProvider,
  PaymentRequestPage,
  PaymentSettings,
  RazorpayAccount,
  TestPayment,
} from "@/lib/paymentMachines";
import { queryKeys } from "@/lib/queryKeys";

const BASE = "/api/v1/payment-machines";

export function usePaymentSettings() {
  return useQuery({
    queryKey: queryKeys.paymentSettings,
    queryFn: () => erpGet<PaymentSettings>(`${BASE}/settings`),
  });
}

export function useSavePaymentSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PaymentSettings>) =>
      erpSend<PaymentSettings>(`${BASE}/settings`, "PUT", body),
    onSuccess: (s) => qc.setQueryData(queryKeys.paymentSettings, s),
  });
}

export function usePaymentProviders() {
  return useQuery({
    queryKey: queryKeys.paymentProviders,
    queryFn: () => erpGet<PaymentProvider[]>(`${BASE}/providers`),
    staleTime: 10 * 60_000,
  });
}

export function usePaymentConnections() {
  return useQuery({
    queryKey: queryKeys.paymentConnections,
    queryFn: () => erpGet<PaymentConnection[]>(`${BASE}/connections`),
  });
}

export function usePaymentDevices() {
  return useQuery({
    queryKey: queryKeys.paymentDevices,
    queryFn: () => erpGet<PaymentDevice[]>(`${BASE}/devices`),
  });
}

/** Payments the machines were asked to take; `unused` = paid but no bill used them. */
export function usePaymentRequests(unused: boolean) {
  return useQuery({
    queryKey: queryKeys.paymentRequests(unused),
    queryFn: () =>
      erpGet<PaymentRequestPage>(
        `${BASE}/requests?limit=50${unused ? "&unused=true" : ""}`,
      ),
  });
}

function useInvalidating<B, R>(fn: (body: B) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.paymentMachines }),
  });
}

export const useCreateConnection = () =>
  useInvalidating(
    (body: {
      provider: string;
      label?: string;
      is_live: boolean;
      credentials: Record<string, string>;
    }) => erpSend<PaymentConnection>(`${BASE}/connections`, "POST", body),
  );

export const useUpdateConnection = () =>
  useInvalidating(
    ({
      id,
      ...body
    }: {
      id: string;
      label?: string;
      is_active?: boolean;
      is_live?: boolean;
    }) =>
      erpSend<PaymentConnection>(`${BASE}/connections/${id}`, "PATCH", body),
  );

export const useTestConnection = () =>
  useMutation({
    mutationFn: (id: string) =>
      erpSend<{ ok: boolean }>(`${BASE}/connections/${id}/test`, "POST"),
  });

export type DeviceBody = {
  branch_id: string;
  label: string;
  provider?: string | null;
  connection_id?: string | null;
  device_ref?: string | null;
  accepts_card: boolean;
  accepts_upi: boolean;
};

export const useCreateDevice = () =>
  useInvalidating((body: DeviceBody) =>
    erpSend<PaymentDevice>(`${BASE}/devices`, "POST", body),
  );

export const useUpdateDevice = () =>
  useInvalidating(
    ({
      id,
      ...body
    }: Partial<DeviceBody> & { id: string; is_active?: boolean }) =>
      erpSend<PaymentDevice>(`${BASE}/devices/${id}`, "PATCH", body),
  );

export const useResolveRequest = () =>
  useInvalidating(({ id, note }: { id: string; note: string }) =>
    erpSend<{ ok: boolean }>(`${BASE}/requests/${id}/resolve`, "POST", {
      note,
    }),
  );

/** The business's own Razorpay account (website and tills): the keys in use (test or live, told by the key) and the webhook URL. */
export function useRazorpayAccount() {
  return useQuery({
    queryKey: queryKeys.razorpayAccount,
    queryFn: () => erpGet<RazorpayAccount>(`${BASE}/razorpay`),
  });
}

export const useSaveRazorpay = () =>
  useInvalidating(
    (body: { key_id: string; key_secret: string; webhook_secret?: string }) =>
      erpSend<RazorpayAccount>(`${BASE}/razorpay`, "PUT", body),
  );

const TEST_PAYMENTS = `${BASE}/test-payments`;

/** A test payment from the portal, made the way a till does it: a Razorpay QR (no device) or the amount sent to a connected machine.
 * Never a bill. */
export const useStartTestPayment = () =>
  useMutation({
    mutationFn: (body: { amount_minor: number; device_id?: string }) =>
      erpSend<TestPayment>(TEST_PAYMENTS, "POST", body),
  });

/** Asks Razorpay every 2 seconds (like a till) until the test payment is final. */
/** Asked exactly as a till asks: the server holds each ask until the status is
 *  no longer the one shown (up to 20 s), and the next ask goes straight out. */
export function useTestPayment(id: string | null, initial?: TestPayment) {
  const qc = useQueryClient();
  const key = queryKeys.razorpayTestPayment(id ?? "");
  return useQuery({
    queryKey: key,
    queryFn: () => {
      const seen = qc.getQueryData<TestPayment>(key)?.status;
      return erpGet<TestPayment>(
        `${TEST_PAYMENTS}/${id}${seen ? `?wait=20&seen=${seen}` : ""}`,
      );
    },
    enabled: !!id,
    initialData: initial,
    // an ask still waiting on the server is not repeated; this only restarts one
    refetchInterval: (q) => (q.state.data?.final ? false : 500),
  });
}

/** cancel | simulate (test keys: Razorpay's test system pays it) | refund */
export function useTestPaymentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "cancel" | "simulate" | "refund";
    }) => erpSend<TestPayment>(`${TEST_PAYMENTS}/${id}/${action}`, "POST"),
    // the ask waiting on the server would bring back the status from before
    onMutate: ({ id }) =>
      qc.cancelQueries({ queryKey: queryKeys.razorpayTestPayment(id) }),
    onSuccess: (t) => qc.setQueryData(queryKeys.razorpayTestPayment(t.id), t),
  });
}
