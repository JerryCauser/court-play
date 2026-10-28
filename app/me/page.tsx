import type { Metadata } from "next";
import { MeView } from "@/components/me-view";

export const metadata: Metadata = { title: "Profile · Court Play" };

export default function Page() {
  return <MeView />;
}
