# CONTEXT.md — True Cost Revealer

> **Purpose of this file:** session-bootstrap context. Read this first at the start of any
> session to get up to speed without re-reading all source. Keep it updated when major
> work lands (see "Last completed task" + "Build status").
> **Last updated:** 2026-07-22

---

## TL;DR (orientation in 5 lines)

- **What:** Invite-only, high-conversion web app that shows a household their *annual + 10-year*
  cost of bottled water vs. an Amway **eSpring** purifier, then drives them to buy. US & Canada.
- **Where:** App root is the **`true-cost-revealer/`** subfolder (NOT the parent `cost_Resolver/`).
  Run all toolchain commands from inside `true-cost-revealer/`.
- **Stack:** Next.js 14.2.35 (App Router) + TypeScript + Tailwind + Supabase (Postgres/Storage).
- **State:** Feature-complete, **production build passes clean**, and **live in production on Vercel**
  at **`https://tcr.hamsaga.com`** (custom domain, Namecheap DNS, auto-provisioned SSL). Fully verified
  end-to-end: lead capture → admin convert-to-client → token link → calculator → report → PDF download
  all confirmed working by the user.
- **Deploy platform is Vercel, NOT Netlify.** The project was originally accidentally deployed on
  Netlify via GitHub auto-deploy before env vars were set; that Netlify site/data was deleted entirely
  and the project was re-deployed fresh on Vercel (2026-07-09/10). `netlify.toml` was removed from the
  repo. See "Known issues" for the root cause of the 401 hit during migration and how it was fixed.
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
| `espring_config` | Singleton: prices, inflation, return rate, CTA text, **floating_cta_label/button/url**, consultant info, logo, `pdf_templates` (brief/standard/full section-ID arrays), `default_client_tier` | **public read**, service-role write |
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
  Button also has an **admin-set link** (`floating_cta_url`) — opens in a new tab when clicking the sticky
  button; falls back to the original scroll-to-`#get-espring` behavior when left blank.
- PDF export: brief/standard/full templates, gated by client `download_tier`; snapshot saved.
- Admin panel: client CRUD + token links + enable/disable + stats; leads view/convert/dismiss; full ConfigEditor
  (eSpring, PayPal, PDF templates, floating CTA, consultant info, logo upload).
- DB schema with RLS + `validate_token` + seed rows. **`floating_cta_label`/`floating_cta_button` migration
  already run in the user's Supabase.**
- **Production build passes clean** (19 routes); `tsc --noEmit` + `next lint` clean.

### ✅ DONE (since last update)
- `git init` + first commit (`5c96746`) + pushed to GitHub: `ochuko9/true-cost-revealer` (`master`).
- **Migrated deployment from Netlify to Vercel.** Netlify site/data deleted; `netlify.toml` removed
  (commit `eb5b725`). Project imported into Vercel via GitHub, root directory `./`. No code changes
  needed — `next.config.mjs` had nothing Netlify-specific.
- **All 6 env vars confirmed set correctly in Vercel** (Project → Settings → Environments → Production
  — note Vercel renamed the old "Environment Variables" page to "Environments").
- **Custom domain live:** `tcr.hamsaga.com` (Namecheap CNAME → `cname.vercel-dns.com`), SSL
  auto-provisioned by Vercel. `NEXT_PUBLIC_APP_URL` updated to match and redeployed.
- **Full end-to-end smoke test passed:** lead form submit → admin convert lead to client → copy token
  link → open it → complete calculator → report renders → PDF downloads. All confirmed working in prod.
- **Admin-configurable floating CTA link** (`floating_cta_url`, commit `b72f447`): the sticky floating
  CTA button now opens an admin-set URL in a new tab (currently pointed at `register.amway.com`);
  blank = falls back to the previous scroll-to-`#get-espring` behavior. Required a Supabase migration
  (`alter table espring_config add column if not exists floating_cta_url text;`) — this **has been run**
  against the production Supabase project (feature was tested end-to-end, automated + manual, and
  shipped/verified live). Followed by an empty "trigger redeploy" commit (`3960714`) after a GitHub
  committer-email verification hiccup delayed the Vercel auto-deploy.

### ❌ NOT DONE / NOT CONFIRMED
- Confirm a public Storage bucket named **`assets`** exists in Supabase (needed for admin logo uploads
  — not yet exercised in the smoke test).

### ◻️ OPTIONAL (polish / nice-to-have, not blocking)
- New-lead notification email/SMS (none wired — admin must check `/admin`).
- Real invite-email sending (currently a no-op — see Known issues #3; copy-token-URL works).
- Spam protection (rate limit / captcha / honeypot) on the public lead form.
- Consent / privacy note on the lead form (CASL applies in Canada).
- Custom domain.

---

## Last completed task

**Fixed a crash on `/admin` after login** (2026-08-03): user reported "Application error: a client-side
exception has occurred" right after admin login. Reproduced locally (Playwright against a local dev
server pointed at the same Supabase project as prod) and root-caused to `ConfigEditor.tsx`: when
`GET /api/admin/config` returns `{"espring": null, "paypal": null}` (see Known issue #1 — happens when
Supabase can't be reached or the singleton config row isn't found), the component unconditionally read
fields off the null `espring`/`paypal` objects (starting at the `labelIsCustom`/`buttonIsCustom` derived
state, e.g. `espring.floating_cta_label`), throwing during render and taking down the whole page. Fixed
by adding a `loadError` state: a null/failed config response now renders a "couldn't load configuration —
Retry" block instead of the form. Verified with `tsc --noEmit` and a targeted `eslint` pass (clean).
**Not yet resolved:** *why* the config API was returning null in the first place — that's a Supabase-side
question (connectivity, project status, or the config row) the user should check separately; this fix
only stops it from crashing the page.

