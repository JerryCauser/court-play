import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { EventState, Snapshot } from "./types";

let client: NeonQueryFunction<false, false> | null = null;

function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

type Row = { state: EventState; ikey: string; created_at: Date | string };

export async function readEvent(id: string): Promise<Snapshot | null> {
  const rows = (await sql()`select state, ikey, created_at from events where id = ${id}`) as Row[];
  const row = rows[0];
  if (!row) return null;
  return { state: row.state, ikey: row.ikey, createdAt: new Date(row.created_at).toISOString() };
}

export type WriteResult = { ok: true; ikey: string } | { ok: false; current: Snapshot | null };

export async function writeEvent(
  id: string,
  state: EventState,
  base: string | null,
  next: string,
): Promise<WriteResult> {
  const json = JSON.stringify(state);
  const rows = (
    base === null
      ? await sql()`
          insert into events (id, state, ikey)
          values (${id}, ${json}::jsonb, ${next})
          on conflict (id) do nothing
          returning ikey`
      : await sql()`
          update events
          set state = ${json}::jsonb, ikey = ${next}, updated_at = now()
          where id = ${id} and ikey = ${base}
          returning ikey`
  ) as { ikey: string }[];
  if (rows.length > 0) return { ok: true, ikey: next };

  const current = await readEvent(id);
  if (current?.ikey === next) return { ok: true, ikey: next };
  return { ok: false, current };
}

export async function readSync(profileId: string): Promise<unknown> {
  await sql()`delete from syncs where expires_at < now()`;
  const rows = (await sql()`select data from syncs where profile_id = ${profileId}`) as { data: unknown }[];
  return rows[0]?.data ?? null;
}

export async function writeSync(profileId: string, data: unknown): Promise<void> {
  await sql()`
    insert into syncs (profile_id, data, expires_at)
    values (${profileId}, ${JSON.stringify(data)}::jsonb, now() + interval '10 minutes')
    on conflict (profile_id) do update set data = excluded.data, expires_at = excluded.expires_at`;
}
