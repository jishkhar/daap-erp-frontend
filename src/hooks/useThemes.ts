"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";
import {
  STOREFRONT_URL,
  type InstalledTheme,
  type ThemeCollection,
  type ThemeConfig,
  type ThemeDefinition,
  type ThemeList,
} from "@/lib/themes";

const BASE = "/api/v1/store-admin/themes";

export function useThemes() {
  return useQuery({
    queryKey: queryKeys.themes,
    queryFn: () => erpGet<ThemeList>(BASE),
  });
}

export function useTheme(key: string) {
  return useQuery({
    queryKey: queryKeys.theme(key),
    queryFn: () => erpGet<InstalledTheme>(`${BASE}/${key}`),
  });
}

/** The theme's schema and starting content, served by the storefront app (the source of truth for every theme). */
export function useThemeDefinition(key: string) {
  return useQuery({
    queryKey: queryKeys.themeDefinition(key),
    queryFn: async () => {
      const res = await fetch(
        `${STOREFRONT_URL}/api/themes/${encodeURIComponent(key)}`,
      );
      if (!res.ok)
        throw new Error(
          res.status === 404
            ? "The storefront doesn't have this theme."
            : "Couldn't reach the storefront.",
        );
      return (await res.json()) as ThemeDefinition;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

/** The shop's own collections, for the editor's collection pickers. */
export function useThemeCollections() {
  return useQuery({
    queryKey: queryKeys.themeCollections,
    queryFn: () =>
      erpGet<ThemeCollection[]>("/api/v1/store-admin/theme-collections"),
  });
}

/** A two-hour token that lets the storefront show this theme's saved but unpublished draft (the editor's preview). */
export function useThemePreviewToken(key: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.themePreview(key),
    queryFn: () =>
      erpSend<{ token: string; expires_at: number }>(
        `${BASE}/${key}/preview`,
        "POST",
      ),
    enabled,
    staleTime: 90 * 60_000, // renewed well before the 2 hours run out
  });
}

function useThemeMutation<I>(fn: (input: I) => Promise<InstalledTheme | void>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (row) => {
      if (row) qc.setQueryData(queryKeys.theme(row.theme_key), row);
      return qc.invalidateQueries({ queryKey: queryKeys.themes, exact: true });
    },
  });
}

export const useInstallTheme = () =>
  useThemeMutation((key: string) =>
    erpSend<InstalledTheme>(`${BASE}/${key}`, "POST"),
  );

export const useSaveThemeDraft = () =>
  useThemeMutation(
    ({
      key,
      config,
      version,
    }: {
      key: string;
      config: ThemeConfig;
      version: number;
    }) =>
      erpSend<InstalledTheme>(`${BASE}/${key}/draft`, "PUT", {
        config,
        version,
      }),
  );

export const usePublishTheme = () =>
  useThemeMutation(({ key, version }: { key: string; version: number }) =>
    erpSend<InstalledTheme>(`${BASE}/${key}/publish`, "POST", { version }),
  );

export function useRemoveTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => erpSend(`${BASE}/${key}`, "DELETE"),
    onSuccess: (_r, key) => {
      qc.removeQueries({ queryKey: queryKeys.theme(key) });
      return qc.invalidateQueries({ queryKey: queryKeys.themes, exact: true });
    },
  });
}
