"use client";

import { useEffect } from "react";
import { MapPin, Calendar } from "lucide-react";

import type { Report } from "@/types/report";
import { FREE_SECTION_IDS } from "@/types/report";
import { trackPageView } from "@/lib/tracking";

import { SectionCard } from "@/components/report/SectionCard";
import { UnlockOverlay } from "@/components/report/UnlockOverlay";
import { useScrollTracking } from "@/hooks/useScrollTracking";

interface ReportViewProps {
  report: Report;
  slug: string;
  siteSwitcher?: React.ReactNode;
  onUnlock?: () => void;
}

export function ReportView({ report, slug, siteSwitcher, onUnlock }: ReportViewProps) {
  useScrollTracking(slug);

  useEffect(() => {
    trackPageView(slug);
  }, [slug]);

  const freeSections = report.sections.filter((s) =>
    (FREE_SECTION_IDS as readonly string[]).includes(s.id)
  );
  const gatedSections = report.sections.filter(
    (s) => !(FREE_SECTION_IDS as readonly string[]).includes(s.id)
  );

  // Derive unlocked state from actual data — if the backend sent bodies, we're in.
  // This is the only reliable signal: sessionStorage can be stale (expired JWT),
  // but the backend never sends content unless the user was authenticated at fetch time.
  const unlocked = gatedSections.length === 0 || gatedSections.some((s) => s.body.trim().length > 0);

  const generatedDate = new Date(report.generated_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <>
        {/* Report header */}
        <div className="border-b border-ink/5 bg-white px-6 md:px-10 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-orange uppercase tracking-wider">
                  Operations Summary
                </span>
                <span className="text-ink-soft/30">•</span>
                <span className="text-xs text-ink-soft capitalize">
                  {report.solution.replace(/_/g, " ")}
                </span>
              </div>
              {siteSwitcher && <div>{siteSwitcher}</div>}
            </div>

            {/* Orientation — above company name */}
            <div className="mb-7 rounded-xl border-l-4 border-orange bg-orange-light px-5 py-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-ink mb-1">How to read this report?</p>
                <p className="text-sm text-ink-mid leading-relaxed">
                  This report summarises operations and challenges at your facility using factual,
                  real-world data and categorises it across 5 key dimensions — Operational Profile,
                  Operational Performance, Labor &amp; Workforce, Safety &amp; Compliance, Technology
                  &amp; Infrastructure. Each dimension includes a brief snapshot of observations and
                  identifies the top 3 risks.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink mb-1">What&apos;s next?</p>
                <p className="text-sm text-ink-mid leading-relaxed">
                  You can further customise this report to your facility by editing answers and by
                  answering more questions under the Questionnaire section on the sidebar. Once you
                  have made all the changes you want, you can regenerate the report to view the
                  updated summary. You can regenerate the report as many times as you need to. Want
                  to understand this further and see recommendations?{" "}
                  <span className="text-orange font-semibold cursor-pointer hover:underline">
                    Chat with us.
                  </span>
                </p>
              </div>
            </div>

            <h1 className="font-serif text-3xl md:text-4xl text-ink leading-tight mb-3">
              {report.site_name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-ink-mid">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-ink-soft" />
                {report.site_address || report.site_location}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-ink-soft" />
                {generatedDate}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-10 py-8 max-w-5xl mx-auto">
          {/* Free sections */}
          <div className="space-y-4">
            {freeSections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                slug={slug}
                isLocked={false}
              />
            ))}
          </div>

          {/* Gated sections */}
          {!unlocked ? (
            <>
              {/* Show first gated section as locked preview */}
              {gatedSections.length > 0 && (
                <div className="mt-4 space-y-4">
                  <SectionCard
                    section={gatedSections[0]}
                    slug={slug}
                    isLocked={true}
                  />
                </div>
              )}

              <UnlockOverlay
                slug={slug}
                onUnlock={() => onUnlock?.()}
              />

              {/* Remaining locked sections — just titles */}
              {gatedSections.slice(1).map((section) => (
                <div
                  key={section.id}
                  className="mt-4 bg-surface/50 border border-ink/5 rounded-lg p-6 opacity-40"
                >
                  <h3 className="font-serif text-lg text-ink">
                    {section.heading}
                  </h3>
                  <p className="text-sm text-ink-soft mt-1">
                    {section.subheading}
                  </p>
                </div>
              ))}
            </>
          ) : (
            <div className="mt-4 space-y-4">
              {gatedSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  slug={slug}
                  isLocked={false}
                />
              ))}
            </div>
          )}

        </div>
      </>
  );
}
