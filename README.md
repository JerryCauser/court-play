# Court Play

Fair match rotation for badminton, tennis, table tennis and other court games.
Create an event, add players, press **Next game** — the app picks who plays, who rests and who teams up with whom.
Share the link so everyone sees the same schedule and scores.

Stack: Next.js (Vercel free tier) + Postgres (Neon free tier). Runtime dependencies: `next`, `react`, `react-dom`, `@neondatabase/serverless`.

## How matches are generated

Games are generated one at a time by `src/lib/schedule.ts` — a deterministic "social mixer" (Americano-style) rotation.
The same event state always produces the same next game, because tie-breaks use a PRNG seeded with the event UUID and the game number.

1. **Equal games / equal rest** — every player accumulates a fair share `2k / N` per round they are present
   (Bresenham / largest-remainder rotation). Players furthest behind their share play first; nobody falls a whole game behind.
2. **Even rotation** — ideal streaks are derived from the court/bench ratio (e.g. 6 players in doubles: play 2, rest 1).
   Exceeding them by one game is penalised, by two is effectively forbidden.
3. **Everyone with and against everyone** — among eligible line-ups, the team split minimising repeated partners/opponents wins
   (exponential cost relative to the least-met pair), with a one-game lookahead.
4. Late joiners start with a fair share from the moment they join; paused players are skipped without penalty.

## Sync & idempotency

The whole event is one JSON document: table `events (id uuid, state jsonb, ikey uuid, created_at)`.

- `GET /api/events/:id` → `{ state, ikey }`
- `POST /api/events/:id` `{ state, ikey }` — create (repeating the same request is a no-op).
- `PUT /api/events/:id` `{ state, expected, next }` — writes only if the stored `ikey` equals `expected`, then sets it to `next`.
  Retrying the same request is safe (stored `ikey == next` → success). Any other mismatch returns `409` with the current
  server state, which replaces the local one (server wins).

Clients save changes with a short debounce and poll every 30 seconds while the tab is visible.
The "My events" list and UI language are stored locally (localStorage / cookie).

## Local development

```bash
npm install
cp .env.example .env.local   # put your Neon connection string here
npm run db:init              # creates the table
npm run dev
```

Checks: `npm run typecheck`, `npm test` (Node's built-in test runner, Node ≥ 22.18), `npm run build`.

## Deploy

1. Create a free Neon project and copy the pooled connection string.
2. Import the repo in Vercel and add `DATABASE_URL` as an environment variable.
3. Run `npm run db:init` once locally against that database.
