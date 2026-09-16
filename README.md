# Skwad

Paste-link **matchday board** for Bangkok recreational sports ก๊วน. Public name **Skwad** (repo: project-roster).

Football first, multi-sport later. Smallest credible board: organiser creates a matchday, copies a link, guests tap Going / Out.

## What it is

**Guests (players — no app, no account)**

1. Open the share link
2. Going or Out
3. Fat position chips from the matchday sport:
   - Football: GK · RB · CB · LB · RW · LW · CM · CAM · CDM · CF · Any
   - Basketball: PG · SG · SF · PF · C · Any
4. Type a name (remembered in a cookie)
5. Done in under a minute

**Organisers (magic-link auth)**

- Create a matchday: sport (Football | Basketball, default Football), title, when/where as text (no venue booking)
- Copy the share link
- Live roster of Going players + positions
- Organiser-only cream/teal pitch: Football formation chips (4-3-3 / 4-4-2 / 4-1-4-1 / 3-5-2), Basketball 5-slot half-court. First-fit from Going chips; extras on the bench. No drag, no player-facing pitch.
- Imbalance banner when the side looks skewed

Positions snapshot as JSON on each matchday. Players stay on chips.

## Visual tokens

All colour lives in the `:root` block of `app/globals.css`. Swap that block to restyle.

Current skin: cream / warm-white ground, dark ink, **Signal teal** (`#00D4C8` family) for the Skwad lockup, Going, selected chips, and CTAs. Interim logo: white SKWAD (chevron A, no crossbar) on a Signal teal capsule.

## What it is not

Venues, ratings, matchmaking, chat, payments, charging players, photo uploads, embedded maps, player apps/accounts, drag-and-drop tactics, Footballizer chrome.

## Pitch fill

Organiser-only. Going players fill the first empty slot whose key matches their chip (`Any` and extras go to **bench**). Empty slot shows a muted abbr and a soft teal `Need CB` pill. If 2+ slots are empty and someone is Going: `3 slots open · light on defence`. If nobody is Going: `Pitch fills as players tap Going`.

## Imbalance rule

Going RSVPs only. Flex / **Any** is ignored. Soft copy from the sport’s groups — not a pitch or formation.

**Football:** GK | backs (RB/CB/LB) | wings (RW/LW) | mids (CM/CAM/CDM) | CF

**Basketball:** guards (PG/SG) | wings (SF) | bigs (PF/C)

1. GK count **> 1** → `Too many GKs`. If CB is also 0 → `Too many GKs · need a CB`.
2. A field group is **heavy** if its total is **≥ 3**, or one spot in it is **≥ 2** and the group is at least **2** above the lightest other field group.
3. A field group is **light** if its total is **0** while another field group is heavy.
4. Lead copy is `3 PGs` when a count-style group is piled on one chip, otherwise `Heavy on CMs`. Need copy is `light on wings`, `need a big`, or `need a CB`. Fragments join with ` · `.

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
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` | yes | HMAC for session cookies. `openssl rand -base64 32` |
| `APP_URL` | yes | Public origin, e.g. `http://localhost:3000` or the Vercel URL. Used for copied share links. |
| `AUTH_DEBUG` | dogfood | `true` prints the magic link on the login screen (and in server logs). Use this until email sending is wired. |

Local example:

```
DATABASE_URL="postgresql://roster:roster@127.0.0.1:5432/roster"
AUTH_SECRET="replace-with-a-long-random-string"
APP_URL="http://localhost:3000"
AUTH_DEBUG="true"
```

## Tests

Playwright covers: Football match → guest CB on the roster → Too many GKs; 4-1-4-1 empty `Need` pills then a Going CB fills a CB slot; Basketball match → PG chips.

```bash
npx prisma migrate deploy
npx playwright install chromium
npm test
```

## Deploy to Vercel (Mark)

Redeploy **https://project-roster-tau.vercel.app** from this PR so the locked **Skwad** wordmark, favicon, and share cards go live. Coach-board and chips are unchanged.

1. Create a Vercel project from this GitHub repo (already up at `project-roster-tau`).
2. Provision Postgres (Vercel Postgres, Neon, or Supabase).
3. Set environment variables on the project: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL` (the production `https://…` URL), and `AUTH_DEBUG=true` for the first dogfood deploy so magic links show on screen.
4. Deploy. `npm run build` runs `prisma generate`, `prisma migrate deploy`, then `next build`.
5. Confirm `/` loads, request a magic link with `AUTH_DEBUG` on, create a matchday, paste the guest link in a private window.

Email delivery is intentionally out of MVP1. Leave `AUTH_DEBUG=true` until a provider is added.
