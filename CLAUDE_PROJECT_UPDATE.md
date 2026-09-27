# True Cost Revealer — Project Update
**For:** Lead-Gen-offer (Claude.ai Project knowledge)
**As of:** 2026-07-14

---

## What this is

True Cost Revealer is an invite-only marketing/sales tool built for an Amway eSpring water-purifier
consultant. A prospect gets a private link, completes a 3-step calculator about their bottled-water
habits, and receives a personalized, emotionally-framed report showing their annual and 10-year cost
of bottled water vs. switching to an eSpring system — designed to "strike the emotions, produce a
state of excitement to act immediately" (pain / loss-aversion framing, red numbers for losses). It
ends in a call-to-action to talk to the consultant and/or download a branded PDF.

## Current status: live in production

- **Live URL:** `https://tcr.hamsaga.com`
- **Hosting:** Vercel (migrated from Netlify this month — the original Netlify deploy was accidental
  and has since been fully decommissioned)
- **Domain:** custom subdomain on `hamsaga.com`, registered at Namecheap, DNS via CNAME to Vercel
- **Database/backend:** Supabase (Postgres + Storage), same project used for local dev and production
- **Verified working end-to-end:** lead capture form → admin converts lead to client → client gets a
  token link → completes calculator → sees personalized report → downloads PDF. All confirmed working
  in production, not just locally.

## How leads flow through it

1. **Public lead capture** (`/request-access`) — a teaser page ("Your 10-year number — hidden until
   you look," a blurred $27,840 example) collects name + email or phone. No calculator access yet.
2. **Admin reviews leads** in `/admin` — sees every submission, can convert a promising lead into a
   full "client" record, which generates a private, single-use-style token link.
3. **Client redeems the link** (`/access/<token>`) — validates the token, sets a 7-day session, sends
   them into the gated `/calculator`.
4. **3-step calculator** — household size, bottled-water buying habits, other water spend. Deliberately
   low-friction (no required fields block progress except first name).
5. **Personalized report** — ~13 narrative sections: annual spend, money lost, plastic waste reality,
   break-even timeline, 10-year projection, "wealth building" reframe (what that money could become
   invested instead), milestones, and a closing call-to-action with the consultant's contact info.
6. **Conversion paths:** call/contact the consultant directly, or download a PDF report (tiered:
   brief/standard/full, admin controls which tier each client gets).

## Admin controls (all in `/admin`, password-protected)

Nearly everything is configurable without a code change: eSpring pricing/inflation assumptions,
PayPal financing plan display, the closing CTA copy, consultant contact info (name/phone/email/
booking link), logo, and which report sections appear in each PDF tier. Also manages the lead list
and client list directly.

## Recent work (this update cycle)

- **Migrated hosting from Netlify to Vercel** and got a custom domain (`tcr.hamsaga.com`) fully live
  with SSL, after tracking down a couple of DNS/env-var misconfigurations along the way.
- **Added a new feature:** the "floating CTA" — a sticky bar that slides up as someone scrolls through
  their report, showing their savings figure and a button — now has an **admin-configurable link**.
  The button can open any URL the admin sets (currently pointed at `register.amway.com`), or if left
  blank, falls back to scrolling to the on-page CTA section. This was built, tested (automated +
  manual), and shipped to production.

## Known gaps (not urgent, but worth knowing)

- **No new-lead notifications** — submissions land silently; admin has to check the dashboard to see
  them. Highest-value next improvement.
- **Invite emails aren't automated** — the working invite path today is "admin copies the token link
  and sends it manually" (text/email/WhatsApp), not an automatic email.
- **No spam protection** on the public lead form (no rate limiting or CAPTCHA yet).
- **No consent checkbox** on the lead form (relevant if targeting Canadian leads, CASL requirements).

## Bottom line for Lead-Gen-offer

The tool is live, stable, and has been exercised through a full real conversion path in production.
It's ready to be used as a genuine lead-generation asset today. The biggest lever left on the table
is lead-notification automation, so leads don't sit unseen between admin check-ins.
