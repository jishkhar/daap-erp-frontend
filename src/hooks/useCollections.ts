"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend, type Product } from "@/lib/erp";

export type ProductCollection = {
  id: string;
  name: string;
  description: string;
  item_count: number;
  version: number;
  created_at: string;
  updated_at: string;
};
export type CollectionDetail = ProductCollection & { products: Product[] };
export type CollectionInput = {
  name: string;
  description: string;
  variant_ids: string[];
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
