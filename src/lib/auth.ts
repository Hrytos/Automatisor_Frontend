"use client";

const AUTH_KEY = "automatisor_auth";

// Non-sensitive user metadata stored in sessionStorage.
// The JWT itself lives only in the HttpOnly cookie set by the backend.
export interface AuthSession {
  user_id: string;
  account_id: string | null;
  is_admin: boolean;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession): void {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent("automatisor:authchange"));
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new CustomEvent("automatisor:authchange"));
}

export function isUnlocked(): boolean {
  return getAuthSession() !== null;
}

export function isAdmin(): boolean {
  return getAuthSession()?.is_admin ?? false;
}
