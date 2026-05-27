# הַמִּגְרָשׁ — HaMigrash

A Hebrew-first, RTL-first, mobile-first football management platform for amateur leagues.

> All data is derived from **match events**. There is no manual standings editing — points, top scorers, player stats, and brackets all fall out of the event stream.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind, RTL |
| State | TanStack Query, Zustand |
| Validation | Zod |
| Backend | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Auth | Google OAuth only (no passwords) |
| Email | Resend (invitations) — falls back to `console.info` in dev |
| Offline | IndexedDB (Dexie) event queue, idempotent on `client_id` |
| Hosting | Vercel |

---

## 2. Architecture at a glance

```
                ┌─────────────────────────────┐
                │  Next.js (App Router, RTL)  │
                │  - Public pages (/c /t /m /p)│
                │  - Authed app (/dashboard …)│
                │  - Server actions           │
                │  - API routes               │
                └────────────┬────────────────┘
                             │ supabase-js
                             ▼
                ┌─────────────────────────────┐
                │  Supabase (Postgres)        │
                │  - RLS on every table       │
                │  - SECURITY DEFINER helpers │
                │  - SQL functions:           │
                │      competition_standings  │
                │      head_to_head           │
                │      player_stats           │
                │      accept_invitation      │
                │  - Triggers:                │
                │      auto-promote creator   │
                │      flip match status      │
                │  - Realtime publication     │
                └─────────────────────────────┘
```

Permissions are **entity-based** — there are no global roles. A user can be:
- `manager` / `assistant` / `player` on a specific **team**
- `organiser` / `admin` / `scorer` on a specific **competition**
- `referee` / `scorer` / `assistant` on a specific **match**

RLS enforces this. The UI is not trusted.

---

## 3. Setup

### Prerequisites
- Node 20+, pnpm or npm
- A Supabase project (free tier is fine)

### Install

