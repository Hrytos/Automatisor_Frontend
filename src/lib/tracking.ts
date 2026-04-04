"use client";

const VISITOR_KEY = "automatisor_visitor_id";
const EVENTS_KEY = "automatisor_events";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

interface TrackingEvent {
  visitor_id: string;
  event_type: string;
  slug: string;
  event_data: Record<string, unknown>;
  timestamp: number;
}

function pushEvent(event: TrackingEvent) {
  const raw = localStorage.getItem(EVENTS_KEY);
  const events: TrackingEvent[] = raw ? JSON.parse(raw) : [];
  events.push(event);
  // Keep last 500 events
  if (events.length > 500) events.splice(0, events.length - 500);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function trackEvent(
  eventType: string,
  slug: string,
  data: Record<string, unknown> = {}
) {
  const event: TrackingEvent = {
    visitor_id: getVisitorId(),
    event_type: eventType,
    slug,
    event_data: data,
    timestamp: Date.now(),
  };
  pushEvent(event);
}

export function trackPageView(slug: string) {
  trackEvent("page_view", slug);
}

export function trackSectionView(slug: string, sectionId: string) {
  trackEvent("section_view", slug, { section_id: sectionId });
}

export function trackScrollDepth(slug: string, depth: number) {
  trackEvent("scroll_depth", slug, { depth_percent: depth });
}

export function trackUnlock(slug: string, email: string) {
  trackEvent("unlock", slug, { email });
}
