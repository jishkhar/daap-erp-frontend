"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Recycle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { IntakeForm } from "@/components/erp/recommerce/IntakeForm";
import { ProductSelect } from "@/components/erp/ProductSelect";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CursorPager } from "@/components/ui/CursorPager";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import {
  usePriceGuides,
  useRecommerceAssets,
  useRecommerceSummary,
  useSavePriceGuide,
} from "@/hooks/useRecommerce";
import {
  ASSET_STATUS_TONE,
  formatMoney,
  humanize,
  toMinor,
  type PriceGuide,
  type Product,
  type RecommerceAsset,
} from "@/lib/erp";
import { useActiveBranch } from "@/lib/branch";
import { hasGrant, hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { useDebounced } from "@/lib/useDebounced";

type Tab = "pipeline" | "intake" | "guides";
const STAGES = [
  "INSPECTED",
  "ACQUIRED",
  "GRADED",
  "IN_REFURBISHMENT",
  "QC_PENDING",
  "QC_FAILED",
  "IN_STOCK",
  "SOLD",
  "SCRAPPED",
  "REJECTED",
];

export default function RecommercePage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const router = useRouter();
  const { branchId } = useActiveBranch();
  const [tab, setTab] = useState<Tab>("pipeline");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const summary = useRecommerceSummary();
  const assets = useRecommerceAssets({ status, q: query, branch_id: branchId }); // newest first, searched and paged on the server
  const cur = tenant?.currency ?? "INR";
  const branchCode = useMemo(
    () => new Map((session?.branches ?? []).map((b) => [b.id, b.branch_code])),
    [session],
  );
  const canAcquire = hasGrant(session, "recommerce:acquire");

  const columns = useMemo<ColumnDef<RecommerceAsset, unknown>[]>(
    () => [
      {
        header: "Asset",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink-900">
              {row.original.asset_number}
            </p>
            <p className="text-[12px] text-ink-400">
              {row.original.source_type === "TRADE_IN" ? "Trade-in" : "Buyback"}
            </p>
          </div>
        ),
      },
      {
        header: "Device",
        cell: ({ row }) => (
          <div>
            <p className="text-ink-900">{row.original.product_name}</p>
            <p className="font-mono text-[12px] text-ink-400">
              {row.original.serial_number}
            </p>
          </div>
        ),
      },
      {
        header: "Grade",
        cell: ({ row }) =>
          row.original.grade ??
          (row.original.suggested_grade ? (
            <span className="text-ink-400">
              {row.original.suggested_grade}?
            </span>
          ) : (
            "—"
          )),
      },
      {
        header: "Branch",
        cell: ({ row }) =>
          branchCode.get(row.original.current_branch_id) ??
          `#${row.original.current_branch_id}`,
      },
      {
        header: "Cost basis",
        cell: ({ row }) => formatMoney(row.original.cost_basis_minor, cur),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={ASSET_STATUS_TONE[row.original.status]}>
            {humanize(row.original.status)}
          </Badge>
        ),
      },
    ],
    [branchCode, cur],
  );

  if (!ready) return null;
  const by = summary.data?.by_status ?? {};

  return (
    <PortalShell tenant={tenant} active="recommerce">
      <PageHeader
        scopedToBranch
        icon={<Recycle size={20} />}
        title="ReCommerce"
        description="Buy back and take trade-ins, refurbish, quality-check and resell. Every unit carries its exact cost."
      />
      <Tabs<Tab>
        tabs={[
          { key: "pipeline", label: "Pipeline" },
          ...(canAcquire
            ? [{ key: "intake" as const, label: "New inspection" }]
            : []),
          { key: "guides", label: "Price guides" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "pipeline" && (
        <>
          {summary.error && (
            <p className="mb-space-3 text-[13px] font-medium text-error">
              {summary.error.message}
            </p>
          )}
          <div className="mb-space-4 grid grid-cols-2 gap-space-3 sm:grid-cols-4">
            <Card className="p-space-3">
              <p className="text-[12px] text-ink-400">Work in progress</p>
              <p className="text-[20px] font-bold text-ink-900">
                {formatMoney(summary.data?.wip_cost_minor ?? 0, cur)}
              </p>
            </Card>
            <Card className="p-space-3">
              <p className="text-[12px] text-ink-400">Ready to sell</p>
              <p className="text-[20px] font-bold text-ink-900">
                {summary.data?.in_stock_units ?? 0}
              </p>
            </Card>
            <Card className="p-space-3">
              <p className="text-[12px] text-ink-400">Awaiting QC</p>
              <p className="text-[20px] font-bold text-ink-900">
                {by.QC_PENDING?.units ?? 0}
              </p>
            </Card>
            <Card className="p-space-3">
              <p className="text-[12px] text-ink-400">In refurbishment</p>
              <p className="text-[20px] font-bold text-ink-900">
                {(by.IN_REFURBISHMENT?.units ?? 0) + (by.GRADED?.units ?? 0)}
              </p>
            </Card>
          </div>
          <Card className="mb-space-4 flex flex-wrap gap-space-3 p-space-3">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-52"
              aria-label="Stage"
            >
              <option value="">Any stage</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                  {by[s] ? ` (${by[s].units})` : ""}
                </option>
              ))}
            </Select>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search IMEI or asset no."
              className="w-64"
              aria-label="Search"
            />
          </Card>
          {assets.error && (
            <p className="mb-space-3 text-[13px] font-medium text-error">
              {assets.error.message}
            </p>
          )}
          <Card className="p-space-2">
            <DataTable
              columns={columns}
              data={assets.rows}
              getRowId={(a) => String(a.id)}
              onRowClick={(a) => router.push(`/portal/recommerce/${a.id}`)}
              paginate={false}
              loading={assets.isFetching}
              emptyMessage={
                assets.isLoading ? "Loading…" : "No devices in the pipeline."
              }
            />
            <CursorPager {...assets.pager} />
          </Card>
        </>
      )}
      {tab === "intake" && (
        <IntakeForm
          branchId={branchId}
          onDone={(a) => router.push(`/portal/recommerce/${a.id}`)}
        />
      )}
      {tab === "guides" && (
        <PriceGuides
          currency={cur}
          canEdit={hasTenantWide(session, "recommerce:manage")}
        />
      )}
    </PortalShell>
  );
}

