"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  ExternalLink,
  RotateCw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  usePublishTheme,
  useSaveThemeDraft,
  useTheme,
  useThemeCollections,
  useThemeDefinition,
  useThemePreviewToken,
} from "@/hooks/useThemes";
import { getPortalTenant } from "@/lib/portalAuth";
import { usePermission } from "@/lib/staffAuth";
import {
  configProblems,
  editableConfig,
  GROUP_LABELS,
  newSection,
  previewUrl,
  STOREFRONT_URL,
  type Group,
  type InstalledTheme,
  type ThemeCollection,
  type ThemeConfig,
  type ThemeDefinition,
  type Values,
} from "@/lib/themes";
import { toast } from "@/lib/toast";
import { move, ThemeFields } from "./ThemeFields";

type Selection =
  { kind: "group"; group: Group } | { kind: "section"; id: string } | null;

/** The theme editor: pick a part of the site on the left, change its settings, see the saved draft in the preview, then publish. */
export function ThemeEditor({ themeKey }: { themeKey: string }) {
  const theme = useTheme(themeKey);
  const definition = useThemeDefinition(themeKey);
  const collections = useThemeCollections();
  if (theme.error)
    return (
      <Problem>Couldn&apos;t load this theme: {theme.error.message}</Problem>
    );
  if (definition.error)
    return (
      <Problem>
        Couldn&apos;t load the theme from your storefront ({STOREFRONT_URL}):{" "}
        {definition.error.message}
      </Problem>
    );
  if (theme.isPending || definition.isPending || collections.isPending)
    return <Skeleton className="h-[480px] w-full" />;
  return (
    <Editor
      key={theme.data.theme_key}
      theme={theme.data}
      def={definition.data}
      collections={collections.data ?? []}
    />
  );
}

function Problem({ children }: { children: React.ReactNode }) {
  return (
    <Card className="p-space-5 text-[14px] text-error">
      {children}{" "}
      <Link href="/portal/channels/online" className="ml-space-2 underline">
        Back to themes
      </Link>
    </Card>
  );
}

