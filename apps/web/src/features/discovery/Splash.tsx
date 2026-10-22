"use client";

import { useEffect, useState } from "react";

import { ButtonLink, IdMark, PhoneFrame } from "@/components/ui";

import { NetworkArt } from "./NetworkArt";

const STEPS: [string, string][] = [
  ["Tell us where you are", "Four questions, in your own words."],
  ["Make five decisions", "Situations written for you, not a personality test."],
  ["Meet who matters", "We introduce you only when it's worth your time."],
];

/** Screens 1–2: the loading mark, then the intro. */
export function Splash() {
  const [intro, setIntro] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setIntro(true), 2000);
    return () => window.clearTimeout(t);
  }, []);

  if (!intro) {
    return (
      <PhoneFrame className="items-center justify-center text-center">
        <div className="flex flex-col items-center gap-5 fade-in">
          <IdMark size={56} />
          <p className="text-[13px] font-extrabold tracking-[0.22em] text-ink">IDEA DISTRICT</p>
          <p className="text-[14px] text-ink3">Understanding before recommendation.</p>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col fade-in">
        <div className="flex items-center gap-3">
          <IdMark size={36} />
          <p className="text-[11px] font-extrabold tracking-[0.22em]">IDEA DISTRICT</p>
        </div>
        <div className="my-auto py-3">
          <NetworkArt />
        </div>
        <div className="mb-5">
          <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Let&rsquo;s discover what you&rsquo;re capable of.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink2">
            Your ID isn&rsquo;t something you fill out. It&rsquo;s something we discover through your journey.
          </p>
        </div>
        <ol className="mb-6 divide-y divide-rule2 border-y border-rule2">
          {STEPS.map(([title, detail], i) => (
            <li key={title} className="flex gap-4 py-2">
              <span className="w-4 pt-0.5 text-[12px] font-bold text-ink3">{i + 1}</span>
              <span>
                <span className="block text-[14.5px] font-bold">{title}</span>
                <span className="block text-[13px] leading-snug text-ink2">{detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <ButtonLink href="/start">Begin discovery</ButtonLink>
        <p className="mt-3 text-center text-[12.5px] text-ink3">Takes about five minutes.</p>
      </div>
    </PhoneFrame>
  );
}
