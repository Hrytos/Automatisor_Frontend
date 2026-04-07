"use client";

import { useEffect } from "react";
import { getAuthSession, setAuthSession, clearAuthSession } from "@/lib/auth";

// Silently refresh the access_token every 30 minutes while the user is logged in.
// The backend /auth/refresh endpoint swaps the refresh_token cookie for a new
// access_token + refresh_token pair, so sessions stay alive indefinitely.
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

export function SessionRefresher() {
  useEffect(() => {
    const syncSession = async () => {
      const existing = getAuthSession();

      if (!existing) {
        // No local session — but a valid cookie might exist (e.g. new tab).
        // Call /auth/me to check and populate sessionStorage if so.
        try {
          const res = await fetch("/api/auth/me", { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            setAuthSession({
              user_id: data.user_id,
              email: data.email,
              account_id: data.account_id ?? null,
              is_admin: data.is_admin ?? false,
            });
          }
        } catch {
          // Network error or not authenticated — ignore.
        }
        return;
      }

      // Session exists — silently refresh the access_token.
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (res.status === 401) {
          // Refresh token expired or revoked — clear local session.
          clearAuthSession();
        }
      } catch {
        // Network error — ignore silently; the next interval will retry.
      }
    };

    // Sync on mount (catches tab restores / new tabs / long suspensions),
    // then refresh every 30 minutes.
    syncSession();
    const id = setInterval(syncSession, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
