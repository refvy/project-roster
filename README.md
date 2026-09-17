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
- Organiser **Squad** board: football **half-pitch** (~3:4 portrait, cream ground, Signal teal lines — GK just above the goal line, forwards on the centre-circle arc), basketball cream schematic **half-court** (hoop/key at the top, proper 3-point corners + arc, half center circle on the midcourt line; **C** at the rim, **PF · SF** wide, **SG · PG** closer). Formation chips 4-3-3 / 4-4-2 / 4-1-4-1 / 3-5-2. Slots: empty = muted abbr; filled = first name + abbr; extras get a corner teal `+N` (cream ring, cap 9+). Tap for the full list. Fill order: exact → compatible (CAM/CDM → CM; LW ↔ LM; RW ↔ RM) → Any vacancies. **Bench / Any** = leftover Any + unmatched. Collapsed **Out · N** after the bench (hidden when empty). No drag.
- Imbalance banner when the side looks skewed

Positions snapshot as JSON on each matchday. Players stay on chips.

## Visual tokens

All colour lives in the `:root` block of `app/globals.css`. Swap that block to restyle.

Current skin: cream / warm-white ground, dark ink, **Signal teal** (`#00D4C8` family) for the Skwad lockup, Going, selected chips, and CTAs. Locked logo (Steve): white SKWAD, chevron A, notched teal capsule — header `public/skwad-header.png`, icon `app/icon.png`. Match share OG: cream card, SKWAD capsule, title; **description is the match when/where**. Landing and /board OG tagline: **Paste a link. Get your squad signed up.** Type: **Outfit** only — ExtraBold titles (`tracking-tight`), Medium/Regular body. No serif.

## What it is not

Venues, ratings, matchmaking, chat, payments, charging players, photo uploads, embedded maps, player apps/accounts, drag-and-drop tactics, Footballizer chrome.

## Squad fill

Organiser **Squad** board. Fill order: **exact position → compatible → Any vacancies**. Compatible when the formation has no exact slot: CAM/CDM → CM; LW ↔ LM; RW ↔ RM. Named-position overflow **stays on that slot**. Empty: muted abbr outline. Filled: first name (~8 chars) + abbr. Extras: corner teal `+N` (cream numeral + 2px cream ring; min 22px; cap **9+**). Tap opens the full list. Leftover **Any** (board full) and unmatched keys sit on **Bench / Any** with a teal Any chip. Empty bench: `Nobody on the bench yet.` **Out · N** is a collapsed row under the bench (hidden when nobody is Out). Football is a ~3:4 portrait half-pitch. Basketball is a cream portrait half-court (C / PF·SF / SG·PG) with 3-point corners + arc and a half center circle on the midcourt line. If 2+ slots are empty and someone is Going: `3 slots open · light on defence`. If nobody is Going: `Squad fills as players tap Going`.

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

Playwright covers: crowded chip keeps the name + corner `+N`; football player chips Any·GK on the bottom row; match OG description = when/where; landing/board OG tagline; basketball 3pt + center circle; `+ New matchday`; Copy invitation link; Squad; Invited/Hosting; CAM/CDM on CM; Out · N.

```bash
npx prisma migrate deploy
npx playwright install chromium
npm test
```

## Deploy to Vercel (Mark)

Redeploy **https://project-roster-tau.vercel.app** from this PR so name++N chips, ball sport icons, the fixed basketball 3pt/center circle, Any·GK chip row, and OG copy go live.

1. Create a Vercel project from this GitHub repo (already up at `project-roster-tau`).
2. Provision Postgres (Vercel Postgres, Neon, or Supabase).
3. Set environment variables on the project: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL` (the production `https://…` URL), and `AUTH_DEBUG=true` for the first dogfood deploy so magic links show on screen.
4. Deploy. `npm run build` runs `prisma generate`, `prisma migrate deploy`, then `next build`.
5. Confirm `/` loads, request a magic link with `AUTH_DEBUG` on, create a matchday, paste the guest link in a private window.

Email delivery is intentionally out of MVP1. Leave `AUTH_DEBUG=true` until a provider is added.
