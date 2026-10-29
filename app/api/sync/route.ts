import { mergeBackups, parseBackup } from "@/lib/backup";
import { readSync, writeSync } from "@/lib/db";

const MAX_BODY = 256 * 1024;
const noStore = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return Response.json({ error: "too_large" }, { status: 413 });
  const sent = parseBackup(text);
  if (!sent?.profile) return Response.json({ error: "bad_request" }, { status: 400 });

  const row = await readSync(sent.profile.id);
  const stored = row ? parseBackup(JSON.stringify(row)) : null;
  if (!stored) {
    await writeSync(sent.profile.id, sent);
    return Response.json({ status: "waiting", backup: sent }, { headers: noStore });
  }

  const merged = mergeBackups(stored, sent);
  await writeSync(sent.profile.id, merged);
  return Response.json({ status: "merged", backup: merged }, { headers: noStore });
}
