"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

import type { Audience, Room, VisibilitySettings } from "@idea-district/api-client";

import { AppShell, CalmState, ErrorNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { BackLink, Eyebrow, focus, useLoad } from "@/features/cafe/shared";

import { AUDIENCE_WORDS, AUDIENCES, ROOM_NAMES, ROOMS } from "./rooms";

type Viewer = "connections" | "community" | "investors";
const VIEWERS: { value: Viewer; label: string }[] = [
  { value: "connections", label: "Connections" },
  { value: "community", label: "Community" },
  { value: "investors", label: "Investors" },
];

/** Which rooms a viewer would see. Investors see nothing unless the founder opts in,
 *  and then only the rooms the founder ticked for them. */
function roomsFor(viewer: Viewer, v: VisibilitySettings): Room[] {
  if (viewer === "connections") return ROOMS.filter((r) => v.rooms[r] !== "private");
  if (viewer === "community") return ROOMS.filter((r) => v.rooms[r] === "community");
  return v.investors ? ROOMS.filter((r) => v.investor_rooms.includes(r)) : [];
}

/** A row of options with radio semantics: one tab stop, arrow keys move and choose. */
function Segmented<T extends string>({
  labelledBy,
  options,
  value,
  onChange,
  disabled = false,
}: {
  labelledBy: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent, i: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next]!.value);
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid grid-cols-3 gap-1 rounded-[12px] border border-rule bg-screen p-1">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={`min-h-[44px] rounded-[9px] px-2 text-[13px] leading-tight font-semibold disabled:opacity-60 ${on ? "bg-ink text-cream" : "text-ink2 hover:bg-sand2"} ${focus}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function RoomRow({ room, value, onChange, error }: { room: Room; value: Audience; onChange: (a: Audience) => void; error?: string }) {
  const id = useId();
  return (
    <li className="py-4">
      <p id={id} className="mb-2 text-[15px] font-bold">
        {ROOM_NAMES[room]}
      </p>
      <Segmented labelledBy={id} options={AUDIENCES.map((a) => ({ value: a, label: AUDIENCE_WORDS[a] }))} value={value} onChange={onChange} />
      {error ? (
        <p role="alert" className="mt-2 text-[12.5px] text-ember-deep">
          {error}
        </p>
      ) : null}
    </li>
  );
}

