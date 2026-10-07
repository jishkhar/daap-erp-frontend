"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useActiveBranch } from "@/lib/branch";
import {
  EXPENSE_STATUS_TONE,
  erp,
  formatMoney,
  humanize,
  qs,
  toMinor,
  useErpQuery,
  type Expense,
} from "@/lib/erp";
import { activeBranches, hasGrant, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

type Category = { id: string; name: string; account_code: string };

export function ExpensesTab({ currency }: { currency: string }) {
  const session = useStaffSession();
  const [status, setStatus] = useState("");
  const { branchId: activeBranch } = useActiveBranch();
  const expenses = useErpQuery<Expense[]>(
    `/api/v1/finance/expenses${qs({ status, branch_id: activeBranch })}`,
  );
  const categories = useErpQuery<Category[]>(
    "/api/v1/finance/expense-categories",
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    branch_id: "",
    category_id: "",
    amount: "",
    description: "",
    vendor: "",
    date: "",
  });
  const [busy, setBusy] = useState(false);
  const allBranches = useMemo(() => session?.branches ?? [], [session]);
  const branches = useMemo(() => activeBranches(session), [session]);
  const branchCode = (id: string) =>
    allBranches.find((b) => b.id === id)?.branch_code ?? `#${id}`;
  const canCreate = hasGrant(session, "expenses:create"),
    canApprove = hasGrant(session, "expenses:approve"),
    canPay = hasGrant(session, "expenses:pay");

  async function act(
    id: string,
    action: string,
    body?: unknown,
    message?: string,
  ) {
    const res = await erp(
      `/api/v1/finance/expenses/${id}/${action}`,
      "POST",
      body,
    );
    if (res.error) return toast.error("Couldn't update the expense", res.error);
    toast.success(message ?? "Done");
    expenses.reload();
  }

  const columns = useMemo<ColumnDef<Expense, unknown>[]>(
    () => [
      {
        header: "Expense",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink-900">
              {row.original.description}
            </p>
            <p className="text-[12px] text-ink-400">
              {row.original.expense_number} · {row.original.category_name}
              {row.original.vendor ? ` · ${row.original.vendor}` : ""}
            </p>
          </div>
        ),
      },
      {
        header: "Branch",
        cell: ({ row }) => branchCode(row.original.branch_id),
      },
      { header: "Date", cell: ({ row }) => row.original.expense_date },
      {
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatMoney(row.original.amount_minor, currency)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={EXPENSE_STATUS_TONE[row.original.status]}>
            {humanize(row.original.status)}
          </Badge>
        ),
      },
      {
        header: "",
        id: "a",
        cell: ({ row }) => (
          <div className="flex justify-end gap-space-1">
            {row.original.status === "SUBMITTED" && canApprove && (
              <>
                <Button
                  variant="ghost"
                  onClick={() =>
                    act(
                      row.original.id,
                      "approve",
                      undefined,
                      "Expense approved",
                    )
                  }
                >
                  Approve
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const reason = window.prompt("Reason for rejecting?");
                    if (reason)
                      void act(
                        row.original.id,
                        "reject",
                        { reason },
                        "Expense rejected",
                      );
                  }}
                >
                  Reject
                </Button>
              </>
            )}
            {row.original.status === "APPROVED" && canPay && (
              <>
                <Button
                  variant="ghost"
                  onClick={() =>
                    act(
                      row.original.id,
                      "pay",
                      { paid_via: "BANK" },
                      "Paid from bank",
                    )
                  }
                >
                  Pay (bank)
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    act(
                      row.original.id,
                      "pay",
                      { paid_via: "CASH" },
                      "Paid in cash",
                    )
                  }
                >
                  Pay (cash)
                </Button>
              </>
            )}
          </div>
        ),
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [branches, currency, canApprove, canPay],
  );

  async function submit() {
    const amount = toMinor(form.amount);
    if (!amount) return toast.error("Enter a valid amount");
    setBusy(true);
    const res = await erp("/api/v1/finance/expenses", "POST", {
      branch_id: form.branch_id || branches[0]?.id,
      category_id: form.category_id,
      amount_minor: amount,
      description: form.description.trim(),
      vendor: form.vendor.trim() || null,
      ...(form.date ? { expense_date: form.date } : {}),
    });
    setBusy(false);
    if (res.error) return toast.error("Couldn't submit the expense", res.error);
    toast.success("Expense submitted for approval");
    setOpen(false);
    setForm({
      branch_id: "",
      category_id: "",
      amount: "",
      description: "",
      vendor: "",
      date: "",
    });
    expenses.reload();
  }

  return (
    <>
      <Card className="mb-space-4 flex flex-wrap items-center justify-between gap-space-3 p-space-3">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-48"
          aria-label="Status"
        >
          <option value="">Any status</option>
          {["SUBMITTED", "APPROVED", "PAID", "REJECTED"].map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New expense
          </Button>
        )}
      </Card>
      {expenses.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {expenses.error}
        </p>
      )}
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={expenses.data ?? []}
          getRowId={(e) => String(e.id)}
          loading={expenses.loading}
          emptyMessage={expenses.loading ? "Loading…" : "No expenses."}
        />
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New expense"
        description="Approved by someone other than you, then paid. The cost is booked when it is approved."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                !form.category_id ||
                !form.amount ||
                !form.description.trim()
              }
              onClick={submit}
            >
              Submit
            </Button>
          </>
        }
      >
        <div className="grid gap-x-space-4 sm:grid-cols-2">
          <Field label="Branch" htmlFor="x_branch">
            <Select
              id="x_branch"
              value={form.branch_id || String(branches[0]?.id ?? "")}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branch_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category" htmlFor="x_cat" required>
            <Select
              id="x_cat"
              value={form.category_id}
              onChange={(e) =>
                setForm({ ...form, category_id: e.target.value })
              }
            >
              <option value="">Choose…</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`Amount (${currency})`} htmlFor="x_amt" required>
            <Input
              id="x_amt"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="Date" htmlFor="x_date">
            <Input
              id="x_date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field
            label="Description"
            htmlFor="x_desc"
            required
            className="sm:col-span-2"
          >
            <Input
              id="x_desc"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          <Field label="Vendor" htmlFor="x_vendor" className="sm:col-span-2">
            <Input
              id="x_vendor"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
