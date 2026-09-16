# Project Roster

Paste-link **matchday board** for Bangkok recreational sports ก๊วน. Working code name — public brand TBD.

Football first, multi-sport later. Smallest credible board: organiser creates a matchday, copies a link, guests tap Going / Out.

## What it is

**Guests (players — no app, no account)**

1. Open the share link
2. Going or Out
3. Fat position chips: GK / DEF / MID / FWD / Any
4. Type a name (remembered in a cookie)
5. Done in under a minute

**Organisers (magic-link auth)**

- Create a matchday: title + when/where as text (no venue booking)
- Copy the share link
- Live roster of Going players + positions
- Imbalance banner when the side looks skewed

Positions live as JSON on each matchday so another sport can swap the chip set later without a schema rewrite.

## Visual tokens

All colour lives in the `:root` block of `app/globals.css`. Swap that block to restyle — no brand lockup yet.

Current skin: cream / warm-white ground, dark ink, **Signal teal** (`#00D4C8` family) for the wordmark, Going, selected chips, and CTAs.

## What it is not

Venues, ratings, matchmaking, chat, payments, charging players, public brand hunt, photo uploads, embedded maps, player apps/accounts.

## Imbalance rule

Going RSVPs only. Flex / **Any** is ignored.

1. **Special** positions (football: GK) — if count **> 1**, warn `Too many GKs`.
2. **Field** positions (football: DEF / MID / FWD) — if the highest count is **≥ 2** and **at least 2 more** than the lowest, warn `Too many DEFs · need a MID` (labels from the overloaded / needed chips).
3. Fragments join with ` · `.

So two keepers on the list is enough to show **Too many GKs**.

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

Playwright covers the MVP loop: organiser creates a matchday → copy link → guest Going + position → roster → imbalance when too many GKs.

```bash
npx prisma migrate deploy
npx playwright install chromium
npm test
```

## Deploy to Vercel (Mark)

1. Create a Vercel project from this GitHub repo.
2. Provision Postgres (Vercel Postgres, Neon, or Supabase).
3. Set environment variables on the project: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL` (the production `https://…` URL), and `AUTH_DEBUG=true` for the first dogfood deploy so magic links show on screen.
4. Deploy. `npm run build` runs `prisma generate`, `prisma migrate deploy`, then `next build`.
5. Confirm `/` loads, request a magic link with `AUTH_DEBUG` on, create a matchday, paste the guest link in a private window.

Email delivery is intentionally out of MVP1. Leave `AUTH_DEBUG=true` until a provider is added.
