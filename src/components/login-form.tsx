"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setAuthSession } from "@/lib/auth"

type Step = "email" | "otp"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to send verification code.")
      }
      setStep("otp")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, token: otp }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Invalid or expired code.")
      }
      const data = await res.json()
      // Store only non-sensitive metadata — the JWT is in the HttpOnly cookie
      setAuthSession({
        user_id: data.user_id,
        account_id: data.account_id ?? null,
        is_admin: data.is_admin ?? false,
        email,
      })

      // Admins land on the admin create-report page directly
      if (data.is_admin) {
        router.push("/report/create")
        return
      }

      // Regular users: fetch their reports and navigate to the first one
      const reportsRes = await fetch(`/api/reports`, { credentials: "include" })
      if (reportsRes.ok) {
        const reports = await reportsRes.json()
        if (Array.isArray(reports) && reports.length > 0) {
          router.push(`/report/${reports[0].report_id}`)
          return
        }
      }
      // No reports found
      router.push("/no-report")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">

          {/* ── Left: OTP form ── */}
          {step === "email" ? (
            <form
              key="email-step"
              onSubmit={handleSendOtp}
              className="flex flex-col gap-6 p-6 md:p-8"
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Sign in</h1>
                <p className="text-sm text-muted-foreground text-balance">
                  Enter your email to receive a one-time code
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Send verification code"
                )}
              </Button>
            </form>
          ) : (
            <form
              key="otp-step"
              onSubmit={handleVerifyOtp}
              className="flex flex-col gap-6 p-6 md:p-8"
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Check your email</h1>
                <p className="text-sm text-muted-foreground text-balance">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                  className="tracking-[0.5em] text-center text-lg font-mono"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || otp.length < 6}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Verify & sign in"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("email")
                  setOtp("")
                  setError(null)
                }}
                className="text-sm text-muted-foreground hover:underline underline-offset-2 text-center cursor-pointer"
              >
                Use a different email
              </button>
            </form>
          )}

          {/* ── Right: branding panel ── */}
          <div className="relative hidden md:flex flex-col items-center justify-center bg-zinc-950 p-10 text-white overflow-hidden">
            {/* subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative z-10 flex flex-col items-center gap-5 text-center">
              {/* Logo mark */}
              <div className="w-14 h-14 rounded-2xl bg-[#E8532A] flex items-center justify-center shadow-lg">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M14 3L25 8.5V19.5L14 25L3 19.5V8.5L14 3Z"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 3V25M3 8.5L14 14M25 8.5L14 14"
                    stroke="white"
                    strokeWidth="1.8"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">
                  Hrytos
                </p>
                <h2 className="text-xl font-bold leading-tight">Automatisor</h2>
              </div>
              <p className="text-sm text-zinc-400 max-w-[200px] leading-relaxed">
                Data-driven operations assessments for warehouse automation.
              </p>
              <div className="flex flex-col gap-2 mt-2 w-full max-w-[200px]">
                {["Evidence-based scoring", "No vendor affiliation", "Operator-first analysis"].map(
                  (item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                      <div className="w-1 h-1 rounded-full bg-[#E8532A] flex-shrink-0" />
                      {item}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground text-center px-6">
        Access is restricted to invited contacts only.
      </p>
    </div>
  )
}


