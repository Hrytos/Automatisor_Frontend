"use client";

import { useEffect } from "react";
import { getAuthSession, clearAuthSession } from "@/lib/auth";

// Silently refresh the access_token every 30 minutes while the user is logged in.
// The backend /auth/refresh endpoint swaps the refresh_token cookie for a new
// access_token + refresh_token pair, so sessions stay alive indefinitely.
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

export function SessionRefresher() {
  useEffect(() => {
    const refresh = async () => {
      if (!getAuthSession()) return; // not logged in — nothing to refresh

      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (res.status === 401) {
          // Refresh token expired or revoked — clear local session so the UI
          // shows the logged-out state on the next navigation.
          clearAuthSession();
        }
      } catch {
        // Network error — ignore silently; the next interval will retry.
      }
    };

    // Refresh immediately on mount (catches tab restores / long suspensions),
    // then again every 30 minutes.
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
