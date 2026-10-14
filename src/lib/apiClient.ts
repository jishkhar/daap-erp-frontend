// Shared axios plumbing for staffAuth.ts -- the wrapper keeps its
// original fetch-style `(path, init?: RequestInit)` signature (every
// existing caller across pages/components passes a RequestInit-shaped
// object), so this just repackages that into the axios request config
// shape rather than forcing every call site to be rewritten too.

export function requestInitToAxiosConfig(init?: RequestInit): {
  method: string;
  headers: Record<string, string>;
  data: unknown;
} {
  const headers = new Headers(init?.headers);
  // JSON strings need this header; otherwise axios labels them as form data and FastAPI rejects the body.
  if (typeof init?.body === "string" && !headers.has("Content-Type")) {
    try {
      JSON.parse(init.body);
      headers.set("Content-Type", "application/json");
    } catch {
      /* Non-JSON bodies keep their original content type. */
    }
  }
  return {
    method: (init?.method as string) || "GET",
    headers: Object.fromEntries(headers.entries()),
    // init.body is already a JSON string (every caller does
    // JSON.stringify(payload) + sets Content-Type itself) -- passed through
    // unchanged so axios sends the exact same bytes fetch() did, not
    // re-serialized.
    data: init?.body,
  };
}
