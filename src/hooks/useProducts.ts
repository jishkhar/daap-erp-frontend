"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { erpGet, erpSend, erpSendFile, qs, type Product } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

/** A product row with its tax rate, as the product search returns it (for the order page's tax preview). */
export type ProductWithTax = Product & { tax_rate_bps?: number | null };

/** The product master, paged and searched (name, variant, SKU) on the server. */
export function useProductList(q: string) {
  return usePagedQuery<Product>(queryKeys.productList, "/api/v1/products", {
    q,
  });
}

export type ProductSearch = {
  q: string;
  lifecycle_status?: string;
  /** true: only serial/IMEI-tracked products; false: only untracked ones; omitted: both. */
  serialized?: boolean;
  limit?: number;
};

/** Up to `limit` products matching a search, for a picker or the order page. `enabled: false` fetches nothing. */
export function useProductSearch(search: ProductSearch, enabled = true) {
  const params = {
    q: search.q,
    lifecycle_status: search.lifecycle_status,
    serialized:
      search.serialized === undefined ? undefined : String(search.serialized), // qs() drops a plain false
    limit: search.limit ?? 8,
  };
  return useQuery({
    queryKey: queryKeys.productList(params),
    queryFn: () => erpGet<ProductWithTax[]>(`/api/v1/products${qs(params)}`),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** Everything a product change can show: every product list and search, and stock rows (which carry product names). */
function useRefreshProducts() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.products }),
      qc.invalidateQueries({ queryKey: queryKeys.inventory }),
    ]);
}

export function useSaveProduct() {
  const refresh = useRefreshProducts();
  return useMutation({
    /** `id` set: update that product; otherwise create one (the body then carries the SKU). */
    mutationFn: ({
      id,
      body,
    }: {
      id?: string;
      body: Record<string, unknown>;
    }) =>
      id
        ? erpSend<Product>(`/api/v1/products/${id}`, "PATCH", body)
        : erpSend<Product>("/api/v1/products", "POST", body),
    onSuccess: refresh,
  });
}

/** Another variant (size, colour ...) of an existing product. */
export function useAddVariant() {
  const refresh = useRefreshProducts();
  return useMutation({
    mutationFn: ({
      productId,
      body,
    }: {
      productId: string;
      body: Record<string, unknown>;
    }) =>
      erpSend<Product>(`/api/v1/products/${productId}/variants`, "POST", body),
    onSuccess: refresh,
  });
}

export type ImportResult = {
  total: number;
  created: number;
  failed: number;
  errors: { row: number; sku: string | null; error: string }[];
};

/** Create products from a CSV / spreadsheet; the result says which rows were skipped and why. */
export function useImportProducts() {
  const refresh = useRefreshProducts();
  return useMutation({
    mutationFn: (file: File) =>
      erpSendFile<ImportResult>("/api/v1/products/import", file),
    onSuccess: (result) => (result.created > 0 ? refresh() : undefined),
  });
}

export type ProductImages = { images: string[] };

/** A product's gallery: upload one image, remove one, or set the order (the first is the cover). Each returns the new list. */
export function useProductImages(productId: string) {
  const refresh = useRefreshProducts();
  const path = `/api/v1/products/${productId}/images`;
  return {
    upload: useMutation({
      mutationFn: (file: File) => erpSendFile<ProductImages>(path, file),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (url: string) =>
        erpSend<ProductImages>(`${path}${qs({ url })}`, "DELETE"),
      onSuccess: refresh,
    }),
    reorder: useMutation({
      mutationFn: (urls: string[]) =>
        erpSend<ProductImages>(`${path}/order`, "PUT", { urls }),
      onSuccess: refresh,
    }),
  };
}

/** A product's extra barcodes (a redesigned box, a shop label). */
export function useProductBarcodes(productId: string) {
  const refresh = useRefreshProducts();
  const path = `/api/v1/products/${productId}/barcodes`;
  return {
    add: useMutation({
      mutationFn: (input: { barcode: string; source: string }) =>
        erpSend(path, "POST", input),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (barcodeId: string) =>
        erpSend(`${path}/${barcodeId}`, "DELETE"),
      onSuccess: refresh,
    }),
  };
}
