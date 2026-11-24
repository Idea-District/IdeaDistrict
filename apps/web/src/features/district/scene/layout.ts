import type { Audience, Room } from "@idea-district/api-client";

export type XZ = [number, number];
export type V3 = [number, number, number];

/** Places in the District you can fly to. */
export type DSpot = "overview" | "id" | Room | "unknowns";

/**
 * Your District is a small island. Your ID stands in the plaza in the middle; each room is a building
 * on a ring around it; the path at the front leads back to the Cafe.
 */
export const ISLAND_R = 12.5;
const ring = (deg: number, r = 7.6): XZ => [Math.sin((deg * Math.PI) / 180) * r, Math.cos((deg * Math.PI) / 180) * r];

export const BUILDINGS: Record<Room, { at: XZ; deg: number }> = {
  needs: { at: ring(180), deg: 180 },
  business: { at: ring(-128), deg: -128 },
  progress: { at: ring(128), deg: 128 },
  capabilities: { at: ring(68), deg: 68 },
  journey: { at: ring(-68, 8.2), deg: -68 },
};

/** Empty lots, where what we don't know yet hangs like fog. */
export const LOTS: XZ[] = [ring(28, 8.4), ring(-28, 8.6), ring(95, 10.4), ring(-100, 10.6)];

export const CAFE_SIGN: XZ = [0, 10.9];

/** Who sees a room through each lens. */
export function canSee(lens: Audience, audience: Audience) {
  if (lens === "private") return true; // you see everything
  if (lens === "connections") return audience !== "private";
  return audience === "community";
}

export const LENS_LABEL: Record<Audience, string> = { private: "Me", connections: "A connection", community: "The community" };

/** Camera views: [position, target]. Buildings are seen from the plaza side, slightly above. */
export function view(spot: DSpot, narrow: boolean): [V3, V3] {
  if (spot === "overview") return narrow ? [[0, 25, 29], [0, 0, -1]] : [[0, 17, 24], [0, 0.4, -0.6]];
  if (spot === "id") return narrow ? [[0, 7, 12.5], [0, 2.4, 0]] : [[0, 6, 11], [0, 2.4, 0]];
  if (spot === "unknowns") {
    const [x, z] = LOTS[0];
    return [[x * 0.35, 7.5, z + 6.5], [x, 1, z]];
  }
  const { at } = BUILDINGS[spot];
  const len = Math.hypot(at[0], at[1]);
  const dx = at[0] / len;
  const dz = at[1] / len;
  const back = narrow ? 10.5 : 10;
  return [
    [at[0] - dx * back, narrow ? 7.5 : 6.2, at[1] - dz * back],
    [at[0], 1.5, at[1]],
  ];
}
