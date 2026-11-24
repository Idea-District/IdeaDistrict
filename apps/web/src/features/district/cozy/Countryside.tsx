"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Object3D,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
} from "three";

import { hash, onTile, S, type Tile } from "./board";

export type Item = { p: [number, number, number]; s: [number, number, number]; r?: number; c: string };

const dummy = new Object3D();
const tint = new Color();

function place(mesh: InstancedMesh | null, items: Item[]) {
  if (!mesh) return;
  items.forEach((it, i) => {
    dummy.position.set(...it.p);
    dummy.rotation.set(0, it.r ?? 0, 0);
    dummy.scale.set(...it.s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, tint.set(it.c));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/** Many copies of one small shape, each with its own place, size and colour, in a single draw. */
export function Inst({ geo, items, shadow = true, glow = 0, rough = 0.92 }: { geo: BufferGeometry; items: Item[]; shadow?: boolean; glow?: number; rough?: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => place(ref.current, items), [items]);
  if (!items.length) return null;
  return (
    <instancedMesh key={items.length} ref={ref} args={[geo, undefined, items.length]} castShadow={shadow} receiveShadow>
      <meshStandardMaterial flatShading roughness={rough} emissive={glow ? "#ffc98a" : "#000000"} emissiveIntensity={glow} />
    </instancedMesh>
  );
}

/* Shapes, each sitting on y = 0 so its scale is its height. */
export const GEO = {
  side: new CylinderGeometry(S * 0.975, S * 0.975, 0.7, 6, 1, true).rotateY(Math.PI / 6).translate(0, -0.35, 0),
  bottom: new CircleGeometry(S * 0.975, 6).rotateX(Math.PI / 2).translate(0, -0.7, 0),
  cap: new CircleGeometry(S * 0.975, 6).rotateX(-Math.PI / 2),
  cone: new ConeGeometry(1, 1, 7).translate(0, 0.5, 0),
  trunk: new CylinderGeometry(0.5, 0.6, 1, 5).translate(0, 0.5, 0),
  blob: new IcosahedronGeometry(1, 0).translate(0, 1, 0),
  box: new BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  disc: new CylinderGeometry(1, 1, 1, 7).translate(0, 0.5, 0),
  // A pitched roof: a triangular prism along x, apex up, 1 high and 1 deep at the eaves.
  roof: new CylinderGeometry(1, 1, 1, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(0, 0.5, 0).scale(1, 2 / 3, 1 / Math.sqrt(3)),
};

const TOP: Record<Tile["kind"], [string, string]> = {
  meadow: ["#a6cc72", "#8fbd63"],
  village: ["#b2d17d", "#9cc56c"],
  room: ["#b7d585", "#a8cc76"],
  forest: ["#77a65a", "#6a9a52"],
  field: ["#e4c66f", "#d9b65c"],
  water: ["#cdbb8e", "#c2b083"],
  path: ["#a6cc72", "#9cc56c"],
  plaza: ["#e6dfcd", "#ddd4bf"],
};
const mix = (a: string, b: string, t: number) => `#${new Color(a).lerp(new Color(b), t).getHexString()}`;

const ROUND = ["#6fae5a", "#82b95c", "#5f9f55", "#94c25f", "#d7a446", "#c98a3f"];
const PINE = ["#3f7a50", "#4a8757", "#356d48"];
const FLOWER = ["#fdfaf0", "#f6d65a", "#f3a6b8", "#c9b3e6", "#fdfaf0"];
const WALL = ["#f3ead8", "#efe2c8", "#e9dcc6", "#f5efe2"];
const ROOFS = ["#9a5643", "#7f6a63", "#5e6f63", "#a8664c", "#6f5a52"];

type Scatter = Record<"trunk" | "pine" | "crown" | "flower" | "bush" | "wheat" | "dirt" | "pad" | "reed" | "wall" | "roof" | "window" | "bale", Item[]>;

/** Everything that stands on the countryside tiles, worked out once from the board. */
function scatter(tiles: Tile[]): Scatter {
  const o: Scatter = { trunk: [], pine: [], crown: [], flower: [], bush: [], wheat: [], dirt: [], pad: [], reed: [], wall: [], roof: [], window: [], bale: [] };
  const h = (t: Tile, k: number) => hash(t.x, t.z, k);

  const pine = (x: number, z: number, s: number, k: number) => {
    o.trunk.push({ p: [x, 0, z], s: [0.09 * s, 0.3 * s, 0.09 * s], c: "#7a5a40" });
    o.pine.push({ p: [x, 0.2 * s, z], s: [0.38 * s, 0.75 * s, 0.38 * s], r: k, c: PINE[Math.floor(k * 10) % PINE.length] });
    o.pine.push({ p: [x, 0.62 * s, z], s: [0.27 * s, 0.6 * s, 0.27 * s], r: k * 2, c: PINE[Math.floor(k * 17) % PINE.length] });
  };
  const round = (x: number, z: number, s: number, k: number, autumn: boolean) => {
    o.trunk.push({ p: [x, 0, z], s: [0.08 * s, 0.38 * s, 0.08 * s], c: "#7a5a40" });
    const c = autumn ? ROUND[4 + (Math.floor(k * 10) % 2)] : ROUND[Math.floor(k * 10) % 4];
    o.crown.push({ p: [x, 0.18 * s, z], s: [0.36 * s, 0.4 * s, 0.36 * s], r: k * 6, c });
  };
  const flowers = (t: Tile, n: number, k0: number) => {
    for (let i = 0; i < n; i++) {
      const [x, z] = onTile(t, h(t, k0 + i), h(t, k0 + i + 50), 0.85);
      o.flower.push({ p: [x, 0, z], s: [0.06, 0.07, 0.06], c: FLOWER[Math.floor(h(t, k0 + i + 90) * FLOWER.length)] });
    }
  };
  const house = (x: number, z: number, rot: number, k: number, big = 1) => {
    const w = (0.55 + k * 0.25) * big;
    const d = 0.45 * big;
    const wh = 0.42 * big;
    o.wall.push({ p: [x, 0, z], s: [w, wh, d], r: rot, c: WALL[Math.floor(k * 40) % WALL.length] });
    o.roof.push({ p: [x, wh, z], s: [w + 0.1, 0.32 * big, d + 0.12], r: rot, c: ROOFS[Math.floor(k * 23) % ROOFS.length] });
    // Two windows on the long front side.
    const fx = Math.sin(rot) * (d / 2 + 0.005);
    const fz = Math.cos(rot) * (d / 2 + 0.005);
    for (const side of [-1, 1]) {
      const ox = Math.cos(rot) * side * w * 0.25;
      const oz = -Math.sin(rot) * side * w * 0.25;
      o.window.push({ p: [x + fx + ox, wh * 0.38, z + fz + oz], s: [0.1, 0.12, 0.02], r: rot, c: "#ffd79a" });
    }
  };

  for (const t of tiles) {
    switch (t.kind) {
      case "forest": {
        const n = 6 + Math.floor(h(t, 1) * 4);
        for (let i = 0; i < n; i++) {
          const [x, z] = onTile(t, h(t, 10 + i), h(t, 30 + i), 0.82);
          const s = 0.85 + h(t, 50 + i) * 0.55;
          if (h(t, 70 + i) < 0.6) pine(x, z, s * 1.15, h(t, 80 + i));
          else round(x, z, s, h(t, 80 + i), h(t, 95 + i) < 0.15);
        }
        flowers(t, 2, 200);
        break;
      }
      case "meadow":
      case "room": {
        const trees = t.kind === "room" ? 0 : Math.floor(h(t, 2) * 3);
        for (let i = 0; i < trees; i++) {
          const [x, z] = onTile(t, h(t, 10 + i), 0.4 + h(t, 30 + i) * 0.6);
          round(x, z, 0.8 + h(t, 50 + i) * 0.5, h(t, 80 + i), h(t, 95 + i) < 0.2);
        }
        if (t.kind === "meadow" && h(t, 4) < 0.5) {
          const [x, z] = onTile(t, h(t, 5), h(t, 6));
          o.bush.push({ p: [x, -0.08, z], s: [0.18, 0.12, 0.18], r: h(t, 7) * 6, c: "#5f9450" });
        }
        flowers(t, t.kind === "room" ? 5 : 3 + Math.floor(h(t, 8) * 5), 100);
        break;
      }
      case "village": {
        const n = 2 + Math.floor(h(t, 1) * 2);
        for (let i = 0; i < n; i++) {
          const a = h(t, 3) + i / n;
          const [x, z] = onTile(t, a, 0.35, 0.8);
          house(x, z, -a * Math.PI * 2 + Math.PI / 2, h(t, 20 + i));
        }
        round(t.x + 0.1, t.z - 0.05, 0.9, h(t, 9), false);
        flowers(t, 4, 100);
        break;
      }
      case "field": {
        const rot = Math.floor(h(t, 1) * 3) * (Math.PI / 3);
        for (let row = -3; row <= 3; row++)
          for (let col = -3; col <= 3; col++) {
            const lx = row * 0.27;
            const lz = col * 0.27;
            if (Math.hypot(lx, lz) > S * 0.78) continue;
            const x = t.x + lx * Math.cos(rot) - lz * Math.sin(rot);
            const z = t.z + lx * Math.sin(rot) + lz * Math.cos(rot);
            const k = h(t, 10 + row * 7 + col);
            o.wheat.push({ p: [x, 0, z], s: [0.2, 0.16 + k * 0.08, 0.2], r: rot, c: k < 0.5 ? "#e8c768" : "#dcb655" });
          }
        if (h(t, 2) < 0.35) {
          const [x, z] = onTile(t, h(t, 3), 0.9, 0.85);
          o.bale.push({ p: [x, 0, z], s: [0.14, 0.18, 0.14], c: "#d4ad5a" });
        }
        break;
      }
      case "water": {
        const pads = 1 + Math.floor(h(t, 1) * 3);
        for (let i = 0; i < pads; i++) {
          const [x, z] = onTile(t, h(t, 10 + i), h(t, 20 + i), 0.7);
          o.pad.push({ p: [x, -0.035, z], s: [0.13, 0.01, 0.13], c: i === 0 && h(t, 4) < 0.4 ? "#f3c3cf" : "#5c9a4f" });
        }
        for (let i = 0; i < 4; i++) {
          const [x, z] = onTile(t, h(t, 40 + i), 0.85 + h(t, 50 + i) * 0.15, 0.9);
          o.reed.push({ p: [x, -0.1, z], s: [0.03, 0.32 + h(t, 60 + i) * 0.15, 0.03], c: "#6f8f4a" });
        }
        break;
      }
      case "path": {
        o.dirt.push({ p: [t.x, 0, t.z], s: [0.62, 0.012, S * Math.sqrt(3) + 0.02], c: "#d8c194" });
        for (let i = 0; i < 3; i++) {
          const side = i % 2 ? 1 : -1;
          const z = t.z + (h(t, 10 + i) - 0.5) * 2;
          round(t.x + side * (0.75 + h(t, 20 + i) * 0.4), z, 0.7, h(t, 30 + i), false);
        }
        flowers(t, 4, 100);
        break;
      }
      default:
        break;
    }
  }
  return o;
}

/** The tiles themselves: an earthy slab under each one, its colour on top. */
function Slabs({ tiles }: { tiles: Tile[] }) {
  const { sides, tops, wet } = useMemo(() => {
    const sides: Item[] = tiles.map((t) => ({ p: [t.x, 0, t.z], s: [1, 1, 1], c: mix("#9b7653", "#8a6747", hash(t.x, t.z, 11)) }));
    const tops: Item[] = tiles.map((t) => {
      const [a, b] = TOP[t.kind];
      return { p: [t.x, t.kind === "water" ? -0.2 : 0, t.z], s: [1, 1, 1], c: mix(a, b, hash(t.x, t.z, 12)) };
    });
    const wet: Item[] = tiles.filter((t) => t.kind === "water").map((t) => ({ p: [t.x, -0.03, t.z], s: [1, 1, 1], c: "#ffffff" }));
    return { sides, tops, wet };
  }, [tiles]);
  return (
    <>
      <Inst geo={GEO.side} items={sides} />
      <Inst geo={GEO.bottom} items={sides} shadow={false} />
      <Inst geo={GEO.cap} items={tops} shadow={false} />
      <Water items={wet} />
    </>
  );
}

/** Still water, a soft teal with a little shine. */
function Water({ items }: { items: Item[] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => place(ref.current, items), [items]);
  if (!items.length) return null;
  return (
    <instancedMesh key={items.length} ref={ref} args={[GEO.cap, undefined, items.length]} receiveShadow>
      <meshPhysicalMaterial color="#6bb3c6" roughness={0.12} metalness={0.05} clearcoat={1} transparent opacity={0.92} />
    </instancedMesh>
  );
}

/** The countryside: tiles, woods, fields, ponds and little villages. */
export function Countryside({ tiles, evening }: { tiles: Tile[]; evening: boolean }) {
  const s = useMemo(() => scatter(tiles), [tiles]);
  return (
    <group>
      <Slabs tiles={tiles} />
      <Inst geo={GEO.trunk} items={s.trunk} />
      <Inst geo={GEO.cone} items={s.pine} />
      <Inst geo={GEO.blob} items={s.crown} />
      <Inst geo={GEO.blob} items={s.bush} />
      <Inst geo={GEO.box} items={s.flower} shadow={false} />
      <Inst geo={GEO.box} items={s.wheat} />
      <Inst geo={GEO.disc} items={s.bale} />
      <Inst geo={GEO.box} items={s.dirt} shadow={false} />
      <Inst geo={GEO.disc} items={s.pad} shadow={false} />
      <Inst geo={GEO.cone} items={s.reed} />
      <Inst geo={GEO.box} items={s.wall} />
      <Inst geo={GEO.roof} items={s.roof} />
      <Inst geo={GEO.box} items={s.window} shadow={false} glow={evening ? 2.2 : 0} rough={0.4} />
    </group>
  );
}

const CLOUDS: { a: number; r: number; y: number; s: number }[] = [
  { a: 0.2, r: 12, y: -3.2, s: 1.6 },
  { a: 1.3, r: 15, y: -4.2, s: 1.3 },
  { a: 2.4, r: 11, y: -3.6, s: 1.8 },
  { a: 3.3, r: 14, y: -4.6, s: 1.5 },
  { a: 4.4, r: 12.5, y: -3, s: 1.2 },
  { a: 5.4, r: 16, y: -4, s: 1.6 },
  { a: 0.8, r: 18, y: -2.5, s: 1.1 },
  { a: 3.9, r: 19, y: -2.8, s: 1.2 },
];

function drift(g: Group, dt: number) {
  g.rotation.y += dt * 0.012;
}

/** Soft clouds drifting below the board, so it floats above them. */
export function Clouds({ evening, reduced }: { evening: boolean; reduced: boolean }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    if (g.current && !reduced) drift(g.current, dt);
  });
  return (
    <group ref={g}>
      {CLOUDS.map((c, i) => (
        <group key={i} position={[Math.sin(c.a) * c.r, c.y, Math.cos(c.a) * c.r]} scale={c.s}>
          {[
            [0, 0, 0, 1],
            [0.9, -0.15, 0.1, 0.75],
            [-0.85, -0.2, -0.05, 0.7],
            [0.3, 0.35, -0.2, 0.7],
          ].map(([x, y, z, r], j) => (
            <mesh key={j} position={[x, y, z]} scale={[r, r * 0.72, r]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial flatShading color={evening ? "#7d86a3" : "#ffffff"} roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
