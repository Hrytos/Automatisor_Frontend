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

function renderBody(body: string) {
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="space-y-2">
        {bulletBuffer.map((text, i) => (
          <li key={i} className="relative text-[15px] leading-[1.7] text-ink-mid">
            <span className="absolute left-[-1rem] top-[0.62em] w-[5px] h-[5px] rounded-full bg-orange/60 shrink-0" />
            {text}
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("• ")) {
      bulletBuffer.push(line.slice(2));
    } else {
      flushBullets();
      elements.push(
        <p key={key++} className="text-[15px] leading-[1.75] text-ink-mid">
          {line}
        </p>
      );
    }
  }
  flushBullets();
  return elements;
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
          {renderBody(section.body)}
        </div>
      </div>

      {/* Locked gradient overlay */}
      {isLocked && (
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/95 to-transparent rounded-b-lg pointer-events-none" />
      )}
    </div>
  );
}
