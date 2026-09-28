# Court Play

Fair match rotation for badminton, tennis, table tennis and any other one-court game.

- Create an event, add players (name + color), pick singles or doubles.
- Press **Add game** — the next match is generated so that everyone plays and rests evenly,
  partners and opponents rotate, and nobody sits (or plays) for too long in a row.
- Track the score (±1) and mark the winner.
- Share the link — everyone with it sees updates (polling every 30 s) and can edit.
- UI in English and Russian.

## How it works

The whole event is one JSON document stored in Postgres (`db/schema.sql`):

| column       | meaning                                   |
| ------------ | ----------------------------------------- |
| `id`         | event UUID (also the share link)          |
| `state`      | full event state as `jsonb`               |
| `ikey`       | idempotency key of the current version    |
| `created_at` | creation time                             |
| `updated_at` | last write time                           |

Writes are optimistic: the client sends `{ state, base, next }` where `base` is the `ikey` it last
saw and `next` is a fresh UUID. The row is updated only if `ikey = base`, then `ikey` becomes `next`.
Retrying the same request is safe: if the stored `ikey` already equals `next`, the write is reported
as applied. On a real conflict the server responds `409` with its current state and the client
adopts it — the server always wins.

Game generation is deterministic: it is seeded with `event id + game number` and depends only on the
event state, so two devices adding the same game produce the same match.

### Scheduling

Each new game is picked from all candidate line-ups by a cost function:

1. **Fair share** — every player accrues `players on court / players present` per game and spends 1
   per game played. The difference in games played never exceeds 1 (hard limit).
2. **Max 4 in a row** — nobody plays more than 4 games in a row (hard limit); resting twice in a row
   is avoided when possible.
3. **Variety** — exponential penalties for repeating who rests together, partners and opponents.

To avoid locking into a fixed cycle (e.g. the same two people always resting together), the best
candidates are checked with a short look-ahead of the next few games. Ties are broken by the seeded
random order. Players can join, leave (“remove” keeps their history) and return at any time.

## Development

```bash
cp .env.example .env.local
npm install
npm run db:init
npm run dev
```

## Deploy (free tier)

1. Create a Postgres database on [Neon](https://neon.tech) and run `npm run db:init` with its
   `DATABASE_URL`.
2. Import the repository on [Vercel](https://vercel.com) and set `DATABASE_URL` in project settings
   (or use the Vercel ↔ Neon integration, which sets it for you).
