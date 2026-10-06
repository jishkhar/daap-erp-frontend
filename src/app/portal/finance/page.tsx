"use client";

import { Banknote } from "lucide-react";
import { useState } from "react";
import { ExpensesTab } from "@/components/erp/finance/ExpensesTab";
import { FinanceOverview } from "@/components/erp/finance/FinanceOverview";
import { JournalTab } from "@/components/erp/finance/JournalTab";
import { ReconciliationTab } from "@/components/erp/finance/ReconciliationTab";
import { TaxInvoicesTab } from "@/components/erp/finance/TaxInvoicesTab";
import { FinancialReports } from "@/components/erp/reports/FinancialReports";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";

type Tab = "overview" | "expenses" | "invoices" | "reports" | "reconciliation" | "journal";

export default function FinancePage() {
  const { tenant, ready } = usePortalGuard();
  const [tab, setTab] = useState<Tab>("overview");
  if (!ready) return null;
  const currency = tenant?.currency ?? "INR";

  return (
    <PortalShell tenant={tenant} active="finance">
      <PageHeader scopedToBranch icon={<Banknote size={20} />} title="Finance" description="One set of books for every branch and channel. Financial statements and GST reports are under Reports." />
      <Tabs<Tab> tabs={[{ key: "overview", label: "Overview" }, { key: "expenses", label: "Expenses" }, { key: "invoices", label: "Tax invoices" }, { key: "reports", label: "Reports" }, { key: "reconciliation", label: "Reconciliation" }, { key: "journal", label: "Journal" }]} value={tab} onChange={setTab} />
      {tab === "overview" && <FinanceOverview currency={currency} />}
      {tab === "expenses" && <ExpensesTab currency={currency} />}
      {tab === "invoices" && <TaxInvoicesTab currency={currency} />}
      {tab === "reports" && <FinancialReports currency={currency} />}
      {tab === "reconciliation" && <><p className="mb-space-3 text-[12.5px] text-ink-400">Gateway payments and settlements are reconciled company-wide, so the branch filter doesn&apos;t apply here.</p><ReconciliationTab currency={currency} /></>}
      {tab === "journal" && <JournalTab currency={currency} />}
    </PortalShell>
  );
}
