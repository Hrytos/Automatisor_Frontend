import type { Report } from "@/types/report";
import alleghanyData from "./alleghany.json";
import atlantaData from "./atlanta.json";

const alleghany = alleghanyData as Report;
const atlanta = atlantaData as Report;

// Slug is the first 8 characters of the site_id
function toSlug(siteId: string): string {
  return siteId.split("-")[0];
}

export const reports: Record<string, Report> = {
  [toSlug(alleghany.site_id)]: alleghany,
  [toSlug(atlanta.site_id)]: atlanta,
};

export function getReportBySlug(slug: string): Report | undefined {
  return reports[slug];
}

export function getAllSlugs(): string[] {
  return Object.keys(reports);
}
