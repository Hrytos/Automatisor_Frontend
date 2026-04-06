"use client";

import { useState, useEffect, useRef } from "react";
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

  async function fetchReport() {
    setLoading(true);
    setNotFound(false);
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

      // Fire site list fetch in parallel immediately
      if (data.account_id) {
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
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ── Poll every 30s while regeneration is queued ─────────────────────────────
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (report?.regeneration_status === "queued") {
      pollRef.current = setInterval(() => {
        fetchReport();
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

  if (notFoundFlag || !report) {
    if (!loading) notFound();
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
          {/* ── Regeneration in-progress banner ── */}
          {report?.regeneration_status === "queued" && !loading && (
            <div className="flex items-center gap-2.5 px-5 py-3 bg-orange/8 border-b border-orange/20">
              <Loader2 className="w-3.5 h-3.5 text-orange animate-spin flex-shrink-0" />
              <p className="text-[13px] text-orange font-medium">
                Your report is being regenerated — this takes around 5 minutes. The page will update automatically.
              </p>
            </div>
          )}
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

