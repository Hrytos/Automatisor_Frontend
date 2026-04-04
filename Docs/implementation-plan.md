# AutomatiSOR Frontend — Implementation Plan

This document describes the architecture, component design decisions, data flows, and phased implementation plan for the AutomatiSOR Next.js frontend.

---

## 1. Overview

The frontend is a Next.js 16 App Router application deployed on Vercel. It serves as the client-facing interface for the AutomatiSOR platform, responsible for:

- Rendering gated Operations Fitness Index (OFI) reports
- Authenticating users via OTP email login (no passwords)
- Providing a multi-section questionnaire flow tied to each report
- Triggering report regeneration and showing live status
- Admin tooling for generating shareable report links

---

## 2. Architecture

```
Browser
  │
  │  All /api/* requests → Next.js server rewrite
  │  (same-origin — cookie sent automatically on every request)
  │
  ▼
┌────────────────────────────────────────────────────────────┐
│                  Next.js App (Vercel)                       │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  /report/    │  │/questionnaire│  │  /login          │ │
│  │  [slug]      │  │  [reportId]  │  │  /reports        │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘ │
│         │                  │                               │
│         └──────────────────┴──────┐                        │
│                                   ▼                        │
│                          components/                       │
│                          ├─ Navbar (auth modal)           │
│                          ├─ ReportView                    │
│                          ├─ ReportSidebar                 │
│                          ├─ SectionCard                   │
│                          └─ OFIScoreGauge                 │
│                                   │                        │
│                          lib/                             │
│                          ├─ auth.ts (sessionStorage)      │
│                          └─ tracking.ts (localStorage)    │
└────────────────────────────┬──────────────────────────────┘
                             │  server-side rewrite
                             │  BACKEND_URL env var
                             ▼
              FastAPI Backend (Render)
              /api/* → backend:PORT/*
```

### Key design decisions

| Decision | Rationale |
|---|---|
| All API calls via `/api/*` proxy | HttpOnly cookie is same-origin only — the proxy ensures the cookie is sent on every request without any CORS complexity |
| `sessionStorage` for auth metadata | JWT never exposed to JS; only non-sensitive user metadata (`user_id`, `email`, `account_id`, `is_admin`) stored. Clears on tab close by design |
| Auth event bus via `CustomEvent` | Next.js App Router reuses the layout across navigations — the Navbar never re-mounts, so a custom event is the only reliable way to sync auth state changes |
| Unlock state derived from API response | `sessionStorage` can be stale (expired JWT). Deriving unlock from actual body content in the response is the only reliable signal |
| Client components for all interactive pages | All report/questionnaire pages use `"use client"` — they depend on cookies, sessionStorage, and polling. SSR would add complexity with no benefit for authenticated content |
| Polling over WebSocket | Simpler infra; 30s granularity is acceptable for report regeneration (takes ~5 min). WebSocket adds a persistent server connection on Render's free tier |

---

## 3. Page Structure

### `/ → /login`
Root page immediately redirects. No landing page yet.

### `/login`
Standalone login page wrapping the `LoginForm` component. Used for direct navigation. The same login flow is also available inline in the Navbar dropdown on every page.

### `/reports`
Lists all reports for the authenticated user's account. If only one report exists, redirects directly to it (most users have one site).

### `/report/[slug]`
Main report view. `slug` is the `report_id` UUID.

- Fetches report from `/api/reports/{slug}`
- Unauthenticated: shows `operational_profile` section only + `UnlockOverlay`
- Authenticated: all sections unlocked
- Site switcher dropdown (fetches `/api/reports/by-account/{account_id}`)
- Regeneration polling when `regeneration_status === "queued"`
- Expired JWT detection: if session exists but backend sends empty bodies, clears auth and reloads

### `/questionnaire/[reportId]`
Per-report questionnaire. Authenticated users only.

