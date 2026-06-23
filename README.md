# True Cost Revealer

A private, invite-only water cost calculator that shows clients exactly what they spend annually on bottled water vs. switching to an eSpring water purification system. Generates a personalized results report in under 60 seconds.

---

## Quick Start (Local Development)

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier is sufficient)

### 2. Install Dependencies

```bash
cd true-cost-revealer
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `ADMIN_PASSWORD` | You choose — used to log in to `/admin` |
| `JWT_SECRET` | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally, your domain in production |

### 4. Set Up the Database

1. Go to your Supabase project → **SQL Editor**
2. Open `supabase/schema.sql` from this repo
3. Paste the entire file and click **Run**

This creates all tables, seeds default config values, enables Row Level Security, and installs the `validate_token` function.

**Storage bucket (for logo uploads):**
1. Supabase → **Storage** → Create a new bucket
2. Name it `assets`, set it to **Public**

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How It Works

### Client Flow

1. Admin adds a client in `/admin` — either by email (sends magic link) or generates a token URL
2. Client opens the link: `/access/abc123xyz`
3. Token is validated, a 7-day session cookie is set
4. Client completes the 3-step calculator form
5. Results page renders their personalized report
6. Client can download a branded PDF summary

### Admin Flow

Go to `/admin` → enter your `ADMIN_PASSWORD`.

**Client Management:**
- Add clients by email (sends magic link via Supabase Auth) or generate a token-only link
- Copy shareable link to clipboard (for WhatsApp, SMS, etc.)
- Enable/disable access per client without deleting
- View open count and last-access time per client

**eSpring Configuration:**
- Edit system prices, filter capacity, inflation rates
- Changes apply to all future client sessions immediately
- Upload a logo for PDF branding
- Edit the PDF call-to-action text

**PayPal Financing:**
- Update hard-coded payment amounts if Amway pricing changes
- Values are displayed exactly — no dynamic calculation from APR

---

## Deployment (Vercel + Supabase)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create true-cost-revealer --private --source=. --push
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo
2. Framework: **Next.js** (auto-detected)
3. Add all variables from `.env.local.example` in Vercel → **Settings → Environment Variables**
4. Click **Deploy**

### 3. Custom Domain (optional)

1. Vercel → your project → **Settings → Domains**
2. Add your domain (e.g. `truecost.yourbrand.com`)
3. Update DNS with the CNAME Vercel provides
4. Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables to match

### Running Cost

| Service | Free tier |
|---|---|
| Vercel | 100GB bandwidth/month |
| Supabase | 500MB DB, 1GB storage |

**Expected cost: $0/month** for typical usage (invite-only, small client list).

---

## Project Structure

```
true-cost-revealer/
├── app/
│   ├── access/[token]/      # Token validation & session creation
│   ├── calculator/          # 3-step input form
│   │   └── results/         # Personalized results report
│   ├── admin/               # Admin panel (password-protected)
│   │   └── login/
│   └── api/
│       ├── validate-token/  # POST — validates token, sets session cookie
│       └── admin/
│           ├── auth/        # Admin login/logout via JWT cookie
│           ├── clients/     # Client CRUD
│           ├── config/      # eSpring + PayPal config PATCH
│           └── logo/        # Logo upload to Supabase Storage
├── components/
│   ├── calculator/          # Multi-step form steps + progress bar
│   ├── results/             # 6 result sections + PDF export
│   ├── admin/               # Client manager + config editor
│   └── ui/                  # Button, Input primitives
├── lib/
│   ├── calculations/        # Core financial engine (water-cost.ts)
│   ├── supabase/            # Browser / server / admin clients
│   ├── admin-auth.ts        # JWT middleware for API routes
│   └── utils.ts             # Currency formatters, cn()
├── types/index.ts           # All TypeScript types + US state tax rates
└── supabase/schema.sql      # Full DB schema — run once in Supabase SQL editor
```

---

## Calculation Logic

All calculations are in [`lib/calculations/water-cost.ts`](lib/calculations/water-cost.ts).

- **Annual spend**: `bottles/week × 52 × cost × (1 + tax) + delivery + filtration + other`
- **Cost per litre**: derived from 500ml per standard bottle × household size
- **Break-even**: month-by-month cumulative comparison until eSpring total falls below bottled water total
- **10-year projection**: both sides compounded with admin-configured inflation rates (default: 3% bottled water, 2% eSpring)
- **PayPal plans**: displayed from hard-coded published values — never recalculated from APR

---

## Security Notes

- Admin panel uses signed JWT cookies (8-hour expiry)
- Client access uses `httpOnly` session cookies (7-day expiry)
- All admin API routes call `requireAdmin()` which verifies JWT before any DB write
- Supabase Row Level Security enabled on all tables
- Service role key is server-side only — never shipped to the browser
- Token validation runs via a Supabase `security definer` function