/** The most we will pay for each model by grade. Offers above it need a manager. */
function PriceGuides({
  currency,
  canEdit,
}: {
  currency: string;
  canEdit: boolean;
}) {
  const guides = usePriceGuides();
  const saveGuide = useSavePriceGuide();
  const [model, setModel] = useState<Product | null>(null); // searched in the catalogue (serialized models only)
  const product = model ? String(model.id) : "";
  const [grade, setGrade] = useState("A");
  const [price, setPrice] = useState("");

  function save() {
    const minor = toMinor(price);
    if (!product || !minor)
      return toast.error("Choose a model and enter a price");
    saveGuide.mutate(
      { variant_id: product, grade, max_price_minor: minor },
      {
        onSuccess: () => {
          toast.success("Price guide saved");
          setPrice("");
        },
        onError: (e) => toast.error("Couldn't save the guide", e.message),
      },
    );
  }
  const rows = [...(guides.data ?? [])].sort(
    (a, b) =>
      a.variant_id.localeCompare(b.variant_id) ||
      a.grade.localeCompare(b.grade),
  );
  return (
    <>
      {canEdit && (
        <Card className="mb-space-4 flex flex-wrap items-end gap-space-3 p-space-3">
          <div className="w-72">
            <ProductSelect
              value={model}
              onChange={setModel}
              serialized
              placeholder="Search device models…"
            />
          </div>
          <Select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-28"
            aria-label="Grade"
          >
            {["A", "B", "C"].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </Select>
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={`Max price (${currency})`}
            inputMode="decimal"
            className="w-48"
            aria-label="Max price"
          />
          <Button onClick={save}>Save guide</Button>
        </Card>
      )}
      <Card className="p-space-2">
        <DataTable<PriceGuide>
          columns={[
            {
              header: "Model",
              cell: ({ row }) =>
                row.original.product_name ?? `#${row.original.variant_id}`,
            },
            { header: "Grade", cell: ({ row }) => row.original.grade },
            {
              header: "Most we pay",
              cell: ({ row }) =>
                `${formatMoney(row.original.max_price_minor, currency)}`,
            },
          ]}
          data={rows}
          getRowId={(g) => String(g.id)}
          loading={guides.isFetching}
          emptyMessage={
            guides.isLoading
              ? "Loading…"
              : "No price guides yet — set one before buying devices."
          }
        />
      </Card>
      {!canEdit && (
        <p className="mt-space-2 text-[12.5px] text-ink-400">
          Price guides are set by a tenant-wide manager.
        </p>
      )}
    </>
  );
}
