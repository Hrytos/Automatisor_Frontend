"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { getAuthSession } from "@/lib/auth";
import { posthog } from "@/lib/posthog";

interface ReportSummary {
  report_id: string;
  site_name: string;
  site_location: string;
  ofi_score: number;
  ofi_tier: string;
  ofi_tier_label: string;
  generated_at: string;
}

export default function MyReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
    loadReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadReports() {
    try {
      const res = await fetch("/api/reports", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.replace("/login");
          return;
        }
        throw new Error(`Failed to load reports (${res.status})`);
      }
      const data: ReportSummary[] = await res.json();
      if (data.length === 1) {
        // Single report — go straight to it
        router.replace(`/report/${data[0].report_id}`);
        return;
      }
      setReports(data);
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }

  if (!authChecked) return null;

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Navbar />
      <main className="flex-1 px-6 md:px-12 py-10 max-w-3xl mx-auto w-full">
        <h1 className="font-serif text-2xl text-ink mb-1">My Reports</h1>
        <p className="text-sm text-ink-soft font-light mb-8">
          Select a site to view its operations report.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-ink-soft" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-ink-soft">No reports found for your account.</p>
            <p className="text-xs text-ink-soft/70 mt-1">
              Contact the Hrytos team to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <button
                key={r.report_id}
                onClick={() => {
                  posthog.capture("report_card_clicked", {
                    report_id: r.report_id,
                    site_name: r.site_name,
                    site_location: r.site_location,
                  });
                  router.push(`/report/${r.report_id}`);
                }}
                className="w-full text-left bg-white border border-ink/10 rounded-xl px-5 py-4 hover:border-orange/40 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink text-sm truncate">{r.site_name}</p>
                    {r.site_location && (
                      <p className="text-xs text-ink-soft flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {r.site_location}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-ink-soft">{r.ofi_tier_label}</p>
                      <p className="text-lg font-semibold text-orange leading-tight">
                        {r.ofi_score}
                        <span className="text-xs text-ink-soft font-normal">/100</span>
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-ink-soft group-hover:text-orange transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
