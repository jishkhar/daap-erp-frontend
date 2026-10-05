// DAAP platform-admin auth -- deliberately separate from the tenant staff session (lib/staffAuth.ts): a different
// token type, signed with a different secret, from POST /api/platform/auth/login. Stored in sessionStorage (not
// localStorage) so it lives no longer than the tab. The token lasts 15 minutes and there is no refresh endpoint
// for the platform API, so an expired session simply asks for the password again.

import { notifyStorageChange } from "@/lib/useStorageValue";

const TOKEN_KEY = "super_admin_token";
const ADMIN_KEY = "super_admin";

export type SuperAdmin = { email: string };

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getSuperAdmin(): SuperAdmin | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string, admin: SuperAdmin) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  notifyStorageChange();
}

export function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_KEY);
  notifyStorageChange();
}

import axios, { isAxiosError } from "axios";
import { requestInitToAxiosConfig } from "@/lib/apiClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function adminFetch(path: string, init?: RequestInit): Promise<
  { ok: true; data: unknown } | { ok: false; unauthorized: true } | { ok: false; unauthorized: false; error: string }
> {
  const token = getAdminToken();
  if (!token) return { ok: false, unauthorized: true };

  try {
    const res = await axios.request({
      ...requestInitToAxiosConfig(init),
      url: `${API_BASE_URL}${path}`,
      headers: { ...requestInitToAxiosConfig(init).headers, Authorization: `Bearer ${token}` },
    });
    return { ok: true, data: res.data };
  } catch (err) {
    if (isAxiosError(err) && err.response) {
      if (err.response.status === 401) {
        clearAdminToken();
        return { ok: false, unauthorized: true };
      }
      const e = err.response.data?.error;
      return { ok: false, unauthorized: false, error: typeof e === "string" ? e : e?.message || "Something went wrong." };
    }
    return { ok: false, unauthorized: false, error: "Network error — check your connection." };
  }
}

/** Platform sign-in. Returns an error message, or null on success. */
export async function adminLogin(email: string, password: string): Promise<string | null> {
  try {
    const res = await axios.post(`${API_BASE_URL}/api/platform/auth/login`, { email, password });
    setAdminToken(res.data.access_token, { email });
    return null;
  } catch (err) {
    if (isAxiosError(err) && err.response) {
      const e = err.response.data?.error;
      return typeof e === "string" ? e : e?.message || "Incorrect email or password.";
    }
    return "Couldn't reach the server. Please try again.";
  }
}

/** One JSON call to the platform API. */
export async function adminJson<T = unknown>(path: string, method: "GET" | "POST" | "PATCH" = "GET", body?: unknown): Promise<{ data: T | null; error: string | null; unauthorized: boolean }> {
  const result = await adminFetch(path, { method, ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  if (!result.ok) return { data: null, error: result.unauthorized ? "Session expired — sign in again." : result.error, unauthorized: result.unauthorized };
  return { data: result.data as T, error: null, unauthorized: false };
}

export const ADMIN_TOKEN_KEY = TOKEN_KEY;
