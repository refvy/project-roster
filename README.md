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
5. See who’s Going, sorted back→front for that match’s formation, then Any / extras
6. After **I’m going**, **Add someone else** on the same link (name + Going/Out + position). Extras show `added by {you}`; you can edit/delete only people you added
7. Done in under a minute

**Organisers (magic-link auth)**

- Create a matchday: sport (Football | Basketball, default Football), title, when/where as text (no venue booking)
- Edit title / when-where / sport / formation; delete with one confirm (guest link shows a deleted state)
- Copy the share link
- Live roster of Going players + positions, same back→front order guests see
- Organiser-only board: football **half-pitch** (~3:4 portrait, cream ground, Signal teal lines — GK just above the goal line, forwards on the centre-circle arc), basketball cream schematic **half-court** (key + arc, same teal line weight). Formation chips 4-3-3 / 4-4-2 / 4-1-4-1 / 3-5-2. **Stack-then-expand** on matching slots (up to 2 first names + teal `+N`; tap for the full list). **Any is not a slot** — muted cream **Bench / Any** strip is Any + unmatched only (named-position overflow stays on the slot). No drag, no player-facing pitch.
- Imbalance banner when the side looks skewed

Positions snapshot as JSON on each matchday. Players stay on chips.

## Visual tokens

All colour lives in the `:root` block of `app/globals.css`. Swap that block to restyle.

Current skin: cream / warm-white ground, dark ink, **Signal teal** (`#00D4C8` family) for the Skwad lockup, Going, selected chips, and CTAs. Locked logo (Steve): white SKWAD, chevron A, notched teal capsule — header `public/skwad-header.png`, icon `app/icon.png`, OG `app/opengraph-image.png`. Type: **Outfit** only — ExtraBold titles (`tracking-tight`), Medium/Regular body. No serif.

## What it is not

Venues, ratings, matchmaking, chat, payments, charging players, photo uploads, embedded maps, player apps/accounts, drag-and-drop tactics, Footballizer chrome.

## Pitch fill

Organiser-only. Going players **stack** on matching formation slots in signup order (balanced across duplicate keys like two CBs). Each chip shows up to **2** first names (~8 chars) and a teal `+N` for the rest — tap the slot for the full list. Overflow for a named position **stays on that slot**, never the bench. **Any** and unmatched keys (no slot in this formation) sit on a muted cream **Bench / Any** strip. Empty bench: `Nobody on the bench yet.` Empty slot shows a muted abbr only, soft teal ring — no `Need CB` pills. Football is a ~3:4 portrait half-pitch (cream, teal lines; goal at the bottom, kickoff circle at the top). Basketball is a cream schematic half-court with the same teal lines. If 2+ slots are empty and someone is Going: `3 slots open · light on defence`. If nobody is Going: `Pitch fills as players tap Going`. Soft need copy can still appear on the imbalance banner (`3 on LW · light on RW`).

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

Playwright covers: Football match → guest CB on the roster → Too many GKs; ~3:4 half-pitch GK below CF; 4-1-4-1 empty muted slots (no `Need` pills) then a Going CB fills a CB slot; empty **Bench / Any** copy, then Any on the strip; **3 LWs stack** (2 names + `+1`, sheet lists all, overflow off the bench); Basketball match → PG chips + half-court; edit title; delete → guest deleted state; guest Going list sorted GK → CB → Any; guest **I’m going** then **Add someone else** (`added by`) then edits and deletes them.

```bash
npx prisma migrate deploy
npx playwright install chromium
npm test
```

## Deploy to Vercel (Mark)

Redeploy **https://project-roster-tau.vercel.app** from this PR so stack-then-expand slot chips, cream/teal boards, Bench / Any strip, I’m going / Add someone else, Outfit type, and the locked **Skwad** brand go live.

1. Create a Vercel project from this GitHub repo (already up at `project-roster-tau`).
2. Provision Postgres (Vercel Postgres, Neon, or Supabase).
3. Set environment variables on the project: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL` (the production `https://…` URL), and `AUTH_DEBUG=true` for the first dogfood deploy so magic links show on screen.
4. Deploy. `npm run build` runs `prisma generate`, `prisma migrate deploy`, then `next build`.
5. Confirm `/` loads, request a magic link with `AUTH_DEBUG` on, create a matchday, paste the guest link in a private window.

Email delivery is intentionally out of MVP1. Leave `AUTH_DEBUG=true` until a provider is added.
