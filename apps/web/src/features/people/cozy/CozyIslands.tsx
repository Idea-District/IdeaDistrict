"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, DoubleSide, type Group, type Mesh } from "three";

import type { OpportunityKind, OpportunitySummary } from "@idea-district/api-client";

import { C } from "@/features/cafe/scene/palette";
import { canvasTexture } from "@/features/cafe/scene/textures";
import { useCanvasTexture } from "@/features/cafe/scene/useCanvasTexture";
import { hash } from "@/features/district/cozy/board";
import { GEO, Inst, type Item } from "@/features/district/cozy/Countryside";

import { usePeople } from "../scene/context";
import { FLAG, NameTag, Spot } from "../scene/Islands";
import { HARBOUR, HOME_R, SUGGESTION, type Islander, type V3, type XZ } from "../scene/layout";

/*
 * The cozy archipelago: every founder's island is a little cluster of hexagon tiles on a faceted sea,
 * in the same storybook style as the cozy District and Cafe.
 */
const TOP = 0.25;
const LAMP = new Color(C.bulb).multiplyScalar(2.6);
const BEAM = new Color("#fff0cc").multiplyScalar(1.4);
const ROOFS = ["#9a5643", "#7f6a63", "#5e6f63", "#a8664c", "#6f5a52", "#8a4f3d"];
const SQ3 = Math.sqrt(3);

function Mat({ c, rough = 0.9 }: { c: string; rough?: number }) {
  return <meshStandardMaterial flatShading color={c} roughness={rough} />;
}

/** Tile centres within `rings` of the middle, for tiles of radius `t`. The outer ring is a little ragged. */
function cells(rings: number, t: number, seed: number): { x: number; z: number; d: number }[] {
  const out: { x: number; z: number; d: number }[] = [];
  for (let q = -rings; q <= rings; q++)
    for (let r = -rings; r <= rings; r++) {
      const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
      if (d > rings || (rings > 1 && d === rings && hash(q + seed, r, 4) < 0.3)) continue;
      out.push({ x: t * 1.5 * q, z: t * SQ3 * (r + q / 2), d });
    }
  return out;
}

/**
 * An island of hexagon tiles: earthy slabs dipping into the sea, sandy tiles round the edge, meadow
 * and woods inside. `keep` is a clear patch (in island coordinates) left free for buildings.
 */
