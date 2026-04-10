"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  ClipboardList,
  Lightbulb,
  List,
  FilePlus,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: (slug: string) => string;
  enabled: boolean;
  badge?: string;
  adminOnly: boolean;
};

interface ReportSidebarProps {
  slug?: string;
  isAdmin?: boolean;
}

const tabs: Tab[] = [
  {
    id: "report",
    label: "Report",
    icon: FileText,
    href: (slug: string) => `/report/${slug}`,
    enabled: true,
    adminOnly: false,
  },
  {
    id: "questionnaire",
    label: "Questionnaire",
    icon: ClipboardList,
    href: (slug: string) => `/questionnaire/${slug}`,
    enabled: true,
    adminOnly: false,
  },
  {
    id: "recommendations",
    label: "Recommendations",
    icon: Lightbulb,
    href: () => "#",
    enabled: false,
    badge: "Coming Soon",
    adminOnly: false,
  },
  {
    id: "shortlists",
    label: "Shortlists",
    icon: List,
    href: () => "#",
    enabled: false,
    badge: "Coming Soon",
    adminOnly: false,
  },
  {
    id: "create-report",
    label: "Create Report",
    icon: FilePlus,
    href: () => "/report/create",
    enabled: true,
    badge: "Admin",
    adminOnly: true,
  },
];

export function ReportSidebar({ slug = "", isAdmin = false }: ReportSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  // ── Shared active-tab helper ────────────────────────────────────────────────
  function isActive(tab: Tab) {
    if (!mounted) return false;
    return tab.id === "report"
      ? pathname === `/report/${slug}`
      : pathname === tab.href(slug);
  }

  // ── Mobile bottom navigation bar ───────────────────────────────────────────
  // Always rendered; only visible below lg breakpoint.
  const mobileNav = (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white border-t border-ink/10 flex safe-area-bottom">
      {visibleTabs.map((tab) => {
        const needsSlug = tab.id === "report" || tab.id === "questionnaire";
        const isDisabledNoSlug = needsSlug && !slug;
        const disabled = !tab.enabled || isDisabledNoSlug;
        const active = isActive(tab);

        const inner = (
          <>
            <tab.icon
              className={`w-5 h-5 ${
                active ? "text-orange" : disabled ? "text-ink/20" : "text-ink-soft"
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 leading-none ${
                active ? "text-orange font-semibold" : disabled ? "text-ink/20" : "text-ink-soft"
              }`}
            >
              {tab.label}
            </span>
            {tab.badge && !disabled && (
              <span className={`text-[8px] px-1 rounded font-medium leading-none ${
                tab.adminOnly ? "text-orange/60" : "text-ink-soft/60"
              }`}>
                {tab.badge}
              </span>
            )}
          </>
        );

        if (disabled) {
          return (
            <div
              key={tab.id}
              className="flex flex-1 flex-col items-center justify-center py-2.5 gap-0.5 cursor-not-allowed"
            >
              {inner}
            </div>
          );
        }

        return (
          <Link
            key={tab.id}
            href={tab.href(slug)}
            className={`flex flex-1 flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
              active ? "bg-orange/5" : "hover:bg-surface active:bg-surface"
            }`}
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );

  // ── Collapsed strip (desktop only) ─────────────────────────────────────────
  if (!open) {
    return (
      <>
        <aside className="hidden lg:flex flex-col items-center w-12 border-r border-ink/10 bg-white shrink-0 h-full pt-5">
          <button
            onClick={() => setOpen(true)}
            className="w-8 h-8 rounded-md flex items-center justify-center text-ink-soft hover:text-ink hover:bg-surface transition-colors"
            aria-label="Open sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </aside>
        {mobileNav}
      </>
    );
  }

  // ── Expanded sidebar (desktop only) ────────────────────────────────────────
  return (
    <>
      <aside className="hidden lg:flex flex-col w-56 border-r border-ink/10 bg-white shrink-0 h-full overflow-y-auto">
        <div className="px-4 pt-6 mb-4 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-ink-soft font-medium">
            Navigation
          </p>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-ink-soft hover:text-ink hover:bg-surface transition-colors"
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {visibleTabs.map((tab) => {
            const active = isActive(tab);
            const needsSlug = tab.id === "report" || tab.id === "questionnaire";
            const isDisabledNoSlug = needsSlug && !slug;

            if (!tab.enabled || isDisabledNoSlug) {
              return (
                <div
                  key={tab.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-not-allowed ${
                    tab.adminOnly ? "text-orange/50" : "text-ink-soft/50"
                  }`}
                >
                  <tab.icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm min-w-0 truncate">{tab.label}</span>
                  {tab.badge && !isDisabledNoSlug && (
                    <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${
                      tab.adminOnly
                        ? "bg-orange/10 text-orange/70"
                        : "bg-surface text-ink-soft"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={tab.id}
                href={tab.href(slug)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-orange/10 text-orange font-medium"
                    : "text-ink-mid hover:bg-surface hover:text-ink"
                }`}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      {mobileNav}
    </>
  );
}
