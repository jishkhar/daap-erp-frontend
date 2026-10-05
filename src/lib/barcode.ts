export type BarcodeType = "UPC_A" | "EAN_13" | "EAN_8" | "CODE_39" | "CODE_128" | "ITF_14";

type Spec = { label: string; hint: string; maxLength: number; digitsOnly: boolean; fixed?: number; pattern: RegExp };

export const BARCODE_SPECS: Record<BarcodeType, Spec> = {
  UPC_A: { label: "UPC-A", hint: "Exactly 12 digits.", maxLength: 12, digitsOnly: true, fixed: 12, pattern: /^\d{12}$/ },
  EAN_13: { label: "EAN-13", hint: "Exactly 13 digits.", maxLength: 13, digitsOnly: true, fixed: 13, pattern: /^\d{13}$/ },
  EAN_8: { label: "EAN-8", hint: "Exactly 8 digits.", maxLength: 8, digitsOnly: true, fixed: 8, pattern: /^\d{8}$/ },
  CODE_39: { label: "Code 39", hint: "Up to 43 characters: A–Z, 0–9, space and - . $ / + %.", maxLength: 43, digitsOnly: false, pattern: /^[A-Z0-9 .$/+%-]{1,43}$/ },
  CODE_128: { label: "Code 128", hint: "Up to 48 printable ASCII characters.", maxLength: 48, digitsOnly: false, pattern: /^[\x20-\x7E]{1,48}$/ },
  ITF_14: { label: "ITF-14", hint: "Exactly 14 digits.", maxLength: 14, digitsOnly: true, fixed: 14, pattern: /^\d{14}$/ },
};

export const BARCODE_TYPES = Object.keys(BARCODE_SPECS) as BarcodeType[];

/** The type isn't stored, so guess it from a saved value when editing. */
export function inferBarcodeType(value: string | null | undefined): BarcodeType {
  const v = value ?? "";
  if (/^\d+$/.test(v)) {
    if (v.length === 12) return "UPC_A";
    if (v.length === 13) return "EAN_13";
    if (v.length === 8) return "EAN_8";
    if (v.length === 14) return "ITF_14";
  }
  return "CODE_128";
}

/** Strips characters the type can't hold as the user types. */
export function sanitizeBarcode(type: BarcodeType, raw: string): string {
  const spec = BARCODE_SPECS[type];
  let v = spec.digitsOnly ? raw.replace(/\D/g, "") : raw;
  if (type === "CODE_39") v = v.toUpperCase();
  return v.slice(0, spec.maxLength);
}

/** Returns an error message, or null when the value is valid (empty is valid — the barcode is optional). */
export function validateBarcode(type: BarcodeType, value: string): string | null {
  if (!value) return null;
  const spec = BARCODE_SPECS[type];
  if (spec.pattern.test(value)) return null;
  return `${spec.label}: ${spec.hint.charAt(0).toLowerCase()}${spec.hint.slice(1)}`;
}
