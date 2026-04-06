"use client";

import { useEffect, useRef } from "react";
import {
  Building2,
  Activity,
  Users,
  ShieldCheck,
  Cpu,
  DollarSign,
} from "lucide-react";

import type { ReportSection } from "@/types/report";
import { trackSectionView } from "@/lib/tracking";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  operational_profile: Building2,
  ops_performance: Activity,
  labour_analysis: Users,
  safety_compliance: ShieldCheck,
  technology_infrastructure: Cpu,
  financial_signals: DollarSign,
};

interface SectionCardProps {
  section: ReportSection;
  slug: string;
  isLocked: boolean;
}

function parseBody(body: string): { paragraphs: string[]; bullets: string[] } {
  const lines = body.split("\n");
  const paragraphs: string[] = [];
  const bullets: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("- ") || line.startsWith("• ")) {
      bullets.push(line.slice(2));
    } else {
      paragraphs.push(line);
    }
  }

  return { paragraphs, bullets };
}

export function SectionCard({ section, slug, isLocked }: SectionCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const Icon = ICONS[section.id] ?? Building2;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackSectionView(slug, section.id);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [slug, section.id]);

  return (
    <div ref={ref} id={`section-${section.id}`} className="relative">
      <div
        className={`bg-surface border border-ink/5 rounded-lg p-6 md:p-8 ${
          isLocked ? "select-none" : ""
        }`}
      >
        {/* Section header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-white border border-ink/5 flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-ink-mid" />
          </div>
          <div>
            <h3 className="font-serif text-xl text-ink leading-snug">
              {section.heading}
            </h3>
            <p className="text-sm text-ink-soft mt-0.5">{section.subheading}</p>
          </div>
        </div>

        {/* Body */}
        <div
          className={`pl-12 space-y-4 ${isLocked ? "max-h-[120px] overflow-hidden" : ""}`}
        >
          {(() => {
            const { paragraphs, bullets } = parseBody(section.body);
            const topThree = bullets.slice(0, 3);
            return (
              <>
                {paragraphs.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[12px] font-semibold uppercase tracking-widest text-ink-soft">
                      Snapshot
                    </p>
                    {paragraphs.map((text, i) => (
                      <p key={i} className="text-[15px] leading-[1.75] text-ink-mid">
                        {text}
                      </p>
                    ))}
                  </div>
                )}

                {topThree.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[12px] font-semibold uppercase tracking-widest text-ink-soft">
                      Top 3 Risks
                    </p>
                    <ul className="space-y-2">
                      {topThree.map((text, i) => (
                        <li key={i} className="relative pl-4 text-[15px] leading-[1.7] text-ink-mid">
                          <span className="absolute left-0 top-[0.62em] w-[5px] h-[5px] rounded-full bg-orange/60 shrink-0" />
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Locked gradient overlay */}
      {isLocked && (
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/95 to-transparent rounded-b-lg pointer-events-none" />
      )}
    </div>
  );
}
