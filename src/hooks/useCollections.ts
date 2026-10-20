"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend, erpSendFile, type Product } from "@/lib/erp";

export type CollectionCondition = {
  field: "category_id" | "lifecycle_status" | "name";
  value: string;
};

export type ProductCollection = {
  show_in_header: boolean;
  header_order: number;
  header_dropdown: boolean;
  dropdown_collection_ids: string[];
  image_url: string | null;
  conditions: CollectionCondition[];
  excluded_variant_ids: string[];
  id: string;
  name: string;
  description: string;
  item_count: number;
  version: number;
  created_at: string;
  updated_at: string;
};
export type CollectionDetail = ProductCollection & {
  products: Product[];
  manual_products: Product[];
  variant_ids: string[];
};
export type CollectionInput = {
  show_in_header?: boolean;
  header_order?: number;
  header_dropdown?: boolean;
  dropdown_collection_ids?: string[];
  name: string;
  description: string;
  variant_ids: string[];
  image_url?: string | null;
  conditions?: CollectionCondition[];
  excluded_variant_ids?: string[];
};

export function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: () => erpGet<ProductCollection[]>("/api/v1/collections"),
  });
}

export function useCollection(id: string | null) {
  return useQuery({
    queryKey: ["collections", id],
    queryFn: () => erpGet<CollectionDetail>(`/api/v1/collections/${id}`),
    enabled: !!id,
  });
}

export function useSaveCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      version,
      ...body
    }: CollectionInput & { id?: string; version?: number }) =>
      id
        ? erpSend<CollectionDetail>(`/api/v1/collections/${id}`, "PUT", {
            ...body,
            version,
          })
        : erpSend<CollectionDetail>("/api/v1/collections", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => erpSend(`/api/v1/collections/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });
}

export function useCollectionPreview(input: CollectionInput, enabled: boolean) {
  return useQuery({
    queryKey: ["collection-preview", input],
    queryFn: () =>
      erpSend<{ products: Product[]; item_count: number }>(
        "/api/v1/collections/preview",
        "POST",
        input,
      ),
    enabled,
  });
}

export function useUploadCollectionCover() {
  return useMutation({
    mutationFn: (file: File) =>
      erpSendFile<{ image_url: string }>("/api/v1/collections/cover", file),
  });
}

export function useToggleCollectionHeader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version, show_in_header }: { id: string; version: number; show_in_header: boolean }) =>
      erpSend<CollectionDetail>(`/api/v1/collections/${id}/header`, "PATCH", { version, show_in_header }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });
}
