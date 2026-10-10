"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import {
  erpGet,
  erpSend,
  qs,
  type Account,
  type Expense,
  type JournalEntry,
  type TaxDocument,
} from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

type Params = Record<string, string | number | boolean | null | undefined>;

/** Every finance figure on screen: the books change together (an expense, a journal entry or a settlement moves several reports). */
function useRefreshFinance() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.finance });
}

// ------------------------------------------------------------------ overview and reports
export type FinanceSummary = {
  month: string;
  net_revenue_minor: number;
  gross_profit_minor: number;
  gross_margin_pct: number | null;
  net_profit_minor: number;
  cash_and_bank_minor: number;
  gateway_clearing_minor: number;
  receivable_minor: number;
  payable_minor: number;
  inventory_minor: number;
  gst_payable_minor: number;
};

/** This month's headline figures, for one branch or the whole business. */
export function useFinanceSummary(branchId: string | null) {
  const params = { branch_id: branchId };
  return useQuery({
    queryKey: queryKeys.financeSummary(params),
    queryFn: () =>
      erpGet<FinanceSummary>(`/api/v1/finance/reports/summary${qs(params)}`),
  });
}

/** One finance report (`/api/v1/finance/reports/<name>`): profit-and-loss, balance-sheet, gst, gstr1, sales-matrix ... */
export function useFinanceReport<T>(name: string, params: Params = {}) {
  return useQuery({
    queryKey: queryKeys.financeReport(name, params),
    queryFn: () => erpGet<T>(`/api/v1/finance/reports/${name}${qs(params)}`),
  });
}

/** Close the books through a date (null reopens them): nothing dated on or before it can be posted. */
export function useSetPeriodLock() {
  const refresh = useRefreshFinance();
  return useMutation({
    mutationFn: (closedThrough: string | null) =>
      erpSend("/api/v1/finance/period-lock", "PUT", {
        closed_through: closedThrough,
      }),
    onSuccess: refresh,
  });
}

// ------------------------------------------------------------------ expenses
export type ExpenseCategory = {
  id: string;
  name: string;
  account_code: string;
};

/** Expenses, newest first, paged on the server. */
export function useExpenseList(filters: {
  status?: string;
  branch_id?: string | null;
}) {
  return usePagedQuery<Expense>(
    (params) => queryKeys.expenseList(params),
    "/api/v1/finance/expenses",
    filters,
  );
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: queryKeys.expenseCategories,
    queryFn: () =>
      erpGet<ExpenseCategory[]>("/api/v1/finance/expense-categories"),
  });
}

export type NewExpense = {
  branch_id: string | undefined;
  category_id: string;
  amount_minor: number;
  description: string;
  vendor: string | null;
  expense_date?: string;
};

/** Submit an expense for approval. */
export function useCreateExpense() {
  const refresh = useRefreshFinance();
  return useMutation({
    mutationFn: (input: NewExpense) =>
      erpSend("/api/v1/finance/expenses", "POST", input),
    onSuccess: refresh,
  });
}

/** Approve, reject (body: reason) or pay (body: paid_via) an expense. */
export function useExpenseAction() {
  const refresh = useRefreshFinance();
  return useMutation({
    mutationFn: ({
      id,
      action,
      body,
    }: {
      id: string;
      action: "approve" | "reject" | "pay";
      body?: unknown;
    }) => erpSend(`/api/v1/finance/expenses/${id}/${action}`, "POST", body),
    onSuccess: refresh,
  });
}

// ------------------------------------------------------------------ journal
/** The general journal, newest first, paged on the server. */
export function useJournalList(filters: { branch_id?: string | null }) {
  return usePagedQuery<JournalEntry>(
    (params) => queryKeys.journalList(params),
    "/api/v1/finance/journal-entries",
    filters,
  );
}

/** One journal entry with its lines. Nothing is fetched while `id` is empty. */
export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: queryKeys.journalEntry(id),
    queryFn: () =>
      erpGet<JournalEntry>(`/api/v1/finance/journal-entries/${id}`),
    enabled: Boolean(id),
  });
}

/** The chart of accounts. */
export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => erpGet<Account[]>("/api/v1/finance/accounts"),
  });
}

export type JournalLineIn = {
  account: string;
  debit_minor: number;
  credit_minor: number;
};

/** Post a manual (balanced) journal entry. */
export function usePostJournal() {
  const refresh = useRefreshFinance();
  return useMutation({
    mutationFn: (input: { memo: string; lines: JournalLineIn[] }) =>
      erpSend("/api/v1/finance/journal-entries", "POST", input),
    onSuccess: refresh,
  });
}

/** Entries are never edited: a mistake is undone by a reversing entry. */
export function useReverseJournal() {
  const refresh = useRefreshFinance();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      erpSend(`/api/v1/finance/journal-entries/${id}/reverse`, "POST", {
        reason,
      }),
    onSuccess: refresh,
  });
}

// ------------------------------------------------------------------ reconciliation
export type UnreconciledPayment = {
  id: string;
  order_id: string;
  provider_txn_id: string | null;
  amount_minor: number;
  captured_at: string;
};
export type Settlement = {
  id: string;
  external_ref: string;
  amount_minor: number;
  fee_minor: number;
  settled_on: string;
  status: "MATCHED" | "UNMATCHED" | "AMOUNT_MISMATCH";
};

/** Captured gateway payments not yet matched to a settlement. */
export function useUnreconciledPayments() {
  return useQuery({
    queryKey: queryKeys.unreconciled,
    queryFn: () =>
      erpGet<UnreconciledPayment[]>("/api/v1/finance/unreconciled-payments"),
  });
}

export function useSettlements() {
  return useQuery({
    queryKey: queryKeys.settlements,
    queryFn: () => erpGet<Settlement[]>("/api/v1/finance/settlements"),
  });
}

export type SettlementLine = {
  external_ref: string;
  amount_minor: number | null;
  fee_minor: number;
  settled_on: string;
};
export type SettlementImportResult = {
  matched: number;
  unmatched: number;
  amount_mismatch: number;
  duplicate: number;
};

/** Import a gateway settlement report; lines are matched to captured payments by reference and amount. */
export function useImportSettlements() {
  const refresh = useRefreshFinance();
  return useMutation({
    mutationFn: (lines: SettlementLine[]) =>
      erpSend<SettlementImportResult>(
        "/api/v1/finance/settlements/import",
        "POST",
        { provider: "razorpay", lines },
      ),
    onSuccess: refresh,
  });
}

// ------------------------------------------------------------------ tax documents
/** GST tax invoices and credit notes, newest first, paged on the server. */
export function useTaxDocuments(filters: { branch_id?: string | null }) {
  return usePagedQuery<TaxDocument>(
    (params) => queryKeys.taxDocuments(params),
    "/api/v1/finance/tax-documents",
    filters,
  );
}
