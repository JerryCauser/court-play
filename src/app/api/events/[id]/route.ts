import { sql } from "@/lib/db";
import { isUuid, validateState, type EventState } from "@/lib/state";

export const dynamic = "force-dynamic";

const MAX_BODY = 64 * 1024;

type Ctx = { params: Promise<{ id: string }> };
type Row = { state: EventState; ikey: string };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > MAX_BODY) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function current(id: string): Promise<Row | null> {
  const rows = (await sql()`select state, ikey from events where id = ${id}`) as Row[];
  return rows[0] ?? null;
}

async function eventId(ctx: Ctx): Promise<string | null> {
  const { id } = await ctx.params;
  return isUuid(id) ? id.toLowerCase() : null;
}

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const id = await eventId(ctx);
  if (!id) return json({ error: "bad_id" }, 400);
  const row = await current(id);
  return row ? json(row) : json({ error: "not_found" }, 404);
}

export async function POST(req: Request, ctx: Ctx): Promise<Response> {
  const id = await eventId(ctx);
  if (!id) return json({ error: "bad_id" }, 400);
  const body = await readBody(req);
  if (!body || !isUuid(body.ikey) || !validateState(body.state)) return json({ error: "bad_request" }, 400);
  const inserted = await sql()`
    insert into events (id, state, ikey)
    values (${id}, ${JSON.stringify(body.state)}::jsonb, ${body.ikey})
    on conflict (id) do nothing
    returning ikey`;
  if (inserted.length) return json({ ikey: body.ikey }, 201);
  const row = await current(id);
  if (row && row.ikey === body.ikey) return json({ ikey: row.ikey });
  return json(row, 409);
}

export async function PUT(req: Request, ctx: Ctx): Promise<Response> {
  const id = await eventId(ctx);
  if (!id) return json({ error: "bad_id" }, 400);
  const body = await readBody(req);
  if (!body || !isUuid(body.expected) || !isUuid(body.next) || !validateState(body.state)) {
    return json({ error: "bad_request" }, 400);
  }
  const updated = await sql()`
    update events
    set state = ${JSON.stringify(body.state)}::jsonb, ikey = ${body.next}
    where id = ${id} and ikey = ${body.expected}
    returning ikey`;
  if (updated.length) return json({ ikey: body.next });
  const row = await current(id);
  if (!row) return json({ error: "not_found" }, 404);
  if (row.ikey === body.next) return json({ ikey: row.ikey });
  return json(row, 409);
}
