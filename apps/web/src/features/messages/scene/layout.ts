export type V3 = [number, number, number];

/** Places on the pier: a conversation's lantern is `c:<id>`. */
export type MSpot = "overview" | "letterbox" | "empty" | `c:${string}`;

/** Where the pier ends; lanterns float out over the water beyond it. */
export const PIER_END = -2.5;
export const LETTERBOX: V3 = [1.6, 0, 3.4];
export const BENCH: V3 = [0, 0, PIER_END + 0.9];

/** Lanterns in a gentle arc over the water, a second row further out if there are many. */
export function lanternSpots(n: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < n; i++) {
    const row = i < 7 ? 0 : 1;
    const inRow = row === 0 ? Math.min(n, 7) : n - 7;
    const k = row === 0 ? i : i - 7;
    const spread = Math.min(140, 30 + inRow * 18);
    const a = inRow === 1 ? 0 : ((k / (inRow - 1)) * spread - spread / 2) * (Math.PI / 180);
    const r = row === 0 ? 5 : 8.5;
    out.push([Math.sin(a) * r, 2.2 + ((i * 37) % 5) * 0.22 + row * 0.6, PIER_END - 1.6 - Math.cos(a) * r * 0.7]);
  }
  return out;
}

export function view(spot: MSpot, target: V3 | null, narrow: boolean): [V3, V3] {
  if (spot === "overview") return narrow ? [[0, 4.2, 15], [0, 2.1, -6]] : [[0, 3.5, 11.5], [0, 2.1, -6]];
  if (spot === "letterbox") return [[LETTERBOX[0] - 2.6, 1.9, LETTERBOX[2] + 3.4], [LETTERBOX[0], 0.9, LETTERBOX[2]]];
  if (spot === "empty") return [[0, 2, BENCH[2] + 4.5], [BENCH[0], 0.9, BENCH[2]]];
  const t = target ?? [0, 2.5, -8];
  const back = narrow ? 5.8 : 4.6;
  return [
    [t[0] * 0.75, t[1] + 0.25, t[2] + back],
    [t[0], t[1], t[2]],
  ];
}
