"use client";

import { useState, useEffect } from "react";
import { Copy, Check, ShieldAlert, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { getAuthSession } from "@/lib/auth";
import { ReportSidebar } from "@/components/report/ReportSidebar";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AccountItem { account_id: string; company_name: string; }
interface SiteItem {
  site_id: string;
  site_name: string;
  site_address: string | null;
  report_id: string;   // always present — only sites with reports are returned
  has_answers: boolean;
}
interface GeneratedLink { report_id: string; site_name: string; site_address: string; }

// ── Select component ──────────────────────────────────────────────────────────

function Select({
  value, onChange, disabled, placeholder, children,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none rounded-lg border border-ink/10 bg-surface px-3 py-2 pr-9 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="" disabled>{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateReportPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin]         = useState(false);

  // Dropdown data
  const [accounts, setAccounts]               = useState<AccountItem[]>([]);
  const [sites, setSites]                     = useState<SiteItem[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [sitesLoading, setSitesLoading]       = useState(false);

  // Selections
  const [selectedAccount, setSelectedAccount]   = useState("");
  const [checkedReportIds, setCheckedReportIds] = useState<Set<string>>(new Set());

  // Link generation results
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[] | null>(null);
  const [generating, setGenerating]         = useState(false);
  const [copiedId, setCopiedId]             = useState<string | null>(null);
  const [error, setError]                   = useState<string | null>(null);

  // ── Auth check ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      // Fast path — session already in storage
      if (getAuthSession()) {
        const admin = getAuthSession()!.is_admin;
        setIsAdmin(admin);
        setAuthChecked(true);
        if (admin) loadAccounts();
        return;
      }

      // No local session yet — SessionRefresher may still be running /auth/me.
      // Wait up to 2 s for the authchange event before deciding.
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 2000);
        function onAuth() {
          clearTimeout(timer);
          window.removeEventListener("automatisor:authchange", onAuth);
          resolve();
        }
        window.addEventListener("automatisor:authchange", onAuth);
      });

      const admin = getAuthSession()?.is_admin ?? false;
      setIsAdmin(admin);
      setAuthChecked(true);
      if (admin) loadAccounts();
    }
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAccounts() {
    setAccountsLoading(true);
    try {
      const res = await fetch(
        `/api/accounts/admin/list`,
        { credentials: "include" }
      );
      if (res.ok) setAccounts(await res.json());
    } finally {
      setAccountsLoading(false);
    }
  }

  async function handleAccountChange(accountId: string) {
    setSelectedAccount(accountId);
    setCheckedReportIds(new Set());
    setGeneratedLinks(null);
    setSites([]);
    if (!accountId) return;

    const session = getAuthSession();
    if (!session) return;
    setSitesLoading(true);
    try {
      const res = await fetch(
        `/api/accounts/admin/${accountId}/sites`,
        { credentials: "include" }
      );
      if (res.ok) setSites(await res.json());
    } finally {
      setSitesLoading(false);
    }
  }


  function toggleSiteCheck(reportId: string) {
    setCheckedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) next.delete(reportId); else next.add(reportId);
      return next;
    });
    setGeneratedLinks(null);
  }

  async function handleGenerateLinks() {
    setError(null);
    const session = getAuthSession();
    if (!session) { setError("Session expired. Please log in again."); return; }

    setGenerating(true);
    try {
      const res = await fetch(`/api/reports/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ report_ids: [...checkedReportIds] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Server returned ${res.status}`);
      }
      setGeneratedLinks(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  function copyLink() {
    if (!generatedLinks || generatedLinks.length === 0) return;
    const firstId = generatedLinks[0].report_id;
    const url = `${window.location.origin}/report/${firstId}?account=${selectedAccount}`;
    navigator.clipboard.writeText(url);
    setCopiedId("link");
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Derived
  const accountObj = accounts.find((a) => a.account_id === selectedAccount);

  // ── Guard ─────────────────────────────────────────────────────────────────────

  if (!authChecked) return null;

  if (!isAdmin) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-full bg-orange/10 flex items-center justify-center mx-auto mb-5">
              <ShieldAlert className="w-7 h-7 text-orange" />
            </div>
            <h1 className="font-serif text-2xl text-ink mb-2">Admin only</h1>
            <p className="text-sm text-ink-soft font-light leading-relaxed mb-6">
              This page is restricted to Hrytos team members. Sign in with your
              <span className="font-medium text-ink"> @hrytos.com</span> email to continue.
            </p>
            <Button variant="outline" render={<a href="/" />}>
              Return Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create Report Form ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <ReportSidebar isAdmin={true} />
        <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-4 py-12 md:py-16">
        <div className="w-full max-w-lg">

          {/* Header */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-orange bg-orange/8 px-2.5 py-1 rounded-full mb-3">
              Admin
            </span>
            <h1 className="font-serif text-3xl text-ink">Generate Report Links</h1>
            <p className="text-sm text-ink-soft font-light mt-1.5">
              Select a company and sites to generate shareable report URLs. Default questionnaire answers are seeded automatically if not already set.
            </p>
          </div>

          <div className="space-y-5">

            {/* Company dropdown */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Company <span className="text-orange">*</span>
              </label>
              {accountsLoading ? (
                <p className="text-xs text-ink-soft py-2">Loading accounts…</p>
              ) : (
                <Select
                  value={selectedAccount}
                  onChange={handleAccountChange}
                  placeholder="Select a company…"
                >
                  {accounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.company_name}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            {/* Sites list — checkboxes; admin picks which sites are included in the shared view */}
            {selectedAccount && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Sites to include <span className="text-orange">*</span>
                </label>
                <p className="text-xs text-ink-soft mb-2">
                  Checked sites will appear in the dropdown. The first checked site opens first.
                </p>
                {sitesLoading ? (
                  <p className="text-xs text-ink-soft py-2">Loading sites…</p>
                ) : sites.length === 0 ? (
                  <p className="text-xs text-ink-soft py-2">No reports found for this account.</p>
                ) : (
                  <div className="space-y-2">
                    {sites.map((s) => (
                      <label
                        key={s.report_id}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                          checkedReportIds.has(s.report_id)
                            ? "border-orange bg-orange/5"
                            : "border-ink/10 bg-surface hover:border-orange/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checkedReportIds.has(s.report_id)}
                          onChange={() => toggleSiteCheck(s.report_id)}
                          className="mt-0.5 accent-orange cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-ink font-medium truncate">{s.site_name}</p>
                          {s.site_address && (
                            <p className="text-xs text-ink-soft truncate">{s.site_address}</p>
                          )}
                        </div>
                        {s.has_answers && (
                          <span className="shrink-0 mt-0.5 text-[10px] font-medium text-teal bg-teal/10 px-1.5 py-0.5 rounded-full">
                            Answered
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            {selectedAccount && sites.length > 0 && (
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleGenerateLinks}
                  disabled={generating || checkedReportIds.size === 0}
                  className="w-full gap-2"
                >
                  {generating ? "Preparing…" : `Generate Link${checkedReportIds.size > 1 ? ` (${checkedReportIds.size} sites)` : ""}`}
                </Button>
              </div>
            )}

            {/* Generated link card — single URL with account scope */}
            {generatedLinks && generatedLinks.length > 0 && (() => {
              const firstId = generatedLinks[0].report_id;
              const url = `${typeof window !== "undefined" ? window.location.origin : ""}/report/${firstId}?account=${selectedAccount}`;
              const copied = copiedId === "link";
              return (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                    Link ready — opens {generatedLinks[0].site_name}{generatedLinks.length > 1 ? ` + ${generatedLinks.length - 1} more in dropdown` : ""}
                  </p>
                  <div className="rounded-lg border border-ink/10 bg-surface px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-ink-soft bg-ink/4 rounded px-2 py-1.5 truncate font-mono">
                        {url}
                      </code>
                      <button
                        type="button"
                        onClick={copyLink}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-ink/10 hover:border-orange/40 hover:text-orange transition-colors"
                      >
                        {copied ? (
                          <><Check className="w-3.5 h-3.5 text-teal" /><span className="text-teal">Copied</span></>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" />Copy</>
                        )}
                      </button>
                    </div>
                    {generatedLinks.length > 1 && (
                      <ul className="space-y-0.5 pt-1 border-t border-ink/5">
                        {generatedLinks.map((l) => (
                          <li key={l.report_id} className="text-xs text-ink-soft truncate">
                            · {l.site_name}{l.site_address ? ` — ${l.site_address}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
        </div>
        </main>
      </div>
    </div>
  );
}
