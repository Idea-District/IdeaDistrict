import type { ConnectionItem, ExplorePick, MatchPerson } from "@idea-district/api-client";

export type XZ = [number, number];
export type V3 = [number, number, number];

/** Places you can sail to. Other founders' islands are `p:<their id>`. */
export type PSpot = "overview" | "you" | "suggestion" | "requests" | "harbour" | `p:${string}`;

const at = (deg: number, r: number): XZ => [Math.sin((deg * Math.PI) / 180) * r, Math.cos((deg * Math.PI) / 180) * r];

/** Your island sits in the middle. ID's suggestion is straight ahead, across the water. */
export const HOME_R = 3.4;
export const SUGGESTION: XZ = [0, -12.5];
export const HARBOUR: XZ = at(48, 6.2);
export const BOTTLES: XZ = at(-40, 5.6);
/** Connections on the inner ring, joined to you by bridges. */
const CONNECTION_SLOTS: XZ[] = [at(122, 8.5), at(-122, 8.5), at(78, 9), at(-80, 9), at(160, 9.5), at(-160, 9.5)];
/** This week's Explore picks, further out with a buoy. */
const EXPLORE_SLOTS: XZ[] = [at(145, 16), at(-145, 16), at(100, 16.5), at(-100, 16.5)];

export type Islander = {
  id: string;
  person: MatchPerson;
  at: XZ;
  kind: "connected" | "in_talks" | "explore";
  conversationId: string | null;
  reason?: string;
  shared?: ExplorePick["shared"];
};

/**
 * Who gets an island, and where. Someone you're already connected with is never also an Explore pick,
 * and ID's suggestion has the lighthouse, so they don't get a second island.
 */
export function islanders(connected: ConnectionItem[], inTalks: ConnectionItem[], picks: ExplorePick[], suggested: string | null = null): Islander[] {
  const out: Islander[] = [];
  const seen = new Set<string>();
  [...connected.map((c) => ({ c, kind: "connected" as const })), ...inTalks.map((c) => ({ c, kind: "in_talks" as const }))]
    .slice(0, CONNECTION_SLOTS.length)
    .forEach(({ c, kind }, i) => {
      seen.add(c.person_id);
      out.push({ id: c.person_id, person: c.person, at: CONNECTION_SLOTS[i], kind, conversationId: c.conversation_id });
    });
  picks
    .filter((p) => !seen.has(p.id) && p.person.name !== suggested)
    .slice(0, EXPLORE_SLOTS.length)
    .forEach((p, i) => out.push({ id: p.id, person: p.person, at: EXPLORE_SLOTS[i], kind: "explore", conversationId: null, reason: p.reason, shared: p.shared }));
  return out;
}

/** Camera: [position, target]. Places are seen from the home side, across the water. */
export function view(spot: PSpot, target: XZ | null, narrow: boolean): [V3, V3] {
  if (spot === "overview") return narrow ? [[0, 30, 30], [0, 0, -3]] : [[0, 21, 27], [0, 0, -3.5]];
  if (spot === "you") return narrow ? [[0, 9, 13], [0, 1.4, 0]] : [[0, 7.5, 11], [0, 1.4, 0]];
  const t = target ?? [0, 0];
  const len = Math.hypot(t[0], t[1]) || 1;
  const dx = t[0] / len;
  const dz = t[1] / len;
  const tall = spot === "suggestion";
  const back = (narrow ? 12 : 10) + (tall ? 4 : 0);
  return [
    [t[0] - dx * back, (narrow ? 8 : 6.5) + (tall ? 1.5 : 0), t[1] - dz * back],
    [t[0], tall ? 2.6 : 1, t[1]],
  ];
}
