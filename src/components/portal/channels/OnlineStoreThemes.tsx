"use client";

import { Eye, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";

/**
 * Online store appearance: themes and website text.
 *
 * SAMPLE DATA ONLY. Nothing here is read from or saved to the backend yet; every button just says so.
 * It exists to settle the layout (modelled on a Shopify-style Themes page) before the storefront is wired up.
 */

const notWired = () =>
  toast.success(
    "Preview only",
    "Themes and website text aren't connected to the storefront yet.",
  );

type Theme = {
  id: string;
  name: string;
  by: string;
  tone: string;
  added?: string;
};

const CURRENT: Theme = {
  id: "current",
  name: "Heritage",
  by: "DAAP",
  tone: "from-amber-900 to-stone-800",
  added: "Last saved: Apr 30 at 7:53 pm",
};
const DRAFTS: Theme[] = [
  {
    id: "d1",
    name: "Horizon",
    by: "DAAP",
    tone: "from-teal-700 to-sky-600",
    added: "Added: Apr 2 at 4:15 pm",
  },
];
const DISCOVER: Theme[] = [
  { id: "t1", name: "Horizon", by: "DAAP", tone: "from-teal-700 to-sky-600" },
  { id: "t2", name: "Tinker", by: "DAAP", tone: "from-stone-500 to-amber-200" },
  { id: "t3", name: "Savor", by: "DAAP", tone: "from-red-700 to-rose-400" },
  { id: "t4", name: "Dwell", by: "DAAP", tone: "from-stone-400 to-rose-900" },
  {
    id: "t5",
    name: "Atelier",
    by: "DAAP",
    tone: "from-amber-800 to-stone-300",
  },
];

const SPEED = [
  { label: "LCP P75", value: "2144 ms", note: "Good" },
  { label: "INP P75", value: "90 ms", note: "Good" },
  { label: "Layout shift", value: "0", note: "Good" },
  { label: "Sessions", value: "174", note: "" },
];

/** A tiny stand-in for a theme screenshot, drawn with CSS so there are no images to ship. */
function Thumb({ tone, className }: { tone: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-md border border-line bg-card",
        className,
      )}
      aria-hidden
    >
      <div className={cn("h-1/2 bg-gradient-to-br", tone)} />
      <div className="grid flex-1 grid-cols-4 gap-1 p-1.5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="rounded-sm bg-paper" />
        ))}
      </div>
    </div>
  );
}

function ThemeRow({
  theme,
  actions,
}: {
  theme: Theme;
  actions: React.ReactNode;
}) {
  return (
    <Card className="flex items-center gap-space-4 p-space-4">
      <Thumb tone={theme.tone} className="h-[72px] w-[120px] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink-900">{theme.name}</p>
        <p className="text-[12.5px] text-ink-600">{theme.added}</p>
      </div>
      <div className="flex flex-wrap items-center gap-space-2">{actions}</div>
    </Card>
  );
}

