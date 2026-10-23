/**
 * Storefront themes in the portal. The storefront app owns every theme (code, schema, defaults) and serves the schema at
 * GET {storefront}/api/themes/{key} (the common address); each shop's website is {slug}.{storefront host} (storeUrl); the portal only edits values against it and saves them through the ERP
 * (/api/v1/store-admin/themes). The storefront re-validates everything before rendering, so these types mirror
 * storefront src/themes/schema.ts and the helpers here only shape the form.
 */

export const STOREFRONT_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3001"
).replace(/\/$/, "");

export type Values = Record<string, unknown>;
export type Option = { value: string; label: string };
type Base = { key: string; label: string; help?: string };
export type ThemeField =
  | (Base & { type: "text" | "textarea"; default?: string; max?: number })
  | (Base & { type: "url" | "image"; default?: string })
  | (Base & { type: "collection"; default?: string })
  | (Base & { type: "collections"; default?: string[]; max?: number })
  | (Base & { type: "toggle"; default?: boolean })
  | (Base & { type: "number"; default?: number; min?: number; max?: number })
  | (Base & { type: "select"; options: Option[]; default?: string })
  | (Base & {
      type: "list";
      fields: ThemeField[];
      default?: Values[];
      max?: number;
      itemLabel?: string;
    });

export type SectionSchema = {
  type: string;
  name: string;
  fields: ThemeField[];
};
export const GROUPS = [
  "brand",
  "announcement",
  "header",
  "footer",
  "pages",
] as const;
export type Group = (typeof GROUPS)[number];
export const GROUP_LABELS: Record<Group, string> = {
  brand: "Logo & name",
  announcement: "Announcement bar",
  header: "Header",
  footer: "Footer",
  pages: "Store pages",
};

export type ThemeSchema = {
  settings: Record<Group, ThemeField[]>;
  sections: SectionSchema[];
};
export type SectionInstance = { id: string; type: string; settings: Values };
export type ThemeConfig = {
  settings: Record<Group, Values>;
  templates: { home: SectionInstance[] };
};

/** What the storefront serves for one theme. */
export type ThemeDefinition = {
  key: string;
  name: string;
  schema: ThemeSchema;
  defaults: ThemeConfig;
};

/** One of the shop's collection pages (/c/<slug>), as the collection pickers offer them (GET /store-admin/theme-collections). */
export type ThemeCollection = {
  slug: string;
  name: string;
  kind: "category" | "craft" | "occasion";
  product_count: number;
};

/** An installed theme as the ERP returns it. */
export type InstalledTheme = {
  theme_key: string;
  name: string;
  is_active: boolean;
  draft_version: number;
  published_version: number | null;
  published_at: string | null;
  updated_at: string;
  has_unpublished_changes: boolean;
  draft?: Partial<ThemeConfig>;
  published?: Partial<ThemeConfig> | null;
};
export type ThemeList = {
  installed: InstalledTheme[];
  available: { theme_key: string; name: string }[];
};

const isObj = (v: unknown): v is Values =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Same link and image rules as the storefront (anything else is dropped there): site paths, web, mail and phone. */
export const URL_OK = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i;
export const IMAGE_OK = /^(\/(?!\/)|https:\/\/)/i;

/** A field's value for the form: the saved value when it has the right type, else the field default. */
export function fieldValue(f: ThemeField, v: unknown): unknown {
  switch (f.type) {
    case "text":
    case "textarea":
    case "url":
    case "image":
    case "collection":
      return typeof v === "string" ? v : (f.default ?? "");
    case "collections":
      return Array.isArray(v)
        ? v.filter((s) => typeof s === "string")
        : (f.default ?? []);
    case "toggle":
      return typeof v === "boolean" ? v : (f.default ?? false);
    case "number":
      return typeof v === "number" ? v : (f.default ?? f.min ?? 0);
    case "select":
      return f.options.some((o) => o.value === v)
        ? v
        : (f.default ?? f.options[0]?.value ?? "");
    case "list":
      return (Array.isArray(v) ? v : (f.default ?? []))
        .filter(isObj)
        .map((item) => fieldValues(f.fields, item));
  }
}

export function fieldValues(fields: ThemeField[], raw: unknown): Values {
  const src = isObj(raw) ? raw : {};
  return Object.fromEntries(
    fields.map((f) => [f.key, fieldValue(f, src[f.key])]),
  );
}