- Loads answers from `/api/reports/{reportId}/questionnaire`
- Multi-section step-by-step form (10 sections, ~40 questions)
- Section progress saved to backend every time user advances (`PATCH`)
- Summary view before submitting regeneration
- `sessionStorage` persists current section and view state keyed by `reportId` (survives sidebar navigation)
- Regeneration status banner + polling while queued

### `/questionnaire`
Public lead-capture form. No auth required. Saves to the `questionnaires` table for manual follow-up.

### `/report/create`
Admin-only. Select an account + site, generate and copy shareable report links. Calls `POST /api/reports/prepare`.

### `/no-report`
Shown when an authenticated user has no reports associated with their account.

---

## 4. Component Design

### `Navbar`

The Navbar is the primary authentication surface. It lives in the root layout and is never unmounted.

```
States:
  not mounted         → empty (SSR hydration guard)
  unauthenticated     → "Sign in" button
  authenticated       → user email + dropdown (My Reports, Sign out)
  admin               → user email + dropdown (My Reports, Create Report, Sign out)

Sub-states (dropdown open):
  step = "email"      → email input form
  step = "otp"        → 6-digit code input form
  loading             → spinner
  error               → inline error message
```

Auth flow:
1. `POST /api/auth/otp/send` → moves to `step = "otp"`
2. `POST /api/auth/otp/verify` → sets `sessionStorage` via `setAuthSession()`, dispatches `automatisor:authchange`, redirects

### `ReportView`

Stateless display component. Accepts `report: Report` and derives everything from it.

```
Layout:
  ├─ Report header (site name, location, date, site switcher slot)
  ├─ OFIScoreGauge (SVG semicircle, score, tier, confidence)
  ├─ Regeneration status banner (conditional)
  ├─ Free sections (always rendered with full body)
  ├─ Gated sections — two states:
  │   ├─ locked:   first gated section shown as preview + UnlockOverlay CTA
  │   └─ unlocked: all sections rendered with full bodies
  └─ Section tabs (top) for quick navigation
```

### `SectionCard`

Renders a single report section. Receives `section: ReportSection` and `isLocked: boolean`.

- When locked: blurred body text overlay
- Body is rendered as plain text (markdown not yet parsed — Phase 8 work)

### `OFIScoreGauge`

SVG semicircle gauge. Takes `score` (0–100), `tier`, `tierLabel`, `confidence`. Purely presentational, no state.

### `ReportSidebar`

Collapsible left navigation. Links: Report, Questionnaire, Recommendations (coming soon), Shortlists (coming soon), Create Report (admin only). Collapses to icon strip on desktop.

### `UnlockOverlay`

CTA shown over locked sections. Triggers the Navbar sign-in dropdown by dispatching a custom event or showing an inline prompt. Not a modal — lives inline in the page flow.

---

## 5. Auth System

### `src/lib/auth.ts`

```ts
// sessionStorage key
AUTH_KEY = "automatisor_auth"

// Stored shape (never contains the JWT)
AuthSession {
  user_id: string
  account_id: string | null
  is_admin: boolean
  email: string
}

// Functions
getAuthSession()    → AuthSession | null
setAuthSession()    → stores + dispatches "automatisor:authchange"
clearAuthSession()  → removes + dispatches "automatisor:authchange"
isUnlocked()        → boolean
isAdmin()           → boolean
```

### Cookie handling

The `access_token` HttpOnly cookie is set/cleared entirely by the backend:
- Set on `POST /auth/otp/verify`
- Cleared on `POST /auth/logout`
- Sent automatically on all `fetch(..., { credentials: "include" })` calls

The frontend never reads the cookie value — it's invisible to JS by design.

---

## 6. Questionnaire System

The per-report questionnaire is split into 10 sections:

| # | Section ID | Title |
|---|---|---|
| 0 | `about` | About the Company & Site |
| 1 | `s01` | Physical Environment |
| 2 | `s02` | Material Movement |
| 3 | `s03` | Workforce & Operations |
| 4 | `s04` | Technology & Infrastructure |
| 5 | `s05` | Financial & Strategic Context |
| 6 | `s06` | Safety & Compliance |
| 7 | `s07` | Deployment Readiness |
| 8 | `s08` | Competitive & Market Context |
| 9 | `s09` | Additional Context |

