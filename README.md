# Skwad

Paste-link **matchday board** for Bangkok recreational sports ก๊วน. Public name **Skwad** (repo: project-roster).

Football first, multi-sport later. Smallest credible board: organiser creates a matchday, copies a link, guests tap Going / Out.

## What it is

**Guests (players — no app, no account)**

1. Open the share link
2. Going or Out
3. Fat position chips from the matchday sport, arranged like the board:
   - Football (attack at top): LW · CF · RW / CAM · CM · CDM / LB · CB · RB / Any · GK
   - Basketball: C / PF · SF / SG · PG / Any
4. Type a name (remembered in a cookie)
5. See who’s Going, sorted back→front for that match’s formation, then Any / extras
6. After **I’m going**, **Add someone else** on the same link (name + Going/Out + position). Extras show `added by {you}`; you can edit/delete only people you added
7. Done in under a minute

**Organisers (magic-link auth)**

- Create a matchday: sport (Football | Basketball, default Football), title, when/where as text (no venue booking)
- Edit title / when-where / sport / formation; delete with one confirm (guest link shows a deleted state)
- **+ New matchday**; copy **Copy invitation link** (URL muted under the button)
- Home tabs **Invited** (matches you joined) · **Hosting** (matches you created). SKWAD logo goes here. Managers who also play see both.
- Live roster of Going players + positions, same back→front order guests see
- Organiser **Squad** board: football **half-pitch** (~3:4 portrait, cream ground, Signal teal lines — GK just above the goal line, forwards on the centre-circle arc), basketball cream schematic **half-court** (hoop/key at the top, proper 3-point corners + arc, half center circle on the midcourt line; **C** at the rim, **PF · SF** wide, **SG · PG** closer). Formation chips 4-3-3 / 4-4-2 / 4-1-4-1 / 3-5-2. Slots: empty = muted abbr; filled = first name + abbr; extras get a corner teal `+N` (cream ring, cap 9+). Tap for the full list. Fill order: exact → compatible (CAM/CDM → CM; LW ↔ LM; RW ↔ RM) → Any vacancies. **Bench** = leftover Any + unmatched. Collapsed **Out · N** after the bench (hidden when empty). No drag.
- Imbalance banner when the side looks skewed

Positions snapshot as JSON on each matchday. Players stay on chips.

## Visual tokens

All colour lives in the `:root` block of `app/globals.css`. Swap that block to restyle.

Current skin: cream / warm-white ground, dark ink, **Signal teal** (`#00D4C8` family) for the Skwad lockup, Going, selected chips, and CTAs. Locked logo (Steve): white SKWAD, chevron A, notched teal capsule — header `public/skwad-header.png`, icon `app/icon.png`. Match share OG: cream card, SKWAD capsule, title; **description is the match when/where**. Landing and /board OG tagline: **Paste a link. Get your squad signed up.** Type: **Outfit** only — ExtraBold titles (`tracking-tight`), Medium/Regular body. No serif.

## What it is not

Venues, ratings, matchmaking, chat, payments, charging players, photo uploads, embedded maps, player apps/accounts, drag-and-drop tactics, Footballizer chrome.

## Squad fill

Organiser **Squad** board. Fill order: **exact position → compatible → Any vacancies**. Compatible when the formation has no exact slot: CAM/CDM → CM; LW ↔ LM; RW ↔ RM. Named-position overflow **stays on that slot**. Empty: muted abbr outline. Filled: first name (~8 chars) + abbr. Extras: corner teal `+N` (cream numeral + 2px cream ring; min 22px; cap **9+**). Tap opens the full list. Leftover **Any** (board full) and unmatched keys sit on **Bench** with a teal Any chip. Empty bench: `Nobody on the bench yet.` **Out · N** is a collapsed row under the bench (hidden when nobody is Out). Football is a ~3:4 portrait half-pitch. Basketball is a cream portrait half-court (C / PF·SF / SG·PG) with 3-point corners + arc and a half center circle on the midcourt line. If 2+ slots are empty and someone is Going: `3 slots open · light on defence`. If nobody is Going: `Squad fills as players tap Going`.

## Imbalance rule

Going RSVPs only. Flex / **Any** is ignored. Soft copy from the sport’s groups — not a pitch or formation.

**Football:** GK | backs (RB/CB/LB) | wings (RW/LW) | mids (CM/CAM/CDM) | CF

**Basketball:** guards (PG/SG) | wings (SF) | bigs (PF/C)

