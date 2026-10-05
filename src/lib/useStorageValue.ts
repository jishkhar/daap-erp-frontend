"use client";

import { useSyncExternalStore } from "react";

const EVENT = "erp-storage";

/** Tell every useStorageValue() reader that a key changed (the browser's own `storage` event only fires in OTHER tabs). */
export function notifyStorageChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** The current string value of a localStorage/sessionStorage key — null on the server and on the first client pass
 * (so server and client markup agree), then the real value, kept live as it changes. */
export function useStorageValue(key: string, area: "local" | "session" = "local"): string | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return (area === "local" ? localStorage : sessionStorage).getItem(key);
      } catch {
        return null; // storage blocked (private window, site data cleared)
      }
    },
    () => null,
  );
}

const noopSubscribe = () => () => {};

/** false on the server and during hydration, true afterwards -- lets a component render nothing until it can read
 * browser-only state, without a flash of the wrong UI. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
