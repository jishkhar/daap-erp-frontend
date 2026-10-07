"use client";

import { ImageIcon, ImagePlus, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { erp, erpUpload, qs, type Product } from "@/lib/erp";
import { toast } from "@/lib/toast";

// Mirrors the server's rules (services/product_images.py); the server is what actually enforces them.
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 10;
const ACCEPT = "image/jpeg,image/png,image/webp";

type Images = { images: string[] };

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

/** Manage a product's gallery: upload to the image store, remove, and choose the cover (the first image). */
export function ProductImagesModal({
  product,
  onClose,
  onChanged,
}: {
  product: Product | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  // `edited` holds the list after this dialog has changed anything; until then the product's own list is shown.
  const [edited, setEdited] = useState<{ id: string; urls: string[] } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const images = product
    ? edited?.id === product.id
      ? edited.urls
      : (product.images ?? [])
    : [];
  const path = product ? `/api/v1/products/${product.id}/images` : "";
  const apply = (urls: string[]) => {
    if (product) setEdited({ id: product.id, urls });
    onChanged();
  };

  async function upload(files: FileList | null) {
    if (input.current) input.current.value = "";
    if (!product || !files?.length) return;
    setBusy(true);
    let current = images;
    for (const file of Array.from(files)) {
      if (current.length >= MAX_IMAGES) {
        toast.error(`At most ${MAX_IMAGES} images per product`);
        break;
      }
      if (!ACCEPT.split(",").includes(file.type)) {
        toast.error(`${file.name}: use a JPEG, PNG or WebP image`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: images can be at most 5 MB`);
        continue;
      }
      const res = await erpUpload<Images>(path, file);
      if (res.error || !res.data) {
        toast.error(`Couldn't upload ${file.name}`, res.error ?? undefined);
        continue;
      }
      current = res.data.images;
      apply(current);
    }
    setBusy(false);
  }

  async function remove(url: string) {
    setBusy(true);
    const res = await erp<Images>(`${path}${qs({ url })}`, "DELETE");
    setBusy(false);
    if (res.error || !res.data)
      return toast.error("Couldn't remove the image", res.error ?? undefined);
    apply(res.data.images);
  }

  async function makeCover(url: string) {
    setBusy(true);
    const res = await erp<Images>(`${path}/order`, "PUT", {
      urls: [url, ...images.filter((u) => u !== url)],
    });
    setBusy(false);
    if (res.error || !res.data)
      return toast.error(
        "Couldn't change the cover image",
        res.error ?? undefined,
      );
    apply(res.data.images);
  }

  return (
    <Modal
      open={product !== null}
      onClose={onClose}
      width="lg"
      title={`Images — ${product?.name ?? ""}`}
      description="Shown on the online store. The first image is the cover. JPEG, PNG or WebP, up to 5 MB each."
      footer={
        <>
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => upload(e.target.files)}
          />
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
          <Button
            disabled={busy || images.length >= MAX_IMAGES}
            onClick={() => input.current?.click()}
          >
            <ImagePlus size={16} /> {busy ? "Working…" : "Upload images"}
          </Button>
        </>
      }
    >
      {images.length === 0 ? (
        <p className="py-space-6 text-center text-[13px] text-ink-400">
          No images yet. Upload at least one so the product looks right on the
          store.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-space-3 sm:grid-cols-3">
          {images.map((url, i) => (
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
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-medium text-white">
                  Cover
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2">
                {i !== 0 && (
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
