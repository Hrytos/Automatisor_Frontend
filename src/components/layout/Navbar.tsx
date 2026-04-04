"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Mail, KeyRound, Loader2, LogOut, ChevronDown, FileText } from "lucide-react";
import { getAuthSession, setAuthSession, clearAuthSession, type AuthSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mounted, setMounted] = useState(false);

  // Dropdown / modal state
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setSession(getAuthSession());

    // Re-read auth state whenever any component calls setAuthSession/clearAuthSession.
    // Needed because Next.js App Router reuses the layout (and this Navbar) across
    // navigations — the component never re-mounts, so we rely on this event instead.
    function onAuthChange() {
      setSession(getAuthSession());
    }
    window.addEventListener("automatisor:authchange", onAuthChange);
    return () => window.removeEventListener("automatisor:authchange", onAuthChange);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    // Clear the HttpOnly cookie server-side, then clear local metadata
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    clearAuthSession();
    setSession(null);
    setOpen(false);
    window.location.reload();
  }

  function openSignIn() {
    setStep("email");
    setEmail("");
    setToken("");
    setError(null);
    setOpen(true);
  }

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail ?? "Failed to send code.");
        return;
      }
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), token: token.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.detail ?? "Invalid or expired code.");
        return;
      }
      // Store only non-sensitive metadata — the JWT is in the HttpOnly cookie
      const newSession: AuthSession = {
        user_id: body.user_id,
        account_id: body.account_id ?? null,
        is_admin: body.is_admin ?? false,
        email: email.trim(),
      };
      setAuthSession(newSession);
      setSession(newSession);
      setOpen(false);
      // If already on a report page, reload to unlock it.
      // Otherwise navigate to the reports list.
      if (pathname?.startsWith("/report/")) {
        window.location.reload();
      } else {
        router.push("/reports");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const initials = session?.email
    ? session.email.slice(0, 2).toUpperCase()
    : null;

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-ink/10 bg-white px-6 py-4 md:px-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <span className="font-serif text-xl text-ink tracking-tight">
          Automati<span className="text-orange">SOR</span>
        </span>
        <span className="hidden sm:inline text-xs text-ink-soft font-light border-l border-ink/10 pl-2 ml-1">
          by Hrytos
        </span>
      </Link>

      {/* Auth area */}
      {mounted && (
        <div className="relative" ref={dropdownRef}>
          {session ? (
            /* Logged-in avatar button */
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 bg-surface hover:bg-ink/5 transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-orange/15 text-orange text-xs font-semibold flex items-center justify-center">
                {initials}
              </span>
              <ChevronDown className={`w-3 h-3 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          ) : (
            /* Sign in button */
            <button
              onClick={openSignIn}
              className="text-sm font-medium text-ink-mid hover:text-ink border border-ink/10 rounded-lg px-3.5 py-1.5 bg-surface hover:bg-white transition-colors"
            >
              Sign in
            </button>
          )}

          {/* Dropdown panel */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-ink/10 rounded-xl shadow-lg overflow-hidden">
              {session ? (
                /* Signed-in panel */
                <div>
                  <div className="px-4 py-3 border-b border-ink/5">
                    <p className="text-xs text-ink-soft mb-0.5">Signed in as</p>
                    <p className="text-sm font-medium text-ink truncate">{session.email}</p>
                    {session.is_admin && (
                      <span className="inline-block mt-1 text-[10px] font-medium bg-orange/10 text-orange px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  {!session.is_admin && (
                    <Link
                      href="/reports"
                      onClick={() => setOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-ink-mid hover:text-ink hover:bg-surface transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      My Reports
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-ink-mid hover:text-ink hover:bg-surface transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              ) : (
                /* Sign-in OTP panel */
                <div className="px-5 py-5">
                  {step === "email" ? (
                    <>
                      <p className="text-sm font-medium text-ink mb-1">Sign in</p>
                      <p className="text-xs text-ink-soft mb-4 leading-relaxed">
                        Enter your email — we&apos;ll send a one-time code.
                      </p>
                      <form onSubmit={handleSendOtp} className="space-y-2">
                        <Input
                          type="email"
                          placeholder="email@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoFocus
                          className="bg-surface border-ink/10 text-sm"
                        />
                        {error && <p className="text-xs text-red-500">{error}</p>}
                        <Button type="submit" disabled={loading} className="w-full gap-1.5">
                          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                          {loading ? "Sending…" : "Send Code"}
                        </Button>
                      </form>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-ink mb-1">Enter your code</p>
                      <p className="text-xs text-ink-soft mb-4 leading-relaxed">
                        Sent to <span className="font-medium">{email}</span>.{" "}
                        <button onClick={() => setStep("email")} className="underline hover:text-ink">
                          Change
                        </button>
                      </p>
                      <form onSubmit={handleVerifyOtp} className="space-y-2">
                        <Input
                          type="text"
                          placeholder="6-digit code"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          required
                          autoFocus
                          className="bg-surface border-ink/10 text-sm tracking-widest"
                        />
                        {error && <p className="text-xs text-red-500">{error}</p>}
                        <Button type="submit" disabled={loading} className="w-full gap-1.5">
                          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                          {loading ? "Verifying…" : "Verify"}
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