```bash
cd hamigrash
npm install
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### Configure Google OAuth (Supabase Dashboard → Authentication → Providers → Google)

1. Create OAuth credentials in Google Cloud Console.
2. Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
3. Paste the client ID / secret into Supabase.
4. **Disable** email/password sign-in (we are Google-only).

### Apply database migrations

Run the SQL files in `supabase/migrations/` **in order**:

```
0001_extensions_and_enums.sql
0002_profiles.sql
0003_teams_players.sql
0004_competitions.sql
0005_matches_and_events.sql
0006_invitations_and_shares.sql
0007_views_and_standings.sql
0008_invitation_accept.sql
0009_rls_helpers.sql
0010_rls_policies.sql
0011_triggers.sql
0012_realtime.sql
```

Either paste each into the SQL editor, or via CLI:

```bash
supabase link --project-ref <ref>
supabase db push        # if you store them under supabase/migrations
```

### Run

```bash
npm run dev
# → http://localhost:3000
```

---

## 4. Where things live

```
hamigrash/
├── supabase/migrations/      # schema, RLS, functions, triggers
├── src/
│   ├── app/
│   │   ├── page.tsx          # landing
│   │   ├── login/            # Google login
│   │   ├── auth/callback/    # OAuth callback (claims pending invites)
│   │   ├── (app)/            # authed shell (sidebar, topbar)
│   │   │   ├── dashboard/    # organiser control center
│   │   │   ├── teams/        # list + new + detail
│   │   │   ├── competitions/ # list + new + detail (standings, fixtures)
│   │   │   ├── matches/      # list + new + detail (live tracker, retro)
│   │   │   ├── players/      # list + detail (stat sheet + FIFA-style card)
│   │   │   ├── invitations/  # create + accept-by-token
│   │   │   └── balancer/     # team balancer
│   │   ├── c/[slug]/         # public competition page (SEO-friendly)
│   │   ├── t/[slug]/         # public team page
│   │   ├── m/[id]/           # public match page (realtime)
│   │   ├── p/[id]/           # public player page
│   │   ├── s/[token]/        # share-link resolver
│   │   └── api/              # JSON endpoints (invitations, events batch, share)
│   ├── components/           # ui/, layout/, match/, balancer/, standings/, player/
│   └── lib/
│       ├── supabase/         # browser, server, middleware, admin, types
│       ├── algorithms/       # fixtures, knockout, balancer, standings tie-breakers
│       ├── actions/          # server actions (teams, players, competitions, matches, invitations)
│       ├── schemas/          # zod
│       ├── offline/          # IndexedDB event queue + background sync
│       ├── i18n/he.ts        # all Hebrew strings (single source)
│       └── utils.ts
└── README.md
```

---

## 5. Key algorithms

### Standings (`lib/algorithms/standings.ts` + SQL `competition_standings`)
- Postgres computes the base table from `match_events` (no editable cache).
- Order: points → GD → GF → name (in SQL).
- For ties remaining after those, `applyTieBreakers()` adds **head-to-head** points
  computed from the SQL `head_to_head` function. Bulk-applied per tied group.

### Round-robin fixtures (`lib/algorithms/fixtures.ts`)
- Berger / circle method.
- Handles odd counts via a synthetic BYE that's filtered out.
- `rounds = 2` produces home/away legs by reversing each pair in the return leg.

### Knockout brackets (`lib/algorithms/knockout.ts`)
- Standard tournament seeding (1 vs N, 2 vs N-1, …) interleaved so top seeds meet last.
- Bye-aware for non-power-of-two field sizes.
- Generates Round 0 matches up front; later rounds are created as winners are known
  (UI not implemented in this drop — DB stores `bracket_round` / `bracket_slot` and is ready).

### Team balancer (`lib/algorithms/balancer.ts`)
1. Snake-deal players to teams by position group (GK → DF → FW → MF), each sorted by OVR.
2. Hill-climb same-position swaps until max-min total-OVR gap ≤ 1 (or 200 iters).
3. Position-preserving — never sticks all GKs on one team.

---

## 6. Offline-first

`lib/offline/event-queue.ts` (Dexie / IndexedDB):
- Live tracker writes every event locally with a UUID `client_id`.
- `lib/offline/sync.ts` flushes the queue to Supabase via `upsert(onConflict: client_id)`,
  so retries are safe.
- Re-flushes on `online` event and every 15s.
- Server-side trigger flips match status (`scheduled → live → finished`) from events,
  so the source of truth is preserved even if the queue arrives late.

---

## 7. Invitation flow

```
  Organiser ─ createInvitation ──► invitations row (status=pending, token=hex)
                                          │
                                          ▼
                              email sent (Resend) with /invitations/accept?token=…
                                          │
                                          ▼
  Invitee opens link ─► Google login ─► /auth/callback
                                          │
                                          ▼
                              accept_invitation(token)  (SECURITY DEFINER)
                                          │  validates email match
                                          ▼
                              team_members / competition_members / match_officials row created
```

Email is the binding token: invite email must equal Google account email. The DB function rejects mismatches with `invitation_email_mismatch`.

---

## 8. Security notes

- **No global admin.** `auth.uid()` alone gives the user only public read access.
- All writes pass through RLS policies in `0010_rls_policies.sql`. Helpers in `0009_rls_helpers.sql` centralise permission checks (and avoid the classic RLS-vs-RLS recursion).
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. It is not used by RLS-respecting paths — only by deliberately admin operations (none required for MVP runtime; it is included for future migrations/scripts).
- Public share links produce read-only canonical URLs (`/c/<slug>`, `/m/<id>`, etc.) that hit the same RLS-public read paths — there is no separate "share" auth bypass.

---

## 9. What's not in this drop

The spec asks for the full system; the following are intentionally minimal scaffolds, ready to expand:
- Cup bracket UI (DB is ready, generator emits Round 0).
- Match lineup editor on the match page (server action is wired, UI is a stub).
- Push notifications / share-card image generation.

---

## 10. Smoke checklist after deploy

1. Sign in with Google → profile auto-created (`profiles` row exists).
2. Create a team → you appear as `manager` in `team_members` (creator trigger).
3. Create a competition → you appear as `organiser` (creator trigger).
4. Add ≥ 2 teams to it → click **יצירת לוח משחקים** → rows appear in `matches`.
5. Open a match, enter a retro 2-1 score → standings row updates (no manual edit).
6. Open the public `/c/<slug>` URL in an incognito window → standings render.
7. Invite a teammate by email → they receive a link → after Google login on the right account, `team_members` row appears.

Everything else is downstream of those steps.
