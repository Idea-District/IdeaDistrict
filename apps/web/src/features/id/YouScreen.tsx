"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { IdMark, Label, PhoneFrame, TabBar } from "@/components/ui";
import { useStored } from "@/lib/session";

function Toggle({ label, defaultOn }: { label: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  const id = useId();
  return (
    <li className="flex items-center justify-between gap-4 py-3.5">
      <span id={id} className="text-[14.5px] font-bold">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={id}
        onClick={() => setOn((v) => !v)}
        className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${on ? "bg-ember" : "bg-rule"}`}
      >
        <span
          aria-hidden
          className={`absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow transition-transform duration-150 ${on ? "translate-x-[18px]" : ""}`}
        />
      </button>
    </li>
  );
}

/** "You": name, ID link and visibility (local state only in this build; investor visibility is opt-in). */
export function YouScreen() {
  const name = useStored("founderName");
  return (
    <PhoneFrame footer={<TabBar />}>
      <div className="flex items-center gap-4">
        <IdMark />
        <div>
          <Label tone="neutral">You</Label>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">{name ?? " "}</h1>
        </div>
      </div>

      <Link
        href="/id"
        className="mt-6 flex items-center justify-between rounded-xl border border-rule bg-card px-3.5 py-3 text-[14.5px] font-bold hover:border-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
      >
        Open my ID <span aria-hidden className="text-ember">→</span>
      </Link>

      <section className="mt-6 rounded-2xl bg-sand px-[15px] py-[6px]">
        <Label tone="neutral" as="h2" className="pt-3">
          Visibility
        </Label>
        <ul className="divide-y divide-rule">
          <Toggle label="Investors can see my ID" defaultOn={false} />
          <Toggle label="Investors can see what I'm working on now" defaultOn={false} />
          <Toggle label="Open to introductions" defaultOn />
        </ul>
      </section>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink3">You always see exactly what an investor sees.</p>
    </PhoneFrame>
  );
}
