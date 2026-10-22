"use client";

import { useEffect, useState } from "react";

import { ButtonLink, IdMark, PhoneFrame } from "@/components/ui";

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
        <div className="mt-auto mb-10">
          <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Let&rsquo;s discover what you&rsquo;re capable of.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink2">
            Your ID isn&rsquo;t something you fill out. It&rsquo;s something we discover through your journey.
          </p>
        </div>
        <ButtonLink href="/start">Begin discovery</ButtonLink>
        <p className="mt-3 text-center text-[12.5px] text-ink3">Takes about five minutes.</p>
      </div>
    </PhoneFrame>
  );
}
