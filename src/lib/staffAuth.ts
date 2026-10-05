import { useMemo } from "react";
import axios, { isAxiosError } from "axios";
import { requestInitToAxiosConfig } from "@/lib/apiClient";
import type { PortalTenant } from "@/lib/portalAuth";
import { notifyStorageChange, useStorageValue } from "@/lib/useStorageValue";

const ACCESS_KEY = "erp_access_token";
const REFRESH_KEY = "erp_refresh_token";
const SESSION_KEY = "erp_session";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/** Permissions as the ERP API returns them (GET /api/v1/auth/me): "module:action" -> "*" (every branch of the
 * tenant) or the list of branch ids the grant covers. */
export type PermissionMap = Record<string, "*" | string[]>;

export type SessionBranch = { id: string; branch_code: string; branch_name: string };

export type StaffSession = {
  id: string;
  name: string;
  roles: string[];
  tenant: PortalTenant;
  permissions: PermissionMap;
  branches: SessionBranch[];
  /** Modules the tenant has switched on and bought (super admin's Access Management). Absent on sessions saved before this existed. */
  modules?: Record<string, boolean>;
};

type MeResponse = {
  user_id: string;
  name: string;
  tenant_id: string;
  tenant: { id: string; tenant_code: string; display_name: string; currency: string; timezone: string };
  roles: string[];
  permissions: PermissionMap;
  branches: SessionBranch[];
  modules?: Record<string, boolean>;
};

type TokenResponse = { access_token: string; refresh_token: string };

export function saveStaffSession(accessToken: string, refreshToken: string, session: StaffSession) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notifyStorageChange();
}

export function getStaffAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getStaffRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getStaffSession(): StaffSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearStaffSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(SESSION_KEY);
  notifyStorageChange();
}

/** The ERP reports errors as { error: { code, message } }; older call sites expect a plain string. */
function errorMessage(data: unknown): string {
  const err = (data as { error?: unknown } | undefined)?.error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Something went wrong.";
}

async function loadSession(accessToken: string): Promise<StaffSession> {
  const me = (await axios.get<MeResponse>(`${API_BASE_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } })).data;
  const tenant: PortalTenant = { id: me.tenant.id, code: me.tenant.tenant_code, name: me.tenant.display_name, currency: me.tenant.currency };
  return { id: me.user_id, name: me.name, roles: me.roles, tenant, permissions: me.permissions, branches: me.branches, modules: me.modules };
}

/** Sign in with tenant code + email + password. Returns an error message, or null on success. */
export async function loginStaff(tenantCode: string, email: string, password: string): Promise<string | null> {
  try {
    const res = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, { tenant_code: tenantCode.trim(), email: email.trim(), password });
    const tokens = res.data as TokenResponse;
    const session = await loadSession(tokens.access_token);
    saveStaffSession(tokens.access_token, tokens.refresh_token, session);
    return null;
  } catch (err) {
    if (isAxiosError(err) && err.response) return errorMessage(err.response.data);
    return "Couldn't reach the server. Please try again.";
  }
}

/** One silent refresh via /api/v1/auth/refresh (tokens rotate). Returns the new access token, or null. */
async function tryRefresh(): Promise<string | null> {
  const refreshToken = getStaffRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post<TokenResponse>(`${API_BASE_URL}/api/v1/auth/refresh`, { refresh_token: refreshToken });
    const session = await loadSession(res.data.access_token);
    saveStaffSession(res.data.access_token, res.data.refresh_token, session);
    return res.data.access_token;
  } catch {
    return null;
  }
}

export async function logoutStaff() {
  const refreshToken = getStaffRefreshToken();
  if (refreshToken) {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/auth/logout`, { refresh_token: refreshToken });
    } catch {
      /* best effort: the local session is cleared regardless */
    }
  }
  clearStaffSession();
}

type FetchResult =
  | { ok: true; data: unknown }
  | { ok: false; unauthorized: true }
  | { ok: false; unauthorized: false; error: string };

/** axios wrapper for authenticated ERP requests. Access tokens last ~15 minutes, so a 401 first tries ONE silent
 * refresh before giving up and clearing the session. */
