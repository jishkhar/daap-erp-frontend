"use client";

import Image from "next/image";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  FolderOpen,
  Grid2X2,
  ImageIcon,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import { CollectionProductPicker } from "@/components/erp/CollectionProductPicker";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import { useProductCategories } from "@/hooks/useProducts";
import {
  useCollections,
  useCollectionPreview,
  useSaveCollection,
  useUploadCollectionCover,
  type CollectionCondition,
  type CollectionDetail,
  type CollectionInput,
} from "@/hooks/useCollections";
import { formatMoney, type Product } from "@/lib/erp";
import { toast } from "@/lib/toast";
import { useDebounced } from "@/lib/useDebounced";
import { useStaffSession } from "@/lib/staffAuth";

function Cover({
  url,
  className = "",
}: {
  url?: string | null;
  className?: string;
}) {
  return url ? (
    <Image
      unoptimized
      width={320}
      height={400}
      src={url}
      alt=""
      className={`h-full w-full object-cover ${className}`}
    />
  ) : (
    <ImageIcon size={25} className="text-ink-300" />
  );
}

export function CollectionEditor({
  collection,
  editable,
}: {
  collection?: CollectionDetail;
  editable: boolean;
}) {
  const router = useRouter();
  const session = useStaffSession();
  const [version, setVersion] = useState(collection?.version);
  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [showInHeader, setShowInHeader] = useState(collection?.show_in_header ?? false);
  const [headerOrder, setHeaderOrder] = useState(collection?.header_order ?? 0);
  const [headerDropdown, setHeaderDropdown] = useState(collection?.header_dropdown ?? false);
  const [dropdownIds, setDropdownIds] = useState<string[]>(collection?.dropdown_collection_ids ?? []);
  const [dropdownChoice, setDropdownChoice] = useState("");
  const allCollections = useCollections();
  const [image, setImage] = useState(collection?.image_url ?? null);
  const [selected, setSelected] = useState<Product[]>(
    collection?.manual_products ??
      (collection?.products ?? []).filter(
        (p) =>
          !collection?.variant_ids || collection.variant_ids.includes(p.id),
      ),
  );
  const [conditions, setConditions] = useState<CollectionCondition[]>(
    collection?.conditions ?? [],
  );
  const [excluded, setExcluded] = useState<string[]>(
    collection?.excluded_variant_ids ?? [],
  );
  const [picker, setPicker] = useState<"add" | "exclude" | null>(null);
  const [discard, setDiscard] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [columns, setColumns] = useState("4");
  const [search, setSearch] = useState("");
  const query = useDebounced(search.trim().toLowerCase());
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("manual");
  const fileInput = useRef<HTMLInputElement>(null);
  const categories = useProductCategories();
  const save = useSaveCollection();
  const upload = useUploadCollectionCover();
  const draft: CollectionInput = {
    name,
    description,
    show_in_header: showInHeader,
    header_order: headerOrder,
    header_dropdown: headerDropdown,
    dropdown_collection_ids: dropdownIds,
    image_url: image,
    variant_ids: selected.map((p) => p.id),
    conditions,
    excluded_variant_ids: excluded,
  };
  const snapshot = JSON.stringify(draft);
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;
  const validRules = conditions.every((r) => !!r.value.trim());
  const previewInput = useDebounced(
    JSON.stringify({ ...draft, name: "Preview", description: "" }),
  );
  const preview = useCollectionPreview(
    JSON.parse(previewInput) as CollectionInput,
    editable && conditions.length > 0 && validRules,
  );
  const products = !editable
    ? (collection?.products ?? [])
    : conditions.length > 0
      ? (preview.data?.products ?? [])
      : selected.filter((p) => !excluded.includes(p.id));
  const busy = save.isPending || upload.isPending;
  const filtered = products.filter(
    (p) =>
      (!status || p.lifecycle_status === status) &&
      `${p.name} ${p.sku}`.toLowerCase().includes(query),
  );
  const displayed = [...filtered].sort((a, b) =>
    sort === "title"
      ? a.name.localeCompare(b.name)
      : sort === "price"
        ? a.price_minor - b.price_minor
        : sort === "newest"
          ? Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? "")
          : 0,
  );
  const leave = () => {
    if (busy) return;
    if (dirty && editable) setDiscard(true);
    else router.push("/portal/collections");
  };
  const move = (id: string, direction: number) =>
    setSelected((prev) => {
      const index = prev.findIndex((p) => p.id === id),
        next = [...prev];
      if (
        index < 0 ||
        index + direction < 0 ||
        index + direction >= next.length
      )
        return prev;
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
  useEffect(() => {
    if (!dirty || !editable) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, editable]);

  return (
    <div className="mx-auto max-w-[1280px] pb-space-8">
      <div className="-mx-space-2 mb-space-6 flex flex-wrap items-center justify-between gap-space-3 border-b border-line bg-paper/95 px-space-2 py-space-3">
        <div className="flex min-w-0 items-center gap-space-2 text-sm">
          <Button
            variant="ghost"
            aria-label="Back to collections"
            onClick={leave}
            disabled={busy}
          >
            <ArrowLeft size={18} />
          </Button>
          <FolderOpen size={17} className="shrink-0 text-ink-600" />
          <button
            onClick={leave}
            disabled={busy}
            className="text-ink-600 hover:underline"
          >
            Collections
          </button>
          <span className="text-ink-300">/</span>
          <h1 className="truncate font-semibold">
            {collection ? collection.name : "Add collection"}
          </h1>
        </div>
        {editable && (
          <div className="flex items-center gap-space-2 rounded-full bg-ink-900 py-1 pl-4 pr-1 text-white shadow-md">
            <span className="mr-2 hidden text-xs md:inline">
              {busy
                ? "Saving…"
                : dirty || !collection
                  ? "Unsaved collection"
                  : "All changes saved"}
            </span>
            <button
              disabled={busy}
              className="rounded-full bg-white/10 px-3 py-2 text-xs hover:bg-white/20 disabled:opacity-50"
              onClick={leave}
            >
              Discard
            </button>
            <button
              type="submit"
              form="collection-editor"
              disabled={
                busy ||
                !name.trim() ||
                !validRules ||
                selected.length > 2000 ||
                (!!collection && !dirty)
              }
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink-900 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        )}
      </div>
      <form
        id="collection-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (!editable || busy || !name.trim() || !validRules) return;
          save.mutate(
            { ...draft, id: collection?.id, version },
            {
              onSuccess: (saved) => {
                setVersion(saved.version);
                setBaseline(snapshot);
                toast.success("Collection saved");
                if (!collection)
                  router.replace(`/portal/collections/${saved.id}`);
              },
              onError: (error) => {
                toast.error("Couldn't save collection", error.message);
              },
            },
          );
        }}
      >
        <div className="grid items-start gap-space-5 xl:grid-cols-[minmax(0,1fr)_290px]">
          <div className="min-w-0">
            <Card className="mb-space-6 p-space-4 sm:p-space-5">
              <div className="flex flex-col gap-space-5 md:flex-row">
                <div className="shrink-0">
                  <button
                    type="button"
                    disabled={!editable || busy}
                    onClick={() => fileInput.current?.click()}
                    aria-label={
                      image
                        ? "Change collection cover"
                        : "Upload collection cover"
                    }
                    className="group relative flex h-44 w-36 items-center justify-center overflow-hidden rounded-xl border border-dashed border-ink-300 bg-paper/30 transition hover:border-brand-500"
                  >
                    {image ? (
                      <Cover url={image} />
                    ) : (
                      <div className="text-center">
                        <Upload
                          size={21}
                          className="mx-auto mb-2 text-ink-500"
                        />
                        <span className="text-xs text-ink-500">Add image</span>
                      </div>
                    )}
                    {image && editable && (
                      <span className="absolute inset-x-0 bottom-0 bg-black/50 py-2 text-xs text-white">
                        Change image
                      </span>
                    )}
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Collection cover file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      if (file.size > 1024 * 1024) {
                        toast.error("Choose an image up to 1 MB");
                        return;
                      }
                      upload.mutate(file, {
                        onSuccess: (result) => setImage(result.image_url),
                        onError: (error) =>
                          toast.error("Couldn't upload cover", error.message),
                      });
                    }}
                  />
                  {image && editable && (
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      disabled={busy}
                      className="mt-2 text-xs text-ink-500 hover:underline"
                    >
                      Remove image
                    </button>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="collection-title" className="sr-only">
                    Collection title
                  </label>
                  <input
                    id="collection-title"
                    autoFocus={!collection}
                    value={name}
                    disabled={!editable || busy}
                    maxLength={120}
                    required
                    placeholder="Add title"
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border-0 bg-transparent py-2 text-xl font-semibold text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-0"
                  />
                  <label htmlFor="collection-description" className="sr-only">
                    Collection description
                  </label>
                  <textarea
                    id="collection-description"
                    value={description}
                    disabled={!editable || busy}
                    maxLength={1000}
                    rows={4}
                    placeholder="Add description"
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full resize-y border-0 bg-transparent py-2 text-sm text-ink-600 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
              <div className="mt-space-4 border-t border-line pt-space-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Show in header</p>
                    <p className="mt-1 text-xs text-ink-500">The first five enabled collections, by header order, appear by name in the storefront desktop and mobile menus.</p>
                  </div>
                  <Switch checked={showInHeader} onChange={() => setShowInHeader(!showInHeader)} disabled={!editable || busy} aria-label="Show in header" />
                </div>
                {showInHeader && <label className="mt-4 flex items-center gap-3 text-sm">
                  Header order
                  <Input type="number" min={0} max={10000} value={headerOrder} disabled={!editable || busy} onChange={(e) => setHeaderOrder(Math.min(10000, Math.max(0, Number(e.target.value) || 0)))} className="!w-24" />
                  <span className="text-xs text-ink-500">Lower numbers appear first.</span>
                </label>}
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Use dropdown menu</p>
                    <p className="mt-1 text-xs text-ink-500">Show links to other collections underneath this header. When off, the header opens this collection directly.</p>
                  </div>
                  <Switch checked={headerDropdown} onChange={() => setHeaderDropdown(!headerDropdown)} disabled={!editable || busy} aria-label="Use dropdown menu" />
                </div>
                {headerDropdown && <div className="mt-4 space-y-3">
                  <p className="text-xs text-ink-500">Choose up to 30 collections. Their own “Show in header” setting controls only top-level placement.</p>
                  {allCollections.error && <p role="alert" className="text-xs text-error">{allCollections.error.message}</p>}
                  <div className="flex items-center gap-2">
                    <Select aria-label="Dropdown collection" value={dropdownChoice} onChange={(e) => setDropdownChoice(e.target.value)} disabled={!editable || busy || allCollections.isLoading || dropdownIds.length >= 30}>
                      <option value="">Choose a collection</option>
                      {(allCollections.data ?? []).filter((c) => c.id !== collection?.id && !dropdownIds.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <Button type="button" disabled={!editable || busy || !dropdownChoice || dropdownIds.length >= 30} onClick={() => { setDropdownIds([...dropdownIds, dropdownChoice]); setDropdownChoice(""); }}><Plus size={14} /> Add</Button>
                  </div>
                  <ol className="divide-y divide-line rounded-lg border border-line">
                    {dropdownIds.map((id, index) => {
                      const childName = allCollections.data?.find((c) => c.id === id)?.name ?? "Unavailable collection";
                      return <li key={id} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">{childName}</span>
                        <button type="button" aria-label={`Move ${childName} up`} disabled={!editable || busy || index === 0} className="rounded p-1 hover:bg-paper disabled:opacity-30" onClick={() => setDropdownIds((prev) => { const next = [...prev]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}><ArrowUp size={15} /></button>
                        <button type="button" aria-label={`Move ${childName} down`} disabled={!editable || busy || index === dropdownIds.length - 1} className="rounded p-1 hover:bg-paper disabled:opacity-30" onClick={() => setDropdownIds((prev) => { const next = [...prev]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })}><ArrowDown size={15} /></button>
                        <button type="button" aria-label={`Remove ${childName} from dropdown`} disabled={!editable || busy} className="rounded p-1 hover:bg-paper disabled:opacity-30" onClick={() => setDropdownIds((prev) => prev.filter((v) => v !== id))}><X size={15} /></button>
                      </li>;
                    })}
                    {!dropdownIds.length && <li className="px-3 py-3 text-xs text-ink-500">Add collections above to build the dropdown. Until then, the header remains a direct link.</li>}
                  </ol>
                </div>}
              </div>
              {upload.isPending && (
                <p role="status" className="mt-2 text-xs text-ink-600">
                  Uploading image…
                </p>
              )}
            </Card>
            <div className="mb-space-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold">Collection items</h2>
              {editable && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPicker("add")}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-700 xl:hidden"
                >
                  <Plus size={14} /> Add products
                </button>
              )}
              <span className="rounded-md bg-black/5 px-2 py-0.5 text-xs text-ink-600">
                {products.length}
              </span>
              {conditions.length > 0 && preview.isFetching && editable && (
                <span role="status" className="text-xs text-ink-400">
                  Updating…
                </span>
              )}
            </div>
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-space-2 border-b border-line p-space-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    aria-label="Grid view"
                    aria-pressed={view === "grid"}
                    className={`rounded-lg p-2 ${view === "grid" ? "bg-brand-50 text-brand-700" : "text-ink-400"}`}
                  >
                    <Grid2X2 size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    aria-label="List view"
                    aria-pressed={view === "list"}
                    className={`rounded-lg p-2 ${view === "list" ? "bg-brand-50 text-brand-700" : "text-ink-400"}`}
                  >
                    <List size={17} />
                  </button>
                  <Select
                    aria-label="Grid columns"
                    value={columns}
                    onChange={(e) => setColumns(e.target.value)}
                    className="!h-8 !w-28 !text-xs"
                  >
                    <option value="3">3 columns</option>
                    <option value="4">4 columns</option>
                  </Select>
                </div>
                <Select
                  aria-label="Sort collection items"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="!h-8 !w-40 !text-xs"
                >
                  <option value="manual">Manual order</option>
                  <option value="title">Title: A–Z</option>
                  <option value="price">Price: low to high</option>
                  <option value="newest">Newest first</option>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-space-2 px-space-3 py-space-3">
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={15}
                    className="absolute left-3 top-3 text-ink-400"
                  />
                  <Input
                    aria-label="Search collection items"
                    placeholder="Search collection items"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="!h-9 pl-9 !text-xs"
                  />
                </div>
                <SlidersHorizontal size={15} className="text-ink-400" />
                <Select
                  aria-label="Filter collection status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="!h-9 !w-32 !text-xs"
                >
                  <option value="">All statuses</option>
                  {["active", "draft", "discontinued", "archived"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                {(search || status) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatus("");
                    }}
                    className="text-xs text-ink-600 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {preview.error && conditions.length > 0 && (
                <p role="alert" className="px-4 pb-3 text-sm text-error">
                  {preview.error.message}
                </p>
              )}
              {!products.length ? (
                <div className="relative m-space-3 flex min-h-80 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-paper/30">
                  <div
                    aria-hidden="true"
                    className="absolute inset-3 grid grid-cols-3 gap-3 opacity-35"
                  >
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-line bg-card"
                      />
                    ))}
                  </div>
                  <div className="relative z-10 max-w-xs rounded-xl bg-card/95 p-space-5 text-center">
                    <ImageIcon
                      size={25}
                      className="mx-auto mb-3 text-ink-300"
                    />
                    <p className="text-sm font-semibold">
                      Start building your collection
                    </p>
                    <p className="mb-4 mt-1 text-xs text-ink-500">
                      Choose individual products or add conditions to include
                      matching products automatically.
                    </p>
                    {editable && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setPicker("add")}
                      >
                        <Plus size={15} /> Add products
                      </Button>
                    )}
                  </div>
                </div>
              ) : displayed.length === 0 ? (
                <p className="p-12 text-center text-sm text-ink-500">
                  No items match these filters.
                </p>
              ) : (
                <div
                  className={
                    view === "grid"
                      ? `grid grid-cols-2 gap-space-3 p-space-3 ${columns === "4" ? "md:grid-cols-3 2xl:grid-cols-4" : "md:grid-cols-3"}`
                      : "divide-y divide-line px-space-3"
                  }
                >
                  {displayed.map((product) => {
                    const manualIndex = selected.findIndex(
                      (p) => p.id === product.id,
                    );
                    return (
                      <article
                        key={product.id}
                        className={
                          view === "grid"
                            ? "group overflow-hidden rounded-xl border border-line bg-card shadow-sm"
                            : "flex items-center gap-space-3 py-space-3"
                        }
                      >
                        <div
                          className={
                            view === "grid"
                              ? "relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-paper"
                              : "relative flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-paper"
                          }
                        >
                          <Cover url={product.images?.[0]} />
                          {view === "grid" && (
                            <div className="absolute bottom-2 right-2">
                              <Badge
                                tone={
                                  product.lifecycle_status === "active"
                                    ? "success"
                                    : "info"
                                }
                              >
                                {product.lifecycle_status}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div
                          className={
                            view === "grid" ? "p-space-2" : "min-w-0 flex-1"
                          }
                        >
                          <h3 className="line-clamp-2 break-words text-xs font-medium leading-relaxed">
                            {product.name}
                          </h3>
                          <p className="mt-1 truncate text-[11px] text-ink-400">
                            {product.sku} ·{" "}
                            {formatMoney(
                              product.price_minor,
                              session?.tenant.currency ?? "INR",
                            )}
                          </p>
                          {editable && (
                            <div className="mt-2 flex flex-wrap items-center gap-1">
                              {sort === "manual" && manualIndex >= 0 && (
                                <>
                                  <button
                                    type="button"
                                    disabled={busy || manualIndex === 0}
                                    aria-label={`Move ${product.name} up`}
                                    onClick={() => move(product.id, -1)}
                                    className="rounded p-1 text-ink-500 hover:bg-paper disabled:opacity-25"
                                  >
                                    <ArrowUp size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      busy ||
                                      manualIndex === selected.length - 1
                                    }
                                    aria-label={`Move ${product.name} down`}
                                    onClick={() => move(product.id, 1)}
                                    className="rounded p-1 text-ink-500 hover:bg-paper disabled:opacity-25"
                                  >
                                    <ArrowDown size={14} />
                                  </button>
                                </>
                              )}
                              {product.images?.[0] && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  aria-label={`Use ${product.name} as cover`}
                                  onClick={() =>
                                    setImage(product.images?.[0] ?? null)
                                  }
                                  className="rounded p-1 text-ink-500 hover:bg-paper"
                                >
                                  <ImageIcon size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={busy}
                                aria-label={`Remove ${product.name}`}
                                onClick={() => {
                                  setSelected((prev) =>
                                    prev.filter((p) => p.id !== product.id),
                                  );
                                  if (conditions.length)
                                    setExcluded((prev) => [
                                      ...new Set([...prev, product.id]),
                                    ]);
                                }}
                                className="ml-auto rounded p-1 text-ink-500 hover:bg-error-tint hover:text-error"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
          <aside className="space-y-space-3 xl:sticky xl:top-24">
            <Card className="p-space-4">
              <div className="mb-space-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <FolderOpen size={16} /> Products
                </h2>
                <span className="rounded-md bg-paper px-2 py-1 text-xs">
                  {products.length}
                </span>
              </div>
              {conditions.length > 0 && (
                <p className="mb-3 text-xs text-ink-500">
                  Products matching all conditions are added automatically.
                </p>
              )}
              <fieldset
                disabled={!editable || busy}
                className="space-y-space-3"
              >
                {conditions.map((rule, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-lg border border-line p-2"
                  >
                    <div className="flex gap-1">
                      <Select
                        aria-label={`Condition ${index + 1} field`}
                        value={rule.field}
                        onChange={(e) =>
                          setConditions((prev) =>
                            prev.map((r, i) =>
                              i === index
                                ? {
                                    field: e.target
                                      .value as CollectionCondition["field"],
                                    value: "",
                                  }
                                : r,
                            ),
                          )
                        }
                        className="!h-8 !text-xs"
                      >
                        <option value="category_id">Category is</option>
                        <option value="lifecycle_status">Status is</option>
                        <option value="name">Title contains</option>
                      </Select>
                      <button
                        type="button"
                        aria-label={`Remove condition ${index + 1}`}
                        onClick={() =>
                          setConditions((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                        className="p-1 text-ink-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {rule.field === "name" ? (
                      <Input
                        aria-label={`Condition ${index + 1} value`}
                        value={rule.value}
                        maxLength={120}
                        placeholder="e.g. wedding"
                        onChange={(e) =>
                          setConditions((prev) =>
                            prev.map((r, i) =>
                              i === index ? { ...r, value: e.target.value } : r,
                            ),
                          )
                        }
                        className="!h-8 !text-xs"
                      />
                    ) : (
                      <Select
                        aria-label={`Condition ${index + 1} value`}
                        value={rule.value}
                        onChange={(e) =>
                          setConditions((prev) =>
                            prev.map((r, i) =>
                              i === index ? { ...r, value: e.target.value } : r,
                            ),
                          )
                        }
                        className="!h-8 !text-xs"
                      >
                        <option value="">
                          Choose{" "}
                          {rule.field === "category_id" ? "category" : "status"}
                        </option>
                        {rule.field === "category_id"
                          ? categories.data?.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))
                          : ["active", "draft", "discontinued", "archived"].map(
                              (s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ),
                            )}
                      </Select>
                    )}
                  </div>
                ))}
                {editable && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={conditions.length >= 20}
                      onClick={() =>
                        setConditions((prev) => [
                          ...prev,
                          { field: "category_id", value: "" },
                        ])
                      }
                      className="inline-flex items-center gap-1 rounded-full bg-paper px-3 py-2 text-xs font-medium disabled:opacity-40"
                    >
                      <Plus size={13} /> Add condition
                    </button>
                    <button
                      type="button"
                      onClick={() => setPicker("add")}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700"
                    >
                      <Plus size={13} /> Add products
                    </button>
                  </div>
                )}
              </fieldset>
              {categories.error && (
                <p role="alert" className="mt-2 text-xs text-error">
                  {categories.error.message}
                </p>
              )}
            </Card>
            {editable && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPicker("exclude")}
                className="flex items-center gap-2 px-3 py-2 text-xs text-ink-600"
              >
                <Plus size={14} /> Exclude products
                {excluded.length > 0 && ` (${excluded.length})`}
              </button>
            )}
            {excluded.length > 0 && (
              <div className="rounded-lg border border-dashed border-line p-space-3 text-xs text-ink-500">
                {excluded.length} products excluded from this collection.
                {editable && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setExcluded([])}
                    className="mt-2 block font-medium text-brand-600 hover:underline"
                  >
                    Clear exclusions
                  </button>
                )}
              </div>
            )}
            <p className="px-3 text-xs leading-relaxed text-ink-400">
              Products keep their categories and can appear in multiple
              collections. Removing a product here keeps it in your catalogue.
            </p>
          </aside>
        </div>
        {save.error && (
          <p role="alert" className="mt-space-4 text-sm text-error">
            {save.error.message}
          </p>
        )}
        {selected.length > 2000 && (
          <p role="alert" className="mt-3 text-sm text-error">
            Select up to 2,000 products.
          </p>
        )}
      </form>
      {picker && (
        <CollectionProductPicker
          mode={picker}
          selectedIds={
            picker === "add"
              ? selected
                  .filter((p) => !excluded.includes(p.id))
                  .map((p) => p.id)
              : excluded
          }
          onClose={() => setPicker(null)}
          onAdd={(items) => {
            if (picker === "add") {
              setSelected((prev) => [
                ...prev,
                ...items.filter(
                  (p) => !prev.some((existing) => existing.id === p.id),
                ),
              ]);
              setExcluded((prev) =>
                prev.filter((id) => !items.some((p) => p.id === id)),
              );
            } else {
              setExcluded((prev) => [
                ...new Set([...prev, ...items.map((p) => p.id)]),
              ]);
            }
          }}
        />
      )}
      <ConfirmDialog
        open={discard}
        title="Discard changes?"
        message="Your unsaved changes to this collection will be lost."
        confirmLabel="Discard changes"
        onCancel={() => setDiscard(false)}
        onConfirm={() => router.push("/portal/collections")}
      />
    </div>
  );
}
