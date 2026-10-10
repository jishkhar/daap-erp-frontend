"use client";

import { ImageIcon, ImagePlus, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useProductImages } from "@/hooks/useProducts";
import type { Product } from "@/lib/erp";
import { toast } from "@/lib/toast";

// Mirrors the server's rules (services/product_images.py); the server is what actually enforces them.
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 10;
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

  async function upload(files: FileList | null) {
    if (input.current) input.current.value = "";
    if (!product || !files?.length) return;
    setUploading(true);
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
      try {
        const result = await gallery.upload.mutateAsync(file); // one at a time, in order
        current = result.images;
        apply(result);
      } catch (e) {
        toast.error(`Couldn't upload ${file.name}`, (e as Error).message);
      }
    }
    setUploading(false);
  }

  function remove(url: string) {
    gallery.remove.mutate(url, {
      onSuccess: apply,
      onError: (e) => toast.error("Couldn't remove the image", e.message),
    });
  }

  function makeCover(url: string) {
    gallery.reorder.mutate([url, ...images.filter((u) => u !== url)], {
      onSuccess: apply,
      onError: (e) => toast.error("Couldn't change the cover image", e.message),
    });
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
