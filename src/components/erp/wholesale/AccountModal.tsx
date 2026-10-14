"use client";

import { useState } from "react";
import { CustomerSelect } from "@/components/erp/CustomerSelect";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import { usePriceLists, useSaveAccount } from "@/hooks/useWholesale";
import { fromMinor, toMinor, type Customer } from "@/lib/erp";
import { toast } from "@/lib/toast";
import { GSTIN_RE, type CustomerAccount } from "@/lib/wholesale";

type Draft = {
  who: "new" | "existing";
  customer: Customer | null;
  name: string;
  phone: string;
  email: string;
  legal_name: string;
  gstin: string;
  billing_state: string;
  billing_address: string;
  price_list_id: string;
  credit: boolean;
  limit: string;
  days: string;
  status: CustomerAccount["status"];
  hold_reason: string;
  notes: string;
};

function initial(a: CustomerAccount | null, defaultDays: number): Draft {
  return {
    who: "new",
    customer: null,
    name: "",
    phone: "",
    email: "",
    legal_name: a?.legal_name ?? "",
    gstin: a?.gstin ?? "",
    billing_state: a?.gstin ? "" : (a?.billing_state ?? ""),
    billing_address: a?.billing_address ?? "",
    price_list_id: a?.price_list_id ?? "",
    credit: a ? a.credit_limit_minor !== null : false,
    limit: fromMinor(a?.credit_limit_minor ?? null),
    days: String(a?.credit_days ?? defaultDays),
    status: a?.status ?? "active",
    hold_reason: a?.hold_reason ?? "",
    notes: a?.notes ?? "",
  };
}

/** Add a business customer, or change one's terms. A business customer is a customer (new, or picked from the CRM) plus its GSTIN,
 * billing state, price list and credit terms. Credit off = the customer always pays at billing. */
