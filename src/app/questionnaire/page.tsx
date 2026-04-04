"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, CheckCircle2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SelectOption {
  label: string;
  value: string;
}

interface QuestionConfig {
  id: string;
  label: string;
  note?: string;
  type: "text" | "number" | "single" | "multi";
  required?: boolean;
  options?: SelectOption[];
  placeholder?: string;
}

interface SectionConfig {
  id: string;
  shortLabel: string;
  title: string;
  questions: QuestionConfig[];
}

type Answers = Record<string, string | string[]>;

// ── Questionnaire Data ─────────────────────────────────────────────────────────

const sections: SectionConfig[] = [
  {
    id: "about",
    shortLabel: "About",
    title: "About the Company & Site",
    questions: [
      {
        id: "company_name",
        label: "Name of the company",
        type: "text",
        required: true,
        placeholder: "e.g. Alleghany Warehouse Co.",
      },
      {
        id: "site_location",
        label: "Location of the site",
        type: "text",
        required: true,
        placeholder: "e.g. Covington, VA",
      },
      {
        id: "square_footage",
        label: "Square footage",
        type: "number",
        placeholder: "e.g. 320000",
      },
    ],
  },
  {
    id: "s01",
    shortLabel: "Physical Environment",
    title: "Section 01 — Physical Environment",
    questions: [
      {
        id: "aisle_width",
        label: "Q1 — What is the typical aisle width in the main internal transport zones?",
        type: "single",
        required: true,
        options: [
          { label: "Under 7 ft (very narrow aisle)", value: "under_7ft" },
          { label: "7 – 10 ft (narrow aisle)", value: "7_10ft" },
          { label: "10 – 15 ft (standard aisle)", value: "10_15ft" },
          { label: "15 – 20 ft (wide aisle)", value: "15_20ft" },
          { label: "Over 20 ft (very wide / open floor)", value: "over_20ft" },
        ],
      },
      {
        id: "floor_condition",
        label: "Q2 — How would you describe the floor surface condition?",
        note: "Confirm on site visit. Answer from desk research if available.",
        type: "single",
        options: [
          { label: "Excellent – smooth, level, recently resurfaced", value: "excellent" },
          { label: "Good – minor cracks or control joints, well maintained", value: "good" },
          { label: "Fair – uneven sections, surface damage present", value: "fair" },
          { label: "Poor – significant unevenness, heavy traffic damage", value: "poor" },
          { label: "Mixed – varies significantly by zone", value: "mixed" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "temp_exposure",
        label: "Q3 — Are cold or temperature-controlled zones present, and do transport operatives work in them?",
        type: "single",
        options: [
          { label: "No – ambient only", value: "ambient_only" },
          { label: "Cold zones present but transport is ambient-side only", value: "cold_present_ambient_transport" },
          { label: "Transport operatives regularly work in refrigerated zones (35–46°F)", value: "refrigerated_exposure" },
          { label: "Transport operatives regularly work in freezer zones (0°F or below)", value: "freezer_exposure" },
          { label: "Both refrigerated and freezer zones with sustained operative exposure", value: "both_cold_exposure" },
        ],
      },
    ],
  },
  {
    id: "s02",
    shortLabel: "Material Movement",
    title: "Section 02 — Material Movement",
    questions: [
      {
        id: "travel_distance",
        label: "Q4 — What is the typical one-way travel distance for the most frequent internal material moves?",
        type: "single",
        required: true,
        options: [
          { label: "Under 100 ft", value: "under_100ft" },
          { label: "100 – 250 ft", value: "100_250ft" },
          { label: "250 – 500 ft", value: "250_500ft" },
          { label: "500 – 1,000 ft", value: "500_1000ft" },
          { label: "Over 1,000 ft", value: "over_1000ft" },
        ],
      },
      {
        id: "load_format",
        label: "Q5 — What is the primary load format being moved internally?",
        type: "single",
        options: [
          { label: "Pallets (standard GMA / CHEP 48×40 in)", value: "pallets" },
          { label: "Roll cages or dollies", value: "roll_cages" },
          { label: "Totes / bins / KLT containers", value: "totes" },
          { label: "Large containers (IBCs, bulk)", value: "large_containers" },
          { label: "Mixed – multiple load formats in use", value: "mixed" },
        ],
      },
      {
        id: "load_weight",
        label: "Q6 — What is the average gross weight per load unit?",
        type: "single",
        options: [
          { label: "Under 220 lbs", value: "under_220lbs" },
          { label: "220 – 660 lbs", value: "220_660lbs" },
          { label: "660 – 1,300 lbs", value: "660_1300lbs" },
          { label: "1,300 – 2,200 lbs", value: "1300_2200lbs" },
          { label: "Over 2,200 lbs", value: "over_2200lbs" },
        ],
      },
    ],
  },
  {
    id: "s03",
    shortLabel: "Infrastructure",
    title: "Section 03 — Infrastructure & Constraints",
    questions: [
      {
        id: "wifi_state",
        label: "Q7 — What is the state of the warehouse WiFi / network infrastructure?",
        note: "Confirm on site visit. May be available from IT/facilities documentation.",
        type: "single",
        options: [
          { label: "Enterprise-grade WiFi 6 with full facility coverage", value: "wifi6_full" },
          { label: "Good coverage with some identified dead spots", value: "good_with_gaps" },
          { label: "Patchy – unreliable in multiple zones", value: "patchy" },
          { label: "Poor – limited or inconsistent coverage", value: "poor" },
          { label: "No WiFi infrastructure in place", value: "none" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "deployment_constraints",
        label: "Q8 — Are there any known physical constraints that would complicate tugger deployment?",
        type: "multi",
        options: [
          { label: "Narrow or irregular aisles in key transport zones", value: "narrow_aisles" },
          { label: "Floor surface conditions requiring remediation", value: "floor_remediation" },
          { label: "Restricted dock areas limiting approach or turning space", value: "restricted_docks" },
          { label: "Ramps, inclines, or multi-level transitions on transport routes", value: "ramps_inclines" },
          { label: "High-density pedestrian zones with no feasible segregation path", value: "pedestrian_conflict" },
          { label: "No significant physical constraints identified", value: "none" },
        ],
      },
    ],
  },
  {
    id: "s04",
    shortLabel: "Transport Operation",
    title: "Section 04 — Transport Operation",
    questions: [
      {
        id: "primary_mhe_type",
        label: "Q9 — What is the primary equipment used for internal material transport?",
        note: "Moving loads between zones, not picking or putaway.",
        type: "single",
        options: [
          { label: "Manual push – hand pallet jacks or carts (no powered equipment)", value: "manual_push" },
          { label: "Walkie / walkie-rider pallet jack", value: "walkie_rider" },
          { label: "Counterbalance forklift", value: "counterbalance_forklift" },
          { label: "Reach truck or narrow-aisle truck", value: "reach_truck" },
          { label: "Tugger trains or tow tractors (already in use)", value: "tugger_existing" },
          { label: "Mixed – multiple equipment types on different routes", value: "mixed" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "transport_ftes",
        label: "Q10 — How many FTEs are primarily dedicated to internal material transport at this site (across all shifts)?",
        note: "Count only operatives whose primary duty is internal material transport. Exclude pickers, packers, receivers, and supervisors.",
        type: "single",
        options: [
          { label: "Fewer than 3 FTEs", value: "under_3" },
          { label: "3 – 5 FTEs", value: "3_5" },
          { label: "6 – 10 FTEs", value: "6_10" },
          { label: "11 – 20 FTEs", value: "11_20" },
          { label: "More than 20 FTEs", value: "over_20" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "moves_per_shift",
        label: "Q11 — Approximately how many internal transport moves occur per shift at this site?",
        note: "One move = one round trip or one-way load transfer between zones. Use order count, truck count, or inbound pallet volume as a proxy if a direct figure is unavailable.",
        type: "single",
        options: [
          { label: "Fewer than 20 moves per shift", value: "under_20" },
          { label: "20 – 50 moves per shift", value: "20_50" },
          { label: "51 – 150 moves per shift", value: "51_150" },
          { label: "151 – 300 moves per shift", value: "151_300" },
          { label: "More than 300 moves per shift", value: "over_300" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "route_count",
        label: "Q12 — How many distinct recurring internal transport routes operate at this site?",
        note: "A route is a fixed repeated path between two zones. Count distinct paths, not the number of trips per path.",
        type: "single",
        options: [
          { label: "1 route (single fixed loop)", value: "1" },
          { label: "2 – 3 routes", value: "2_3" },
          { label: "4 – 6 routes", value: "4_6" },
          { label: "More than 6 routes", value: "over_6" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
    ],
  },
  {
    id: "s05",
    shortLabel: "Labour & Workforce",
    title: "Section 05 — Labour & Workforce",
    questions: [
      {
        id: "transport_overtime",
        label: "Q13 — Is there evidence of regular or persistent overtime in internal transport roles at this site?",
        note: "Persistent overtime in transport roles is a direct indicator that permanent headcount cannot cover demand.",
        type: "single",
        options: [
          { label: "No evidence of regular overtime", value: "none" },
          { label: "Occasional overtime during peak periods only", value: "seasonal" },
          { label: "Regular overtime most weeks (estimated >10% of hours)", value: "regular" },
          { label: "Heavy overtime sustained year-round (estimated >20% of hours)", value: "heavy" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "transport_attrition",
        label: "Q14 — How would you characterise attrition in transport roles at this site?",
        note: "Estimate from job posting frequency, worker review recency and volume patterns, or direct knowledge.",
        type: "single",
        options: [
          { label: "Low — roles appear stable, infrequent open postings", value: "low" },
          { label: "Moderate — some turnover, recurring postings for same roles", value: "moderate" },
          { label: "High — frequent postings, short tenure signals in reviews", value: "high" },
          { label: "Very high — near-constant open roles, strong churn signals", value: "very_high" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
    ],
  },
  {
    id: "s06",
    shortLabel: "Physical Infra",
    title: "Section 06 — Physical Infrastructure",
    questions: [
      {
        id: "ceiling_clearance",
        label: "Q15 — What is the minimum ceiling or structural clearance along the primary internal transport routes?",
        note: "Applies to minimum clearance along transport routes, not the highest point in the building.",
        type: "single",
        options: [
          { label: "Under 12 ft", value: "under_12ft" },
          { label: "12 – 16 ft", value: "12_16ft" },
          { label: "Over 16 ft", value: "over_16ft" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "doorway_width",
        label: "Q16 — What is the narrowest doorway or opening along the primary transport routes?",
        note: "Standard tugger trains with a loaded cart typically require 8–10 ft minimum passage width.",
        type: "single",
        options: [
          { label: "Under 8 ft", value: "under_8ft" },
          { label: "8 – 10 ft", value: "8_10ft" },
          { label: "Over 10 ft", value: "over_10ft" },
          { label: "No restricting doorways on routes", value: "unrestricted" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "site_layout",
        label: "Q17 — How is the warehouse operation physically structured?",
        note: "Multi-building sites with outdoor segments require weatherproofed vehicles or separate handoff points.",
        type: "single",
        options: [
          { label: "Single building – all transport is internal", value: "single_building" },
          { label: "Multiple connected buildings – transport is under cover throughout", value: "multi_connected" },
          { label: "Multiple separate buildings – transport crosses outdoor areas", value: "multi_separate" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "charging_feasibility",
        label: "Q18 — Is there available space and electrical capacity near the primary transport routes for charging stations?",
        note: "A typical 2-shift deployment needs 2–4 charging stations. Assess availability of electrical capacity and floor space near the main transport loop.",
        type: "single",
        options: [
          { label: "Yes – space and 240V electrical capacity confirmed or likely available", value: "feasible" },
          { label: "Partial – space available but electrical upgrade likely needed", value: "partial" },
          { label: "Unlikely – no clear space or electrical capacity near routes", value: "unlikely" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
    ],
  },
  {
    id: "s07",
    shortLabel: "Financial & Timing",
    title: "Section 07 — Financial & Timing",
    questions: [
      {
        id: "lease_remaining",
        label: "Q19 — How many years remain on this facility's lease or ownership commitment?",
        note: "A site with less than 2 years remaining on its lease rarely justifies a capital automation investment.",
        type: "single",
        options: [
          { label: "Less than 2 years", value: "under_2yr" },
          { label: "2 – 3 years", value: "2_3yr" },
          { label: "4 – 7 years", value: "4_7yr" },
          { label: "More than 7 years", value: "over_7yr" },
          { label: "Owned (no lease)", value: "owned" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "capex_cycle",
        label: "Q20 — When does this company typically finalise its annual capital expenditure budget?",
        type: "single",
        options: [
          { label: "Q1 (January – March)", value: "q1" },
          { label: "Q2 (April – June)", value: "q2" },
          { label: "Q3 (July – September)", value: "q3" },
          { label: "Q4 (October – December)", value: "q4" },
          { label: "Continuous / rolling budget process", value: "rolling" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "competitor_automation",
        label: "Q21 — Are direct competitors at similar facilities known to have deployed automated internal transport?",
        type: "single",
        options: [
          { label: "Yes – confirmed at direct competitors", value: "confirmed" },
          { label: "Likely – strong industry signals but not confirmed at direct competitors", value: "likely" },
          { label: "No – not known to have automated internal transport", value: "none" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "annual_transport_labour_cost",
        label: "Q22 — What is the estimated annual fully-loaded cost of the transport labour force at this site?",
        note: "Include wages, employer payroll taxes (~7.65%), and benefits (typically 20–30% of wages).",
        type: "single",
        options: [
          { label: "Under $200,000 per year", value: "under_200k" },
          { label: "$200,000 – $500,000 per year", value: "200_500k" },
          { label: "$500,000 – $1,000,000 per year", value: "500k_1m" },
          { label: "$1,000,000 – $2,000,000 per year", value: "1_2m" },
          { label: "Over $2,000,000 per year", value: "over_2m" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
      {
        id: "payback_expectation",
        label: "Q23 — What payback period would this operator typically require to approve an automation investment of this scale?",
        type: "single",
        options: [
          { label: "Under 12 months", value: "under_12m" },
          { label: "12 – 18 months", value: "12_18m" },
          { label: "18 – 36 months", value: "18_36m" },
          { label: "Over 36 months acceptable", value: "over_36m" },
          { label: "Unknown at this stage", value: "unknown" },
        ],
      },
    ],
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function QuestionnairePage() {
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);

  const section = sections[currentSection];
  const isFirst = currentSection === 0;
  const isLast = currentSection === sections.length - 1;

  const canProceed = section.questions
    .filter((q) => q.required)
    .every((q) => {
      const val = answers[q.id];
      return val !== undefined && val !== "";
    });

  function setSingle(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(id: string, value: string) {
    setAnswers((prev) => {
      const current = (prev[id] as string[] | undefined) ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [id]: next };
    });
  }

  function handleNext() {
    if (!isLast) {
      setCurrentSection((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      localStorage.setItem(
        "automatisor_questionnaire",
        JSON.stringify({ answers, submitted_at: Date.now() })
      );
      setSubmitted(true);
    }
  }

  function handleBack() {
    if (!isFirst) {
      setCurrentSection((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-teal-light flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-teal" />
            </div>
            <h1 className="font-serif text-3xl text-ink mb-3">
              Diagnostic Submitted
            </h1>
            <p className="text-sm text-ink-mid font-light leading-relaxed mb-6">
              Thank you for completing the diagnostic. Your operations summary
              report will be generated and delivered to you within 24 hours.
            </p>
            <Button render={<a href="/" />}>Return Home</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="flex-1 flex flex-col items-center px-4 py-10 md:py-16">
        <div className="w-full max-w-2xl">

          {/* ── Section tab navigation ── */}
          <div className="flex flex-wrap gap-1.5 mb-8">
            {sections.map((sec, idx) => (
              <button
                key={sec.id}
                onClick={() => {
                  setCurrentSection(idx);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer",
                  idx === currentSection
                    ? "bg-orange text-white border-orange"
                    : "bg-surface text-ink-soft border-ink/10 hover:border-orange/40 hover:text-ink"
                )}
              >
                {sec.shortLabel}
              </button>
            ))}
          </div>

          {/* ── Section header ── */}
          <div className="mb-8">
            <p className="text-xs text-ink-soft mb-1.5">
              Section {currentSection + 1} of {sections.length}
            </p>
            <h1 className="font-serif text-2xl text-ink">{section.title}</h1>
          </div>

          {/* ── Questions ── */}
          <div className="space-y-10">
            {section.questions.map((q) => (
              <div key={q.id}>
                <p className="text-sm font-medium text-ink mb-1 leading-snug">
                  {q.label}
                  {q.required && <span className="text-orange ml-0.5">*</span>}
                </p>
                {q.note && (
                  <p className="text-xs text-ink-soft italic mb-3 leading-relaxed">
                    {q.note}
                  </p>
                )}

                {/* Text / Number inputs */}
                {(q.type === "text" || q.type === "number") && (
                  <Input
                    type={q.type}
                    placeholder={q.placeholder}
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setSingle(q.id, e.target.value)}
                    className="bg-surface border-ink/10 max-w-sm"
                  />
                )}

                {/* Single-select option cards */}
                {q.type === "single" && (
                  <div className="space-y-2 mt-3">
                    {q.options!.map((opt) => {
                      const selected = answers[q.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setSingle(q.id, opt.value)}
                          className={cn(
                            "w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg border text-sm transition-all cursor-pointer",
                            selected
                              ? "border-orange bg-orange/5 text-ink"
                              : "border-ink/10 bg-surface text-ink hover:border-orange/30 hover:bg-orange/5"
                          )}
                        >
                          <span
                            className={cn(
                              "flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                              selected ? "border-orange bg-orange" : "border-ink/30"
                            )}
                          >
                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                          </span>
                          <span className={selected ? "font-medium" : ""}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Multi-select option cards */}
                {q.type === "multi" && (
                  <div className="space-y-2 mt-3">
                    {q.options!.map((opt) => {
                      const selected = ((answers[q.id] as string[]) ?? []).includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleMulti(q.id, opt.value)}
                          className={cn(
                            "w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg border text-sm transition-all cursor-pointer",
                            selected
                              ? "border-orange bg-orange/5 text-ink"
                              : "border-ink/10 bg-surface text-ink hover:border-orange/30 hover:bg-orange/5"
                          )}
                        >
                          <span
                            className={cn(
                              "flex-shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                              selected ? "border-orange bg-orange" : "border-ink/30"
                            )}
                          >
                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                          </span>
                          <span className={selected ? "font-medium" : ""}>{opt.label}</span>
                        </button>
                      );
                    })}
                    <p className="text-xs text-ink-soft mt-2">Select all that apply.</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Navigation ── */}
          <div className="flex justify-between mt-12 pt-8 border-t border-ink/5">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isFirst}
              className="gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="gap-1.5"
            >
              {isLast ? "Submit Diagnostic" : "Continue"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