function HexIsland({ rings, t, seed, keep = [] }: { rings: number; t: number; seed: number; keep?: { at: XZ; r: number }[] }) {
  const k = t / 1.5;
  const { sides, tops, trunks, pines, crowns, flowers } = useMemo(() => {
    const cs = cells(rings, t, seed);
    const sides: Item[] = [];
    const tops: Item[] = [];
    const trunks: Item[] = [];
    const pines: Item[] = [];
    const crowns: Item[] = [];
    const flowers: Item[] = [];
    const free = (x: number, z: number) => keep.every((p) => Math.hypot(x - p.at[0], z - p.at[1]) > p.r);
    cs.forEach((c, i) => {
      const h = (n: number) => hash(c.x + seed * 3.1, c.z - seed, n);
      sides.push({ p: [c.x, TOP, c.z], s: [k, 1, k], c: h(1) < 0.5 ? "#9b7653" : "#8a6747" });
      const sand = c.d === rings && h(2) < 0.3;
      tops.push({ p: [c.x, TOP, c.z], s: [k, 1, k], c: sand ? (h(3) < 0.5 ? "#ead9a6" : "#e2cf98") : h(3) < 0.5 ? "#a6cc72" : "#93c066" });
      if (sand) return;
      const n = h(4) < 0.45 ? 2 + Math.floor(h(5) * 3) : h(4) < 0.7 ? 1 : 0;
      for (let j = 0; j < n; j++) {
        const a = h(10 + j) * Math.PI * 2;
        const rr = Math.sqrt(h(20 + j)) * t * 0.65;
        const x = c.x + Math.cos(a) * rr;
        const z = c.z + Math.sin(a) * rr;
        if (!free(x, z)) continue;
        const s = (0.7 + h(30 + j) * 0.4) * Math.max(0.75, k * 1.1);
        trunks.push({ p: [x, TOP, z], s: [0.08 * s, 0.32 * s, 0.08 * s], c: "#7a5a40" });
        if (h(40 + j) < 0.55) {
          pines.push({ p: [x, TOP + 0.2 * s, z], s: [0.36 * s, 0.75 * s, 0.36 * s], r: a, c: i % 2 ? "#3f7a50" : "#4a8757" });
          pines.push({ p: [x, TOP + 0.6 * s, z], s: [0.26 * s, 0.55 * s, 0.26 * s], r: a * 2, c: "#356d48" });
        } else crowns.push({ p: [x, TOP + 0.16 * s, z], s: [0.34 * s, 0.38 * s, 0.34 * s], r: a, c: h(50 + j) < 0.2 ? "#d7a446" : h(50 + j) < 0.6 ? "#6fae5a" : "#82b95c" });
      }
      for (let j = 0; j < 3; j++) {
        const a = h(60 + j) * Math.PI * 2;
        const rr = Math.sqrt(h(70 + j)) * t * 0.8;
        flowers.push({ p: [c.x + Math.cos(a) * rr, TOP, c.z + Math.sin(a) * rr], s: [0.05, 0.06, 0.05], c: ["#fdfaf0", "#f6d65a", "#f3a6b8"][j] });
      }
    });
    return { sides, tops, trunks, pines, crowns, flowers };
  }, [rings, t, seed, k, keep]);
  return (
    <group>
      <Inst geo={GEO.side} items={sides} />
      <Inst geo={GEO.cap} items={tops} shadow={false} />
      <Inst geo={GEO.trunk} items={trunks} />
      <Inst geo={GEO.cone} items={pines} />
      <Inst geo={GEO.blob} items={crowns} />
      <Inst geo={GEO.box} items={flowers} shadow={false} />
    </group>
  );
}

/** A small cottage: cream walls, a pitched roof, a door, and a window that glows at dusk. */
function Cottage({ at, roof, s = 1, lit, rot = 0 }: { at: XZ; roof: string; s?: number; lit: boolean; rot?: number }) {
  return (
    <group position={[at[0], TOP, at[1]]} rotation={[0, rot, 0]} scale={s}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.6, 0.62]} />
        <Mat c="#f3ead8" />
      </mesh>
      <mesh position={[0, 0.6, 0]} scale={[0.98, 0.42, 0.76]} geometry={GEO.roof} castShadow>
        <Mat c={roof} />
      </mesh>
      <mesh position={[0.25, 0.68, -0.1]} castShadow>
        <boxGeometry args={[0.1, 0.3, 0.1]} />
        <Mat c="#8a7d74" />
      </mesh>
      <mesh position={[-0.18, 0.2, 0.315]}>
        <boxGeometry args={[0.18, 0.36, 0.02]} />
        <Mat c="#7a5a40" />
      </mesh>
      <mesh position={[0.2, 0.34, 0.315]}>
        <boxGeometry args={[0.18, 0.16, 0.02]} />
        {lit ? <meshBasicMaterial color={LAMP} toneMapped={false} /> : <meshStandardMaterial color="#3e5357" roughness={0.3} />}
      </mesh>
    </group>
  );
}

function Bench({ at, rot }: { at: XZ; rot: number }) {
  return (
    <group position={[at[0], TOP, at[1]]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.6, 0.05, 0.2]} />
        <Mat c="#a0714f" />
      </mesh>
      <mesh position={[0, 0.34, -0.09]} castShadow>
        <boxGeometry args={[0.6, 0.18, 0.04]} />
        <Mat c="#a0714f" />
      </mesh>
      {[-0.25, 0.25].map((x) => (
        <mesh key={x} position={[x, 0.1, 0]}>
          <boxGeometry args={[0.05, 0.2, 0.18]} />
          <Mat c="#4b4038" />
        </mesh>
      ))}
    </group>
  );
}