### Navigation state

```
view: "questions" | "summary"
currentSection: 0–9
```

Both are persisted to `sessionStorage` keyed by `reportId` (`qs_section_{id}`, `qs_view_{id}`) so navigation to the report page and back doesn't lose position.

### Save strategy

- Answers are saved to the backend (`PATCH /api/reports/{id}/questionnaire`) each time the user clicks "Next →" to advance a section.
- Also saved when clicking "Preview" or "Submit & Regenerate".
- The full answers object is always sent (not a diff).

### Regeneration flow

```
Summary view → "Submit & Regenerate" clicked
  │
  ├─ PATCH /api/reports/{id}/questionnaire  (final save)
  ├─ POST  /api/reports/{id}/regenerate
  │
  ├─ On 202: set regenerationStatus = "queued"
  │          show orange banner
  │          start 30s polling interval
  │
  └─ On poll: GET /api/reports/{id}/questionnaire
              checks regeneration_status field
              clears interval when status !== "queued"
```

---

## 7. Tracking System

`src/lib/tracking.ts` implements a lightweight client-side event log stored in `localStorage`.

Events logged:
- `page_view` — on every report page load
- `section_view` — when a section scrolls into view
- `scroll_depth` — at 25%, 50%, 75%, 100%
- `unlock` — when a user completes OTP login from a report page

Events are stored in `localStorage` as an array (max 500 items). Currently used for local analytics only — no backend flush yet.

---

## 8. Phased Implementation Plan

### Phase 1 — Foundation ✅ (Complete)

- [x] Next.js 16 App Router scaffold
- [x] Tailwind CSS v4 + shadcn/ui setup
- [x] DM Sans + DM Serif Display fonts
- [x] Global layout, `globals.css` design tokens (ink, orange, surface, etc.)
- [x] `@/` path alias, TypeScript strict mode
- [x] `cn()` utility from `tailwind-merge` + `clsx`
- [x] Root `page.tsx` → redirect to `/login`
- [x] `not-found.tsx` global 404

---

### Phase 2 — Auth System ✅ (Complete)

- [x] `src/lib/auth.ts` — `sessionStorage` helpers + `CustomEvent` bus
- [x] `LoginForm` component — email → OTP two-step form
- [x] `/login` page
- [x] `Navbar` — inline auth dropdown, sign out, admin detection
- [x] `POST /api/auth/otp/send` and `/verify` integration
- [x] Redirect to `/reports` after login; admin redirect to `/report/create`
- [x] `POST /api/auth/logout` → cookie clear + `clearAuthSession()`

---

### Phase 3 — Report Rendering ✅ (Complete)

- [x] `Report`, `ReportSection` TypeScript types
- [x] `GET /api/reports/{slug}` fetch on `/report/[slug]`
- [x] `ReportView` component — header, score gauge, free + gated sections
- [x] `SectionCard` — section heading, subheading, body
- [x] `OFIScoreGauge` — SVG semicircle, tier colours, score animation
- [x] `UnlockOverlay` — CTA over locked sections
- [x] Section gating derived from actual body content
- [x] Expired JWT detection and auto-clear
- [x] `FREE_SECTION_IDS` and `SECTION_ICONS` constants in `types/report.ts`

---

### Phase 4 — Navigation & Layout ✅ (Complete)

- [x] `ReportSidebar` — collapsible left nav, active state, admin tab
- [x] `/reports` list page with single-report redirect
- [x] `/no-report` page
- [x] Site switcher dropdown (fetches `by-account` endpoint)
- [x] `Footer` component
- [x] Scroll tracking hook (`useScrollTracking`)
- [x] Client-side event tracking (`src/lib/tracking.ts`)

---

### Phase 5 — Questionnaire Flow ✅ (Complete)

