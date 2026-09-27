import { notFound } from "next/navigation";
import { EventView } from "@/components/EventView";
import { isUuid } from "@/lib/state";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return <EventView id={id.toLowerCase()} />;
}
