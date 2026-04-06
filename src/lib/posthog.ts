import posthog from "posthog-js";

let initialised = false;

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (initialised) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    ui_host: "https://us.posthog.com",
    capture_pageview: false,  // We fire page views manually
    capture_pageleave: false, // We handle site-time tracking manually
    autocapture: true,        // Captures button clicks, form interactions, etc.
    persistence: "localStorage",
  });

  initialised = true;
}

export { posthog };
