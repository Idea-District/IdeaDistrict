"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";

import { Button, ErrorNotice, Heading, Label, PhoneFrame, ProgressBar, Sub } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { memory, session } from "@/lib/session";

type Answers = { name: string; working_on: string; hoping_for: string; in_the_way: string };
const empty: Answers = { name: "", working_on: "", hoping_for: "", in_the_way: "" };

const questions: { key: Exclude<keyof Answers, "name">; label: string; placeholder: string }[] = [
  { key: "working_on", label: "What are you working on right now?", placeholder: "The thing taking most of your week…" },
  { key: "hoping_for", label: "What are you hoping to make happen?", placeholder: "In the next few months…" },
  { key: "in_the_way", label: "What's getting in your way?", placeholder: "What's stopping you, slowing you down…" },
];

const field =
  "w-full rounded-xl border border-rule bg-card px-3.5 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink3/80 focus:border-ember focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/30";

/** Screen 3: the four open-text questions. */
export function StartForm() {
  const router = useRouter();
  const uid = useId();
  const [answers, setAnswers] = useState<Answers>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  // A founder created by an attempt whose saveContext failed: reuse it on retry.
  const pending = useRef<{ id: string; name: string } | null>(null);

  const set = (k: keyof Answers) => (e: { target: { value: string } }) =>
    setAnswers((a) => ({ ...a, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = {
      name: answers.name.trim(),
      working_on: answers.working_on.trim(),
      hoping_for: answers.hoping_for.trim(),
      in_the_way: answers.in_the_way.trim(),
    };
    if (Object.values(trimmed).some((v) => !v)) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setError(null);
    setBusy(true);
    try {
      let founder = pending.current;
      if (!founder || founder.name !== trimmed.name) {
        founder = await api.createFounder(trimmed.name);
        session.setFounder(founder.id, founder.name);
        pending.current = founder;
      }
      const founderId = founder.id;
      memory.known = await api.saveContext({
        founder_id: founderId,
        working_on: trimmed.working_on,
        hoping_for: trimmed.hoping_for,
        in_the_way: trimmed.in_the_way,
      });
      pending.current = null;
      setAnswers(empty);
      router.push("/start/known");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const isMissing = (k: keyof Answers) => missing && !answers[k].trim();

  return (
    <PhoneFrame>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <ProgressBar value={0.2} label="Discovery progress" />
        <Label className="mt-5">Start with where you are</Label>
        <Heading className="mt-2">Tell us where you are right now.</Heading>
        <Sub className="mt-2">In your own words. There are no right answers.</Sub>

        <div className="mt-6 flex flex-col gap-5">
          <div>
            <label htmlFor={`${uid}-name`} className="mb-2 block text-[15px] font-bold">
              What should we call you?
            </label>
            <input
              id={`${uid}-name`}
              className={field}
              value={answers.name}
              onChange={set("name")}
              autoComplete="given-name"
              placeholder="Your first name"
              aria-invalid={isMissing("name")}
            />
          </div>
          {questions.map((q) => (
            <div key={q.key}>
              <label htmlFor={`${uid}-${q.key}`} className="mb-2 block text-[15px] font-bold">
                {q.label}
              </label>
              <textarea
                id={`${uid}-${q.key}`}
                className={`${field} min-h-[92px] resize-y`}
                value={answers[q.key]}
                onChange={set(q.key)}
                placeholder={q.placeholder}
                rows={3}
                aria-invalid={isMissing(q.key)}
              />
            </div>
          ))}
        </div>

        {missing ? (
          <p role="alert" className="mt-4 text-[13.5px] font-bold text-ember-deep">
            Answer all four — a sentence each is plenty.
          </p>
        ) : null}
        {error ? (
          <div className="mt-4">
            <ErrorNotice message={error} />
          </div>
        ) : null}

        <Button type="submit" disabled={busy} className="mt-8">
          {busy ? "Starting your ID…" : "Start my ID"}
        </Button>
      </form>
    </PhoneFrame>
  );
}
