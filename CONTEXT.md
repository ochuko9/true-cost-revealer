# CONTEXT.md — True Cost Revealer

> **Purpose of this file:** session-bootstrap context. Read this first at the start of any
> session to get up to speed without re-reading all source. Keep it updated when major
> work lands (see "Last completed task" + "Build status").
> **Last updated:** 2026-06-23

---

## TL;DR (orientation in 5 lines)

- **What:** Invite-only, high-conversion web app that shows a household their *annual + 10-year*
  cost of bottled water vs. an Amway **eSpring** purifier, then drives them to buy. US & Canada.
- **Where:** App root is the **`true-cost-revealer/`** subfolder (NOT the parent `cost_Resolver/`).
  Run all toolchain commands from inside `true-cost-revealer/`.
- **Stack:** Next.js 14.2.35 (App Router) + TypeScript + Tailwind + Supabase (Postgres/Storage).
- **State:** Feature-complete, **production build passes clean**. Git repo exists, single commit `5c96746`
  ("Initial commit: True Cost Revealer") pushed to GitHub (`ochuko9/true-cost-revealer`, `master`).
  **That push triggered an accidental production deploy on Netlify** (GitHub integration auto-deploys on
  push) before env vars / Supabase were confirmed set up — treat the live site as **unverified**, not a
  real launch, until the env vars below are confirmed set in Netlify and a clean redeploy is triggered.
- **Goal of the UX:** "strike the emotions, produce a state of excitement to act immediately" —
  framing is deliberately **pain / loss-aversion** (cost of inaction), red numbers for losses.

---

## Project purpose

A private sales/marketing tool for an Amway eSpring consultant. Flow: capture a lead → invite them
with a private link → they complete a 3-step calculator → they see a personalized, emotionally-framed
report (annual spend, money lost, break-even, 10-year projection, wealth-building "what you could
have instead", dated milestones) → they convert (call/book consultant) and/or download a branded PDF.
Admin tunes all pricing/copy/financing and manages clients + leads from `/admin`.

---

## Tech stack

| Area | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | `14.2.35` |
| Language | TypeScript | `^5` |
| UI lib | React | `^18` |
| Styling | Tailwind CSS | `^3.4.1` |
| Backend / DB / Storage | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) | `0.10.3` / `2.106.2` |
| Auth (admin) | `jose` JWT in httpOnly cookie (8h) | `^6.2.3` |
| Auth (client) | httpOnly `tcr_token` cookie (7d), set after token validation | — |
| PDF | `jspdf` + `html2canvas` (client-side; externalized on server in `next.config.mjs`) | `4.2.1` / `1.4.1` |
| Charts | `recharts` | `^3.8.1` |
| Icons | `lucide-react` | `^1.16.0` |
| Class utils | `clsx` + `tailwind-merge` → `cn()` in `lib/utils.ts` | — |
| Font | Inter via `next/font/google` (`--font-inter`, weights 400–900) | — |

Scripts (run from `true-cost-revealer/`): `npm run dev` · `npm run build` · `npm run lint` · `npm start`.
Verify command: `npx tsc --noEmit && npm run lint`.

---

## Brand / design system

- **Navy** (bg): `#0A1628` (`navy`), dark variant `#060d1a` (`navy-dark`). Body bg is set in `globals.css`.
- **Aqua** (primary/accent): `#00B4D8` (`aqua` / `aqua-500`). Full scale `aqua-50…900` in `tailwind.config.ts`
  (50 `#e6f7fb`, 100 `#b3e8f4`, 200 `#80d9ed`, 300 `#4dcae6`, 400 `#1abbdf`, 500 `#00B4D8`,
  600 `#0090ad`, 700 `#006c82`, 800 `#004857`, 900 `#00242c`).
- **Loss/pain accents:** `red-400` (`#f87171`) for headlines, `red-300` (`#fca5a5`, ~8.8:1 on navy) for
  numbers/inline emphasis. Losses are shown in red on purpose (cost-of-inaction framing).
