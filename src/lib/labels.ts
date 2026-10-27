/** Shop labels: the business's settings, and labels a branch's till was asked to print (the till has the label printer). */
export type MakerBarcode = "never" | "ask" | "always";

export type LabelSettings = {
  /** Never disables automatic shop barcodes and labels for all products; ask/always control labels for manufacturer-barcoded products. */
  maker_barcode: MakerBarcode;
  /** Ask branches holding a product to relabel it when its selling price changes. */
  relabel_on_price_change: boolean;
};

export type LabelRequest = {
  id: string;
  branch_id: string;
  source_type: "goods_receipt" | "transfer" | "price_change" | "manual";
  source_ref: string | null;
  note: string | null;
  status: "open" | "printed" | "dismissed";
  labels: number;
  printed: number;
};

export const MAKER_BARCODE_CHOICES: {
  value: MakerBarcode;
  label: string;
  hint: string;
}[] = [
  {
    value: "ask",
    label: "Ask each time",
    hint: "The till lists them unticked; staff tick the ones they want.",
  },
  {
    value: "always",
    label: "Always label them",
    hint: "They get the shop's own label like every other product.",
  },
  {
    value: "never",
    label: "Never label them",
    hint: "No automatic shop barcodes or labels. Generate barcodes manually from each product page when needed.",
  },
];
