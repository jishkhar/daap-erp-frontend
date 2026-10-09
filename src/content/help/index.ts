import { gettingStarted } from "./getting-started";
import { gst } from "./gst";
import { onlineStore } from "./online-store";
import { pos } from "./pos";
import type { Doc } from "./types";
import { whatsapp } from "./whatsapp";

export type { Block, Doc, Section } from "./types";

/** In the order they appear in the Help centre. */
export const DOCS: Doc[] = [gettingStarted, onlineStore, pos, whatsapp, gst];

export const docBySlug = (slug: string) => DOCS.find((d) => d.slug === slug);
