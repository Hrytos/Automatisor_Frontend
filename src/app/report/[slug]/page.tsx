"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/report/ReportView";
import { Navbar } from "@/components/layout/Navbar";
import { ReportSidebar } from "@/components/report/ReportSidebar";
import { getAuthSession, isAdmin, clearAuthSession } from "@/lib/auth";
import { FREE_SECTION_IDS } from "@/types/report";
import type { Report } from "@/types/report";
import { posthog } from "@/lib/posthog";
import { useSiteTimeTracking } from "@/hooks/useSiteTimeTracking";

interface SiteSwitcherItem {
  report_id: string;
  site_id: string;
  site_name: string;
  site_address: string;
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const accountParam = searchParams.get("account");

  const [report, setReport]         = useState<Report | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFoundFlag, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const [siteList, setSiteList]           = useState<SiteSwitcherItem[]>([]);
  const [switcherOpen, setSwitcherOpen]   = useState(false);
  const [adminUser, setAdminUser]         = useState(false);

  // Track time spent on each site — fires automatically on site switch or page leave
  useSiteTimeTracking(report);

  useEffect(() => {
    setAdminUser(isAdmin());
    function onAuthChange() { setAdminUser(isAdmin()); }
    window.addEventListener("automatisor:authchange", onAuthChange);
    return () => window.removeEventListener("automatisor:authchange", onAuthChange);
  }, []);

  const fetchReport = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setNotFound(false);
    setFetchError(false);
    const session = getAuthSession();

