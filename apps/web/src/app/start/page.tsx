import type { Metadata } from "next";

import { StartForm } from "@/features/discovery/StartForm";

export const metadata: Metadata = { title: "Start" };

export default function StartPage() {
  return <StartForm />;
}
