"use client";

import { useEffect } from "react";

interface FreshchatUserApi {
  setEmail?: (email: string) => void;
  setFirstName?: (firstName: string) => void;
  setLastName?: (lastName: string) => void;
  setProperties?: (properties: Record<string, string>) => void;
}

interface FreshchatApi {
  destroy?: () => void;
  hide?: () => void;
  setExternalId?: (externalId: string) => void;
  user?: FreshchatUserApi;
  on?: (event: string, cb: () => void) => void;
}

declare global {
  interface Window {
    fcWidget?: FreshchatApi;
  }
}

const FRESHCHAT_SCRIPT_ID = "freshchat-widget-script";
const FRESHCHAT_SRC = "//in.fw-cdn.com/32728071/1543315.js";

interface FreshchatIdentity {
  externalId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

interface FreshchatWidgetProps {
  enabled: boolean;
  identity: FreshchatIdentity | null;
}

function applyIdentity(identity: FreshchatIdentity) {
  if (!window.fcWidget) return false;
  const displayName = [identity.firstName, identity.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  window.fcWidget.setExternalId?.(identity.externalId);
  window.fcWidget.user?.setEmail?.(identity.email);
  if (identity.firstName) {
    window.fcWidget.user?.setFirstName?.(identity.firstName);
  }
  if (identity.lastName) {
    window.fcWidget.user?.setLastName?.(identity.lastName);
  }
  window.fcWidget.user?.setProperties?.({
    externalId: identity.externalId,
    email: identity.email,
    firstName: identity.firstName ?? "",
    lastName: identity.lastName ?? "",
    displayName,
  });
  return true;
}

export function FreshchatWidget({ enabled, identity }: FreshchatWidgetProps) {
  useEffect(() => {
    if (!enabled) {
      if (window.fcWidget?.hide) {
        window.fcWidget.hide();
      }
      if (window.fcWidget?.destroy) {
        window.fcWidget.destroy();
      }
      const existing = document.getElementById(FRESHCHAT_SCRIPT_ID);
      if (existing) {
        existing.remove();
      }
      return;
    }

    const existing = document.getElementById(FRESHCHAT_SCRIPT_ID);
    if (existing) return;

    const script = document.createElement("script");
    script.id = FRESHCHAT_SCRIPT_ID;
    script.src = FRESHCHAT_SRC;
    script.async = true;
    script.setAttribute("chat", "true");
    document.head.appendChild(script);

    // ── Mobile: prevent fullscreen takeover ────────────────────────────────
    // Freshchat hard-codes a full-viewport layout for narrow screens by setting
    // inline styles via JavaScript. CSS overrides lose because Freshchat uses
    // setProperty with "important" internally. We win by hooking into the
    // widget:opened event and applying our own inline !important values.
    const BOTTOM_OFFSET = 76; // mobile bottom nav (56px) + gap (20px)

    function constrainMobilePanel() {
      if (window.innerWidth >= 1024) return;
      const frame = document.getElementById("fc_frame");
      if (!frame) return;
      const panelW = Math.min(Math.round(window.innerWidth * 0.92), 400);
      const constraints: [string, string][] = [
        ["top",           "auto"],
        ["left",          "auto"],
        ["right",         "16px"],
        ["bottom",        `${BOTTOM_OFFSET}px`],
        ["width",         `${panelW}px`],
        ["height",        "62vh"],
        ["max-height",    "62vh"],
        ["min-height",    "0"],
        ["border-radius", "12px"],
        ["overflow",      "hidden"],
      ];
      constraints.forEach(([prop, val]) => frame.style.setProperty(prop, val, "important"));
    }

    // Poll until fcWidget.on is available, then register the open handler
    const hookInterval = window.setInterval(() => {
      if (!window.fcWidget?.on) return;
      window.clearInterval(hookInterval);
      window.fcWidget.on("widget:opened", constrainMobilePanel);
    }, 300);

    // Safety: abandon poll after 15 s
    const hookTimeout = window.setTimeout(() => window.clearInterval(hookInterval), 15_000);

    return () => {
      window.clearInterval(hookInterval);
      window.clearTimeout(hookTimeout);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !identity) return;
    if (applyIdentity(identity)) return;

    const interval = window.setInterval(() => {
      if (applyIdentity(identity)) {
        window.clearInterval(interval);
      }
    }, 300);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
    }, 6000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [enabled, identity]);

  return null;
}
