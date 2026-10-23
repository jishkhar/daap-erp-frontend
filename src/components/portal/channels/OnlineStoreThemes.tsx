"use client";

import { ExternalLink, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useInstallTheme,
  usePublishTheme,
  useRemoveTheme,
  useThemes,
} from "@/hooks/useThemes";
import { cn } from "@/lib/cn";
import { erpSend } from "@/lib/erp";
import { formatShortDateTime } from "@/lib/formatDate";
import { usePermission } from "@/lib/staffAuth";
import { useDomains } from "@/hooks/useDomains";
import { getPortalTenant } from "@/lib/portalAuth";
import {
  previewUrl,
  primaryStoreUrl,
  storeUrl,
  STOREFRONT_URL,
  type InstalledTheme,
} from "@/lib/themes";
import { toast } from "@/lib/toast";

/**
 * Online store appearance, laid out like Shopify's Online Store > Themes: the live theme (a live view of the website), draft themes
 * (installed, not live) and themes to add. Editing happens in the theme editor (/portal/channels/online/themes/[key]); the themes
 * themselves are built into the storefront by DAAP, which also serves their screenshots (/theme-previews/{key}.jpg).
 */

/** What the website shows before any theme is published. */
const DEFAULT_THEME = { theme_key: "heritage", name: "Heritage" };
const editorHref = (key: string) => `/portal/channels/online/themes/${key}`;
const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/** The real website, drawn at desktop width and scaled down to fit (not clickable). */
function SitePreview({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const DESKTOP = 1440;
  const scale = size.w ? size.w / DESKTOP : 0;
  return (
    <div
      ref={box}
      className={cn("relative overflow-hidden bg-paper", className)}
      aria-hidden
    >
      {scale > 0 && (
        <iframe
          src={src}
          title={title}
          tabIndex={-1}
          loading="lazy"
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white"
          style={{
            width: DESKTOP,
            height: size.h / scale,
            transform: `scale(${scale})`,
          }}
        />
      )}
    </div>
  );
}

/** A theme's screenshot from the storefront, or a plain placeholder until that theme has one. */
function ThemeImage({
  themeKey,
  className,
}: {
  themeKey: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("overflow-hidden bg-paper", className)} aria-hidden>
      {failed ? (
        <div className="h-full w-full bg-gradient-to-br from-stone-300 to-stone-100" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- served by the storefront app, not this one
        <img
          src={`${STOREFRONT_URL}/theme-previews/${themeKey}.jpg`}
          alt=""
          className="h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function MoreMenu({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-card text-ink-900 hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
      >
        <MoreHorizontal size={18} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Open the storefront showing this theme's saved draft (new tab). The tab opens first so the browser doesn't block it. */
async function openDraftPreview(slug: string | undefined, key: string) {
  const tab = window.open("about:blank", "_blank");
  try {
    const { token } = await erpSend<{ token: string }>(
      `/api/v1/store-admin/themes/${key}/preview`,
      "POST",
    );
    if (tab) tab.location.href = previewUrl(slug, token);
  } catch (e) {
    tab?.close();
    toast.error("Couldn't open the preview", (e as Error).message);
  }
}

const savedLine = (t: InstalledTheme) =>
  t.has_unpublished_changes || !t.published_at
    ? `Last saved: ${formatShortDateTime(t.updated_at)}`
    : `Published: ${formatShortDateTime(t.published_at)}`;

export function OnlineStoreThemes() {
  const router = useRouter();
  const canEdit = usePermission("channels", "write");
  const list = useThemes();
  const install = useInstallTheme();
  const publish = usePublishTheme();
  const remove = useRemoveTheme();
  const [removing, setRemoving] = useState<InstalledTheme | null>(null);
  const slug = getPortalTenant()?.code;
  const site = storeUrl(slug); // this shop's platform address: previews use it (it redirects to a custom primary domain)
  const domains = useDomains();
  const shopUrl = primaryStoreUrl(domains.data?.primary_host, slug); // where shoppers find the shop

  if (list.isPending)
    return <Skeleton className="h-[540px] w-full rounded-xl" />;
  if (list.error)
    return (
      <Card className="p-space-5 text-[14px] text-error">
        Couldn&apos;t load themes: {list.error.message}
      </Card>
    );

  const live = list.data.installed.find((t) => t.is_active);
  const drafts = list.data.installed.filter((t) => !t.is_active);
  // Before anything is published the website shows the default theme as shipped; it is "the live theme" here, not one to discover.
  const shownKey = live?.theme_key ?? DEFAULT_THEME.theme_key;
  const defaultInstalled = list.data.installed.some(
    (t) => t.theme_key === DEFAULT_THEME.theme_key,
  );
  const discover = list.data.available.filter(
    (t) => live || t.theme_key !== shownKey,
  );

  async function openEditor(key: string, installed: boolean) {
    try {
      if (!installed) await install.mutateAsync(key);
      router.push(editorHref(key));
    } catch (e) {
      toast.error("Couldn't open the theme", (e as Error).message);
    }
  }
  async function add(key: string) {
    try {
      await install.mutateAsync(key);
      toast.success(
        "Theme added",
        "It's in Draft themes. Edit it, then publish when it's ready.",
      );
    } catch (e) {
      toast.error("Couldn't add the theme", (e as Error).message);
    }
  }
  async function makeLive(t: InstalledTheme) {
    try {
      await publish.mutateAsync({ key: t.theme_key, version: t.draft_version });
      toast.success(
        `${t.name} is live`,
        "Shoppers see it within about a minute.",
      );
    } catch (e) {
      toast.error("Couldn't publish", (e as Error).message);
    }
  }

  return (
    <div className="space-y-space-6">
      <div className="mobile-page-actions flex justify-end">
        <Button
          variant="secondary"
          href={shopUrl}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={15} /> View store
        </Button>
      </div>

      {/* The live theme: the website itself */}
      <section
        aria-label="Live theme"
        className="relative overflow-hidden rounded-xl border border-line bg-card shadow-sm"
      >
        {/* exit=1: always the live site, even if this browser was just previewing a draft in the editor */}
        <SitePreview
          src={`${site}/preview?exit=1&path=/`}
          title="Your live website"
          className="h-[420px] sm:h-[540px]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-space-3 p-space-5 text-white">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-space-2 text-[18px] font-bold">
              {hostOf(shopUrl)}
              {live?.has_unpublished_changes && (
                <Badge tone="warning">Unpublished changes</Badge>
              )}
            </p>
            <p className="text-[13px] text-white/85">
              {live
                ? `${live.name} · ${savedLine(live)}`
                : `${DEFAULT_THEME.name} · as shipped, not customized yet`}
            </p>
          </div>
          <div className="mobile-page-actions flex items-center gap-space-2">
            <Button
              variant="secondary"
              disabled={install.isPending}
              onClick={() => openEditor(shownKey, !!live || defaultInstalled)}
            >
              {canEdit ? "Edit theme" : "View theme"}
            </Button>
            <MoreMenu label="More actions for the live theme">
              <DropdownMenuItem
                onClick={() => window.open(shopUrl, "_blank", "noreferrer")}
              >
                <ExternalLink size={15} /> View store
              </DropdownMenuItem>
              {live?.has_unpublished_changes && (
                <DropdownMenuItem
                  onClick={() => openDraftPreview(slug, live.theme_key)}
                >
                  <Eye size={15} /> Preview unpublished changes
                </DropdownMenuItem>
              )}
            </MoreMenu>
          </div>
        </div>
      </section>

      {/* Installed themes that are not live */}
      <section>
        <h2 className="mb-space-3 text-[17px] font-semibold text-ink-900">
          Draft themes
        </h2>
        {drafts.length === 0 ? (
          <Card className="p-space-5 text-[13.5px] text-ink-600">
            No draft themes. Add one from Discover themes to try a new look
            without changing your live website.
          </Card>
        ) : (
          <Card className="divide-y divide-line">
            {drafts.map((t) => (
              <div
                key={t.theme_key}
                className="flex flex-wrap items-center gap-space-4 p-space-4"
              >
                <ThemeImage
                  themeKey={t.theme_key}
                  className="h-[72px] w-[128px] shrink-0 rounded-md border border-line"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink-900">
                    {t.name}
                  </p>
                  <p className="text-[12.5px] text-ink-600">{savedLine(t)}</p>
                </div>
                <div className="mobile-page-actions flex flex-wrap items-center gap-space-2">
                  {canEdit && (
                    <Button
                      variant="secondary"
                      disabled={publish.isPending}
                      onClick={() => makeLive(t)}
                    >
                      Publish
                    </Button>
                  )}
                  <Button variant="secondary" href={editorHref(t.theme_key)}>
                    {canEdit ? "Edit theme" : "View theme"}
                  </Button>
                  <MoreMenu label={`More actions for ${t.name}`}>
                    <DropdownMenuItem
                      onClick={() => openDraftPreview(slug, t.theme_key)}
                    >
                      <Eye size={15} /> Preview
                    </DropdownMenuItem>
                    {canEdit && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setRemoving(t)}
                      >
                        <Trash2 size={15} /> Remove
                      </DropdownMenuItem>
                    )}
                  </MoreMenu>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* Themes not installed yet */}
      <section>
        <h2 className="mb-space-3 text-[17px] font-semibold text-ink-900">
          Discover themes
        </h2>
        <div className="grid gap-space-5 sm:grid-cols-2 lg:grid-cols-3">
          {discover.map((t) => (
            <div key={t.theme_key}>
              <ThemeImage
                themeKey={t.theme_key}
                className="aspect-square rounded-xl border border-line shadow-sm"
              />
              <div className="mobile-page-action-row mt-space-3 flex items-start justify-between gap-space-3">
                <div>
                  <p className="text-[14px] font-semibold text-ink-900">
                    {t.name}
                  </p>
                  <p className="text-[12.5px] text-ink-600">by DAAP</p>
                </div>
                {canEdit && (
                  <Button
                    className="mobile-page-action"
                    variant="secondary"
                    disabled={install.isPending}
                    onClick={() => add(t.theme_key)}
                  >
                    Add
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Card className="flex aspect-square flex-col justify-center rounded-xl p-space-6">
            <p className="text-[15px] font-semibold text-ink-900">
              More themes coming soon
            </p>
            <p className="mt-1 text-[13px] text-ink-600">
              New DAAP themes appear here as they are released. Each one works
              with your products, collections and settings.
            </p>
          </Card>
        </div>
      </section>

      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.name ?? "theme"}?`}
        message="Its saved settings are deleted. You can add the theme again later, starting from its defaults."
        confirmLabel="Remove"
        destructive
        busy={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          try {
            await remove.mutateAsync(removing.theme_key);
            setRemoving(null);
          } catch (e) {
            toast.error("Couldn't remove the theme", (e as Error).message);
          }
        }}
      />
    </div>
  );
}
