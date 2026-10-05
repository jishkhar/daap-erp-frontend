"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type GoogleId = {
  initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

/** Google's own "Sign in with Google" button. Renders nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't set. */
export function GoogleSignInButton({ onCredential, width = 320 }: { onCredential: (idToken: string) => void; width?: number }) {
  const holder = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [ready, setReady] = useState(() => typeof window !== "undefined" && !!window.google);

  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!ready || !CLIENT_ID || !holder.current || !window.google) return;
    window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (res) => callback.current(res.credential) });
    window.google.accounts.id.renderButton(holder.current, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width });
  }, [ready, width]);

  if (!CLIENT_ID) return null;
  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setReady(true)} />
      <div className="my-space-4 flex items-center gap-space-3 text-[12.5px] text-ink-400">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <div ref={holder} className="flex min-h-10 justify-center" />
    </>
  );
}
