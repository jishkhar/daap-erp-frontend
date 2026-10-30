"use client";

import { CreditCard, Plus, QrCode, Wifi } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { useBranches } from "@/hooks/useBranches";
import {
  useCreateConnection,
  useCreateDevice,
  usePaymentConnections,
  usePaymentDevices,
  usePaymentProviders,
  usePaymentRequests,
  usePaymentSettings,
  useRazorpayAccount,
  useResolveRequest,
  useSavePaymentSettings,
  useSaveRazorpay,
  useStartTestPayment,
  useTestPayment,
  useTestPaymentAction,
  useTestConnection,
  useUpdateConnection,
  useUpdateDevice,
  type DeviceBody,
} from "@/hooks/usePaymentMachines";
import { formatMoney } from "@/lib/erp";
import {
  REQUEST_STATUS_LABEL,
  upiQrLink,
  type PaymentConnection,
  type PaymentDevice,
  type PaymentProvider,
  type PaymentRequest,
  type PaymentSettings,
  type TestPayment,
} from "@/lib/paymentMachines";
import { hasPermission, hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

/** Settings > Payments: how the tills take card and UPI (docs/pos_payments.md). A branch can have any number of card machines, of any
 * provider. A machine on a connected provider account is sent the bill amount by the server and confirms the payment itself; any other
 * machine is used the old way (the cashier types its reference). The shop's UPI id gives the till its own QR for the bill amount. */
export default function PaymentSettingsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  if (!ready) return null;
  const canEdit = hasTenantWide(session, "channels:manage");
  const canSeePayments = hasPermission(session, "payments", "view");
  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader
        icon={<CreditCard size={20} />}
        title="Payments"
        description="Card machines and UPI at your tills. Add every machine you own; connect your provider account and the till sends the bill amount to the machine, so cashiers never type amounts or references."
      />
      <div className="max-w-4xl space-y-space-5">
        <MachinesCard canEdit={canEdit} />
        <ConnectionsCard canEdit={canEdit} />
        <RazorpayCard canEdit={canEdit} />
        <UpiCard canEdit={canEdit} />
        {canSeePayments && <RequestsCard />}
      </div>
    </PortalShell>
  );
}

// ------------------------------------------------------------------------------------------------ Razorpay
/** The business's own Razorpay account, used by its website's online payments and the tills' Razorpay QR. One set of keys: saving
 * replaces them; test or live is told by the key itself. (DAAP's own Razorpay, which bills the plan, is a different account and never
 * shown here.) */