- [x] `/questionnaire/[reportId]` — full multi-section form
- [x] All 10 sections with ~40 questions (single, multi, text, number types)
- [x] "Next →" / "← Back" navigation between sections
- [x] Auto-save on section advance (`PATCH /api/reports/{id}/questionnaire`)
- [x] Summary view (read-only review of all answers before submitting)
- [x] Preview button in section header
- [x] `sessionStorage` state persistence (`qs_section_{id}`, `qs_view_{id}`)
- [x] `/questionnaire` public lead-capture form

---

### Phase 6 — Report Regeneration ✅ (Complete)

- [x] "Submit & Regenerate" button on questionnaire summary
- [x] `POST /api/reports/{id}/regenerate` integration
- [x] `regeneration_status` field in `Report` type (optional)
- [x] Orange banner on questionnaire page while `"queued"`
- [x] Orange banner on report page while `"queued"`
- [x] 30s polling on both pages via `setRef<setInterval>`
- [x] Polling auto-stops when status clears

---

### Phase 7 — Admin Tooling ✅ (Complete)

- [x] `/report/create` admin page
- [x] Account dropdown → site dropdown → `POST /api/reports/prepare`
- [x] One-click copy shareable link per site
- [x] Admin-only visibility via `isAdmin()` check + sidebar tab

---

### Phase 8 — Production Hardening ✅ (Complete)

- [x] `BACKEND_URL` env var in `next.config.ts` (no hardcoded URLs)
- [x] `.env.local` with `BACKEND_URL=http://localhost:8000`
- [x] `.gitignore` ignores all `.env*` files
- [x] `Report` type fields aligned with actual API response (optional non-API fields)
- [x] `score_confidence` typed as `string` (not narrow union) to match backend
- [x] TypeScript strict: zero errors (`tsc --noEmit`)
- [x] `credentials: "include"` on all fetch calls

---

### Phase 9 — Markdown Rendering (Planned)

Report section `body` fields contain markdown. Currently rendered as plain text.

- [ ] Install `react-markdown` and `rehype-sanitize`
- [ ] Update `SectionCard` to render `<ReactMarkdown>` with a sanitised renderer
- [ ] Style headings, lists, bold, code blocks within section cards
- [ ] Test with real report content for layout regressions

---

### Phase 10 — Loading & Error UX (Planned)

- [ ] Skeleton loaders for report page (section card placeholders)
- [ ] Error boundary on report page (show friendly message on fetch failure)
- [ ] Toast notifications for questionnaire save success/failure
- [ ] Offline detection banner

---

### Phase 11 — Recommendations & Shortlists (Planned)

Currently in the sidebar as "Coming Soon". Will require new backend endpoints.

- [ ] `/recommendations/[reportId]` — AI-generated shortlist of automation vendors/solutions
- [ ] `/shortlists/[reportId]` — user-curated shortlist with notes
- [ ] Backend: `GET /reports/{id}/recommendations`
- [ ] Backend: `GET/POST/DELETE /reports/{id}/shortlist`

---

### Phase 12 — Analytics Dashboard (Planned)

Flush the client-side tracking event log to the backend and surface it in an admin view.

- [ ] `POST /api/tracking/events` — batch flush endpoint
- [ ] Flush on page unload (`visibilitychange` → `sendBeacon`)
- [ ] Admin page: per-report view counts, scroll depth heatmap, unlock conversion rate

---

## 9. Deployment Checklist

Before deploying to Vercel:

- [ ] Set `BACKEND_URL=https://automatisor-backend.onrender.com` in Vercel environment variables
- [ ] Confirm backend `CORS_ORIGINS` is set to the Vercel production URL
- [ ] Run `npm run build` locally and confirm zero errors
- [ ] Test full OTP login flow in production
- [ ] Test report page (locked and unlocked views)
- [ ] Test questionnaire save + regenerate trigger end-to-end
- [ ] Test admin create-report link generation
- [ ] Confirm `COOKIE_SECURE=true` on the backend (required for HttpOnly cookies over HTTPS)
