// Thin compatibility layer over staffAuth.ts, kept so every portal page keeps one import for "who am I".
import { clearStaffSession, getStaffAccessToken, getStaffSession, staffFetch } from "@/lib/staffAuth";

export type PortalTenant = {
  id: string;
  code: string;
  name: string;
  currency: string;
};

export function getPortalToken(): string | null {
  return getStaffAccessToken();
}

export function getPortalTenant(): PortalTenant | null {
  return getStaffSession()?.tenant ?? null;
}

export function clearPortalSession() {
  clearStaffSession();
}

export const portalFetch = staffFetch;