/** Your island: the ID tower in the middle, two cottages, woods round about. */
export function HomeIsland({ initial, evening }: { initial: string; evening: boolean }) {
  const crown = useRef<Mesh>(null);
  const { reduced } = usePeople();
  const face = useCanvasTexture(
    () =>
      canvasTexture(256, 256, (ctx, w, h, font) => {
        ctx.fillStyle = C.ember;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = C.ink;
        ctx.font = `800 170px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initial, w / 2, h / 2 + 8);
      }),
    initial,
  );
  useFrame((_, dt) => {
    if (crown.current && !reduced) crown.current.rotation.y += dt * 0.6;
  });
  const keep = useMemo(
    () => [
      { at: [0, 0] as XZ, r: 1.1 },
      { at: [-1.7, -0.9] as XZ, r: 0.8 },
      { at: [1.6, -1.2] as XZ, r: 0.7 },
    ],
    [],
  );
  return (
    <Spot id="you" name="Your island" hint="You" marker={[0, 4.4, 0]}>
      <HexIsland rings={2} t={0.92} seed={3} keep={keep} />
      <mesh position={[0, TOP + 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 0.95, 0.24, 8]} />
        <Mat c="#d9d0bd" />
      </mesh>
      {[0, 1, 2].map((lv) => (
        <mesh key={lv} position={[0, TOP + 0.49 + lv * 0.5, 0]} castShadow>
          <boxGeometry args={[1 - lv * 0.25, 0.5, 1 - lv * 0.25]} />
          <meshStandardMaterial flatShading color={C.ember} roughness={0.5} emissive={C.ember} emissiveIntensity={0.15} />
        </mesh>
      ))}
      <mesh ref={crown} position={[0, TOP + 2.3, 0]} castShadow>
        <boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshStandardMaterial map={face} emissive={C.ember} emissiveIntensity={0.25} />
      </mesh>
      <Cottage at={[-1.7, -0.9]} roof={C.forest} lit={evening} rot={0.5} />
      <Cottage at={[1.6, -1.2]} roof={"#5e6f63"} s={0.85} lit={evening} rot={-0.4} />
      <pointLight position={[0, 2.4, 1.2]} intensity={evening ? 3 : 1.5} distance={5} color={C.bulb} />
    </Spot>
  );
}

/** A founder's island. Connected ones have a bridge to yours; Explore picks have a buoy with a light. */
export function PersonIsland({ who, index, evening }: { who: Islander; index: number; evening: boolean }) {
  const accent = who.kind === "explore" ? "Worth a visit" : who.kind === "in_talks" ? "In talks" : "Connected";
  const keep = useMemo(
    () => [
      { at: [-0.3, 0.1] as XZ, r: 0.7 },
      { at: [0.75, -0.6] as XZ, r: 0.5 },
      { at: [-0.9, 0.95] as XZ, r: 0.4 },
    ],
    [],
  );
  return (
    <Spot id={`p:${who.id}`} name={who.person.name} hint={accent} marker={[who.at[0], 3.4, who.at[1]]}>
      <group position={[who.at[0], 0, who.at[1]]}>
        <HexIsland rings={1} t={0.95} seed={index + 11} keep={keep} />
        <Cottage at={[-0.3, 0.1]} roof={ROOFS[index % ROOFS.length]} lit={evening} rot={index * 0.7} />
        <Cottage at={[0.75, -0.6]} roof={ROOFS[(index + 2) % ROOFS.length]} s={0.7} lit={evening && index % 2 === 0} rot={-index * 0.5} />
        <Bench at={[-0.9, 0.95]} rot={-0.8} />
        <NameTag y={2.6} name={who.person.name} line={who.person.building} accent={accent} />
        {who.kind === "explore" ? <Buoy at={[-who.at[0] * 0.15, 0, -who.at[1] * 0.15]} /> : null}
      </group>
    </Spot>
  );
}

/** A striped buoy with a little light, marking an island worth a visit. */
function Buoy({ at }: { at: V3 }) {
  const g = useRef<Group>(null);
  const { reduced } = usePeople();
  useFrame(({ clock }) => {
    if (g.current && !reduced) {
      g.current.position.y = -0.35 + Math.sin(clock.elapsedTime * 1.4 + at[0]) * 0.06;
      g.current.rotation.z = Math.sin(clock.elapsedTime * 1.1 + at[2]) * 0.12;
    }
  });
  return (
    <group ref={g} position={at}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 0.35, 8]} />
        <Mat c="#e8e2d4" />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.11, 0.25, 8]} />
        <Mat c="#c0553b" />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshBasicMaterial color={LAMP} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A plank bridge from your shore to theirs. It builds itself plank by plank when it first appears. */
export function Bridge({ to, dashed = false }: { to: XZ; dashed?: boolean }) {
  const { reduced } = usePeople();
  const built = useRef(reduced ? 1 : 0);
  const planks = useRef<Group>(null);
  const len = Math.hypot(to[0], to[1]);
  const start = HOME_R - 0.3;
  const end = len - 1.6;
  const n = Math.max(2, Math.floor((end - start) / 0.36));
  const angle = Math.atan2(to[0], to[1]);
  useFrame((_, dt) => {
    built.current = Math.min(1, built.current + dt * 0.45);
    const g = planks.current;
    if (!g) return;
    g.children.forEach((m, i) => {
      m.visible = i / n <= built.current && (!dashed || i % 2 === 0);
    });
  });
  return (
    <group rotation={[0, angle, 0]}>
      <group ref={planks}>
        {Array.from({ length: n }, (_, i) => {
          const d = start + (i / (n - 1)) * (end - start);
          const sag = Math.sin((i / (n - 1)) * Math.PI) * -0.1;
          return (
            <mesh key={i} position={[0, TOP - 0.02 + sag, d]} castShadow receiveShadow>
              <boxGeometry args={[0.8, 0.06, 0.3]} />
              <Mat c={i % 3 ? "#c9a77c" : "#b48a66"} />
            </mesh>
          );
        })}
      </group>
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, TOP + 0.3, (start + end) / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, end - start, 5]} />
          <Mat c="#d8c7a6" />
        </mesh>
      ))}
    </group>
  );
}

/** ID's suggestion: a striped lighthouse across the water whose beam sweeps round to find you. */
export function Lighthouse({ name, line, lit, evening }: { name: string | null; line: string; lit: boolean; evening: boolean }) {
  const beam = useRef<Group>(null);
  const { reduced } = usePeople();
  useFrame((_, dt) => {
    if (beam.current && lit && !reduced) beam.current.rotation.y += dt * 0.7;
  });
  const keep = useMemo(
    () => [
      { at: [0, 0] as XZ, r: 0.9 },
      { at: [-1.3, 0.6] as XZ, r: 0.6 },
    ],
    [],
  );
  return (
    <Spot id="suggestion" name={name ?? "Nobody this week"} hint={lit ? "ID's suggestion" : "No match, honestly"} marker={[SUGGESTION[0], 6.6, SUGGESTION[1]]}>
      <group position={[SUGGESTION[0], 0, SUGGESTION[1]]}>
        <HexIsland rings={1} t={1.15} seed={5} keep={keep} />
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, TOP + 0.42 + i * 0.85, 0]} castShadow>
            <cylinderGeometry args={[0.55 - i * 0.07, 0.62 - i * 0.07, 0.85, 8]} />
            <Mat c={i % 2 ? "#d9694f" : "#f4efe6"} />
          </mesh>
        ))}
        <mesh position={[0, TOP + 3.65, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.07, 8]} />
          <Mat c="#2f3a38" />
        </mesh>
        <mesh position={[0, TOP + 3.95, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.55, 8]} />
          {lit ? <meshBasicMaterial color={LAMP} toneMapped={false} /> : <meshStandardMaterial color="#cfe6e1" transparent opacity={0.6} roughness={0.1} />}
        </mesh>
        <mesh position={[0, TOP + 4.45, 0]} castShadow>
          <coneGeometry args={[0.52, 0.5, 8]} />
          <Mat c="#2f3a38" />
        </mesh>
        {lit ? (
          <group ref={beam} position={[0, TOP + 3.95, 0]}>
            <mesh position={[0, 0, 4.5]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[1.4, 9, 24, 1, true]} />
              <meshBasicMaterial color={BEAM} transparent opacity={evening ? 0.2 : 0.05} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
            </mesh>
            <pointLight intensity={evening ? 8 : 3} distance={10} color={C.bulb} />
          </group>
        ) : null}
        <Cottage at={[-1.3, 0.6]} roof={C.forest} s={0.8} lit={evening} rot={0.6} />
        {name ? <NameTag y={5.6} name={name} line={line} accent="ID thinks you should meet" /> : <NameTag y={5.6} name="Nobody this week" line="We'd rather say so" />}
      </group>
    </Spot>
  );
}

/** A little sailing boat at anchor, flying a flag for the kind of opportunity it carries. */
function Boat({ at, kind, i }: { at: V3; kind: OpportunityKind; i: number }) {
  const g = useRef<Group>(null);
  const { reduced } = usePeople();
  useFrame(({ clock }) => {
    if (g.current && !reduced) {
      g.current.position.y = at[1] + Math.sin(clock.elapsedTime * 1.2 + i) * 0.04;
      g.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + i) * 0.05;
    }
  });
  return (
    <group ref={g} position={at} rotation={[0, i * 0.3, 0]}>
      {/* A pitched roof turned upside down makes a hull */}
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI, 0, 0]} scale={[1.1, 0.3, 0.42]} geometry={GEO.roof} castShadow>
        <Mat c={i % 2 ? "#8a5d3d" : "#f3ead8"} />
      </mesh>
      <mesh position={[0, 0.31, 0]}>
        <boxGeometry args={[1.0, 0.03, 0.36]} />
        <Mat c="#c9a77c" />
      </mesh>
      <mesh position={[0.05, 0.85, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 1.1, 5]} />
        <Mat c="#5a4a40" />
      </mesh>
      <mesh position={[-0.13, 0.75, 0]} scale={[1, 1, 0.08]} castShadow>
        <coneGeometry args={[0.3, 0.75, 3]} />
        <Mat c="#fbf8ef" />
      </mesh>
      <mesh position={[0.18, 1.33, 0]}>
        <planeGeometry args={[0.28, 0.16]} />
        <meshStandardMaterial color={FLAG[kind]} side={DoubleSide} roughness={0.9} emissive={FLAG[kind]} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

/** Opportunities: little boats moored at your jetty, flagged by kind. */
export function Harbour({ opportunities }: { opportunities: OpportunitySummary[] }) {
  const boats = useMemo(() => opportunities.slice(0, 4), [opportunities]);
  const angle = Math.atan2(HARBOUR[0], HARBOUR[1]);
  return (
    <Spot id="harbour" name={`${opportunities.length} ${opportunities.length === 1 ? "opportunity" : "opportunities"}`} hint="The harbour" marker={[HARBOUR[0], 3.2, HARBOUR[1]]}>
      <group rotation={[0, angle, 0]}>
        {Array.from({ length: 16 }, (_, i) => (
          <mesh key={i} position={[0, TOP - 0.03, HOME_R - 0.4 + i * 0.4]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 0.07, 0.36]} />
            <Mat c={i % 3 ? "#c9a77c" : "#b48a66"} />
          </mesh>
        ))}
        {[HOME_R + 0.6, HOME_R + 1.8, HOME_R + 3].map((d) =>
          [-0.55, 0.55].map((x) => (
            <mesh key={`${d}${x}`} position={[x, -0.05, d]}>
              <cylinderGeometry args={[0.06, 0.07, 0.7, 6]} />
              <Mat c="#7a5c44" />
            </mesh>
          )),
        )}
        {boats.map((o, i) => (
          <Boat key={o.id} at={[i % 2 ? 1.5 : -1.5, -0.4, HOME_R + 1.4 + Math.floor(i / 2) * 1.9]} kind={o.kind} i={i} />
        ))}
      </group>
    </Spot>
  );
}