1. GK count **> 1** → `Too many GKs`. If CB is also 0 → `Too many GKs · need a CB`.
2. A single named spot **≥ 3** → `3 on LW · light on RW` (empty sibling in the same group).
3. Otherwise a field group is **heavy** if its total is **≥ 3**, or one spot in it is **≥ 2** and the group is at least **2** above the lightest other field group.
4. A field group is **light** if its total is **0** while another field group is heavy.
5. Lead copy is `3 PGs` when a count-style group is piled on one chip, otherwise `Heavy on CMs`. Need copy is `light on wings`, `need a big`, or `need a CB`. Fragments join with ` · `.

## Stack

Next.js App Router (TypeScript) + Tailwind + Postgres (Prisma) + magic-link organiser sessions. Vercel-ready.

## Setup

```bash
cp .env.example .env
# start Postgres, then:
npx prisma migrate deploy
npm run dev
```

### Environment

| Name | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. Local default is `127.0.0.1`. Hosted value lives in the **Vercel project env** (not in git). |
| `AUTH_SECRET` | yes | HMAC for session cookies. `openssl rand -base64 32` |
| `APP_URL` | yes | Public origin for magic-link verify URLs and copied share links. Production: **`https://getskwad.com`** (not the `project-roster-tau.vercel.app` alias). |
| `AUTH_DEBUG` | local / CI | `true` prints the magic link on the login screen (and in server logs). **Unset in Vercel production.** `isAuthDebug()` also returns false when `VERCEL_ENV=production`, so the on-page shortcut cannot leak on the production deployment even if the dashboard var is still set. |
| `RESEND_API_KEY` | production | Resend API key. When set, magic-link emails are sent. Playwright blanks this so CI never burns send quota. |
| `EMAIL_FROM` | with Resend | From header, e.g. `Skwad <onboarding@resend.dev>` until custom domain DNS is live. |

Local example:

```
DATABASE_URL="postgresql://roster:roster@127.0.0.1:5432/roster"
AUTH_SECRET="replace-with-a-long-random-string"
APP_URL="http://localhost:3000"
AUTH_DEBUG="true"
RESEND_API_KEY=""
EMAIL_FROM="Skwad <onboarding@resend.dev>"
```

## Tests

Playwright covers: crowded chip keeps the name + corner `+N`; football player chips Any·GK on the bottom row; match OG description = when/where; landing/board OG tagline; basketball 3pt + center circle; `+ New matchday`; Copy invitation link; Squad; Invited/Hosting; CAM/CDM on CM; Out · N.

```bash
npx prisma migrate deploy
npx playwright install chromium
npm test
```

## Deploy to Vercel (Mark)

Redeploy **production** so **https://getskwad.com** picks this PR up. Do not dogfood guest magic/share links off `project-roster-tau.vercel.app`.

1. Vercel production env: `APP_URL=https://getskwad.com` (so verify emails and Copy invitation link use getskwad.com / skwad.link, not a `*.vercel.app` host). **Unset `AUTH_DEBUG`.** Keep `RESEND_API_KEY` and `EMAIL_FROM`.
2. Preview/tau may stay on a separate DB. Production `DATABASE_URL` must not be the tau database.
3. Deploy. `npm run build` runs `prisma generate`, `prisma migrate deploy`, then `next build`.
4. Confirm https://getskwad.com loads, request a magic link, open it on getskwad.com, create a matchday, paste the guest link (host getskwad.com or skwad.link) in a private window.

Custom domain DNS for `EMAIL_FROM` is handled separately — this pass uses Resend’s onboarding sender until that is live.

### Database access (Dan, read-only)

Hosted Postgres is whatever is in the Vercel project’s `DATABASE_URL` (not committed). Typical Vercel Postgres is Neon-backed; a Neon or Supabase project works the same with Prisma.

For analysis without write access:

1. In the Neon / Vercel Postgres / Supabase dashboard for that database, create a login that has `CONNECT` + `SELECT` only (no `INSERT`/`UPDATE`/`DELETE`).
2. Hand Dan a connection string of the form `postgresql://readonly_user:***@HOST/DB?sslmode=require` via a private channel. Never commit it, never paste it into a PR.
3. Dan points a local Prisma Studio / `psql` at that URL with `prisma studio` or SQL. Production and `project-roster-tau` should each have their own read-only role if he needs both.

The agent cannot see or mint Vercel dashboard credentials.
