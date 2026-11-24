"use client";

import { RequireFounder } from "@/components/RequireFounder";

import { IndustryRead } from "./Industries";

export function IndustryReadScreen({ slug }: { slug: string }) {
  return <RequireFounder>{(founderId) => <IndustryRead founderId={founderId} slug={slug} />}</RequireFounder>;
}
