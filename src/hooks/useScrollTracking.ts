"use client";

import { useEffect, useRef } from "react";
import { trackScrollDepth } from "@/lib/tracking";

export function useScrollTracking(slug: string) {
  const trackedDepths = useRef(new Set<number>());

  useEffect(() => {
    const thresholds = [25, 50, 75, 100];

    function handleScroll() {
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const depth = Math.round((window.scrollY / scrollHeight) * 100);

      for (const t of thresholds) {
        if (depth >= t && !trackedDepths.current.has(t)) {
          trackedDepths.current.add(t);
          trackScrollDepth(slug, t);
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [slug]);
}