/** C10 · Who sees what: an audience per room, the investor opt-in, and a preview. */
export function VisibilityRoom({ founderId }: { founderId: string }) {
  const q = useLoad(() => api.roomVisibility(founderId), founderId);
  const [errors, setErrors] = useState<Partial<Record<Room | "investors" | "investorRooms", string>>>({});
  const [tickBusy, setTickBusy] = useState<Partial<Record<Room, boolean>>>({});
  const [investorBusy, setInvestorBusy] = useState(false);
  const [viewer, setViewer] = useState<Viewer>("connections");
  const switchLabel = useId();
  const previewLabel = useId();
  const ticksLabel = useId();
  const ticksHint = useId();

  async function setRoom(room: Room, audience: Audience) {
    const before = q.data;
    if (!before || before.rooms[room] === audience) return;
    q.setData({ ...before, rooms: { ...before.rooms, [room]: audience } });
    setErrors((e) => ({ ...e, [room]: undefined }));
    try {
      q.setData(await api.setRoomVisibility(founderId, room, audience));
    } catch (err) {
      q.setData((cur) => (cur ? { ...cur, rooms: { ...cur.rooms, [room]: before.rooms[room] } } : cur));
      setErrors((e) => ({ ...e, [room]: `Couldn't save that. ${errorMessage(err)}` }));
    }
  }

  async function toggleInvestors() {
    const before = q.data;
    if (!before || investorBusy) return;
    const next = !before.investors;
    q.setData({ ...before, investors: next });
    setErrors((e) => ({ ...e, investors: undefined }));
    setInvestorBusy(true);
    try {
      const saved = await api.updatePrivacy(founderId, { id_visible_to_investors: next });
      q.setData((cur) => (cur ? { ...cur, investors: saved.id_visible_to_investors } : cur));
    } catch (err) {
      q.setData((cur) => (cur ? { ...cur, investors: before.investors } : cur));
      setErrors((e) => ({ ...e, investors: `Couldn't save that. ${errorMessage(err)}` }));
    } finally {
      setInvestorBusy(false);
    }
  }

  async function tickRoom(room: Room, on: boolean) {
    const before = q.data;
    if (!before || tickBusy[room]) return;
    const others = before.investor_rooms.filter((r) => r !== room);
    q.setData({ ...before, investor_rooms: on ? [...others, room] : others });
    setErrors((e) => ({ ...e, investorRooms: undefined }));
    setTickBusy((b) => ({ ...b, [room]: true }));
    try {
      const saved = await api.setInvestorRoom(founderId, room, on);
      q.setData((cur) => (cur ? { ...cur, investor_rooms: saved.investor_rooms } : cur));
    } catch (err) {
      q.setData((cur) =>
        cur ? { ...cur, investor_rooms: before.investor_rooms.includes(room) ? [...cur.investor_rooms.filter((r) => r !== room), room] : cur.investor_rooms.filter((r) => r !== room) } : cur,
      );
      setErrors((e) => ({ ...e, investorRooms: `Couldn't save that. ${errorMessage(err)}` }));
    } finally {
      setTickBusy((b) => ({ ...b, [room]: false }));
    }
  }

  const header = (
    <>
      <BackLink href="/district" label="My District" />
      <Eyebrow>Room</Eyebrow>
      <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em]">Who sees what</h1>
    </>
  );

  if (!q.data) {
    return (
      <AppShell>
        {header}
        <div className="mt-6">{q.error ? <ErrorNotice message={q.error} onRetry={q.retry} /> : <CalmState title="Checking who sees what…" />}</div>
      </AppShell>
    );
  }

  const v = q.data;
  const preview = roomsFor(viewer, v);

  return (
    <AppShell>
      {header}
      <p className="mt-2 text-[15px] text-ink2">Choose who can see each room. Changes save as you make them.</p>
      <p className="mt-2 text-[13.5px] text-ink3">
        &ldquo;Your connections&rdquo; means founders who accepted an introduction with you. &ldquo;The community&rdquo; is every
        founder in Idea District.
      </p>

      <ul className="mt-4 divide-y divide-rule rounded-[16px] border border-rule bg-card px-4">
        {ROOMS.map((r) => (
          <RoomRow key={r} room={r} value={v.rooms[r]} onChange={(a) => void setRoom(r, a)} error={errors[r]} />
        ))}
      </ul>

      <section className="mt-6 rounded-[16px] border border-rule bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <span id={switchLabel} className="text-[15px] font-bold">
            Visible to investors
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={v.investors}
            aria-labelledby={switchLabel}
            disabled={investorBusy}
            onClick={() => void toggleInvestors()}
            className={`relative flex min-h-[44px] w-[52px] shrink-0 items-center rounded-full disabled:opacity-60 ${focus}`}
          >
            <span aria-hidden className={`absolute inset-x-0 top-1/2 h-[26px] -translate-y-1/2 rounded-full transition-colors duration-150 ${v.investors ? "bg-ember" : "bg-rule"}`} />
            <span
              aria-hidden
              className={`absolute top-1/2 left-[3px] size-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-150 ${v.investors ? "translate-x-[26px]" : ""}`}
            />
          </button>
        </div>
        <p className="mt-1 pr-14 text-[13px] leading-relaxed text-ink3">
          Off unless you turn it on. Investors only see what you allow, and only if you opt in.
        </p>
        {errors.investors ? (
          <p role="alert" className="mt-2 text-[12.5px] text-ember-deep">
            {errors.investors}
          </p>
        ) : null}

        <fieldset className="mt-4 border-t border-rule pt-4" aria-describedby={ticksHint} disabled={!v.investors}>
          <legend id={ticksLabel} className="float-left w-full text-[15px] font-bold">
            Rooms investors may see
          </legend>
          <p id={ticksHint} className="clear-left pt-1 text-[13px] leading-relaxed text-ink3">
            Investors see only the rooms you tick here, and only if you&rsquo;ve opted in. They never browse founders: they see you
            only after you&rsquo;re introduced.
            {v.investors ? null : <span className="mt-1 block font-semibold text-ink2">Turn on &ldquo;Visible to investors&rdquo; to choose rooms.</span>}
          </p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {ROOMS.map((r) => {
              const on = v.investor_rooms.includes(r);
              return (
                <li key={r}>
                  <label
                    className={`flex min-h-[44px] items-center gap-3 rounded-[10px] px-2 text-[14.5px] font-semibold ${v.investors ? "cursor-pointer hover:bg-sand2" : "cursor-not-allowed opacity-60"}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!v.investors || !!tickBusy[r]}
                      onChange={(e) => void tickRoom(r, e.target.checked)}
                      className={`size-5 shrink-0 accent-[#FF6038] ${focus}`}
                    />
                    {ROOM_NAMES[r]}
                  </label>
                </li>
              );
            })}
          </ul>
          {errors.investorRooms ? (
            <p role="alert" className="mt-2 text-[12.5px] text-ember-deep">
              {errors.investorRooms}
            </p>
          ) : null}
        </fieldset>
      </section>

      <section aria-labelledby={previewLabel} className="mt-6 rounded-[16px] bg-sand p-4">
        <h2 id={previewLabel} className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">
          Preview
        </h2>
        <p className="mt-1 mb-3 text-[13.5px] text-ink2">See your District as someone else would.</p>
        <Segmented labelledBy={previewLabel} options={VIEWERS} value={viewer} onChange={setViewer} />
        <div aria-live="polite" className="mt-3">
          {preview.length ? (
            <>
              <p className="text-[13.5px] text-ink2">
                {viewer === "investors" ? "Investors would see your ID and these rooms:" : "They would see these rooms:"}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {preview.map((r) => (
                  <li key={r} className="rounded-full border border-rule bg-card px-3 py-1.5 text-[13.5px] font-semibold">
                    {ROOM_NAMES[r]}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[13.5px] text-ink2">
              {viewer === "investors" && !v.investors
                ? "Nothing. Investors can't see your District unless you turn on “Visible to investors”."
                : viewer === "investors"
                  ? "Your ID only. You haven't ticked any rooms for investors."
                  : "None of your rooms."}
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
