export interface ReportSection {
  id: string;
  heading: string;
  subheading: string;
  body: string;
}

export interface SitedataFlag {
  field: string;
  source: string;
  value: string | number | null;
  note: string;
}

export interface Report {
  report_id: string;
  report_type: string;
  solution: string;
  account_id?: string;
  site_id: string;
  site_name: string;
  site_location: string;
  site_address?: string;
  generated_at: string;
  ofi_score: number;
  ofi_tier: "LOW" | "MEDIUM" | "HIGH";
  ofi_tier_label: string;
  score_confidence: string;
  caveat: string;
  sections: ReportSection[];
  // Fields present in static sample JSON but not returned by the live API
  sections_llm_generated?: string[];
  sections_fallback?: string[];
  hard_blockers?: string[];
  unknown_flags?: string[];
  sitedata_flags?: SitedataFlag[];
  risk_flags?: string[];
  opportunity_flags?: string[];
  evidence_quality_flags?: string[];
  regeneration_status?: string | null;
}

export const FREE_SECTION_IDS = ["operational_profile"] as const;

export const SECTION_ICONS: Record<string, string> = {
  operational_profile: "Building2",
  ops_performance: "Activity",
  labour_analysis: "Users",
  safety_compliance: "ShieldCheck",
  technology_infrastructure: "Cpu",
  financial_signals: "DollarSign",
};
