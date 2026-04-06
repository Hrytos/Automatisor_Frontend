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