/** The full config the editor works on: the saved draft, with any group or page it lacks taken from the theme's defaults. */
export function editableConfig(
  def: ThemeDefinition,
  draft: unknown,
): ThemeConfig {
  const d = isObj(draft) ? draft : {};
  const savedSettings = isObj(d.settings) ? d.settings : {};
  const settings = Object.fromEntries(
    GROUPS.map((g) => [
      g,
      fieldValues(
        def.schema.settings[g] ?? [],
        g in savedSettings ? savedSettings[g] : def.defaults.settings?.[g],
      ),
    ]),
  ) as Record<Group, Values>;
  const savedHome =
    isObj(d.templates) && Array.isArray(d.templates.home)
      ? d.templates.home
      : (def.defaults.templates?.home ?? []);
  const home = savedHome.filter(isObj).flatMap((s, i) => {
    const type = def.schema.sections.find((t) => t.type === s.type);
    if (!type) return [];
    return [
      {
        id: typeof s.id === "string" && s.id ? s.id : `${type.type}-${i}`,
        type: type.type,
        settings: fieldValues(type.fields, s.settings),
      },
    ];
  });
  return { settings, templates: { home } };
}

export function newSection(type: SectionSchema): SectionInstance {
  return {
    id: `${type.type}-${Math.random().toString(36).slice(2, 8)}`,
    type: type.type,
    settings: fieldValues(type.fields, {}),
  };
}

/** Problems the storefront would silently drop, shown in the editor instead. */
export function fieldProblem(f: ThemeField, v: unknown): string | undefined {
  if (f.type === "url" && typeof v === "string" && v && !URL_OK.test(v))
    return "Start with / for a page on your site, or https://";
  if (f.type === "image" && typeof v === "string" && v && !IMAGE_OK.test(v))
    return "Use an https:// image address or a /path on your site.";
  return undefined;
}

export function configProblems(
  def: ThemeDefinition,
  config: ThemeConfig,
): number {
  const count = (fields: ThemeField[], values: Values): number =>
    fields.reduce((n, f) => {
      if (f.type === "list")
        return (
          n +
          (values[f.key] as Values[]).reduce(
            (m, item) => m + count(f.fields, item),
            0,
          )
        );
      return n + (fieldProblem(f, values[f.key]) ? 1 : 0);
    }, 0);
  return (
    GROUPS.reduce(
      (n, g) => n + count(def.schema.settings[g] ?? [], config.settings[g]),
      0,
    ) +
    config.templates.home.reduce(
      (n, s) =>
        n +
        count(
          def.schema.sections.find((t) => t.type === s.type)?.fields ?? [],
          s.settings,
        ),
      0,
    )
  );
}

/**
 * A shop's own website on the hosted storefront: {slug}.{storefront host}. http://localhost:3001 -> http://rosaya.localhost:3001,
 * https://ecommerce.daaprimetech.com -> https://rosaya.ecommerce.daaprimetech.com. The storefront knows the shop from that address.
 */
export function storeUrl(slug: string | null | undefined): string {
  if (!slug) return STOREFRONT_URL;
  try {
    const u = new URL(STOREFRONT_URL);
    u.hostname = `${slug}.${u.hostname}`;
    return u.toString().replace(/\/$/, "");
  } catch {
    return STOREFRONT_URL;
  }
}

/**
 * Where shoppers find the shop: its primary custom domain (Settings > Domains) when it has one, else its platform address (storeUrl).
 * The platform address still works then (it redirects), so previews keep using storeUrl.
 */
export function primaryStoreUrl(
  primaryHost: string | null | undefined,
  slug: string | null | undefined,
): string {
  const platform = storeUrl(slug);
  if (!primaryHost) return platform;
  try {
    if (new URL(platform).hostname === primaryHost) return platform;
  } catch {
    // fall through to the custom domain
  }
  return `https://${primaryHost}`;
}

/** The shop's website showing a theme's saved draft (the token comes from POST /store-admin/themes/{key}/preview). */
export function previewUrl(
  slug: string | null | undefined,
  token: string,
  path = "/",
) {
  return `${storeUrl(slug)}/preview?token=${encodeURIComponent(token)}&path=${encodeURIComponent(path)}`;
}