function RazorpayCard({ canEdit }: { canEdit: boolean }) {
  const account = useRazorpayAccount();
  const save = useSaveRazorpay();
  const settings = usePaymentSettings();
  const saveSettings = useSavePaymentSettings();
  const [form, setForm] = useState({
    key_id: "",
    key_secret: "",
    webhook_secret: "",
  });
  const [testing, setTesting] = useState(false);
  const a = account.data;
  const keyMode = form.key_id.startsWith("rzp_live_")
    ? "live"
    : form.key_id.startsWith("rzp_test_")
      ? "test"
      : null;
  const submit = () =>
    save.mutate(
      {
        key_id: form.key_id.trim(),
        key_secret: form.key_secret.trim(),
        webhook_secret: form.webhook_secret.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Razorpay ${keyMode} keys saved`);
          setForm({ key_id: "", key_secret: "", webhook_secret: "" });
        },
        onError: (e: Error) => toast.error("Couldn't save the keys", e.message),
      },
    );
  return (
    <Card className="space-y-space-3 p-space-5">
      <div className="flex flex-wrap items-center justify-between gap-space-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">
            Razorpay account
          </h2>
          <p className="text-[13px] text-ink-600">
            Your own Razorpay account. Your website&apos;s online payments use
            it, and tills can show a Razorpay UPI QR for the bill that confirms
            itself when the customer pays.
          </p>
        </div>
        {a && (
          <Badge
            tone={
              a.keys?.mode === "live"
                ? "success"
                : a.keys
                  ? "warning"
                  : "neutral"
            }
          >
            {a.keys?.mode === "live"
              ? "Live"
              : a.keys
                ? "Test mode"
                : "Not connected"}
          </Badge>
        )}
      </div>
      {!a ? (
        <SkeletonLines rows={3} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-space-3 rounded-lg border border-line p-space-3">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-ink-900">
                {!a.keys
                  ? "No keys saved"
                  : a.keys.mode === "live"
                    ? "Live keys (real money)"
                    : "Test keys (no real money)"}
              </div>
              {a.keys && (
                <div className="text-[12.5px] text-ink-600">
                  {a.keys.key_id}
                  {a.keys.has_webhook_secret
                    ? " · webhook secret saved"
                    : " · no webhook secret"}
                </div>
              )}
            </div>
            {a.keys && canEdit && (
              <Button variant="secondary" onClick={() => setTesting(true)}>
                Test payment
              </Button>
            )}
          </div>
          {canEdit && (
            <div className="rounded-lg bg-paper p-space-4">
              <h3 className="mb-space-2 text-[13px] font-bold text-ink-900">
                {a.keys ? "Replace keys" : "Save keys"}
              </h3>
              <p className="mb-space-3 text-[12.5px] text-ink-600">
                From the Razorpay Dashboard: Account &amp; Settings &gt; API
                keys. Test keys start with rzp_test_, live keys with rzp_live_.
                They are checked with Razorpay before saving, and the secret is
                never shown again.
              </p>
              <div className="grid gap-x-space-4 sm:grid-cols-2">
                <Field
                  label="Key id"
                  htmlFor="rzp_key"
                  hint={keyMode ? `These are ${keyMode} keys.` : undefined}
                  required
                >
                  <Input
                    id="rzp_key"
                    autoComplete="off"
                    value={form.key_id}
                    onChange={(e) =>
                      setForm({ ...form, key_id: e.target.value })
                    }
                  />
                </Field>
                <Field label="Key secret" htmlFor="rzp_secret" required>
                  <Input
                    id="rzp_secret"
                    type="password"
                    autoComplete="off"
                    value={form.key_secret}
                    onChange={(e) =>
                      setForm({ ...form, key_secret: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Webhook secret"
                  htmlFor="rzp_hook"
                  hint="Needed for website payments, and for till QR payments to confirm at once. Leave empty to keep the saved one."
                  className="col-span-full"
                >
                  <Input
                    id="rzp_hook"
                    type="password"
                    autoComplete="off"
                    value={form.webhook_secret}
                    onChange={(e) =>
                      setForm({ ...form, webhook_secret: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={
                    !keyMode ||
                    form.key_secret.trim().length < 8 ||
                    save.isPending
                  }
                  onClick={submit}
                >
                  {save.isPending ? "Checking with Razorpay…" : "Save keys"}
                </Button>
              </div>
            </div>
          )}
          <p className="text-[12.5px] text-ink-600">
            Webhook URL for the Razorpay Dashboard:{" "}
            <code className="break-all text-ink-900">{a.webhook_url}</code>. For
            the tills&apos; QR, also tick the events{" "}
            <code className="text-ink-900">qr_code.credited</code> and{" "}
            <code className="text-ink-900">qr_code.closed</code>; without them a
            QR payment still confirms, a few seconds later.
          </p>
          {settings.data && (
            <label className="flex items-start gap-space-3 text-[13px] text-ink-700">
              <Switch
                checked={settings.data.razorpay_qr}
                disabled={!canEdit || saveSettings.isPending}
                onChange={() =>
                  saveSettings.mutate(
                    { razorpay_qr: !settings.data!.razorpay_qr },
                    {
                      onError: (e: Error) =>
                        toast.error("Couldn't save", e.message),
                    },
                  )
                }
              />
              <span>
                Show the Razorpay QR on tills. It needs Razorpay&apos;s QR Codes
                (UPI QR) switched on for your account: ask Razorpay Support if
                the QR could not be made.
              </span>
            </label>
          )}
          {testing && a.keys && (
            <TestPaymentModal
              mode={a.keys.mode}
              onClose={() => setTesting(false)}
            />
          )}
        </>
      )}
    </Card>
  );
}

/** Settings > Payments > Test payment: exactly what a till does (same server code, same provider calls), without a till or a bill.
 * Razorpay QR (no `device`): live keys, scan with a phone, pay, refund here; test keys, Razorpay's test system pays it ("Simulate
 * payment"). A connected machine (`device`): the amount appears on it, tap a card, then refund here, or void it on the machine and mark
 * it voided when the provider cannot refund through us. */
function TestPaymentModal({
  device,
  mode,
  onClose,
}: {
  device?: PaymentDevice;
  mode?: "test" | "live";
  onClose: () => void;
}) {
  const [rupees, setRupees] = useState("1");
  const start = useStartTestPayment();
  const action = useTestPaymentAction();
  const resolve = useResolveRequest();
  const [started, setStarted] = useState<TestPayment | null>(null);
  const poll = useTestPayment(started?.id ?? null, started ?? undefined);
  const t = poll.data ?? started;
  const amount = Math.round(Number(rupees) * 100);
  const waiting = !!t && !t.final;
  const where = device ? device.label : "Razorpay QR";
  const run = (what: "cancel" | "simulate" | "refund") =>
    t &&
    action.mutate(
      { id: t.id, action: what },
      {
        onError: (e: Error) =>
          toast.error(
            what === "refund"
              ? "Couldn't refund"
              : what === "simulate"
                ? "Razorpay didn't pay it"
                : "Couldn't cancel",
            e.message,
          ),
      },
    );
  const close = () => {
    if (waiting) run("cancel");
    onClose();
  };
  return (
    <Modal
      open
      width="sm"
      title={`Test payment: ${where}`}
      description={
        device
          ? "Sent to the machine exactly as a till sends it. A real card takes real money: refund or void it afterwards."
          : mode === "live"
            ? "Live keys: this takes real money. Refund it here afterwards."
            : "Test keys: no real money moves."
      }
      onClose={close}
      dismissible={!waiting}
      footer={
        !t ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              disabled={!(amount >= 100 && amount <= 10000) || start.isPending}
              onClick={() =>
                start.mutate(
                  { amount_minor: amount, device_id: device?.id },
                  {
                    onSuccess: setStarted,
                    onError: (e: Error) =>
                      toast.error(
                        device
                          ? "Couldn't send it to the machine"
                          : "Couldn't make the QR",
                        e.message,
                      ),
                  },
                )
              }
            >
              {start.isPending
                ? device
                  ? "Sending…"
                  : "Making the QR…"
                : device
                  ? "Send to machine"
                  : "Show QR"}
            </Button>
          </>
        ) : (
          <>
            {waiting && (
              <Button
                variant="ghost"
                disabled={action.isPending}
                onClick={() => run("cancel")}
              >
                Cancel
              </Button>
            )}
            {waiting && !device && t.is_test && t.qr_payload && (
              <Button
                variant="secondary"
                disabled={action.isPending}
                onClick={() => run("simulate")}
              >
                Simulate payment
              </Button>
            )}
            {t.status === "succeeded" && !t.refunded && t.can_refund && (
              <Button
                variant="secondary"
                disabled={action.isPending}
                onClick={() => run("refund")}
              >
                Refund {formatMoney(t.amount_minor)}
              </Button>
            )}
            {t.status === "succeeded" && !t.refunded && !t.can_refund && (
              <Button
                variant="secondary"
                disabled={resolve.isPending}
                onClick={() =>
                  resolve.mutate(
                    { id: t.id, note: "Test payment voided on the machine" },
                    {
                      onError: (e: Error) =>
                        toast.error("Couldn't save", e.message),
                    },
                  )
                }
              >
                I voided it on the machine
              </Button>
            )}
            {!waiting && <Button onClick={onClose}>Done</Button>}
          </>
        )
      }
    >
      {!t ? (
        <Field label="Amount (Rs 1 to Rs 100)" htmlFor="test_amount">
          <Input
            id="test_amount"
            inputMode="decimal"
            value={rupees}
            onChange={(e) => setRupees(e.target.value)}
          />
        </Field>
      ) : (
        <div className="flex flex-col items-center gap-space-3 text-center">
          <div className="text-[15px] font-bold text-ink-900">
            {formatMoney(t.amount_minor)}{" "}
            {t.is_test && <Badge tone="warning">Test mode</Badge>}
          </div>
          {waiting && t.qr_payload && (
            // eslint-disable-next-line @next/next/no-img-element -- the provider's own QR image
            <img
              src={t.qr_payload}
              alt="UPI QR"
              className="h-56 w-56 rounded-md border border-line bg-white object-contain p-space-2"
            />
          )}
          <p className="text-[13px] text-ink-700">
            {t.status === "succeeded"
              ? `Paid${t.card_last4 ? ` with card ending ${t.card_last4}` : ""}${t.payer_vpa ? ` from ${t.payer_vpa}` : ""}. ` +
                `Payment ${t.provider_txn_id ?? ""}${t.rrn ? `, RRN ${t.rrn}` : ""}.` +
                (t.refunded
                  ? ` ${t.resolved_note ?? "Refunded"}.`
                  : t.can_refund
                    ? ""
                    : " Void it on the machine, then mark it voided.")
              : t.status === "cancelled"
                ? "Cancelled. Nothing was taken."
                : t.status === "expired"
                  ? "Timed out. Nothing was taken."
                  : t.status === "failed" || t.status === "unknown"
                    ? (t.failure_reason ?? "The payment did not go through.")
                    : device
                      ? `Waiting for payment. The amount should be showing on ${device.label}: tap or insert a card.`
                      : t.is_test
                        ? "Waiting for payment. A real UPI app can't pay a test QR: press Simulate payment."
                        : "Waiting for payment. Scan it with any UPI app on your phone."}
          </p>
          {waiting && (
            <p className="text-[12px] text-ink-400">
              Checking every 2 seconds, like a till.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------------------------------------ UPI
function UpiCard({ canEdit }: { canEdit: boolean }) {
  const current = usePaymentSettings();
  const save = useSavePaymentSettings();
  const [edited, setDraft] = useState<PaymentSettings | null>(null);
  const [testing, setTesting] = useState(false);
  const draft = edited ?? current.data ?? null;
  const changed =
    !!draft &&
    !!current.data &&
    JSON.stringify(draft) !== JSON.stringify(current.data);
  return (
    <Card className="space-y-space-3 p-space-5">
      <div className="flex items-center gap-space-2">
        <QrCode size={18} className="text-ink-600" />
        <h2 className="text-[15px] font-bold text-ink-900">
          UPI QR on the till
        </h2>
      </div>
      <p className="text-[13px] text-ink-600">
        With your shop&apos;s UPI id the till shows a QR for the exact bill
        amount. The customer scans it with any UPI app and the cashier taps
        Received once your soundbox or UPI app shows the money. No provider
        needed, and it works offline.
      </p>
      {!draft ? (
        <SkeletonLines rows={3} />
      ) : (
        <fieldset
          disabled={!canEdit}
          className="grid gap-x-space-4 sm:grid-cols-2"
        >
          <Field
            label="Shop UPI id"
            htmlFor="upi_id"
            hint="Like shopname@okaxis. Leave empty for no QR."
          >
            <Input
              id="upi_id"
              value={draft.upi_id ?? ""}
              onChange={(e) => setDraft({ ...draft, upi_id: e.target.value })}
            />
          </Field>
          <Field
            label="Name shown to the payer"
            htmlFor="upi_name"
            hint="Optional."
          >
            <Input
              id="upi_name"
              value={draft.upi_name ?? ""}
              onChange={(e) => setDraft({ ...draft, upi_name: e.target.value })}
            />
          </Field>
          <label className="col-span-full flex items-start gap-space-3">
            <Switch
              checked={draft.manual_entry}
              onChange={() =>
                setDraft({ ...draft, manual_entry: !draft.manual_entry })
              }
              disabled={!canEdit}
            />
            <span className="text-[13px] text-ink-700">
              Let cashiers type a reference when a connected machine fails (no
              connection, provider down). Turned off, such a payment has to wait
              until the machine works.
            </span>
          </label>
        </fieldset>
      )}
      {draft && (
        <div className="flex flex-wrap justify-end gap-space-2">
          {current.data?.upi_id && (
            <Button
              variant="secondary"
              className="mr-auto"
              onClick={() => setTesting(true)}
            >
              Test QR
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              disabled={!changed}
              onClick={() => setDraft(null)}
            >
              Discard
            </Button>
          )}
          {canEdit && (
            <Button
              disabled={!changed || save.isPending}
              onClick={() =>
                save.mutate(draft, {
                  onSuccess: (s) => {
                    setDraft(s);
                    toast.success("Payment settings saved");
                  },
                  onError: (e: Error) =>
                    toast.error("Couldn't save", e.message),
                })
              }
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      )}
      {testing && current.data?.upi_id && (
        <ShopQrTestModal
          upiId={current.data.upi_id}
          payeeName={current.data.upi_name}
          onClose={() => setTesting(false)}
        />
      )}
    </Card>
  );
}

/** Settings > Payments > UPI QR > Test QR: the QR a till shows for a bill, made the same way from the SAVED UPI id. Scanning it with a
 * phone pays the shop's own account. Like on the till, nothing tells the portal the money came: check the phone or soundbox. Never a bill. */
function ShopQrTestModal({
  upiId,
  payeeName,
  onClose,
}: {
  upiId: string;
  payeeName: string | null;
  onClose: () => void;
}) {
  const [rupees, setRupees] = useState("1");
  const [shown, setShown] = useState<{ link: string; amount: number } | null>(
    null,
  );
  const amount = Math.round(Number(rupees) * 100);
  const valid = Number.isFinite(amount) && amount >= 100 && amount <= 10000;
  return (
    <Modal
      open
      width="sm"
      title="Test the shop UPI QR"
      description="Exactly the QR a till shows for a bill. Paying it sends real money to your own UPI account."
      onClose={onClose}
      footer={
        shown ? (
          <>
            <Button variant="ghost" onClick={() => setShown(null)}>
              Another amount
            </Button>
            <Button onClick={onClose}>Done</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              disabled={!valid}
              onClick={() =>
                setShown({
                  amount,
                  link: upiQrLink({
                    upiId,
                    payeeName,
                    amountMinor: amount,
                    reference: `test${Date.now()}`,
                    note: `Test ${formatMoney(amount)}`,
                  }),
                })
              }
            >
              Show QR
            </Button>
          </>
        )
      }
    >
      {!shown ? (
        <Field label="Amount (Rs 1 to Rs 100)" htmlFor="shop_qr_amount">
          <Input
            id="shop_qr_amount"
            inputMode="decimal"
            value={rupees}
            onChange={(e) => setRupees(e.target.value)}
          />
        </Field>
      ) : (
        <div className="flex flex-col items-center gap-space-3 text-center">
          <div className="text-[15px] font-bold text-ink-900">
            Scan to pay {formatMoney(shown.amount)}
          </div>
          <div className="rounded-md border border-line bg-white p-space-3">
            <QRCodeSVG value={shown.link} size={220} />
          </div>
          <div className="text-[13px] font-medium text-ink-900">{upiId}</div>
          <p className="text-[12.5px] text-ink-600">
            Scan it with any UPI app (GPay, PhonePe, Paytm…). Your app should
            show {payeeName || upiId} and {formatMoney(shown.amount)} already
            filled in. Check your phone or soundbox for the money: the shop QR
            does not confirm itself.
          </p>
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------------------------------------ provider accounts
function ConnectionsCard({ canEdit }: { canEdit: boolean }) {
  const connections = usePaymentConnections();
  const providers = usePaymentProviders();
  const update = useUpdateConnection();
  const test = useTestConnection();
  const [adding, setAdding] = useState(false);
  const connectable = (providers.data ?? []).filter((p) => p.available);
  const waiting = (providers.data ?? []).filter((p) => !p.available);
  return (
    <Card className="space-y-space-3 p-space-5">
      <div className="flex items-center justify-between gap-space-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">
            Provider accounts
          </h2>
          <p className="text-[13px] text-ink-600">
            Your account with a card-machine provider. Its keys are checked with
            the provider and stored encrypted; they are never shown again.
          </p>
        </div>
        {canEdit && connectable.length > 0 && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Connect
          </Button>
        )}
      </div>
      {connections.isLoading ? (
        <SkeletonLines rows={2} />
      ) : (connections.data ?? []).length === 0 ? (
        <p className="text-[13px] text-ink-400">No provider connected yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {connections.data!.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-space-3 p-space-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-space-2">
                  <span className="font-medium text-ink-900">{c.label}</span>
                  <Badge
                    tone={
                      c.is_active
                        ? c.is_live
                          ? "success"
                          : "warning"
                        : "neutral"
                    }
                  >
                    {c.is_active ? (c.is_live ? "Live" : "Test") : "Off"}
                  </Badge>
                </div>
                <p className="text-[12.5px] text-ink-600">
                  {c.provider_name} · {c.device_count} machine
                  {c.device_count === 1 ? "" : "s"}
                  {Object.entries(c.public_fields).map(
                    ([k, v]) => ` · ${k}: ${v}`,
                  )}
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-space-2">
                  <Button
                    variant="ghost"
                    disabled={test.isPending}
                    onClick={() =>
                      test.mutate(c.id, {
                        onSuccess: () => toast.success(`${c.label} works`),
                        onError: (e: Error) =>
                          toast.error("The provider refused", e.message),
                      })
                    }
                  >
                    Test
                  </Button>
                  <Button
                    variant={c.is_active ? "destructive" : "secondary"}
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate(
                        { id: c.id, is_active: !c.is_active },
                        {
                          onError: (e: Error) =>
                            toast.error("Couldn't change it", e.message),
                        },
                      )
                    }
                  >
                    {c.is_active ? "Switch off" : "Switch on"}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {waiting.length > 0 && (
        <p className="text-[12.5px] text-ink-400">
          Connection coming soon for {waiting.map((p) => p.name).join(", ")}.
          Add those machines below now: cashiers type their reference until the
          connection is ready. Ask your provider for their POS / cloud
          integration kit.
        </p>
      )}
      {adding && (
        <ConnectModal
          providers={connectable}
          onClose={() => setAdding(false)}
        />
      )}
    </Card>
  );
}

function ConnectModal({
  providers,
  onClose,
}: {
  providers: PaymentProvider[];
  onClose: () => void;
}) {
  const create = useCreateConnection();
  const [provider, setProvider] = useState(providers[0]?.key ?? "");
  const [label, setLabel] = useState("");
  const [live, setLive] = useState(false);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const info = providers.find((p) => p.key === provider);
  return (
    <Modal
      open
      title="Connect a provider account"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!info || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  provider,
                  label: label || undefined,
                  is_live: live,
                  credentials: creds,
                },
                {
                  onSuccess: () => {
                    toast.success("Provider connected");
                    onClose();
                  },
                  onError: (e: Error) =>
                    toast.error("Couldn't connect", e.message),
                },
              )
            }
          >
            {create.isPending ? "Checking with the provider…" : "Connect"}
          </Button>
        </>
      }
    >
      <Field label="Provider">
        <Select
          value={provider}
          onValueChange={(v) => {
            setProvider(v);
            setCreds({});
          }}
        >
          {providers.map((p) => (
            <option key={p.key} value={p.key}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      {info?.note && (
        <p className="mb-space-3 text-[12.5px] text-ink-600">{info.note}</p>
      )}
      <Field
        label="Name"
        htmlFor="conn_label"
        hint="Optional, e.g. 'Paytm - main account'."
      >
        <Input
          id="conn_label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </Field>
      {info?.credential_fields.map((f) => (
        <Field
          key={f.key}
          label={f.label}
          htmlFor={`cred_${f.key}`}
          hint={f.help || undefined}
          required
        >
          <Input
            id={`cred_${f.key}`}
            type={f.secret ? "password" : "text"}
            autoComplete="off"
            value={creds[f.key] ?? ""}
            onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })}
          />
        </Field>
      ))}
      <label className="flex items-center gap-space-3 text-[13px] text-ink-700">
        <Switch checked={live} onChange={() => setLive(!live)} />
        Live account (real money). Leave off while trying the provider&apos;s
        test system.
      </label>
    </Modal>
  );
}

// ------------------------------------------------------------------------------------------------ machines
function MachinesCard({ canEdit }: { canEdit: boolean }) {
  const devices = usePaymentDevices();
  const update = useUpdateDevice();
  const [editing, setEditing] = useState<PaymentDevice | "new" | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const [testing, setTesting] = useState<PaymentDevice | null>(null);
  const rows = (devices.data ?? []).filter((d) => showRetired || d.is_active);
  const retired = (devices.data ?? []).filter((d) => !d.is_active).length;
  const byBranch = new Map<string, PaymentDevice[]>();
  for (const d of rows)
    byBranch.set(d.branch_name, [...(byBranch.get(d.branch_name) ?? []), d]);
  return (
    <Card className="space-y-space-3 p-space-5">
      <div className="flex items-center justify-between gap-space-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">Card machines</h2>
          <p className="text-[13px] text-ink-600">
            Every machine at each branch. A branch may have several, from
            different providers; each till uses the one it last used and the
            cashier can pick another.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setEditing("new")}>
            <Plus size={16} /> Add machine
          </Button>
        )}
      </div>
      {devices.isLoading ? (
        <SkeletonLines rows={3} />
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-ink-400">
          No machines yet. Cashiers take card and UPI on any machine and type
          its reference.
        </p>
      ) : (
        [...byBranch.entries()].map(([branch, list]) => (
          <div key={branch}>
            <h3 className="mb-space-1 text-[12px] font-bold uppercase tracking-wide text-ink-400">
              {branch}
            </h3>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {list.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-space-3 p-space-3"
                >
                  <Wifi
                    size={18}
                    className={d.connected ? "text-success" : "text-ink-300"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-space-2">
                      <span className="font-medium text-ink-900">
                        {d.label}
                      </span>
                      {!d.is_active ? (
                        <Badge tone="neutral">Retired</Badge>
                      ) : d.connected ? (
                        <Badge tone="success">Connected</Badge>
                      ) : (
                        <Badge tone="neutral">Typed reference</Badge>
                      )}
                    </div>
                    <p className="text-[12.5px] text-ink-600">
                      {d.provider_name}
                      {d.device_ref ? ` · ${d.device_ref}` : ""} · takes{" "}
                      {[d.accepts_card && "card", d.accepts_upi && "UPI"]
                        .filter(Boolean)
                        .join(" and ")}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-space-2">
                      <Button variant="ghost" onClick={() => setEditing(d)}>
                        Edit
                      </Button>
                      {d.connected && d.is_active && (
                        <Button
                          variant="secondary"
                          onClick={() => setTesting(d)}
                        >
                          Test payment
                        </Button>
                      )}
                      <Button
                        variant={d.is_active ? "destructive" : "secondary"}
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate(
                            { id: d.id, is_active: !d.is_active },
                            {
                              onError: (e: Error) =>
                                toast.error("Couldn't change it", e.message),
                            },
                          )
                        }
                      >
                        {d.is_active ? "Retire" : "Restore"}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      {retired > 0 && (
        <button
          className="text-[12.5px] text-brand-700"
          onClick={() => setShowRetired(!showRetired)}
        >
          {showRetired
            ? "Hide retired machines"
            : `Show retired machines (${retired})`}
        </button>
      )}
      {testing && (
        <TestPaymentModal device={testing} onClose={() => setTesting(null)} />
      )}
      {editing && (
        <DeviceModal
          device={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function DeviceModal({
  device,
  onClose,
}: {
  device: PaymentDevice | null;
  onClose: () => void;
}) {
  const branches = useBranches();
  const providers = usePaymentProviders();
  const connections = usePaymentConnections();
  const create = useCreateDevice();
  const update = useUpdateDevice();
  const [body, setBody] = useState<DeviceBody>(() => ({
    branch_id: device?.branch_id ?? "",
    label: device?.label ?? "",
    provider: device?.provider ?? "other",
    connection_id: device?.connection_id ?? null,
    device_ref: device?.device_ref ?? "",
    accepts_card: device?.accepts_card ?? true,
    accepts_upi: device?.accepts_upi ?? true,
  }));
  const branchId =
    body.branch_id ||
    branches.data?.find((b) => b.status === "active")?.id ||
    "";
  const accounts = (connections.data ?? []).filter(
    (c: PaymentConnection) => c.provider === body.provider && c.is_active,
  );
  const info = providers.data?.find((p) => p.key === body.provider);
  const busy = create.isPending || update.isPending;
  const save = () => {
    const payload = {
      ...body,
      branch_id: branchId,
      device_ref: body.device_ref || null,
    };
    const done = {
      onSuccess: () => {
        toast.success(device ? "Machine saved" : "Machine added");
        onClose();
      },
      onError: (e: Error) =>
        toast.error("Couldn't save the machine", e.message),
    };
    if (device) update.mutate({ id: device.id, ...payload }, done);
    else create.mutate(payload, done);
  };
  return (
    <Modal
      open
      title={device ? "Edit card machine" : "Add a card machine"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || !branchId || !body.label.trim()}
            onClick={save}
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <Field label="Branch" required>
        <Select
          value={branchId}
          onValueChange={(v) => setBody({ ...body, branch_id: v })}
        >
          {(branches.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.branch_name}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Name"
        htmlFor="dev_label"
        hint="What cashiers see, e.g. 'Counter 2 - Paytm'."
        required
      >
        <Input
          id="dev_label"
          value={body.label}
          onChange={(e) => setBody({ ...body, label: e.target.value })}
        />
      </Field>
      <Field label="Provider">
        <Select
          value={body.provider ?? "other"}
          onValueChange={(v) =>
            setBody({ ...body, provider: v, connection_id: null })
          }
        >
          {(providers.data ?? []).map((p) => (
            <option key={p.key} value={p.key}>
              {p.name}
            </option>
          ))}
          <option value="other">Other</option>
        </Select>
      </Field>
      {accounts.length > 0 && (
        <Field
          label="Connected account"
          hint="Connected: the till sends the amount to this machine."
        >
          <Select
            value={body.connection_id ?? ""}
            onValueChange={(v) =>
              setBody({ ...body, connection_id: v || null })
            }
          >
            <option value="">
              Not connected (cashier types the reference)
            </option>
            {accounts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field
        label={info?.device_ref_label ?? "Machine id"}
        htmlFor="dev_ref"
        hint={
          body.connection_id
            ? "Required: on the machine's sticker or settings screen."
            : "Optional for a machine that is not connected."
        }
        required={!!body.connection_id}
      >
        <Input
          id="dev_ref"
          value={body.device_ref ?? ""}
          onChange={(e) => setBody({ ...body, device_ref: e.target.value })}
        />
      </Field>
      <div className="flex gap-space-5 text-[13px] text-ink-700">
        <label className="flex items-center gap-space-2">
          <Switch
            checked={body.accepts_card}
            onChange={() =>
              setBody({ ...body, accepts_card: !body.accepts_card })
            }
          />{" "}
          Takes cards
        </label>
        <label className="flex items-center gap-space-2">
          <Switch
            checked={body.accepts_upi}
            onChange={() =>
              setBody({ ...body, accepts_upi: !body.accepts_upi })
            }
          />{" "}
          Takes UPI
        </label>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------------------------------------ payments the machines took
function RequestsCard() {
  const [unused, setUnused] = useState(false);
  const requests = usePaymentRequests(unused);
  const [resolving, setResolving] = useState<PaymentRequest | null>(null);
  const count = requests.data?.unused_count ?? 0;
  return (
    <Card className="space-y-space-3 p-space-5">
      <div className="flex flex-wrap items-center justify-between gap-space-3">
        <h2 className="text-[15px] font-bold text-ink-900">
          Payments on connected machines
        </h2>
        <div className="flex gap-space-2">
          <Button
            variant={unused ? "ghost" : "secondary"}
            onClick={() => setUnused(false)}
          >
            All
          </Button>
          <Button
            variant={unused ? "secondary" : "ghost"}
            onClick={() => setUnused(true)}
          >
            Charged but no bill{count > 0 ? ` (${count})` : ""}
          </Button>
        </div>
      </div>
      {unused && (
        <p className="text-[13px] text-ink-600">
          The machine confirmed these but no bill used them within 30 minutes
          (the till stopped, the cashier walked away). Refund the customer on
          the machine or bill it, then mark it as dealt with.
        </p>
      )}
      {requests.isLoading ? (
        <SkeletonLines rows={4} />
      ) : (requests.data?.items ?? []).length === 0 ? (
        <p className="text-[13px] text-ink-400">
          {unused
            ? "Nothing waiting."
            : "No payments on connected machines yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="text-[12px] uppercase tracking-wide text-ink-400">
              <tr>
                <th className="py-space-2">When</th>
                <th>Machine</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Bill</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {requests.data!.items.map((r) => (
                <tr key={r.id}>
                  <td className="py-space-2 text-ink-600">
                    {new Date(r.created_at).toLocaleString("en-IN")}
                  </td>
                  <td>
                    {r.device_label}
                    <span className="block text-[12px] text-ink-400">
                      {r.branch_name}
                      {r.cashier_name ? ` · ${r.cashier_name}` : ""}
                    </span>
                  </td>
                  <td>
                    {formatMoney(r.amount_minor)}
                    <span className="block text-[12px] text-ink-400">
                      {r.method === "upi"
                        ? `UPI ${r.upi_utr ?? ""}`
                        : `Card ${r.card_last4 ? `•••• ${r.card_last4}` : ""}`}
                    </span>
                  </td>
                  <td>
                    <Badge
                      tone={
                        r.status === "succeeded"
                          ? "success"
                          : r.status === "unknown"
                            ? "warning"
                            : r.final
                              ? "neutral"
                              : "info"
                      }
                    >
                      {REQUEST_STATUS_LABEL[r.status]}
                    </Badge>
                    {r.is_test && (
                      <Badge tone="warning" className="ml-space-1">
                        Test
                      </Badge>
                    )}
                    {r.failure_reason && (
                      <span className="block text-[12px] text-ink-400">
                        {r.failure_reason}
                      </span>
                    )}
                  </td>
                  <td>
                    {r.order_number ??
                      (r.resolved_note
                        ? `Dealt with: ${r.resolved_note}`
                        : "—")}
                  </td>
                  <td className="text-right">
                    {unused && (
                      <Button
                        variant="secondary"
                        onClick={() => setResolving(r)}
                      >
                        Dealt with
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {resolving && (
        <ResolveModal request={resolving} onClose={() => setResolving(null)} />
      )}
    </Card>
  );
}

function ResolveModal({
  request,
  onClose,
}: {
  request: PaymentRequest;
  onClose: () => void;
}) {
  const resolve = useResolveRequest();
  const [note, setNote] = useState("");
  return (
    <Modal
      open
      width="sm"
      title={`${formatMoney(request.amount_minor)} on ${request.device_label}`}
      description="Say what was done with this payment."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={note.trim().length < 3 || resolve.isPending}
            onClick={() =>
              resolve.mutate(
                { id: request.id, note: note.trim() },
                {
                  onSuccess: () => {
                    toast.success("Marked as dealt with");
                    onClose();
                  },
                  onError: (e: Error) =>
                    toast.error("Couldn't save", e.message),
                },
              )
            }
          >
            Save
          </Button>
        </>
      }
    >
      <Field
        label="What was done"
        htmlFor="resolve_note"
        hint="E.g. 'Refunded on the machine' or 'Billed by hand as B1T1/00042'."
      >
        <Input
          id="resolve_note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
    </Modal>
  );
}