Prior to that: **added an admin-configurable link to the floating CTA button** (`floating_cta_url`, commit `b72f447`,
2026-07-13). The sticky floating CTA on the results page now opens an admin-set URL in a new tab when
clicked (currently pointed at `register.amway.com`), falling back to the existing scroll-to-CTA-section
behavior when left blank — existing configs keep working unchanged. Touched `types/index.ts`,
`supabase/schema.sql` (+ migration note), `app/calculator/results/page.tsx` (default fallback),
`ConfigEditor.tsx` (new "Button link" input), `ResultsPage.tsx` (click handler). Required and ran a
Supabase migration (`alter table espring_config add column if not exists floating_cta_url text;`).
Built, tested (automated + manual), and shipped to production; followed by an empty commit (`3960714`)
to retrigger a Vercel auto-deploy that had stalled on a GitHub committer-email verification issue.

Prior to that: **migrated deployment from Netlify to Vercel and did a full production launch
verification.** User deleted the Netlify site/data entirely, removed `netlify.toml` (`eb5b725`), imported the repo into
Vercel via GitHub, set all 6 env vars, connected the custom domain `tcr.hamsaga.com` via Namecheap, and
ran a complete smoke test (lead form → admin convert-to-client → token link → calculator → report → PDF)
— all confirmed working. Along the way, hit and fixed a 401/crash caused by (1) Vercel env vars not
saving on first entry during the import flow, and (2) a Supabase project/key mismatch between what was
typed fresh into Vercel vs. the working local `.env.local` — fixed by copying the exact local values in.

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

Production is live and verified — no urgent blockers. Highest-value optionals from here:
1. **New-lead notification email/SMS** — leads currently land silently in `access_requests`; admin has
   to check `/admin` manually to notice them (see Known issue #4).
2. **Real invite-email sending** — magic-link generation is currently a no-op; "copy token URL" is the
   only working invite path (see Known issue #3).
3. Confirm the public Storage bucket **`assets`** exists in Supabase (logo upload feature untested since
   the Vercel migration).
4. Spam protection (rate limit/captcha/honeypot) on the public `/api/access-request` endpoint.

---

## Environment variables (names only — never commit values)

Copy `.env.local.example` → `.env.local` locally; set the same in Vercel → Project → Settings →
**Environments → Production** (Vercel renamed the old single "Environment Variables" page to
"Environments" — the per-environment var list lives one level in from there).

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key — **server only**, full DB access |
| `ADMIN_PASSWORD` | login for `/admin`. **Code fallback is `changeme` — MUST override in prod.** |
| `JWT_SECRET` | signs admin JWT. **Has an insecure hard-coded fallback — MUST override in prod.** Gen: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; `https://tcr.hamsaga.com` in prod (used for invite/magic links) |

---

## Known issues

1. **Vercel env vars can silently fail to save on first entry during the GitHub-import flow.** During
   the Netlify→Vercel migration, values typed into the "Add New Project" import screen's env var fields
   didn't actually persist — the project's Environments → Production page showed "No Environment
   Variables Added" despite having filled them in. Fix: add/verify them *after* import completes, directly
   under Project → Settings → **Environments → Production**, then redeploy. Don't trust that a page loading
   (e.g. `/request-access`) proves env vars are correct — public/static pages render fine even with zero
   Supabase config, since nothing hits Supabase until a form submits or a server component fetches config.
   Verify by hitting a Supabase-backed API route directly, e.g. `GET /api/admin/config`, and checking the
   actual response body (not just HTTP status) — a `{"espring": null, "paypal": null}` response with a
   `200` status means the Supabase call succeeded but found no matching row (likely wrong project/key),
   not that something crashed.
   **Update 2026-08-03:** this exact null-config condition used to take down the *entire* `/admin` page
   with Next.js's generic "Application error: a client-side exception has occurred" — `ConfigEditor.tsx`
   destructured `espring`/`paypal` from the API response and read fields off them (e.g.
   `espring.floating_cta_label`) with no null guard, so a null response crashed the whole component tree
   (`ClientManager`/`AccessRequestsManager` fail gracefully via `Array.isArray` checks; `ConfigEditor` did
   not). Fixed by adding a `loadError` state that shows a "couldn't load config, Retry" block instead of
   rendering the form when the response is null — root cause of the *underlying* null response (Supabase
   connectivity/row) is still whatever this item describes and needs checking separately (Supabase project
   status/env vars) if it recurs.
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
