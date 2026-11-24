import type { Room } from "@idea-district/api-client";

import { BUILDINGS, LOTS, type XZ } from "../scene/layout";

/**
 * The cozy District: a board of hexagon tiles. Your ID sits on the middle tile, each room on its own
 * tile, a path runs to the Cafe, and the rest is countryside. What we don't know yet are the empty
 * slots where a tile hasn't been laid. Everything is worked out from fixed numbers, so the board is
 * the same every visit.
 */
export const S = 1.5; // tile radius, centre to corner
const SQ3 = Math.sqrt(3);

export type Kind = "meadow" | "forest" | "field" | "water" | "path" | "plaza" | "room" | "village";
export type Tile = { key: string; x: number; z: number; d: number; kind: Kind; room?: Room };

/** A repeatable 0..1 number for a tile (and a purpose k). */
export function hash(a: number, b: number, k = 0) {
  const s = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

const centre = (q: number, r: number): XZ => [S * 1.5 * q, S * SQ3 * (r + q / 2)];
const ROOMS: Room[] = ["journey", "business", "needs", "progress", "capabilities"];

export function makeBoard(open: number): { tiles: Tile[]; slots: XZ[] } {
  const cells = hexCells(5);

  const taken = new Set<string>();
  const nearest = (p: XZ) => {
    let best = cells[0];
    let bd = Infinity;
    for (const c of cells) {
      if (taken.has(c.key)) continue;
      const dd = (c.x - p[0]) ** 2 + (c.z - p[1]) ** 2;
      if (dd < bd) {
        bd = dd;
        best = c;
      }
    }
    taken.add(best.key);
    return best;
  };

  nearest([0, 0]).kind = "plaza";
  for (const room of ROOMS) {
    const c = nearest(BUILDINGS[room].at);
    c.kind = "room";
    c.room = room;
  }
  const slots: XZ[] = [];
  const empty = new Set<string>();
  for (let i = 0; i < Math.min(open, LOTS.length); i++) {
    const c = nearest(LOTS[i]);
    empty.add(c.key);
    slots.push([c.x, c.z]);
  }

  for (const c of cells) {
    if (taken.has(c.key)) continue;
    const { x, z, d } = c;
    if (Math.abs(x) < 0.1 && z > 0) {
      c.kind = "path"; // the road to the Cafe, at the front
      continue;
    }
    c.kind = countryside(x, z, d);
  }
  return { tiles: cells.filter((c) => !empty.has(c.key)), slots };
}

/** What grows on an ordinary tile: ponds, woods, fields, the odd hamlet, meadow everywhere else. */
export function countryside(x: number, z: number, d: number): Kind {
  const wet = Math.sin(x * 0.31 + 1.7) + Math.sin(z * 0.29 - 0.4) + 0.8 * Math.sin((x - z) * 0.23 + 0.9);
  const wood = Math.sin(x * 0.43 - 2.1) + Math.sin(z * 0.38 + 2.6) + 0.7 * Math.cos((x + z) * 0.31);
  const h = hash(x, z, 3);
  if (d >= 2 && wet > 1.0) return "water";
  if (wood > 0.75) return "forest";
  if (wood < -0.9) return "field";
  if (d >= 2 && h < 0.2) return "village";
  return "meadow";
}

/** All the tiles within `radius` rings of the middle, with a ragged outer ring. */
export function hexCells(radius: number): Tile[] {
  const out: Tile[] = [];
  for (let q = -radius - 1; q <= radius + 1; q++)
    for (let r = -radius - 1; r <= radius + 1; r++) {
      const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
      if (d > radius + 1 || (d === radius + 1 && hash(q, r, 9) < 0.6)) continue;
      const [x, z] = centre(q, r);
      out.push({ key: `${q},${r}`, x, z, d, kind: "meadow" });
    }
  return out;
}

/** A point somewhere on a tile, kept away from its edge. */
export function onTile(t: { x: number; z: number }, a: number, b: number, reach = 0.72): XZ {
  const ang = a * Math.PI * 2;
  const rad = Math.sqrt(b) * S * reach;
  return [t.x + Math.cos(ang) * rad, t.z + Math.sin(ang) * rad];
}

/** The six corners of a tile (flat-topped). */
export function corners(x: number, z: number, r = S): XZ[] {
  return Array.from({ length: 6 }, (_, k) => [x + Math.cos((k * Math.PI) / 3) * r, z + Math.sin((k * Math.PI) / 3) * r]);
}
