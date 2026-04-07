"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, LogOut, ChevronDown, Bell, CheckCircle2, XCircle, X } from "lucide-react";
import { getAuthSession, clearAuthSession, type AuthSession } from "@/lib/auth";
import { FreshchatWidget } from "@/components/FreshchatWidget";

export function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mounted, setMounted] = useState(false);

  // Dropdown state (logged-in avatar menu)
  const [open, setOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notification log
  type NotifType = "regen_started" | "regen_done" | "regen_error";
  interface Notif { id: string; type: NotifType; report_id: string; site_name: string; ts: number; read: boolean; }
  // Lazy-initialize directly from sessionStorage so the stored history is
  // available on the very first render — avoids the effect-ordering race
  // where the persist effect would overwrite storage with [] before the
  // load effect could restore it.
  const [notifications, setNotifications] = useState<Notif[]>(() => {
    try {
      const stored = sessionStorage.getItem("automatisor_notifications");
      if (stored) return JSON.parse(stored) as Notif[];
    } catch { /* ignore */ }
    return [];
  });
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  // Pre-seed from sessionStorage so navigating between pages doesn't lose
  // the previously-seen regen status and cause duplicate notifications.
  const prevRegenByReport = useRef<Record<string, string | null>>((() => {
    try {
      const s = sessionStorage.getItem("automatisor_regen_prev");
      if (s) return JSON.parse(s) as Record<string, string | null>;
    } catch { /* ignore */ }
    return {};
  })());
  // Helper used inside the event listener to keep the ref + storage in sync
  function setRegenPrev(report_id: string, status: string | null) {
    prevRegenByReport.current[report_id] = status;
    try {
      sessionStorage.setItem("automatisor_regen_prev", JSON.stringify(prevRegenByReport.current));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    setMounted(true);
    setSession(getAuthSession());

    // Re-read auth state whenever any component calls setAuthSession/clearAuthSession.
    // Needed because Next.js App Router reuses the layout (and this Navbar) across
    // navigations — the component never re-mounts, so we rely on this event instead.
    function onAuthChange() {
      setSession(getAuthSession());
    }
    window.addEventListener("automatisor:authchange", onAuthChange);
    return () => window.removeEventListener("automatisor:authchange", onAuthChange);
  }, []);

  // Persist notifications to sessionStorage whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem("automatisor_notifications", JSON.stringify(notifications));
    } catch { /* ignore */ }
  }, [notifications]);

  // Listen for regen status changes and push notification log entries
  useEffect(() => {
    function pushNotif(type: "regen_started" | "regen_done" | "regen_error", report_id: string, site_name: string) {
      const notif = { id: `${type}-${report_id}-${Date.now()}`, type, report_id, site_name, ts: Date.now(), read: false };
      setNotifications((prev) => [notif, ...prev]);
    }

    function onRegenStatus(e: Event) {
      const { status, report_id, site_name } = (e as CustomEvent).detail;
      const prev = prevRegenByReport.current[report_id] ?? null;

      if (status === "queued" && prev !== "queued") {
        pushNotif("regen_started", report_id, site_name);
      } else if (status === null && prev === "queued") {
        pushNotif("regen_done", report_id, site_name);
        setBellOpen(true);
      } else if (status === "error" && prev === "queued") {
        pushNotif("regen_error", report_id, site_name);
      }
      setRegenPrev(report_id, status);
    }
    window.addEventListener("automatisor:regen-status", onRegenStatus);
    return () => window.removeEventListener("automatisor:regen-status", onRegenStatus);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    // Clear the HttpOnly cookie server-side, then clear local metadata
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    clearAuthSession();
    setSession(null);
    setOpen(false);
    window.location.href = "/login";
  }

  const initials = session?.email
    ? session.email.slice(0, 2).toUpperCase()
    : null;
  const isProtectedRoute =
    pathname === "/reports" ||
    pathname === "/report/create" ||
    pathname?.startsWith("/report/") ||
    pathname?.startsWith("/questionnaire/");
  const enableFreshchat = mounted && Boolean(session) && Boolean(isProtectedRoute);
  const freshchatIdentity = session
    ? {
        externalId: session.user_id,
        email: session.email,
        firstName: session.first_name ?? null,
        lastName: session.last_name ?? null,
      }
    : null;

  return (
    <>
      <FreshchatWidget enabled={enableFreshchat} identity={freshchatIdentity} />
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-ink/10 bg-white px-6 py-4 md:px-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <span className="font-serif text-xl text-ink tracking-tight">
          Automati<span className="text-orange">SOR</span>
        </span>
        <span className="hidden sm:inline text-xs text-ink-soft font-light border-l border-ink/10 pl-2 ml-1">
          by Hrytos
        </span>
      </Link>

      {/* Right side */}
      {mounted && (
        <div className="flex items-center gap-2">
          {/* Bell notification — always visible when signed in */}
          {session && (() => {
            const unread = notifications.filter((n) => !n.read).length;
            function relTime(ts: number) {
              const s = Math.floor((Date.now() - ts) / 1000);
              if (s < 60) return "just now";
              if (s < 3600) return `${Math.floor(s / 60)}m ago`;
              return `${Math.floor(s / 3600)}h ago`;
            }
            return (
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => {
                    const opening = !bellOpen;
                    setBellOpen(opening);
                    if (opening) {
                      // mark all read when opening
                      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                    }
                  }}
                  className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4 text-ink-mid" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-orange text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-ink/10 rounded-xl shadow-lg overflow-hidden z-50">
                    {/* Header */}
                    <div className="px-4 py-2.5 border-b border-ink/5 flex items-center justify-between">
                      <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Notifications</p>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => setNotifications([])}
                          className="text-[11px] text-ink-soft hover:text-red-500 transition-colors"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Log */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-ink/5">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <Bell className="w-6 h-6 text-ink/15 mx-auto mb-2" />
                          <p className="text-xs text-ink-soft">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="px-4 py-3 flex items-start gap-3 hover:bg-surface/60 transition-colors">
                            {/* Icon */}
                            <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                              n.type === "regen_started" ? "bg-orange/10" :
                              n.type === "regen_done"    ? "bg-teal/10" : "bg-red-50"
                            }`}>
                              {n.type === "regen_started" && <Loader2 className="w-3.5 h-3.5 text-orange animate-spin" />}
                              {n.type === "regen_done"    && <CheckCircle2 className="w-3.5 h-3.5 text-teal" />}
                              {n.type === "regen_error"   && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-ink">
                                {n.type === "regen_started" ? "Regeneration started" :
                                 n.type === "regen_done"    ? "Report ready" : "Regeneration failed"}
                              </p>
                              <p className="text-xs text-ink-soft mt-0.5 leading-relaxed truncate">
                                {n.site_name || "Your report"}
                              </p>
                              <p className="text-[11px] text-ink/30 mt-0.5">{relTime(n.ts)}</p>
                              {n.type === "regen_done" && (
                                <a
                                  href={`/report/${n.report_id}`}
                                  onClick={() => setBellOpen(false)}
                                  className="mt-1.5 inline-block text-xs font-medium text-orange hover:underline"
                                >
                                  View report →
                                </a>
                              )}
                            </div>

                            {/* Dismiss */}
                            <button
                              onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
                              className="flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded hover:bg-ink/5 text-ink/25 hover:text-ink/50 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Auth area */}
          <div className="relative" ref={dropdownRef}>
          {session ? (
            /* Logged-in avatar button */
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 bg-surface hover:bg-ink/5 transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-orange/15 text-orange text-xs font-semibold flex items-center justify-center">
                {initials}
              </span>
              <ChevronDown className={`w-3 h-3 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          ) : (
            /* Sign in — navigate to dedicated login page */
            <Link
              href="/login"
              className="text-sm font-medium text-ink-mid hover:text-ink border border-ink/10 rounded-lg px-3.5 py-1.5 bg-surface hover:bg-white transition-colors"
            >
              Sign in
            </Link>
          )}

          {/* Dropdown panel — only for logged-in users */}
          {open && session && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-ink/10 rounded-xl shadow-lg overflow-hidden">
              <div>
                <div className="px-4 py-3 border-b border-ink/5">
                  <p className="text-xs text-ink-soft mb-0.5">Signed in as</p>
                  <p className="text-sm font-medium text-ink truncate">{session.email}</p>
                  {session.is_admin && (
                    <span className="inline-block mt-1 text-[10px] font-medium bg-orange/10 text-orange px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-ink-mid hover:text-ink hover:bg-surface transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      )}
      </nav>
    </>
  );
}
