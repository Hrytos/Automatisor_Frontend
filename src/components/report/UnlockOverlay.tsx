"use client";

import { useState, type FormEvent } from "react";
import { Lock, ArrowRight, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setAuthSession } from "@/lib/auth";
import { trackUnlock } from "@/lib/tracking";

interface UnlockOverlayProps {
  slug: string;
  onUnlock: () => void;
}

export function UnlockOverlay({ slug, onUnlock }: UnlockOverlayProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(
          body.detail ?? "Failed to send code. Check your email address.",
        );
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
        body: JSON.stringify({
          email: email.trim(),
          token: token.trim(),
          report_id: slug,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.detail ?? "Invalid or expired code. Try again.");
        return;
      }
      // Store only non-sensitive metadata — the JWT is in the HttpOnly cookie
      setAuthSession({
        user_id: body.user_id,
        account_id: body.account_id ?? null,
        is_admin: body.is_admin ?? false,
        email: email.trim(),
        first_name: body.first_name ?? null,
        last_name: body.last_name ?? null,
      });
      trackUnlock(slug, email.trim());
      onUnlock();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative my-2">
      <div className="bg-white border border-ink/10 rounded-xl p-8 md:p-10 text-center max-w-lg mx-auto shadow-sm">
        <div className="w-12 h-12 rounded-full bg-orange/10 flex items-center justify-center mx-auto mb-4">
          {step === "email" ? (
            <Lock className="w-5 h-5 text-orange" />
          ) : (
            <KeyRound className="w-5 h-5 text-orange" />
          )}
        </div>

        {step === "email" ? (
          <>
            <h3 className="font-serif text-2xl text-ink mb-2">
              Access Your Report
            </h3>
            <p className="text-sm text-ink-soft font-light leading-relaxed mb-6 max-w-sm mx-auto">
              Enter your company email address. We&apos;ll send you a one-time
              code to sign in.
            </p>
            <form
              onSubmit={handleSendOtp}
              className="flex gap-2 max-w-sm mx-auto"
            >
              <Input
                type="email"
                placeholder="email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-surface border-ink/10 text-ink placeholder:text-ink-soft/50"
              />
              <Button
                type="submit"
                disabled={loading}
                className="gap-1.5 shrink-0"
              >
                {loading ? (
                  "..."
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    Send Code
                  </>
                )}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h3 className="font-serif text-2xl text-ink mb-2">
              Check Your Email
            </h3>
            <p className="text-sm text-ink-soft font-light leading-relaxed mb-6 max-w-sm mx-auto">
              We sent a 6-digit code to{" "}
              <span className="text-ink font-medium">{email}</span>. Enter it
              below.
            </p>
            <form
              onSubmit={handleVerifyOtp}
              className="flex gap-2 max-w-sm mx-auto"
            >
              <Input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                required
                className="flex-1 bg-surface border-ink/10 text-ink placeholder:text-ink-soft/50 tracking-widest text-center text-lg"
              />
              <Button
                type="submit"
                disabled={loading || token.length < 6}
                className="gap-1.5 shrink-0"
              >
                {loading ? (
                  "..."
                ) : (
                  <>
                    Verify
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </form>
            <button
              onClick={() => {
                setStep("email");
                setToken("");
                setError(null);
              }}
              className="text-xs text-ink-soft/60 mt-4 hover:text-ink-soft transition-colors"
            >
              Use a different email
            </button>
          </>
        )}

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

        <p className="text-[11px] text-ink-soft/40 mt-4">
          Enter any email to access your report.
        </p>
      </div>
    </div>
  );
}