function Editor({
  theme,
  def,
  collections,
}: {
  theme: InstalledTheme;
  def: ThemeDefinition;
  collections: ThemeCollection[];
}) {
  const canEdit = usePermission("channels", "write");
  const save = useSaveThemeDraft();
  const publish = usePublishTheme();
  const preview = useThemePreviewToken(theme.theme_key, true);
  const slug = getPortalTenant()?.code;
  const [config, setConfig] = useState<ThemeConfig>(() =>
    editableConfig(def, theme.draft),
  );
  const [version, setVersion] = useState(theme.draft_version);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<Selection>(null);
  const [frame, setFrame] = useState(0);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const problems = useMemo(() => configProblems(def, config), [def, config]);
  const busy = save.isPending || publish.isPending;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (next: ThemeConfig) => {
    setConfig(next);
    setDirty(true);
  };
  const setGroup = (g: Group, values: Values) =>
    change({ ...config, settings: { ...config.settings, [g]: values } });
  const home = config.templates.home;
  const setHome = (next: ThemeConfig["templates"]["home"]) =>
    change({ ...config, templates: { home: next } });
  const sectionType = (type: string) =>
    def.schema.sections.find((t) => t.type === type);

  async function saveDraft(): Promise<number | null> {
    try {
      const row = await save.mutateAsync({
        key: theme.theme_key,
        config,
        version,
      });
      if (!row) return null;
      setVersion(row.draft_version);
      setDirty(false);
      setFrame((n) => n + 1);
      return row.draft_version;
    } catch (e) {
      toast.error("Couldn't save", (e as Error).message);
      return null;
    }
  }

  async function doPublish() {
    const v = dirty ? await saveDraft() : version;
    if (v === null) return;
    try {
      await publish.mutateAsync({ key: theme.theme_key, version: v });
      setConfirmPublish(false);
      toast.success(
        "Published",
        "Shoppers see the new look within about a minute.",
      );
    } catch (e) {
      toast.error("Couldn't publish", (e as Error).message);
    }
  }

  const sectionLabel = (s: ThemeConfig["templates"]["home"][number]) => {
    const name = sectionType(s.type)?.name ?? s.type;
    const title =
      typeof s.settings.title === "string" && s.settings.title
        ? s.settings.title
        : "";
    return { name, title };
  };

  const navRow = (
    label: string,
    sub: string,
    onClick: () => void,
    extra?: React.ReactNode,
  ) => (
    <div className="flex items-center gap-space-1 rounded-md hover:bg-black/[0.03]">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-space-2 px-space-2 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium text-ink-900">
            {label}
          </span>
          {sub && (
            <span className="block truncate text-[12px] text-ink-600">
              {sub}
            </span>
          )}
        </span>
        <ChevronRight size={15} className="shrink-0 text-ink-400" />
      </button>
      {extra}
    </div>
  );
  const heading = (text: string) => (
    <p className="mb-1 mt-space-4 px-space-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-600 first:mt-0">
      {text}
    </p>
  );

  let panel: React.ReactNode;
  if (selected?.kind === "group") {
    panel = (
      <ThemeFields
        fields={def.schema.settings[selected.group]}
        values={config.settings[selected.group]}
        collections={collections}
        disabled={!canEdit}
        onChange={(v) => setGroup(selected.group, v)}
      />
    );
  } else if (selected?.kind === "section") {
    const s = home.find((x) => x.id === selected.id);
    const type = s && sectionType(s.type);
    panel =
      s && type ? (
        <ThemeFields
          fields={type.fields}
          values={s.settings}
          collections={collections}
          disabled={!canEdit}
          onChange={(v) =>
            setHome(
              home.map((x) => (x.id === s.id ? { ...x, settings: v } : x)),
            )
          }
        />
      ) : null;
  } else {
    panel = (
      <nav aria-label="Parts of your website">
        {heading("Top of every page")}
        {(["brand", "announcement", "header"] as const).map((g) => (
          <div key={g}>
            {navRow(GROUP_LABELS[g], "", () =>
              setSelected({ kind: "group", group: g }),
            )}
          </div>
        ))}
        {heading("Home page")}
        {home.length === 0 && (
          <p className="px-space-2 py-2 text-[13px] text-ink-600">
            No sections. Add one below.
          </p>
        )}
        {home.map((s, i) => {
          const { name, title } = sectionLabel(s);
          return (
            <div key={s.id}>
              {navRow(
                title || name,
                title ? name : "",
                () => setSelected({ kind: "section", id: s.id }),
                canEdit && (
                  <span className="flex shrink-0 items-center pr-space-1">
                    <SmallButton
                      label="Move up"
                      disabled={i === 0}
                      onClick={() => setHome(move(home, i, -1))}
                    >
                      <ArrowUp size={14} />
                    </SmallButton>
                    <SmallButton
                      label="Move down"
                      disabled={i === home.length - 1}
                      onClick={() => setHome(move(home, i, 1))}
                    >
                      <ArrowDown size={14} />
                    </SmallButton>
                    <SmallButton
                      label="Remove section"
                      onClick={() => setHome(home.filter((x) => x.id !== s.id))}
                    >
                      <X size={14} />
                    </SmallButton>
                  </span>
                ),
              )}
            </div>
          );
        })}
        {canEdit && (
          <div className="px-space-2 pt-space-2">
            <Select
              value=""
              aria-label="Add a section"
              onChange={(e) => {
                const type = sectionType(e.target.value);
                if (!type) return;
                const s = newSection(type);
                setHome([...home, s]);
                setSelected({ kind: "section", id: s.id });
              }}
            >
              <option value="">+ Add a section…</option>
              {def.schema.sections.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        {heading("Bottom of every page")}
        {navRow(GROUP_LABELS.footer, "", () =>
          setSelected({ kind: "group", group: "footer" }),
        )}
        {def.schema.settings.pages && (
          <>
            {heading("Other pages")}
            {navRow(
              GROUP_LABELS.pages,
              "About, shipping, returns, policies",
              () => setSelected({ kind: "group", group: "pages" }),
            )}
          </>
        )}
      </nav>
    );
  }

  const panelTitle =
    selected?.kind === "group"
      ? GROUP_LABELS[selected.group]
      : selected?.kind === "section"
        ? (() => {
            const s = home.find((x) => x.id === selected.id);
            return s ? sectionLabel(s).name : "";
          })()
        : null;

  return (
    <div className="space-y-space-4">
      <div className="flex flex-wrap items-center gap-space-3">
        <Link
          href="/portal/channels/online"
          className="flex items-center gap-1 text-[13.5px] text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft size={15} /> Themes
        </Link>
        <h2 className="text-[17px] font-semibold text-ink-900">{def.name}</h2>
        {theme.is_active ? (
          <Badge tone="success">Live</Badge>
        ) : (
          <Badge tone="neutral">Not live</Badge>
        )}
        <span className="text-[12.5px] text-ink-600">
          {save.isPending
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : "All changes saved"}
          {problems > 0 &&
            ` · ${problems} ${problems === 1 ? "field needs" : "fields need"} fixing`}
        </span>
        {canEdit && (
          <div className="ml-auto flex items-center gap-space-2">
            <Button
              variant="secondary"
              disabled={!dirty || busy}
              onClick={saveDraft}
            >
              Save
            </Button>
            <Button disabled={busy} onClick={() => setConfirmPublish(true)}>
              Publish
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-space-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <Card className="max-h-[calc(100vh-220px)] overflow-y-auto p-space-3">
          {panelTitle !== null && (
            <div className="mb-space-3 flex items-center gap-space-2 border-b border-line pb-space-2">
              <SmallButton label="Back" onClick={() => setSelected(null)}>
                <ArrowLeft size={16} />
              </SmallButton>
              <p className="text-[14px] font-semibold text-ink-900">
                {panelTitle}
              </p>
            </div>
          )}
          <div className={panelTitle !== null ? "px-space-1" : ""}>{panel}</div>
        </Card>

        <Card className="flex min-h-[520px] flex-col overflow-hidden">
          <div className="flex items-center gap-space-2 border-b border-line px-space-3 py-2 text-[12.5px] text-ink-600">
            <span className="min-w-0 flex-1 truncate">
              Preview of your saved draft
              {dirty ? " · save to see your latest changes" : ""}
            </span>
            <SmallButton
              label="Reload preview"
              onClick={() => setFrame((n) => n + 1)}
            >
              <RotateCw size={14} />
            </SmallButton>
            {preview.data && (
              <a
                href={previewUrl(slug, preview.data.token)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-ink-900"
              >
                <ExternalLink size={14} /> Open
              </a>
            )}
          </div>
          {preview.data ? (
            <iframe
              key={frame}
              title="Store preview"
              src={previewUrl(slug, preview.data.token)}
              className="h-[calc(100vh-260px)] min-h-[480px] w-full flex-1 bg-white"
            />
          ) : (
            <div className="grid flex-1 place-items-center p-space-5 text-[13px] text-ink-600">
              {preview.error
                ? `Couldn't start the preview: ${preview.error.message}`
                : "Loading preview…"}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmPublish}
        title={
          theme.is_active
            ? "Publish your changes?"
            : `Make ${def.name} your live theme?`
        }
        message={
          (dirty ? "Your unsaved changes are saved first. " : "") +
          (theme.is_active
            ? "Shoppers will see this version of the theme."
            : "Your website switches to this theme for every shopper.") +
          (problems > 0
            ? ` ${problems} ${problems === 1 ? "field has" : "fields have"} an address the website can't use; those are left out.`
            : "")
        }
        confirmLabel="Publish"
        busy={busy}
        onCancel={() => setConfirmPublish(false)}
        onConfirm={doPublish}
      />
    </div>
  );
}

function SmallButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-1 text-ink-600 hover:bg-black/[0.05] hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
