"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/tracking";
import type { Report } from "@/types/report";

/**
 * Tracks how long a user spends reading a specific site's report.
 *
 * Fires a `site_time_spent` event to PostHog in three scenarios:
 *  1. Component unmounts — user navigates away or switches to a different site
 *  2. visibilitychange fires with state "hidden" — tab is backgrounded or browser closed
 *  3. beforeunload — browser/tab is hard-closed
 *
 * The effect key is `report?.report_id`, so when the user switches sites the
 * cleanup fires for the OLD site and the new effect starts fresh for the new one.
 */
export function useSiteTimeTracking(report: Report | null) {
  const startTimeRef = useRef<number>(Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    if (!report) return;

    // Reset state whenever the site changes
    startTimeRef.current = Date.now();
    firedRef.current = false;

    function fireEvent() {
      if (firedRef.current) return;
      firedRef.current = true;
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      // trackEvent dual-writes to both PostHog and Supabase
      trackEvent("site_time_spent", report!.report_id, {
        site_id: report!.site_id,
        site_name: [report!.site_name, report!.site_address].filter(Boolean).join(" — "),
        site_location: report!.site_location,
        duration_seconds: duration,
      });
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") fireEvent();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", fireEvent);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", fireEvent);
      fireEvent(); // Site switch or page unmount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.report_id]);
}
