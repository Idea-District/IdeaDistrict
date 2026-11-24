import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";

/* The brand face is Avenir Next (installed on Apple devices). Nunito Sans stands in elsewhere. */
const nunito = Nunito_Sans({ variable: "--font-fallback", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "Idea District", template: "%s · Idea District" },
  description: "Understanding before recommendation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${nunito.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
