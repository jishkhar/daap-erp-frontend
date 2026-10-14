"use client";

import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useImportProducts, type ImportResult } from "@/hooks/useProducts";

const COLUMNS = [
  {
    name: "sku",
    required: true,
    guide:
      "Unique product SKU, up to 64 characters. Existing SKUs and duplicates in the file are skipped.",
  },
  { name: "name", required: true, guide: "Product name, e.g. Cotton kurta." },
  {
    name: "price",
    required: true,
    guide:
      "Selling price in currency units, e.g. 1299.00. Use a non-negative number without a currency symbol.",
  },
  {
    name: "variant_name",
    guide:
      "Size, colour or option label, e.g. M / Indigo. Blank uses Default. Each row creates a separate product.",
  },
  {
    name: "description",
    guide:
      "Product description. Quote CSV text containing commas or line breaks.",
  },
  {
    name: "category",
    guide: "Category name. New categories are created automatically.",
  },
  { name: "brand", guide: "Brand name. New brands are created automatically." },
  {
    name: "mrp",
    guide:
      "Maximum retail price in currency units. Must be at least the selling price. Leave blank if not applicable.",
  },
  {
    name: "cost",
    guide:
      "Unit cost in currency units. Use a non-negative number, or leave blank.",
  },
  {
    name: "tax_code",
    guide:
      "An existing ERP tax-rule code. Create the tax rule first; leave blank if not applicable.",
  },
  {
    name: "serialization_type",
    guide:
      "NONE, SERIAL or IMEI. Blank uses NONE. This selects tracking; individual serial numbers are added when receiving stock.",
  },
  {
    name: "barcode",
    guide:
      "Optional manufacturer barcode, up to 64 printable characters; must be unique. Shop-label barcodes are generated automatically.",
  },
  {
    name: "hsn_code",
    guide:
      "HSN code for GST invoices. Format this column as text in Excel to preserve leading zeros.",
  },
  {
    name: "status",
    guide: "active, draft, discontinued or archived. Blank uses active.",
  },
];

export function ProductImportModal({
  currency,
  onClose,
  onImported,
}: {
  currency: string;
  onClose: () => void;
  onImported: (result: ImportResult) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importer = useImportProducts();
  const busy = importer.isPending;

  function chooseFile(selected?: File) {
    if (!selected) return;
    setError(null);
    setFile(null);
    if (!/\.(csv|xlsx)$/i.test(selected.name)) {
      setError("Choose a CSV or Excel (.xlsx) file.");
    } else if (selected.size > 5 * 1024 * 1024) {
      setError("The file is too large. Choose a file no larger than 5 MB.");
    } else if (selected.size === 0) {
      setError("The file is empty. Choose a file containing product rows.");
    } else {
      setFile(selected);
    }
    if (input.current) input.current.value = "";
  }

  function submit() {
    if (!file || busy) return;
    setError(null);
    importer.mutate(file, {
      onSuccess: onImported,
      onError: (e) => setError(e.message),
    });
  }

  return (
    <Modal
      open
      compact
      onClose={onClose}
      dismissible={!busy}
      width="lg"
      title="Bulk import products"
      description="Prepare your file, choose it, then import your products."
      footer={
        <>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!file || busy} onClick={submit}>
            <Upload size={16} /> {busy ? "Importing…" : "Import products"}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-space-2">
        <p className="text-[13px] font-semibold text-ink-900">
          CSV or Excel (.xlsx)
        </p>
        <a
          href="/product-import-template.csv"
          download
          className="inline-flex items-center gap-space-2 text-[13px] font-semibold text-brand-600 hover:underline"
        >
          <Download size={15} /> Download template
        </a>
      </div>
      <p className="mt-space-2 text-[13px] leading-relaxed text-ink-600">
        Up to 2,000 product rows and 5 MB per file. Use the first row for column
        names; Excel imports the active sheet. Each row is checked separately:
        valid rows are imported and skipped rows are listed with their errors.
        This import creates new products; it does not update existing products.
      </p>
      <details
        open
        className="mt-space-4 rounded-md border border-line p-space-3"
      >
        <summary className="cursor-pointer text-[13px] font-semibold text-ink-900">
          Column guide (required fields are marked *)
        </summary>
        <p className="mt-space-2 text-[12px] leading-relaxed text-ink-600">
          Prices, MRP and costs use {currency} amounts, not minor units (e.g.
          1299.00, not 129900). Keep SKUs and barcodes as text in Excel to
          preserve leading zeros. Stock quantities, images and individual serial
          numbers are added separately through inventory and product details.
        </p>
        <dl className="mt-space-3 space-y-space-2 text-[12.5px] leading-relaxed">
          {COLUMNS.map((column) => (
            <div key={column.name}>
              <dt className="inline font-mono font-semibold text-ink-900">
                {column.name}
                {"required" in column && column.required ? " *" : ""}
              </dt>{" "}
              <dd className="inline text-ink-600">— {column.guide}</dd>
            </div>
          ))}
        </dl>
      </details>
      <input
        ref={input}
        type="file"
        accept=".csv,.xlsx"
        hidden
        disabled={busy}
        onChange={(e) => chooseFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="mt-space-4 flex w-full items-center gap-space-3 rounded-md border border-dashed border-line p-space-4 text-left text-[13px] text-ink-600 transition-colors hover:border-brand-400 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50"
      >
        <FileSpreadsheet size={20} className="shrink-0" />
        <span className="min-w-0">
          <span className="block break-all font-semibold text-ink-900">
            {file ? file.name : "Choose a CSV or Excel file"}
          </span>
          <span className="mt-0.5 block text-[12px] text-ink-400">
            {file
              ? "Click to choose a different file. Import starts when you click Import products."
              : "Supported formats: .csv and .xlsx"}
          </span>
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-space-3 text-[13px] text-error">
          {error}
        </p>
      )}
    </Modal>
  );
}