    try {
      const res = await fetch(
        `/api/reports/${slug}`,
        { credentials: "include" }
      );
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error(`Failed to load report (${res.status})`);
      const data: Report = await res.json();

      // If we have a session but got back locked sections, the cookie has expired.
      // Clear local metadata so the UI is honest.
      if (session) {
        const gated = data.sections.filter(
          (s) => !(FREE_SECTION_IDS as readonly string[]).includes(s.id)
        );
        const gotContent =
          gated.length === 0 || gated.some((s) => s.body.trim().length > 0);
        if (!gotContent) {
          clearAuthSession();
          window.location.reload();
          return;
        }
      }

      setReport(data);

      // Only show site switcher for authenticated (logged-in) users
      if (data.account_id && session) {
        fetch(
          `/api/reports/by-account/${data.account_id}`,
          { credentials: "include" }
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((list: SiteSwitcherItem[] | null) => {
            if (list) setSiteList(list);
          })
          .catch(() => {});
      }
    } catch {
      if (!background) setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ── Poll every 30s while regeneration is queued ─────────────────────────────
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (report?.regeneration_status === "queued") {
      pollRef.current = setInterval(() => {
        fetchReport(true);
      }, 30_000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.regeneration_status]);

  // ── Broadcast regen status so the Navbar notification bell can react ─────────
  useEffect(() => {    // Guard: report is null until the first fetch completes. Firing with a null
    // status before data arrives causes the Navbar to mis-read a queued-→-done
    // transition and create a spurious “Report ready” notification.
    if (!report) return;    const status = report?.regeneration_status ?? null;
    const siteName = report?.site_name ?? "";
    window.dispatchEvent(
      new CustomEvent("automatisor:regen-status", { detail: { status, report_id: slug, site_name: siteName } })
    );
    try {
      if (status === "queued") {
        sessionStorage.setItem("regen_pending", JSON.stringify({ report_id: slug, site_name: siteName }));
      } else {
        sessionStorage.removeItem("regen_pending");
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.regeneration_status]);

  if (notFoundFlag) {
    if (!loading) notFound();
  }

  // Network / server error on initial load — show a user-friendly message
  if (fetchError && !loading && !report) {
    return (
      <div className="flex flex-col h-screen">
        <Navbar />
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <p className="text-sm text-ink-mid mb-4">
              Something went wrong loading this report. Please check your connection and try again.
            </p>
            <button
              onClick={() => fetchReport()}
              className="text-sm font-medium text-orange hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const siteSwitcher = siteList.length > 1 ? (
    <div className="relative">
      <button
        onClick={() => {
          const opening = !switcherOpen;
          setSwitcherOpen(opening);
          if (opening) {
            posthog.capture("site_switcher_opened", {
              report_id: slug,
              site_name: report?.site_name,
              available_sites: siteList.length,
            });
          }
        }}
        className="flex items-center gap-1.5 text-sm text-ink-mid hover:text-ink border border-ink/10 rounded-lg px-3 py-1.5 bg-surface hover:bg-white transition-colors"
      >
        Switch site
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
      </button>
      {switcherOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-ink/10 rounded-xl shadow-lg py-1 min-w-56 max-h-72 overflow-y-auto">
          {siteList.map((s) => (
            <button
              key={s.report_id}
              onClick={() => {
                setSwitcherOpen(false);
                if (s.report_id !== slug) {
                  posthog.capture("site_switched", {
                    from_report_id: slug,
                    from_site_name: report?.site_name,
                    to_report_id: s.report_id,
                    to_site_name: s.site_name,
                  });
                }
                const dest = accountParam
                  ? `/report/${s.report_id}?account=${accountParam}`
                  : `/report/${s.report_id}`;
                router.push(dest);
              }}
              className={`w-full text-left px-4 py-2.5 hover:bg-surface transition-colors ${
                s.report_id === slug ? "bg-orange/5 text-orange font-medium" : "text-ink"
              }`}
            >
              <p className="text-sm truncate">{s.site_name}</p>
              {s.site_address && (
                <p className="text-xs text-ink-soft truncate mt-0.5">{s.site_address}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <ReportSidebar
          slug={slug}
          isAdmin={adminUser}
        />
        <main className="flex-1 overflow-y-auto relative">
          {report?.regeneration_status === "error" && !loading && (
            <div className="flex items-center gap-2.5 px-5 py-3 bg-red-50 border-b border-red-200">
              <p className="text-[13px] text-red-700 font-medium">
                Regeneration failed. Please try again from the questionnaire.
              </p>
            </div>
          )}
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="w-6 h-6 text-ink-soft animate-spin" />
            </div>
          ) : report?.regeneration_status === "queued" ? (
            /* ── Full-screen regeneration animation ── */
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-10 overflow-hidden"
              style={{ background: "linear-gradient(160deg, var(--color-surface) 0%, #fff 60%, color-mix(in srgb, var(--color-orange) 6%, white) 100%)" }}
            >
              {/* Orbiting rings — explicit w-48 h-48 so nothing bleeds outside */}
              <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center">
                {/* Outer ring */}
                <div
                  className="absolute inset-0 rounded-full border-2 border-orange/15"
                  style={{ animation: "spin 8s linear infinite" }}
                />
                {/* Middle ring */}
                <div
                  className="absolute w-36 h-36 rounded-full border-2 border-orange/25"
                  style={{ animation: "spin 5s linear infinite reverse" }}
                />
                {/* Inner ring */}
                <div
                  className="absolute w-24 h-24 rounded-full border-2 border-orange/40"
                  style={{ animation: "spin 3s linear infinite" }}
                />
                {/* Orbit dot — outer (contained inside w-48 h-48) */}
                <div className="absolute inset-0" style={{ animation: "spin 8s linear infinite" }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-orange/50" />
                </div>
                {/* Orbit dot — middle */}
                <div className="absolute w-36 h-36" style={{ animation: "spin 5s linear infinite reverse" }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange/70" />
                </div>
                {/* Center pulsing circle */}
                <div
                  className="w-16 h-16 rounded-full bg-orange/10 flex items-center justify-center"
                  style={{ animation: "pulse 2s ease-in-out infinite" }}
                >
                  <div
                    className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center"
                    style={{ animation: "pulse 2s ease-in-out infinite 0.3s" }}
                  >
                    <Loader2 className="w-5 h-5 text-orange animate-spin" />
                  </div>
                </div>
              </div>

              {/* Text block */}
              <div className="text-center flex flex-col items-center gap-3 px-6">
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-ink)" }}>
                  Regenerating your report
                </h2>
                {report?.site_name && (
                  <p className="text-base font-medium" style={{ color: "color-mix(in srgb, var(--color-ink) 55%, transparent)" }}>
                    {[report.site_name, report.site_address].filter(Boolean).join(" — ")}
                  </p>
                )}
                <p className="text-sm mt-1" style={{ color: "color-mix(in srgb, var(--color-ink) 40%, transparent)" }}>
                  This takes about 5 minutes. The page will refresh automatically when ready.
                </p>
              </div>

              {/* Progress track */}
              <div
                className="w-64 h-1 rounded-full overflow-hidden"
                style={{ background: "color-mix(in srgb, var(--color-orange) 12%, transparent)" }}
              >
                <div
                  className="h-full w-2/5 rounded-full"
                  style={{ background: "var(--color-orange)", animation: "regenProgress 1.8s ease-in-out infinite" }}
                />
              </div>

              {/* Pulsing dots — opacity+scale only, no bounce, no layout shift */}
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: "var(--color-orange)",
                      animation: "regenDot 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <ReportView
              report={report!}
              slug={slug}
              onUnlock={fetchReport}
              siteSwitcher={siteSwitcher}
            />
          )}
        </main>
      </div>
    </div>
  );
}

