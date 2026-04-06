"use client";

import { posthog } from "@/lib/posthog";
import { getAuthSession } from "@/lib/auth";

interface EventBody {
  event_type: string;
  user_id?: string;
  email?: string;
  report_id?: string;
  site_id?: string;
  site_name?: string;
  properties: Record<string, unknown>;
}

function persistEvent(body: EventBody) {
  // Fire-and-forget — never blocks the UI
  const session = getAuthSession();
  const payload: EventBody = {
    ...body,
    user_id: body.user_id ?? session?.user_id,
    email:   body.email   ?? session?.email,
  };
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  }).catch(() => {}); // silently swallow network errors
}

export function trackEvent(
  eventType: string,
  slug: string,
  data: Record<string, unknown> = {}
) {
  posthog.capture(eventType, { report_id: slug, ...data });
  const { site_id, site_name, ...rest } = data;
  persistEvent({
    event_type: eventType,
    report_id: slug,
    site_id: typeof site_id === "string" ? site_id : undefined,
    site_name: typeof site_name === "string" ? site_name : undefined,
    properties: rest,
  });
}

export function trackPageView(slug: string) {
  posthog.capture("$pageview", { report_id: slug });
  persistEvent({ event_type: "page_view", report_id: slug, properties: {} });
}

export function trackSectionView(slug: string, sectionId: string) {
  posthog.capture("section_view", { report_id: slug, section_id: sectionId });
  persistEvent({ event_type: "section_view", report_id: slug, properties: { section_id: sectionId } });
}

export function trackScrollDepth(slug: string, depth: number) {
  posthog.capture("scroll_depth", { report_id: slug, depth_percent: depth });
  persistEvent({ event_type: "scroll_depth", report_id: slug, properties: { depth_percent: depth } });
}

export function trackUnlock(slug: string, email: string) {
  posthog.capture("report_unlocked", { report_id: slug, email });
  persistEvent({ event_type: "report_unlocked", report_id: slug, email, properties: {} });
}