function Themes({ storeName }: { storeName: string }) {
  return (
    <div className="space-y-space-6">
      <Card className="overflow-hidden">
        <div
          className={cn(
            "relative flex h-[260px] items-end bg-gradient-to-br p-space-5",
            CURRENT.tone,
          )}
        >
          <div className="absolute inset-x-0 top-0 bg-black/30 px-space-4 py-1.5 text-center text-[12px] text-white">
            Announcement bar text appears here
          </div>
          <div className="absolute inset-x-0 top-[34px] bottom-[70px] grid place-items-center">
            <p className="max-w-md text-center text-[22px] font-semibold text-white/90">
              Your hero headline goes here
            </p>
          </div>
          <div className="relative z-10 flex w-full items-end justify-between gap-space-3">
            <div className="text-white">
              <p className="text-[17px] font-bold">{storeName}</p>
              <p className="text-[12.5px] text-white/80">
                {CURRENT.name} · {CURRENT.added}
              </p>
            </div>
            <div className="flex items-center gap-space-2">
              <Button size="md" variant="secondary" onClick={notWired}>
                Update
              </Button>
              <Button size="md" variant="secondary" onClick={notWired}>
                Edit theme
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <section>
        <div className="mb-space-3 flex items-center justify-between gap-space-3">
          <h2 className="text-[17px] font-semibold text-ink-900">
            Draft themes
          </h2>
          <div className="flex gap-space-2">
            <Button variant="secondary" onClick={notWired}>
              Import
            </Button>
            <Button variant="secondary" onClick={notWired}>
              <Plus size={15} /> New
            </Button>
          </div>
        </div>
        {DRAFTS.map((t) => (
          <ThemeRow
            key={t.id}
            theme={t}
            actions={
              <>
                <Button variant="secondary" onClick={notWired}>
                  Update
                </Button>
                <Button variant="secondary" onClick={notWired}>
                  Publish
                </Button>
                <Button variant="secondary" onClick={notWired}>
                  Edit theme
                </Button>
              </>
            }
          />
        ))}
      </section>

      <section>
        <div className="mb-space-3 flex items-center justify-between gap-space-3">
          <h2 className="text-[17px] font-semibold text-ink-900">
            Discover themes
          </h2>
          <Button variant="secondary" onClick={notWired}>
            Visit theme store
          </Button>
        </div>
        <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
          {DISCOVER.map((t) => (
            <div key={t.id}>
              <Thumb tone={t.tone} className="h-[190px]" />
              <div className="mt-space-2 flex items-start justify-between gap-space-3">
                <div>
                  <p className="text-[14px] font-semibold text-ink-900">
                    {t.name}
                  </p>
                  <p className="text-[12.5px] text-ink-600">by {t.by}</p>
                </div>
                <Button variant="secondary" onClick={notWired}>
                  Add
                </Button>
              </div>
            </div>
          ))}
          <Card className="flex flex-col justify-center p-space-5">
            <p className="text-[14px] font-semibold text-ink-900">
              Explore more themes
            </p>
            <p className="mt-1 text-[13px] text-ink-600">
              Browse professionally designed free and paid themes
            </p>
            <Button
              className="mt-space-3 self-start"
              variant="secondary"
              onClick={notWired}
            >
              Visit theme store
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
}

function TextSettings() {
  const [v, setV] = useState({
    announcement: "Our festival has arrived! Shop now for the upcoming season",
    heroTitle: "Celebrate the beauty of handmade heritage",
    heroSub: "Handpicked pieces, made with care.",
    heroButton: "Shop now",
    footer: "© Your store. All rights reserved.",
  });
  const set =
    (k: keyof typeof v) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setV((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Card className="max-w-2xl p-space-5">
      <Field
        label="Announcement bar"
        htmlFor="ann"
        hint="The strip at the very top of every page."
      >
        <Input id="ann" value={v.announcement} onChange={set("announcement")} />
      </Field>
      <Field label="Hero heading" htmlFor="ht">
        <Input id="ht" value={v.heroTitle} onChange={set("heroTitle")} />
      </Field>
      <Field label="Hero sub-heading" htmlFor="hs">
        <Textarea
          id="hs"
          rows={2}
          value={v.heroSub}
          onChange={set("heroSub")}
        />
      </Field>
      <Field label="Hero button label" htmlFor="hb">
        <Input id="hb" value={v.heroButton} onChange={set("heroButton")} />
      </Field>
      <Field label="Footer text" htmlFor="ft">
        <Input id="ft" value={v.footer} onChange={set("footer")} />
      </Field>
      <Button onClick={notWired}>Save</Button>
    </Card>
  );
}

export function OnlineStoreThemes({ storeName }: { storeName: string }) {
  const [tab, setTab] = useState<"themes" | "text">("themes");
  const [visibility, setVisibility] = useState("public");
  return (
    <>
      <div className="mb-space-4 flex flex-wrap items-center justify-between gap-space-3">
        <Badge tone="warning">Sample data: not connected yet</Badge>
        <div className="flex items-center gap-space-2">
          <Select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-32"
            aria-label="Store visibility"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </Select>
          <Button variant="secondary" onClick={notWired}>
            <Eye size={15} /> View store
          </Button>
        </div>
      </div>

      <Card className="mb-space-5 grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        {SPEED.map((m) => (
          <div key={m.label} className="p-space-4">
            <p className="text-[12px] font-semibold text-ink-600">{m.label}</p>
            <p className="mt-1 flex items-center gap-space-2 text-[15px] font-bold text-ink-900">
              {m.value}
              {m.note && <Badge tone="success">{m.note}</Badge>}
            </p>
          </div>
        ))}
      </Card>

      <Tabs
        tabs={[
          { key: "themes", label: "Themes" },
          { key: "text", label: "Text & content" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "themes" ? <Themes storeName={storeName} /> : <TextSettings />}
    </>
  );
}
