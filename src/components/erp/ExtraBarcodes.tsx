"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  BARCODE_SPECS,
  BARCODE_TYPES,
  sanitizeBarcode,
  validateBarcode,
  type BarcodeType,
} from "@/lib/barcode";
import { useProductBarcodes } from "@/hooks/useProducts";
import type { Product } from "@/lib/erp";
import { toast } from "@/lib/toast";

const SOURCE_LABEL = { manufacturer: "Manufacturer", shop_label: "Shop label" };

/**
 * The other barcodes of a product: a redesigned box, or your own sticker. Each one opens this same product and shares its stock, and
 * a barcode can belong to only one product. (The main barcode is the field above; the till only scans, so this is the one place
 * barcodes are managed.)
 */
export function ExtraBarcodes({ product }: { product: Product | null }) {
  const [type, setType] = useState<BarcodeType>("EAN_13");
  const [source, setSource] = useState<"manufacturer" | "shop_label">(
    "manufacturer",
  );
  const [value, setValue] = useState("");
  const barcodes = useProductBarcodes(product?.id ?? ""); // each change refreshes the product lists, which carry the barcodes
  const busy = barcodes.add.isPending || barcodes.remove.isPending;
  if (!product) return null;
  const extras = (product.barcodes ?? []).filter((b) => !b.is_primary);
  const error = validateBarcode(type, value.trim());

  function add() {
    const code = value.trim();
    if (!code) return toast.error("Enter a barcode");
    if (error) return toast.error("Check the barcode", error);
    barcodes.add.mutate(
      { barcode: code, source },
      {
        onSuccess: () => {
          setValue("");
          toast.success("Barcode added");
        },
        onError: (e) => toast.error("Couldn't add the barcode", e.message),
      },
    );
  }

  function remove(id: string) {
    barcodes.remove.mutate(id, {
      onSuccess: () => toast.success("Barcode removed"),
      onError: (e) => toast.error("Couldn't remove the barcode", e.message),
    });
  }

  return (
    <div className="sm:col-span-2">
      <p className="text-[13px] font-semibold text-ink-900">Other barcodes</p>
      <p className="mb-space-2 text-[12px] text-ink-400">
        A new box or your own label can carry a different barcode. Every barcode
        here opens this same product and shares its stock.
      </p>
      {extras.length > 0 && (
        <ul className="mb-space-2 space-y-space-1">
          {extras.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-md border border-line px-space-3 py-space-1"
            >
              <span className="flex items-center gap-space-2">
                <span className="font-mono text-[13px]">{b.barcode}</span>
                <Badge tone="neutral">{SOURCE_LABEL[b.source]}</Badge>
              </span>
              <Button
                variant="ghost"
                disabled={busy}
                aria-label={`Remove barcode ${b.barcode}`}
                onClick={() => remove(b.id)}
              >
                <Trash2 size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-start gap-space-2">
        <Select
          aria-label="Barcode type"
          className="w-32"
          value={type}
          onChange={(e) => {
            const t = e.target.value as BarcodeType;
            setType(t);
            setValue(sanitizeBarcode(t, value));
          }}
        >
          {BARCODE_TYPES.map((t) => (
            <option key={t} value={t}>
              {BARCODE_SPECS[t].label}
            </option>
          ))}
        </Select>
        <Input
          aria-label="New barcode"
          className="min-w-40 flex-1"
          placeholder="Scan or type a barcode"
          value={value}
          maxLength={BARCODE_SPECS[type].maxLength}
          inputMode={BARCODE_SPECS[type].digitsOnly ? "numeric" : "text"}
          onChange={(e) => setValue(sanitizeBarcode(type, e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // a scanner ends with Enter: add it, don't submit the product form
              add();
            }
          }}
        />
        <Select
          aria-label="Where this barcode comes from"
          className="w-36"
          value={source}
          onChange={(e) => setSource(e.target.value as typeof source)}
        >
          <option value="manufacturer">Manufacturer</option>
          <option value="shop_label">Shop label</option>
        </Select>
        <Button
          variant="secondary"
          disabled={busy || !value.trim()}
          onClick={add}
        >
          Add
        </Button>
      </div>
      {value.trim() && error && (
        <p className="mt-space-1 text-[12px] text-error">{error}</p>
      )}
    </div>
  );
}
