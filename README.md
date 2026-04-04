# AutomatiSOR — Frontend

Next.js frontend for the AutomatiSOR warehouse automation assessment platform. Renders gated operations reports, handles OTP-based authentication via the Navbar, and provides a multi-section questionnaire flow for refining and regenerating reports.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Base UI |
| Icons | Lucide React |
| Fonts | DM Sans + DM Serif Display (Google Fonts) |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx               # Root layout — fonts, metadata, body
│   ├── page.tsx                 # Redirects / → /login
│   ├── not-found.tsx            # Global 404 page
│   ├── login/page.tsx           # Standalone login page (LoginForm)
│   ├── no-report/page.tsx       # Shown when account has no report yet
│   ├── reports/page.tsx         # Report list (redirects to report if only one)
│   ├── report/
│   │   ├── [slug]/page.tsx      # Main report view with polling + site switcher
│   │   └── create/page.tsx      # Admin — generate shareable report links
│   └── questionnaire/
│       ├── page.tsx             # Public lead-capture questionnaire
│       └── [reportId]/page.tsx  # Per-report questionnaire (authenticated)
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx           # Auth dropdown (OTP email login), sign out
│   │   └── Footer.tsx
│   ├── report/
│   │   ├── ReportView.tsx       # Full report layout — free + gated sections
│   │   ├── SectionCard.tsx      # Individual section renderer (markdown body)
│   │   ├── ReportSidebar.tsx    # Collapsible left nav (Report / Questionnaire / Admin)
│   │   ├── OFIScoreGauge.tsx    # SVG semicircle score gauge
│   │   └── UnlockOverlay.tsx    # CTA shown over locked sections
│   └── ui/                      # shadcn/ui primitives
├── lib/
│   ├── auth.ts                  # sessionStorage auth helpers + custom event bus
│   ├── tracking.ts              # Client-side event tracking (localStorage)
│   └── utils.ts                 # cn() tailwind class merger
├── types/
│   └── report.ts                # Report, ReportSection, SitedataFlag types
├── hooks/
│   └── useScrollTracking.ts     # Scroll depth observer
└── data/
    └── reports/                 # Static sample JSON reports (dev/demo only)
```

---

## Local Development

### Prerequisites

- Node.js 20+
- npm (or pnpm / yarn)

### Setup

```bash
cd Webapp/Frontend

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local
# Edit .env.local — set BACKEND_URL=http://localhost:8000

# Start dev server
npm run dev
```

App runs at `http://localhost:3000`. The backend must also be running at `http://localhost:8000` for API calls to work.

---

## Environment Variables

| Variable | Description |
|---|---|
| `BACKEND_URL` | URL of the FastAPI backend. **Server-side only** — not exposed to the browser. Local: `http://localhost:8000`. Production: `https://automatisor-backend.onrender.com` |

Set `BACKEND_URL` in the **Vercel dashboard** (Settings → Environment Variables) before deploying.

---

## API Proxy

All `/api/*` requests are rewritten server-side to `BACKEND_URL` via `next.config.ts`:

```ts
{ source: "/api/:path*", destination: `${BACKEND_URL}/:path*` }
```

This keeps the frontend and backend on the same origin from the browser's perspective, which is required for the HttpOnly `access_token` cookie to be sent automatically with every request.

---

## Authentication

- Auth is entirely driven by the Navbar's inline dropdown — no separate auth page required (a standalone `/login` page also exists for direct navigation).
- `POST /api/auth/otp/send` → sends a 6-digit code to the user's email.
- `POST /api/auth/otp/verify` → the backend sets an HttpOnly `access_token` cookie. The frontend stores only non-sensitive metadata (`user_id`, `email`, `account_id`, `is_admin`) in `sessionStorage` via `src/lib/auth.ts`.
- The JWT **never** touches frontend JavaScript — only the cookie does.
- Auth state changes are broadcast via a `CustomEvent("automatisor:authchange")` so the Navbar and page components stay in sync without a full re-render.

---

## Report Access Model

| User state | What they see |
|---|---|
| Unauthenticated | `operational_profile` section only; all others show the `UnlockOverlay` CTA |
| Authenticated | All section bodies unlocked |
| Admin (`@hrytos.com`) | All sections + `Create Report` in the sidebar |

Unlock state is derived from the actual API response body — if gated sections have content, the user is unlocked. Stale `sessionStorage` with an expired cookie is detected and cleared automatically.

---

## Report Regeneration

After saving questionnaire answers, the user can trigger a report regeneration:

1. `PATCH /api/reports/{id}/questionnaire` saves answers.
2. `POST /api/reports/{id}/regenerate` triggers DemandSense; backend sets `regeneration_status: "queued"`.
3. Both the report page and questionnaire page show an orange banner.
4. A `setInterval` polls `/api/reports/{id}` every 30 seconds; when `regeneration_status` clears, the report content refreshes.

---

## Deployment (Vercel)

1. Connect the repository to Vercel, set root directory to `Webapp/Frontend`.
2. Set `BACKEND_URL=https://automatisor-backend.onrender.com` in Vercel environment variables.
3. Vercel runs `npm run build` automatically on push.
4. After deploying, copy the Vercel URL and set it as `CORS_ORIGINS` in the Render backend environment variables.


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
