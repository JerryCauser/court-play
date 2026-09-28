import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { EventView } from "@/components/event-view";
import { readEvent } from "@/lib/db";
import { isUuid } from "@/lib/uuid";

const load = cache(async (id: string) => (isUuid(id) ? readEvent(id.toLowerCase()) : null));

export async function generateMetadata({ params }: PageProps<"/e/[id]">): Promise<Metadata> {
  const snapshot = await load((await params).id);
  return { title: snapshot ? `${snapshot.state.name} · Court Play` : "Court Play" };
}

export default async function Page({ params }: PageProps<"/e/[id]">) {
  const { id } = await params;
  const snapshot = await load(id);
  if (!snapshot) notFound();
  return <EventView id={id.toLowerCase()} initial={snapshot} />;
}
