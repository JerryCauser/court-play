import type { NextRequest } from "next/server";
import { readEvent, writeEvent } from "@/lib/db";
import { isUuid } from "@/lib/uuid";
import { isEventState } from "@/lib/validate";

const MAX_BODY = 256 * 1024;
const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest, ctx: RouteContext<"/api/events/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "bad_id" }, { status: 400 });
  const snapshot = await readEvent(id);
  if (!snapshot) return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
  if (req.nextUrl.searchParams.get("ikey") === snapshot.ikey) {
    return new Response(null, { status: 204, headers: noStore });
  }
  return Response.json(snapshot, { headers: noStore });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/events/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "bad_id" }, { status: 400 });

  const text = await req.text();
  if (text.length > MAX_BODY) return Response.json({ error: "too_large" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }

  const { state, base, next } = (body ?? {}) as Record<string, unknown>;
  if (!isEventState(state) || !(base === null || isUuid(base)) || !isUuid(next)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await writeEvent(id, state, base, next);
  if (result.ok) return Response.json({ ikey: result.ikey }, { headers: noStore });
  if (!result.current) return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
  return Response.json(result.current, { status: 409, headers: noStore });
}
