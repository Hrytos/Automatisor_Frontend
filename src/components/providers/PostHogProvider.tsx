"use client";

import { useEffect } from "react";
import { initPostHog, posthog } from "@/lib/posthog";
import { getAuthSession } from "@/lib/auth";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();

    // Identify user if they already have an active session (e.g. page refresh)
    const session = getAuthSession();
    if (session) {
      posthog.identify(session.user_id, {
        email: session.email,
        account_id: session.account_id,
        is_admin: session.is_admin,
      });
    }

    // Keep PostHog identity in sync with auth state changes
    function onAuthChange() {
      const s = getAuthSession();
      if (s) {
        posthog.identify(s.user_id, {
          email: s.email,
          account_id: s.account_id,
          is_admin: s.is_admin,
        });
      } else {
        posthog.reset();
      }
    }

    window.addEventListener("automatisor:authchange", onAuthChange);
    return () => window.removeEventListener("automatisor:authchange", onAuthChange);
  }, []);

  return <>{children}</>;
}
