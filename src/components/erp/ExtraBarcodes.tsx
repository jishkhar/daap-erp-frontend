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
import { useSuppliers } from "@/hooks/useProcurement";
import { useProductBarcodes } from "@/hooks/useProducts";
import type { Product } from "@/lib/erp";
import { toast } from "@/lib/toast";

/**
 * The manufacturers' barcodes of a product. The main barcode (the shop's own label, issued by the server and printed on the till) is shown
 * above and never changes, so a supplier change never needs a new sticker. Each barcode here can name the supplier it came from, or the
 * maker when the supplier is not known. Every barcode opens this same product and shares its stock; one barcode belongs to one product.
 */
export function ExtraBarcodes({ product }: { product: Product | null }) {
  const [type, setType] = useState<BarcodeType>("EAN_13");
  const [supplierId, setSupplierId] = useState("");
  const [maker, setMaker] = useState("");
  const [value, setValue] = useState("");
  const suppliers = useSuppliers(Boolean(product));
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
      {
        barcode: code,
        ...(supplierId ? { supplier_id: supplierId } : {}),
        ...(!supplierId && maker.trim() ? { maker_name: maker.trim() } : {}),
      },
      {
        onSuccess: () => {
          setValue("");
          setMaker("");
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
      <p className="mb-space-2 text-[12px] text-ink-400">
        The barcode on a supplier&apos;s box. Scanning it opens this same
        product and shares its stock. Your own shop label above is the one that
        gets printed.
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
                {(b.supplier_name || b.maker_name) && (
                  <Badge tone="neutral">
                    {b.supplier_name ?? b.maker_name}
                  </Badge>
                )}
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
          onValueChange={(value) => {
            const t = value as BarcodeType;
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
          aria-label="Supplier this barcode came from"
          className="w-44"
          value={supplierId}
          onValueChange={(value) => setSupplierId(value)}
        >
          <option value="">Supplier (optional)</option>
          {(suppliers.data ?? []).map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.name}
            </option>
          ))}
        </Select>
        {!supplierId && (
          <Input
            aria-label="Maker or brand when the supplier is not known"
            className="w-40"
            placeholder="Or maker name"
            maxLength={120}
            value={maker}
            onChange={(e) => setMaker(e.target.value)}
          />
        )}
        <Button
          className="mobile-page-action"
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