- **Success:** `emerald-300/400`.
- **Text on navy:** white at opacity. **Contrast rule (WCAG AA):** `white/50` ≈ 5.3:1 (passes);
  `white/30–/45` FAIL — don't use for meaningful text. Prefer `white/60`+ for body, `white/70–80` for emphasis.
- **Type:** Inter; `tabular-nums` on all figures; `leading-tight` on stacked number blocks.
- A11y baked in: `aria-pressed` on segmented toggles, `prefers-reduced-motion` handling, focus rings (`aqua/50`).

---

## Architecture & key flows

**1. Lead capture (public):** `/request-access` (blurred red "$27,840" hook + optional consultant card)
→ `RequestAccessForm` → `POST /api/access-request` → inserts `access_requests` row (service-role).
Requires **name + (email OR phone)**.

**2. Invite-only gate:** `middleware.ts` matches `/calculator` + `/calculator/:path*`; redirects to
`/request-access` if no `tcr_token` cookie. Redemption: `/access/[token]` → `POST /api/validate-token`
→ Postgres `validate_token()` (security definer; checks enabled + not expired, logs access) → sets
7-day httpOnly `tcr_token` cookie → `/calculator`.

**3. Calculator → report:** 3-step form writes inputs to `sessionStorage` (`tcr_inputs`) →
`/calculator/results` (server component) fetches `espring_config` + `paypal_config` (+ the client's
`download_tier` via admin client) → `ResultsPage` runs `runCalculation()` (`lib/calculations/water-cost.ts`)
→ persists the report via `POST /api/report` (upsert into `client_reports`).

**4. Admin:** `/admin` (server-checks `admin_token` JWT, else `/admin/login`). Password → `POST /api/admin/auth`
→ 8h JWT cookie. Dashboard = `ClientManager` + `AccessRequestsManager` + `ConfigEditor`. Every admin API
route calls `requireAdmin()` (`lib/admin-auth.ts`) first.

**Config-field pattern (how to add a new admin-editable setting — "the cta_text pattern"):**
`types/index.ts` (interface) → `supabase/schema.sql` (column + ALTER note) → `app/calculator/results/page.tsx`
(`DEFAULT_ESPRING`/`DEFAULT_PAYPAL` fallback) → `components/admin/ConfigEditor.tsx` (editor UI) → consuming
component. `PATCH /api/admin/config` does `{...updates}` so **new fields need no API change**. Singleton row
IDs: eSpring `00000000-0000-0000-0000-000000000001`, PayPal `…0002`.

---

## Data model (Supabase, all RLS-enabled) — `supabase/schema.sql`

| Table | Role | RLS |
|---|---|---|
| `espring_config` | Singleton: prices, inflation, return rate, CTA text, **floating_cta_label/button**, consultant info, logo, `pdf_templates` (brief/standard/full section-ID arrays), `default_client_tier` | **public read**, service-role write |
| `paypal_config` | Singleton: hard-coded financing plans (6/12/24-mo) | **public read**, service-role write |
| `clients` | Invited clients: `token`, `access_enabled`, `expires_at`, `download_tier` | **service-role only** |
| `access_requests` | Captured leads (name/email/phone/`converted`) | **service-role only** |
| `access_logs` | Per-access audit (ip/ua/completed) | **service-role only** |
| `client_reports` | One row/client: full `report_data` JSON (result + config snapshot) | **service-role only** |

`validate_token(p_token, p_ip, p_ua)` = security-definer fn used by `/api/validate-token`.

---

## ⚠️ Conventions & guardrails (DON'T break these)

- **App lives in `true-cost-revealer/`** — cd there before any `npm`/`npx`. `cd` does NOT persist between
  tool calls; always cd in the same command.
- **RLS:** `clients`, `access_requests`, `access_logs`, `client_reports` are **service-role-only**.
  In server code use `createAdminClient()` (`lib/supabase/admin.ts`), **never** the anon client, or queries
  return null. `espring_config`/`paypal_config` are public-read (calculator needs them).