export async function staffFetch(path: string, init?: RequestInit): Promise<FetchResult> {
  let token = getStaffAccessToken();
  if (!token) return { ok: false, unauthorized: true };

  const config = requestInitToAxiosConfig(init);
  const request = (authToken: string) =>
    axios.request({
      ...config,
      url: `${API_BASE_URL}${path}`,
      headers: { ...config.headers, Authorization: `Bearer ${authToken}` },
    });

  let res;
  try {
    res = await request(token);
  } catch (err) {
    if (!isAxiosError(err) || !err.response) {
      return { ok: false, unauthorized: false, error: "Network error — check your connection." };
    }
    if (err.response.status !== 401) {
      return { ok: false, unauthorized: false, error: errorMessage(err.response.data) };
    }
    token = await tryRefresh();
    if (!token) {
      clearStaffSession();
      return { ok: false, unauthorized: true };
    }
    try {
      res = await request(token);
    } catch (retryErr) {
      if (!isAxiosError(retryErr) || !retryErr.response) {
        return { ok: false, unauthorized: false, error: "Network error — check your connection." };
      }
      if (retryErr.response.status === 401) {
        clearStaffSession();
        return { ok: false, unauthorized: true };
      }
      return { ok: false, unauthorized: false, error: errorMessage(retryErr.response.data) };
    }
  }
  return { ok: true, data: res.data };
}

/** The signed-in session, live: null on the server and on the first client pass, then the real value. */
export function useStaffSession(): StaffSession | null {
  const raw = useStorageValue(SESSION_KEY);
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StaffSession;
    } catch {
      return null;
    }
  }, [raw]);
}

/** Whether a sign-in token is stored (null until the browser value is known). */
export function useHasStaffToken(): boolean | null {
  const token = useStorageValue(ACCESS_KEY);
  return token === null ? null : true;
}

// Sidebar/page keys -> the ERP module that governs them. The backend's 403 is the real enforcement; this only
// decides what to show.
const PAGE_MODULE: Record<string, string> = {
  orders: "orders",
  products: "products",
  customers: "customers",
  discounts: "orders",
  whatsapp: "customers",
  reports: "reports",
  feedback: "customers",
  channels: "channels",
  procurement: "procurement",
  finance: "finance",
  recommerce: "recommerce",
  settings: "tenant",
  staff: "users",
  roles: "roles",
  activity: "audit",
  billing: "billing",
};

// Pages with no ERP module of their own (the dashboard, and the Workforce section, which is not an ERP
// backend module yet) are visible to every signed-in person.
const ALWAYS_VISIBLE = new Set(["dashboard", "check_in_out", "my_leave", "attendance", "leave_requests"]);

const ACTION_VERBS: Record<"view" | "write" | "delete", string[]> = {
  view: ["view"],
  write: ["create", "update", "manage", "receive", "adjust"],
  delete: ["archive", "cancel", "delete"],
};

export function hasPermission(session: StaffSession | null, pageKey: string, action: "view" | "write" | "delete"): boolean {
  if (!session) return true; // before the session loads; the API enforces regardless
  if (ALWAYS_VISIBLE.has(pageKey)) return true;
  const moduleKey = PAGE_MODULE[pageKey];
  if (!moduleKey) return true;
  return ACTION_VERBS[action].some((verb) => Boolean(session.permissions[`${moduleKey}:${verb}`]));
}

export function usePermission(pageKey: string, action: "view" | "write" | "delete"): boolean {
  return hasPermission(useStaffSession(), pageKey, action);
}

/** Does the person hold this exact `module:action` for EVERY branch (a tenant-wide grant)? */
export function hasTenantWide(session: StaffSession | null, permission: string): boolean {
  return session?.permissions[permission] === "*";
}

/** Does the person hold this exact `module:action` for at least one branch? */
export function hasGrant(session: StaffSession | null, permission: string): boolean {
  return Boolean(session?.permissions[permission]);
}

/** Does the person hold this `module:action` at one specific branch? */
export function hasGrantAt(session: StaffSession | null, permission: string, branchId: string): boolean {
  const grant = session?.permissions[permission];
  return grant === "*" || (Array.isArray(grant) && grant.includes(branchId));
}
