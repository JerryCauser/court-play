import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { GameBoard } from "@/components/game-board";
import { readEvent } from "@/lib/db";
import { isUuid } from "@/lib/uuid";

const load = cache(async (id: string) => (isUuid(id) ? readEvent(id.toLowerCase()) : null));

export async function generateMetadata({ params }: PageProps<"/e/[id]/g/[gameId]">): Promise<Metadata> {
  const { id, gameId } = await params;
  const snapshot = await load(id);
  if (!snapshot) return { title: "Court Play" };
  const n = snapshot.state.games.findIndex((g) => g.id === gameId) + 1;
  return { title: `${n > 0 ? `#${n} · ` : ""}${snapshot.state.name} · Court Play` };
}

// The game itself is looked up on the client: it can be deleted (or appear) while the screen is open.
export default async function Page({ params }: PageProps<"/e/[id]/g/[gameId]">) {
  const { id, gameId } = await params;
  const snapshot = await load(id);
  if (!snapshot) notFound();
  return <GameBoard id={id.toLowerCase()} gameId={gameId} initial={snapshot} />;
}