- **Secrets:** never echo/print `ADMIN_PASSWORD`, `JWT_SECRET`, or Supabase keys.
- **PayPal plan amounts are hard-coded published Amway values — never recompute from APR.**
- **PDF section IDs are stable identifiers — never rename them** (templates store arrays of these IDs).
- **Admin PDF regen uses the SAVED snapshot** in `client_reports.report_data`, *not* live config — this is
  deliberate (a client's PDF must look exactly as they saw it; later config edits must not alter it).
  Do not "fix" this to read current config.
- **Floating CTA** (sticky bar on live report) is **live-report-only — never appears in any PDF**. Its
  dollar figure is always computed; only the label + button text are admin-editable.
- Don't kill the user's **port-3000 dev server**.

---

## Build status

### ✅ DONE
- Lead capture: `/request-access` page + form + `POST /api/access-request` → `access_requests`.
- Invite gate: middleware + `/access/[token]` + `validate-token` + session cookie + access logging.
- 3-step calculator (Personal / BottledWater / Additional) + progress bar + sessionStorage handoff.
- Financial engine: annual spend, cost/litre, break-even (month-by-month), 10-yr inflation-adjusted projection.
- Results report: ~13 narrative sections + sticky floating CTA + report persistence.
- **Floating CTA admin controls:** two **independent dropdowns** (Stakes label / Button text), each = presets
  + "Custom…" free-text, decoupled (mix & match), with live preview. Defaults aligned to first presets.
- PDF export: brief/standard/full templates, gated by client `download_tier`; snapshot saved.
- Admin panel: client CRUD + token links + enable/disable + stats; leads view/convert/dismiss; full ConfigEditor
  (eSpring, PayPal, PDF templates, floating CTA, consultant info, logo upload).
- DB schema with RLS + `validate_token` + seed rows. **`floating_cta_label`/`floating_cta_button` migration
  already run in the user's Supabase.**
- **Production build passes clean** (19 routes); `tsc --noEmit` + `next lint` clean.

### ✅ DONE (since last update)
- `git init` + first commit (`5c96746`) + pushed to GitHub: `ochuko9/true-cost-revealer` (`master`).

### ❌ NOT DONE / NOT CONFIRMED (required before treating prod as real)
- **Audit the accidental production deploy on Netlify.** The GitHub push triggered an auto-deploy before
  this was intended. Confirm: are the 6 env vars actually set in Netlify (Site settings → Environment
  variables)? Is the `@netlify/plugin-nextjs` build plugin active (required for App Router + `middleware.ts`
  to run as Netlify Edge Functions — without it the invite-gate may not work)? Is it pointed at a real
  Supabase project?
- Create the **Supabase project** (if not already) → run `supabase/schema.sql` → create a **public Storage
  bucket named `assets`** (logo uploads need it).
- Set/verify the **6 env vars** in Netlify (see below) → **Trigger deploy → Clear cache and deploy site**
  → set `NEXT_PUBLIC_APP_URL` to the real Netlify URL or custom domain.
- No `netlify.toml` or `.vercel/` in the repo → site was connected via Netlify's dashboard/GitHub
  integration directly, with auto-detected build settings (not an explicit config file).

### ◻️ OPTIONAL (polish / nice-to-have, not blocking)
- New-lead notification email/SMS (none wired — admin must check `/admin`).
- Real invite-email sending (currently a no-op — see Known issues #3; copy-token-URL works).
- Spam protection (rate limit / captcha / honeypot) on the public lead form.
- Consent / privacy note on the lead form (CASL applies in Canada).
- Custom domain.

---

## Last completed task

**Git init + push to GitHub (`5c96746`, single "Initial commit" squashing all prior work).** This
unintentionally triggered a production deploy via Netlify's GitHub integration — the user discovered
the app live in production "by accident" before confirming env vars or Supabase setup. Working tree is
currently clean (no uncommitted changes on top of `5c96746`).

Prior to that, the last feature work was: **Floating CTA polish** — (1) rebuilt the admin floating-CTA UI
from paired preset cards into **two independent dropdowns** (label + button decoupled, presets + Custom,
live preview) in `ConfigEditor.tsx`; (2) rewrote the three **label presets** to a time-pressure tone —
`Every day you wait costs more` / `Still bleeding, year after year` / `What waiting really costs you`;
(3) aligned fresh-deploy **defaults** to the first label/button presets (`Every day you wait costs more` /
`Stop the bleed →`) across `ConfigEditor.tsx`, `ResultsPage.tsx`, `app/calculator/results/page.tsx`,
`supabase/schema.sql`; (4) fixed the sticky-bar **label font** (`text-xs white/60` → `text-base font-medium
white/80`; dollar figure bumped to `text-lg`). All verified: `tsc` + `lint` + `build` clean.

---

## Recommended next task

**Audit the accidental Netlify deploy, then make it a real launch.** Concretely:
1. Open the Netlify dashboard for `true-cost-revealer` (Site settings → Build & deploy → Repository,
   confirm it points at `ochuko9/true-cost-revealer`).
2. Confirm/set the 6 env vars there (below) — if unset, the app is currently running on the **insecure
   `ADMIN_PASSWORD`/`JWT_SECRET` fallbacks** (see Known issue #2), which is the urgent risk of an
   unaudited accidental deploy.
3. Confirm `@netlify/plugin-nextjs` is active under Build plugins (needed for `middleware.ts` invite-gate
   to run as Edge Functions).
4. Confirm a real Supabase project exists, `supabase/schema.sql` has been run, and a public Storage bucket
   `assets` exists.
5. Trigger a clean redeploy ("Clear cache and deploy site") after env vars are set; update
   `NEXT_PUBLIC_APP_URL` to the real Netlify URL/custom domain.
6. Smoke test: `/request-access` submit → row in `access_requests`; `/admin` login → convert lead → copy token
   link → open it → complete calculator → see report → download a PDF.

After that, the highest-value optional is a **new-lead notification email** (so leads aren't missed).

---

## Environment variables (names only — never commit values)

Copy `.env.local.example` → `.env.local` locally; set the same in Netlify → Site settings → Environment variables.

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key — **server only**, full DB access |
| `ADMIN_PASSWORD` | login for `/admin`. **Code fallback is `changeme` — MUST override in prod.** |
| `JWT_SECRET` | signs admin JWT. **Has an insecure hard-coded fallback — MUST override in prod.** Gen: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; prod domain in Netlify (used for invite/magic links) |

---

## Known issues

1. **Accidental production deploy on Netlify.** Pushing the initial commit to GitHub triggered an
   auto-deploy via Netlify's GitHub integration before env vars/Supabase were confirmed. Treat the live
   URL as unaudited until env vars are verified in Netlify (see Known issue #2), the `@netlify/plugin-nextjs`
   build plugin is confirmed active, and Supabase is confirmed correctly wired.
2. **Insecure secret fallbacks in code:** if `ADMIN_PASSWORD` / `JWT_SECRET` env vars are unset, the app still
   boots with `changeme` / a known default → admin wide open. Always set them in prod. (Consider failing fast
   if missing — not yet implemented.)
3. **Invite "magic-link" email is effectively a no-op:** `POST /api/admin/clients` calls
   `supabase.auth.admin.generateLink()` but **discards the result**, and `generateLink` only *creates* a link
   (for sending via your own provider) — it doesn't send mail. **Working invite path = "copy token URL"** and
   share manually (WhatsApp/SMS/email). Wire a transactional email provider if real emailing is wanted.
4. **No new-lead notification** — leads land silently in `access_requests`; admin must open `/admin` to see them.
5. **No spam protection** on public `POST /api/access-request` (length guards only; no rate limit/captcha/honeypot).
6. **No consent capture** on the lead form (name/email/phone collected; CASL in Canada wants explicit consent).

---

## File structure (key files only; `node_modules` omitted)

```
true-cost-revealer/                    ← APP ROOT (run npm/npx here)
├── CONTEXT.md                         ← this file
├── README.md                          ← human setup/deploy guide
├── package.json                       ← deps + scripts
├── next.config.mjs                    ← supabase image host + externalize jspdf/html2canvas on server
├── tailwind.config.ts                ← brand colours (navy/aqua scale), Inter font, fade-in
├── tsconfig.json · postcss.config.mjs · .eslintrc.json
├── .env.local.example                 ← env var template (no secrets)
├── middleware.ts                      ← invite gate on /calculator*
├── types/index.ts                     ← ALL TS interfaces (configs, Client, CalculatorInputs, CalculationResult…)
├── supabase/schema.sql                ← full DB schema: tables, RLS, validate_token(), seeds
├── app/
│   ├── layout.tsx                     ← root layout, Inter, metadata
│   ├── globals.css                    ← Tailwind base + body bg #0A1628 + range slider + reduced-motion
│   ├── page.tsx                       ← '/' → redirect to /calculator
│   ├── request-access/page.tsx        ← PUBLIC lead landing (blurred number, consultant card) + form
│   ├── access/[token]/page.tsx        ← token redemption UI → validate → /calculator
│   ├── calculator/page.tsx            ← gated 3-step form host
│   ├── calculator/results/page.tsx    ← SERVER: load config + client tier → <ResultsPage>
│   ├── admin/page.tsx                 ← JWT-gated dashboard (3 managers)
│   ├── admin/login/page.tsx           ← password login
│   └── api/
│       ├── access-request/route.ts    ← POST public lead → access_requests
│       ├── validate-token/route.ts     ← POST token → RPC → set tcr_token cookie
│       ├── report/route.ts            ← POST persist report → client_reports
│       └── admin/
│           ├── auth/route.ts          ← POST login / DELETE logout / GET check (JWT)
│           ├── clients/route.ts       ← GET/POST/PATCH/DELETE clients (+ magic-link gen, see issue #3)
│           ├── clients/report/route.ts← admin regen client PDF from SAVED snapshot
│           ├── access-requests/route.ts← GET leads / POST convert→client / DELETE dismiss
│           ├── config/route.ts        ← GET / PATCH espring+paypal (spreads ...updates)
│           └── logo/route.ts          ← POST logo upload → Storage 'assets'
├── components/
│   ├── ui/                            ← Button.tsx, Input.tsx (primitives)
│   ├── RequestAccessForm.tsx          ← lead-capture form (name + email/phone)
│   ├── calculator/                    ← CalculatorForm (orchestrator), ProgressBar, StepPersonal,
│   │                                     StepBottledWater, StepAdditional
│   ├── results/                       ← ResultsPage (orchestrator + sticky CTA) and sections:
│   │                                     InputsSummary, AnnualSpendSection, MoneyLostSection,
│   │                                     ComparisonTable, PlasticRealitySection, ConvenienceCallout,
│   │                                     BreakEvenSection, CostChart, WealthBuildingSection,
│   │                                     MilestonesSection, CTASection, FilterWarning,
│   │                                     SavingsVisualization, ReportDownloadCard
│   └── admin/                         ← ClientManager, AccessRequestsManager, ConfigEditor,
│                                         ClientReportDownload, AdminLogout
└── lib/
    ├── supabase/                      ← client.ts (browser anon), server.ts (SSR anon), admin.ts (service-role)
    ├── calculations/water-cost.ts     ← financial engine (runCalculation)
    ├── pdf/                           ← generate.ts, section-html.ts (PDF assembly)
    ├── report-sections.ts             ← section registry, stable IDs, template/tier defaults + labels
    ├── admin-auth.ts                  ← requireAdmin() JWT guard for API routes
    └── utils.ts                       ← formatCurrency(), cn()
```

---

## Quick commands

```bash
cd "C:/Logicx/Amway/Russel_Brunson/App_build_folder/cost_Resolver/true-cost-revealer"
npx tsc --noEmit && npm run lint     # fast verify (types + lint)
npm run build                        # full production build (the real deploy gate)
npm run dev                          # local dev (port 3000 — don't kill an existing one)
```