export function AccountModal({
  open,
  account,
  defaultCreditDays,
  onClose,
  onSaved,
}: {
  open: boolean;
  account: CustomerAccount | null;
  defaultCreditDays: number;
  onClose: () => void;
  onSaved?: (a: CustomerAccount) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    initial(account, defaultCreditDays),
  );
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = `${open}:${account?.id ?? "new"}`;
  if (key !== lastKey) {
    // a new opening (or another account): start from what is saved
    setLastKey(key);
    setDraft(initial(account, defaultCreditDays));
  }
  const lists = usePriceLists(open);
  const save = useSaveAccount(account?.id ?? null);
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  const gstin = draft.gstin.trim().toUpperCase();
  const gstinBad = gstin !== "" && !GSTIN_RE.test(gstin);
  const limit = draft.credit ? toMinor(draft.limit) : null;
  const days = Number(draft.days);
  const daysBad = !Number.isInteger(days) || days < 0 || days > 365;
  const holdBad = draft.status === "on_hold" && !draft.hold_reason.trim();
  const whoBad = account
    ? false
    : draft.who === "existing"
      ? !draft.customer
      : !draft.name.trim() || !(draft.phone.trim() || draft.email.trim());
  const invalid =
    whoBad ||
    gstinBad ||
    daysBad ||
    holdBad ||
    (draft.credit && limit === null) ||
    (!!account && !draft.legal_name.trim());

  function submit() {
    const body = {
      legal_name: draft.legal_name.trim() || null,
      gstin: gstin || null,
      billing_state: gstin ? null : draft.billing_state.trim() || null,
      billing_address: draft.billing_address.trim() || null,
      price_list_id: draft.price_list_id || null,
      credit_limit_minor: draft.credit ? limit : null,
      credit_days: draft.credit ? days : 0,
      notes: draft.notes.trim() || null,
    };
    const payload = account
      ? {
          ...body,
          status: draft.status,
          hold_reason:
            draft.status === "on_hold" ? draft.hold_reason.trim() : null,
        }
      : draft.who === "existing"
        ? { ...body, customer_id: draft.customer?.id }
        : {
            ...body,
            customer: {
              name: draft.name.trim(),
              phone: draft.phone.trim() || null,
              email: draft.email.trim() || null,
            },
          };
    save.mutate(payload, {
      onSuccess: (a) => {
        toast.success(
          account ? "Business customer saved" : "Business customer added",
        );
        onSaved?.(a);
        onClose();
      },
      onError: (e) => toast.error("Couldn't save", e.message),
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="lg"
      title={
        account
          ? `${account.legal_name} (${account.account_code})`
          : "Add business customer"
      }
      description={
        account
          ? undefined
          : "A retailer, dealer or contractor that buys from you in bulk. Their GSTIN goes on every invoice."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={invalid || save.isPending} onClick={submit}>
            {save.isPending
              ? "Saving…"
              : account
                ? "Save"
                : "Add business customer"}
          </Button>
        </>
      }
    >
      {!account && (
        <div className="mb-space-4">
          <Tabs<"new" | "existing">
            tabs={[
              { key: "new", label: "New customer" },
              { key: "existing", label: "Existing customer" },
            ]}
            value={draft.who}
            onChange={(who) => set({ who })}
          />
          {draft.who === "existing" ? (
            <Field label="Customer" htmlFor="a_customer" required>
              <CustomerSelect
                id="a_customer"
                value={draft.customer}
                onChange={(customer) =>
                  set({
                    customer,
                    legal_name: draft.legal_name || customer?.name || "",
                    gstin: draft.gstin || customer?.gstin || "",
                  })
                }
              />
            </Field>
          ) : (
            <div className="grid gap-x-space-4 sm:grid-cols-3">
              <Field label="Contact name" htmlFor="a_name" required>
                <Input
                  id="a_name"
                  value={draft.name}
                  maxLength={120}
                  onChange={(e) => set({ name: e.target.value })}
                />
              </Field>
              <Field label="Phone" htmlFor="a_phone" hint="Phone or email">
                <Input
                  id="a_phone"
                  inputMode="tel"
                  value={draft.phone}
                  maxLength={20}
                  onChange={(e) => set({ phone: e.target.value })}
                />
              </Field>
              <Field label="Email" htmlFor="a_email">
                <Input
                  id="a_email"
                  type="email"
                  value={draft.email}
                  maxLength={200}
                  onChange={(e) => set({ email: e.target.value })}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-x-space-4 sm:grid-cols-2">
        <Field
          label="Legal name"
          htmlFor="a_legal"
          required={!!account}
          hint={
            account
              ? undefined
              : "As on their GST registration. Defaults to the contact name."
          }
          className="sm:col-span-2"
        >
          <Input
            id="a_legal"
            value={draft.legal_name}
            maxLength={160}
            onChange={(e) => set({ legal_name: e.target.value })}
          />
        </Field>
        <Field
          label="GSTIN"
          htmlFor="a_gstin"
          error={gstinBad ? "15 characters, e.g. 07ABCDE1234F1Z5" : undefined}
          hint="Leave empty for an unregistered business."
        >
          <Input
            id="a_gstin"
            invalid={gstinBad}
            value={draft.gstin}
            maxLength={15}
            onChange={(e) => set({ gstin: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field
          label="State"
          htmlFor="a_state"
          hint={
            gstin
              ? "Taken from the GSTIN."
              : "Decides IGST or CGST + SGST on counter sales."
          }
        >
          <Input
            id="a_state"
            disabled={!!gstin}
            value={gstin ? "" : draft.billing_state}
            placeholder={
              gstin ? `State code ${gstin.slice(0, 2)}` : "e.g. Karnataka"
            }
            onChange={(e) => set({ billing_state: e.target.value })}
          />
        </Field>
        <Field
          label="Billing address"
          htmlFor="a_addr"
          className="sm:col-span-2"
        >
          <Textarea
            id="a_addr"
            rows={2}
            maxLength={500}
            value={draft.billing_address}
            onChange={(e) => set({ billing_address: e.target.value })}
          />
        </Field>
        <Field
          label="Price list"
          htmlFor="a_list"
          hint="Their prices. None: your normal selling prices."
          className="sm:col-span-2"
        >
          <Select
            id="a_list"
            value={draft.price_list_id}
            onChange={(e) => set({ price_list_id: e.target.value })}
          >
            <option value="">None (normal prices)</option>
            {(lists.data ?? [])
              .filter(
                (l) => l.status === "active" || l.id === draft.price_list_id,
              )
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.prices_include_tax ? " (GST included)" : " (+ GST)"}
                </option>
              ))}
          </Select>
        </Field>
      </div>

      <div className="mt-space-2 rounded-lg border border-line p-space-3">
        <div className="flex items-start justify-between gap-space-4">
          <div>
            <p className="text-[14px] font-semibold text-ink-900">
              Sell on credit
            </p>
            <p className="text-[12.5px] text-ink-600">
              Bill now, collect later, up to a limit. Off: they pay at billing.
            </p>
          </div>
          <Switch
            checked={draft.credit}
            onChange={() => set({ credit: !draft.credit })}
          />
        </div>
        {draft.credit && (
          <div className="mt-space-3 grid gap-x-space-4 sm:grid-cols-2">
            <Field
              label="Credit limit (₹)"
              htmlFor="a_limit"
              required
              error={limit === null ? "Enter an amount" : undefined}
              hint="The most they may owe at any time."
            >
              <Input
                id="a_limit"
                inputMode="decimal"
                invalid={limit === null}
                value={draft.limit}
                onChange={(e) => set({ limit: e.target.value })}
              />
            </Field>
            <Field
              label="Credit days"
              htmlFor="a_days"
              required
              error={daysBad ? "0 to 365" : undefined}
              hint="Each invoice is due this many days after it is issued."
            >
              <Input
                id="a_days"
                inputMode="numeric"
                invalid={daysBad}
                value={draft.days}
                onChange={(e) => set({ days: e.target.value })}
              />
            </Field>
          </div>
        )}
      </div>

      {account && (
        <div className="mt-space-4 grid gap-x-space-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="a_status">
            <Select
              id="a_status"
              value={draft.status}
              onChange={(e) =>
                set({ status: e.target.value as CustomerAccount["status"] })
              }
            >
              <option value="active">Active</option>
              <option value="on_hold">On hold (no new credit sales)</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          {draft.status === "on_hold" && (
            <Field
              label="Why on hold"
              htmlFor="a_hold"
              required
              error={holdBad ? "Say why" : undefined}
            >
              <Input
                id="a_hold"
                invalid={holdBad}
                value={draft.hold_reason}
                maxLength={300}
                onChange={(e) => set({ hold_reason: e.target.value })}
              />
            </Field>
          )}
        </div>
      )}
      <Field label="Notes" htmlFor="a_notes">
        <Textarea
          id="a_notes"
          rows={2}
          maxLength={1000}
          value={draft.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </Field>
    </Modal>
  );
}
