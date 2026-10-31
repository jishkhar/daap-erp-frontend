"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBillingContact, useSaveBillingEmail } from "@/hooks/useBilling";
import { toast } from "@/lib/toast";

/** One line under the billing history: where invoices are emailed, with an optional billing email that gets a copy. */
export function BillingEmail({ canManage }: { canManage: boolean }) {
  const contact = useBillingContact();
  const save = useSaveBillingEmail();
  const [editing, setEditing] = useState<string | null>(null);
  const data = contact.data;
  if (!data) return null;
  const to = [data.onboarding_email, data.billing_email].filter(Boolean);

  if (editing !== null)
    return (
      <form
        className="mt-space-3 flex flex-wrap items-center gap-space-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(editing.trim() || null, {
            onSuccess: () => {
              toast.success("Billing email saved");
              setEditing(null);
            },
            onError: (err) => toast.error("Couldn't save", err.message),
          });
        }}
      >
        <label htmlFor="billing-email" className="text-[13px] text-ink-600">
          Also send invoices to
        </label>
        <Input
          id="billing-email"
          type="email"
          autoFocus
          placeholder="accounts@yourbusiness.com"
          value={editing}
          onChange={(e) => setEditing(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary" disabled={save.isPending}>
          Save
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
          Cancel
        </Button>
      </form>
    );

  return (
    <p className="mt-space-3 text-[13px] text-ink-600">
      Invoices are emailed to{" "}
      <span className="font-medium text-ink-900">{to.join(" and ")}</span>.
      {canManage && (
        <button
          type="button"
          onClick={() => setEditing(data.billing_email ?? "")}
          className="ml-space-2 text-brand-600 hover:underline"
        >
          {data.billing_email ? "Change billing email" : "Add a billing email"}
        </button>
      )}
    </p>
  );
}
