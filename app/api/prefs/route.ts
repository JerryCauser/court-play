import { cookies } from "next/headers";
import { PREFS_COOKIE, parsePrefsCookie, parsePrefsPatch, prefsCookie } from "@/lib/prefs";

const MAX_BODY = 1024;

export async function PUT(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return Response.json({ error: "too_large" }, { status: 413 });
  const patch = parsePrefsPatch(text);
  if (!patch) return Response.json({ error: "bad_request" }, { status: 400 });

  const store = await cookies();
  const prefs = { ...parsePrefsCookie(store.get(PREFS_COOKIE)?.value)?.prefs, ...patch };
  store.set(prefsCookie(prefs));
  return Response.json(prefs, { headers: { "Cache-Control": "no-store" } });
}
