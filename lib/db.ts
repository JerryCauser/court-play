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

type Row = { state: EventState; ikey: string };

export async function readEvent(id: string): Promise<Snapshot | null> {
  const rows = (await sql()`select state, ikey from events where id = ${id}`) as Row[];
  return rows[0] ?? null;
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
