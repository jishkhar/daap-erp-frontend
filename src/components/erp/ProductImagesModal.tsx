"use client";

import { ImageIcon, ImagePlus, Star, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useProductImages } from "@/hooks/useProducts";
import type { Product } from "@/lib/erp";
import { toast } from "@/lib/toast";

// Mirrors the server's rules (services/product_images.py); the server is what actually enforces them.
const MAX_BYTES = 1024 * 1024;
const MAX_IMAGES = 6;
const ACCEPT = "image/jpeg,image/png,image/webp";

/** The small cover picture shown in the products table. */
export function ProductThumb({ url }: { url?: string }) {
  if (url)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="h-10 w-8 rounded object-cover"
        loading="lazy"
      />
    );
  return (
    <span className="flex h-10 w-8 items-center justify-center rounded bg-ink-50 text-ink-300">
      <ImageIcon size={14} />
    </span>
  );
}

/** Manage a product's gallery: upload to the image store, remove, and choose the cover (the first image). Each change refreshes the
 * product lists (hooks/useProducts). */
export function ProductImagesModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  // `edited` holds the list after this dialog has changed anything; until then the product's own list is shown.
  const [edited, setEdited] = useState<{ id: string; urls: string[] } | null>(
    null,
  );
  const gallery = useProductImages(product?.id ?? "");
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<{
    id: string;
    items: { file: File; url: string }[];
  } | null>(null);
  const previewUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);
  const busy =
    uploading || gallery.remove.isPending || gallery.reorder.isPending;
  const input = useRef<HTMLInputElement>(null);

  const images = product
    ? edited?.id === product.id
      ? edited.urls
      : (product.images ?? [])
    : [];
  const apply = ({ images: urls }: { images: string[] }) => {
    if (product) setEdited({ id: product.id, urls });
  };

  const staged = previews?.id === product?.id ? (previews?.items ?? []) : [];

  function release(url: string) {
    URL.revokeObjectURL(url);
    previewUrls.current.delete(url);
  }

  function close() {
    if (busy) return;
    for (const url of previewUrls.current) release(url);
    setPreviews(null);
    onClose();
  }

  function select(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (input.current) input.current.value = "";
    if (!product || !selected.length || busy) return;
    const accepted: { file: File; url: string }[] = [];
    for (const file of selected) {
      if (!ACCEPT.split(",").includes(file.type)) {
        toast.error(`${file.name}: use a JPEG, PNG or WebP image`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: images can be at most 1 MB`);
        continue;
      }
      if (images.length + staged.length + accepted.length >= MAX_IMAGES) {
        toast.error(`At most ${MAX_IMAGES} images per product`);
        break;
      }
      const url = URL.createObjectURL(file);
      previewUrls.current.add(url);
      accepted.push({ file, url });
    }
    if (accepted.length)
      setPreviews({ id: product.id, items: [...staged, ...accepted] });
  }

  async function upload() {
    if (!product || busy || !staged.length) return;
    setUploading(true);
    try {
      for (const { file, url } of staged) {
        try {
          const result = await gallery.upload.mutateAsync(file);
          apply(result);
          setPreviews((p) =>
            p ? { ...p, items: p.items.filter((item) => item.url !== url) } : p,
          );
          release(url);
        } catch (e) {
          toast.error(`Couldn't upload ${file.name}`, (e as Error).message);
        }
      }
    } finally {
      setUploading(false);
    }
  }

  function remove(url: string) {
    if (staged.some((item) => item.url === url)) {
      setPreviews((p) =>
        p ? { ...p, items: p.items.filter((item) => item.url !== url) } : p,
      );
      release(url);
      return;
    }
    const before = images;
    apply({ images: images.filter((u) => u !== url) });
    gallery.remove.mutate(url, {
      onSuccess: apply,
      onError: (e) => {
        apply({ images: before });
        toast.error("Couldn't remove the image", e.message);
      },
    });
  }

  function makeCover(url: string) {
    gallery.reorder.mutate([url, ...images.filter((u) => u !== url)], {
      onSuccess: apply,
      onError: (e) => toast.error("Couldn't change the cover image", e.message),
    });
  }

  const pending = staged.map((item) => item.url);
  const displayed = [...images, ...pending];

  return (
    <Modal
      open={product !== null}
      onClose={close}
      dismissible={!busy}
      width="lg"
      title={`Images — ${product?.name ?? ""}`}
      description="Shown on the website. The first image is the cover. Maximum 6 images per product. JPEG, PNG or WebP, up to 1 MB each."
      footer={
        <>
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            aria-label="Select product images"
            onChange={(e) => select(e.target.files)}
          />
          <Button
            variant="secondary"
            disabled={busy || displayed.length >= MAX_IMAGES}
            onClick={() => input.current?.click()}
          >
            <ImagePlus size={16} /> Select images
          </Button>
          <Button
            disabled={busy || !staged.length}
            onClick={() => void upload()}
          >
            {uploading ? "Uploading…" : "Upload images"}
          </Button>
        </>
      }
    >
      <p className="mb-space-3 text-[13px] text-ink-400">
        {displayed.length} / {MAX_IMAGES} images
        {staged.length > 0 && ` · ${staged.length} selected, not uploaded`}
      </p>
      {displayed.length === 0 ? (
        <p className="py-space-6 text-center text-[13px] text-ink-400">
          No images yet. Select images, then click Upload images to show them on
          the store.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-space-3 sm:grid-cols-3">
          {displayed.map((url, i) => (
            <li
              key={url}
              className="relative overflow-hidden rounded-lg border border-ink-100 bg-ink-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${product?.name ?? "Product"} image ${i + 1}`}
                className="aspect-[3/4] w-full object-cover"
                loading="lazy"
              />
              {pending.includes(url) ? (
                <span
                  className="absolute left-2 top-2 rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-medium text-white"
                  role="status"
                >
                  {uploading ? "Uploading…" : "Not uploaded"}
                </span>
              ) : (
                i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-medium text-white">
                    Cover
                  </span>
                )
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2">
                {i !== 0 && !pending.includes(url) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => makeCover(url)}
                    aria-label="Make cover image"
                    className="rounded-full bg-white/90 p-1.5 text-ink-900 hover:bg-white"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(url)}
                  aria-label="Remove image"
                  className="rounded-full bg-white/90 p-1.5 text-error hover:bg-white"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
