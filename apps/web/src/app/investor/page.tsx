import type { Metadata } from "next";

import { SignIn } from "@/features/investor/SignIn";

export const metadata: Metadata = { title: "Investor sign-in" };

export default function Page() {
  return <SignIn />;
}
