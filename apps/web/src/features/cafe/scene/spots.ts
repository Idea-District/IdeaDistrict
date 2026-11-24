import type { CafeSpot } from "@idea-district/api-client";

/** Where you can stand. Tables each have their own seat: `table-0` … `table-2`. */
export type Place = CafeSpot | `table-${number}`;
export type SpotId = "street" | "room" | Place;
type V3 = [number, number, number];

/** A first-person pose: where your eyes are and which way you face (yaw 0 = towards the back wall). */
export type Pose = { x: number; y: number; z: number; yaw: number; pitch: number };

export function poseFrom(pos: V3, look: V3): Pose {
  const dx = look[0] - pos[0];
  const dy = look[1] - pos[1];
  const dz = look[2] - pos[2];
  return { x: pos[0], y: pos[1], z: pos[2], yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

/**
 * Room: x −6…6, z −6 (back wall) … 4 (front door), floor y = 0, ceiling y = 4.2. Eye height 1.65.
 * `wide` is used on tall, narrow screens (phones) where the camera needs to stand further back.
 */
export const SPOTS: Record<"street" | "room" | CafeSpot, { pos: V3; look: V3; wide?: { pos: V3; look: V3 } }> = {
  street: { pos: [0, 1.7, 12], look: [0, 2.1, 4] },
  room: { pos: [0, 1.75, 3.2], look: [0.3, 1.35, -3], wide: { pos: [0, 2.1, 3.5], look: [0.3, 1.1, -3] } },
  counter: { pos: [-2.3, 1.85, -0.5], look: [-3.3, 2.05, -5.6], wide: { pos: [-2.9, 2.1, 0.2], look: [-3.2, 1.9, -5.6] } },
  tables: { pos: [-1.2, 2.5, 2.9], look: [2.9, 0.7, -0.9], wide: { pos: [-0.6, 3.1, 3.6], look: [3, -0.5, -0.9] } },
  notice: { pos: [-2.4, 1.8, 0.3], look: [-6, 1.75, 0.3], wide: { pos: [-1.5, 1.8, 0.3], look: [-6, 1.75, 0.3] } },
  quick: { pos: [2.4, 1.8, -0.4], look: [3.9, 2.1, -6], wide: { pos: [3.2, 1.9, 0.4], look: [3.9, 2, -6] } },
  district: { pos: [0.4, 1.8, 2.4], look: [6, 2.0, 2.7], wide: { pos: [-0.6, 1.9, 2.6], look: [6, 1.9, 2.7] } },
};

/** The three cafe tables. */
export const TABLES: [number, number][] = [
  [1.7, -2.6],
  [4.3, -0.6],
  [3.1, 1.35],
];

/** Your chair at a table faces the entrance side, so you look into the room as you sit. */
export function yourChairAngle(i: number) {
  const [tx, tz] = TABLES[i];
  return Math.atan2(0 - tx, 3.3 - tz);
}

export function tablePose(i: number): Pose {
  const [tx, tz] = TABLES[i];
  const a = yourChairAngle(i);
  // Sitting back in your chair: you see the table, the topic card and the people across from you.
  return poseFrom([tx + Math.sin(a) * 1.15, 1.25, tz + Math.cos(a) * 1.15], [tx - Math.sin(a) * 0.9, 0.95, tz - Math.cos(a) * 0.9]);
}

export function placePose(spot: SpotId, narrow: boolean): Pose {
  if (spot.startsWith("table-")) return tablePose(Number(spot.slice(6)));
  const s = SPOTS[spot as keyof typeof SPOTS];
  const t = narrow && s.wide ? s.wide : s;
  return poseFrom(t.pos, t.look);
}

/** Where you can walk: inside the walls, in front of the counter. */
export const BOUNDS = { minX: -5.3, maxX: 5.3, minZ: -3.4, maxZ: 3.5 };
export const EYE = 1.65;

export const PLACES: { id: CafeSpot; name: string; hint: string }[] = [
  { id: "counter", name: "The counter", hint: "Daily Brew" },
  { id: "tables", name: "The tables", hint: "Open Table" },
  { id: "notice", name: "Noticeboard", hint: "What's on" },
  { id: "quick", name: "Back room", hint: "Quick Breaks" },
  { id: "district", name: "Side door", hint: "Your District" },
];
