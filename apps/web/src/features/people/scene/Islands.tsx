"use client";

import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import { AdditiveBlending, Color, DoubleSide, type Group, type Mesh } from "three";

import type { OpportunityKind, OpportunitySummary } from "@idea-district/api-client";

import { C } from "@/features/cafe/scene/palette";
import { canvasTexture } from "@/features/cafe/scene/textures";
import { useCanvasTexture } from "@/features/cafe/scene/useCanvasTexture";

import { Fern, Tree } from "@/features/district/scene/parts";
import { useSurface, WorldModelClone } from "@/features/world/assets";

import { usePeople } from "./context";
import { BOTTLES, HARBOUR, HOME_R, SUGGESTION, type Islander, type PSpot, type V3, type XZ } from "./layout";

const GLOW = new Color(C.ember).multiplyScalar(2.2);
const LAMP = new Color(C.bulb).multiplyScalar(2.8);
const BEAM = new Color("#fff0cc").multiplyScalar(1.4);
// Tints over real roof tiles: terracotta, weathered, slate-ish, mossy.
const ROOFS = ["#ffffff", "#c9b6a6", "#9aa7ad", "#b7c2a0", "#e0c2a8", "#a8a29a"];

/** Something you can sail to: hover shows its name, a click flies you over. */
export function Spot({ id, name, hint, marker, children }: { id: PSpot; name: string; hint: string; marker: V3; children: ReactNode }) {
  const { spot, hovered, setHovered, select, dragged, reduced } = usePeople();
  const block = useRef<Mesh>(null);
  const isHover = hovered === id;
  const here = spot === id;
  const phase = marker[0] * 1.3 + marker[2] * 0.7;
  useFrame(({ clock }, dt) => {
    const b = block.current;
    if (!b) return;
    b.position.y = marker[1] + (reduced ? 0 : Math.sin(clock.elapsedTime * 2 + phase) * 0.15);
    if (!reduced) b.rotation.y += dt * (isHover ? 3 : 0.9);
    const s = isHover ? 1.6 : 1;
    b.scale.setScalar(b.scale.x + (s - b.scale.x) * Math.min(1, dt * 10));
  });
  return (
    <group
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (here) return;
        setHovered(id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (hovered === id) setHovered(null);
        document.body.style.cursor = "";
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (dragged.current || here) return;
        document.body.style.cursor = "";
        select(id);
      }}
    >
      {children}
      <mesh ref={block} position={marker} rotation={[0.6, 0.6, 0]} visible={spot === "overview"}>
        <boxGeometry args={[0.36, 0.36, 0.36]} />
        <meshBasicMaterial color={GLOW} toneMapped={false} />
      </mesh>
      {isHover && !here ? (
        <Html position={[marker[0], marker[1] + 0.7, marker[2]]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="cafe-label max-w-[240px] rounded-[12px] bg-ink/95 px-3.5 py-2.5 text-center text-cream shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-light">{hint}</p>
            <p className="mt-0.5 text-[14px] font-bold leading-snug">{name}</p>
            <p className="mt-1 text-[11px] text-cream/70">Click to sail over</p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

/** A rocky island: real grass and rock on top, a weathered stone edge into the sea. */
function Land({ r, seed = 0 }: { r: number; seed?: number }) {
  const grass = useSurface("grass", [r * 0.7, r * 0.7]);
  const rock = useSurface("grass", [r * 1.4, 0.6]);
  const sides = 11 + (seed % 4);
  return (
    <group>
      <mesh position={[0, -0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 1.18, 1.3, sides, 1]} />
        <meshStandardMaterial {...rock} color="#8f857a" />
      </mesh>
      <mesh position={[0, 0.11, 0]} receiveShadow>
        <cylinderGeometry args={[r * 0.98, r, 0.1, sides, 1]} />
        <meshStandardMaterial {...grass} color="#a9c98a" />
      </mesh>
      {[0.4, 2.3, 4.4].map((a, k) => (
        <mesh key={k} position={[Math.cos(a + seed) * r * 1.02, -0.3, Math.sin(a + seed) * r * 1.02]} rotation={[a, seed, 0.4]} scale={[1, 0.7, 0.9]} castShadow>
          <dodecahedronGeometry args={[0.32 - k * 0.05, 1]} />
          <meshStandardMaterial {...rock} color="#8a8177" />
        </mesh>
      ))}
    </group>
  );
}

/** A small house: plaster walls, a tiled pyramid roof, a wooden door; the window glows at dusk. */
function House({ at, roof, s = 1, lit }: { at: V3; roof: string; s?: number; lit: boolean }) {
  const wall = useSurface("plaster", [0.5, 0.4]);
  const tiles = useSurface("roof", [1, 0.6]);
  const wood = useSurface("planks", [0.2, 0.3]);
  return (
    <group position={at} scale={s}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.8, 0.8]} />
        <meshStandardMaterial {...wall} color="#f1e9da" />
      </mesh>
      <mesh position={[0, 1.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.76, 0.55, 4]} />
        <meshStandardMaterial {...tiles} color={roof} flatShading />
      </mesh>
      <mesh position={[0.2, 0.47, 0.41]}>
        <planeGeometry args={[0.22, 0.26]} />
        {lit ? <meshBasicMaterial color={LAMP} toneMapped={false} /> : <meshPhysicalMaterial color="#2b3a3c" roughness={0.05} clearcoat={1} />}
      </mesh>
      <mesh position={[-0.2, 0.3, 0.41]}>
        <planeGeometry args={[0.2, 0.42]} />
        <meshStandardMaterial {...wood} color="#5a4636" />
      </mesh>
    </group>
  );
}

function Palm({ at, s = 1 }: { at: V3; s?: number }) {
  return (
    <group position={[0, at[1] - 0.04, 0]}>
      <Tree at={[at[0], at[2]]} s={s * 0.62} seed={Math.round(Math.abs(at[0] * 7 + at[2] * 3))} />
    </group>
  );
}

/** A name over each island: only their public card, never anything they kept private. */
export function NameTag({ y, name, line, accent }: { y: number; name: string; line: string; accent?: string }) {
  const { spot } = usePeople();
  if (spot !== "overview") return null;
  return (
    <Html position={[0, y, 0]} center distanceFactor={18} zIndexRange={[8, 0]} style={{ pointerEvents: "none" }}>
      <div className="w-max max-w-[220px] rounded-full bg-cream/95 px-3 py-1.5 text-center shadow-[0_6px_18px_rgba(0,0,0,0.25)]">
        {accent ? <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ember-deep">{accent}</p> : null}
        <p className="text-[13px] font-bold leading-tight text-ink">{name}</p>
        <p className="line-clamp-1 text-[11px] text-ink3">{line}</p>
      </div>
    </Html>
  );
}

/** Your island: the ID tower, a couple of houses, the harbour. */
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
  return (
    <Spot id="you" name="Your island" hint="You" marker={[0, 4.4, 0]}>
      <Land r={HOME_R} seed={3} />
      {[0, 1, 2].map((lv) => (
        <mesh key={lv} position={[0, 0.45 + lv * 0.5, 0]} castShadow>
          <boxGeometry args={[1 - lv * 0.25, 0.5, 1 - lv * 0.25]} />
          <meshStandardMaterial color={C.ember} roughness={0.45} emissive={C.ember} emissiveIntensity={0.15} />
        </mesh>
      ))}
      <mesh ref={crown} position={[0, 2.25, 0]} castShadow>
        <boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshStandardMaterial map={face} emissive={C.ember} emissiveIntensity={0.25} />
      </mesh>
      <House at={[-1.7, 0.15, -0.9]} roof={C.forest} lit={evening} />
      <House at={[1.6, 0.15, -1.2]} roof={C.forest2} s={0.85} lit={evening} />
      <Palm at={[-1.4, 0.15, 1.5]} />
      <Palm at={[0.6, 0.15, -2.4]} s={0.8} />
      <pointLight position={[0, 2.4, 1.2]} intensity={3} distance={5} color={C.bulb} />
    </Spot>
  );
}

/** A founder's island. Connected ones have a bridge to yours; Explore picks have a glowing buoy. */
export function PersonIsland({ who, index, evening }: { who: Islander; index: number; evening: boolean }) {
  const roof = ROOFS[index % ROOFS.length];
  const accent = who.kind === "explore" ? "Worth a visit" : who.kind === "in_talks" ? "In talks" : "Connected";
  return (
    <Spot id={`p:${who.id}`} name={who.person.name} hint={accent} marker={[who.at[0], 3.4, who.at[1]]}>
      <group position={[who.at[0], 0, who.at[1]]}>
        <Land r={2} seed={index} />
        <House at={[-0.35, 0.15, 0.1]} roof={roof} lit={evening} />
        <House at={[0.75, 0.15, -0.6]} roof={ROOFS[(index + 2) % ROOFS.length]} s={0.7} lit={evening && index % 2 === 0} />
        <Palm at={[0.9, 0.15, 0.9]} s={0.8} />
        {/* A bench by the water, looking out */}
        <WorldModelClone name="bench" position={[-0.95, 0.15, 0.95]} rotation={[0, -0.8, 0]} scale={0.6} />
        <Fern at={[-1.3, 0.2]} rot={index} s={0.32} />
        <NameTag y={2.6} name={who.person.name} line={who.person.building} accent={accent} />
        {who.kind === "explore" ? <Buoy at={[-who.at[0] * 0.17, 0, -who.at[1] * 0.17]} /> : null}
      </group>
    </Spot>
  );
}

/** A glowing buoy marking an island worth a visit. */
function Buoy({ at }: { at: V3 }) {
  const g = useRef<Group>(null);
  const { reduced } = usePeople();
  useFrame(({ clock }) => {
    if (g.current && !reduced) {
      g.current.position.y = -0.3 + Math.sin(clock.elapsedTime * 1.4 + at[0]) * 0.08;
      g.current.rotation.z = Math.sin(clock.elapsedTime * 1.1 + at[2]) * 0.12;
    }
  });
  return (
    <group ref={g} position={at}>
      <WorldModelClone name="buoy" position={[0, 0.2, 0]} scale={0.5} />
      <mesh position={[0, 1.18, 0]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshBasicMaterial color={LAMP} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A wooden bridge from your shore to theirs. It builds itself plank by plank when it first appears. */
export function Bridge({ to, dashed = false }: { to: XZ; dashed?: boolean }) {
  const { reduced } = usePeople();
  const built = useRef(reduced ? 1 : 0);
  const planks = useRef<Group>(null);
  const len = Math.hypot(to[0], to[1]);
  const start = HOME_R - 0.2;
  const end = len - 1.8;
  const n = Math.max(2, Math.floor((end - start) / 0.38));
  const angle = Math.atan2(to[0], to[1]);
  const wood = useSurface("planks", [1, 0.35]);
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
          const sag = Math.sin((i / (n - 1)) * Math.PI) * -0.12;
          return (
            <mesh key={i} position={[0, 0.12 + sag, d]} castShadow receiveShadow>
              <boxGeometry args={[0.9, 0.06, 0.3]} />
              <meshStandardMaterial {...wood} color={i % 3 ? "#c9b29a" : "#a88d74"} />
            </mesh>
          );
        })}
      </group>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.4, (start + end) / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, end - start, 6]} />
          <meshStandardMaterial color="#c9b79c" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** ID's suggestion: a lighthouse across the water whose beam sweeps round to find you. */
export function Lighthouse({ name, line, lit, evening }: { name: string | null; line: string; lit: boolean; evening: boolean }) {
  const beam = useRef<Group>(null);
  const { reduced } = usePeople();
  const wall = useSurface("plaster", [1.5, 0.5]);
  useFrame((_, dt) => {
    if (beam.current && lit && !reduced) beam.current.rotation.y += dt * 0.7;
  });
  return (
    <Spot id="suggestion" name={name ?? "Nobody this week"} hint={lit ? "ID's suggestion" : "No match, honestly"} marker={[SUGGESTION[0], 6.6, SUGGESTION[1]]}>
      <group position={[SUGGESTION[0], 0, SUGGESTION[1]]}>
        <Land r={2.6} seed={5} />
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, 0.65 + i * 0.85, 0]} castShadow>
            <cylinderGeometry args={[0.55 - i * 0.07, 0.62 - i * 0.07, 0.85, 32]} />
            <meshStandardMaterial {...wall} color={i % 2 ? "#e0674a" : "#f4efe6"} />
          </mesh>
        ))}
        <mesh position={[0, 4.15, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.55, 16]} />
          {lit ? <meshBasicMaterial color={LAMP} toneMapped={false} /> : <meshPhysicalMaterial color="#cfe6e1" transparent opacity={0.45} roughness={0.05} clearcoat={1} />}
        </mesh>
        <mesh position={[0, 3.9, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.06, 32]} />
          <meshStandardMaterial color="#26302e" metalness={0.8} roughness={0.4} />
        </mesh>
        <mesh position={[0, 4.65, 0]} castShadow>
          <coneGeometry args={[0.55, 0.5, 32]} />
          <meshStandardMaterial color="#26302e" metalness={0.8} roughness={0.35} />
        </mesh>
        {lit ? (
          <group ref={beam} position={[0, 4.15, 0]}>
            <mesh position={[0, 0, 4.5]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[1.4, 9, 24, 1, true]} />
              <meshBasicMaterial color={BEAM} transparent opacity={evening ? 0.2 : 0.05} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
            </mesh>
            <pointLight intensity={evening ? 8 : 3} distance={10} color={C.bulb} />
          </group>
        ) : null}
        <Palm at={[1.5, 0.15, 0.8]} />
        <House at={[-1.3, 0.15, 0.6]} roof={C.forest} s={0.8} lit={evening} />
        {name ? <NameTag y={5.6} name={name} line={line} accent="ID thinks you should meet" /> : <NameTag y={5.6} name="Nobody this week" line="We'd rather say so" />}
      </group>
    </Spot>
  );
}

/** Requests waiting for you: bottles bobbing by your shore, a note inside each. */
export function Bottles({ count }: { count: number }) {
  const g = useRef<Group>(null);
  const { reduced } = usePeople();
  const shown = Math.min(count, 5);
  useFrame(({ clock }) => {
    if (!g.current || reduced) return;
    g.current.children.forEach((b, i) => {
      const t = clock.elapsedTime + i * 1.7;
      b.position.y = -0.25 + Math.sin(t * 1.3) * 0.08;
      b.rotation.z = 1.2 + Math.sin(t * 0.9) * 0.2;
      b.rotation.y = i + Math.sin(t * 0.3) * 0.3;
    });
  });
  if (shown === 0) return null;
  return (
    <Spot id="requests" name={`${count} ${count === 1 ? "request" : "requests"} waiting`} hint="Messages in bottles" marker={[BOTTLES[0], 2.2, BOTTLES[1]]}>
      <group ref={g} position={[BOTTLES[0], 0, BOTTLES[1]]}>
        {Array.from({ length: shown }, (_, i) => (
          <group key={i} position={[(i - (shown - 1) / 2) * 0.9, -0.25, (i % 2) * 0.6]} rotation={[0, i, 1.2]}>
            <mesh>
              <cylinderGeometry args={[0.16, 0.16, 0.55, 14]} />
              <meshPhysicalMaterial color="#bfe3dc" roughness={0.05} transmission={0.6} thickness={0.2} transparent opacity={0.75} />
            </mesh>
            <mesh position={[0, 0.36, 0]}>
              <cylinderGeometry args={[0.06, 0.1, 0.2, 10]} />
              <meshPhysicalMaterial color="#bfe3dc" roughness={0.05} transparent opacity={0.75} />
            </mesh>
            <mesh position={[0, 0.48, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 0.06, 8]} />
              <meshStandardMaterial color={C.woodDark} />
            </mesh>
            {/* The rolled-up note inside, Persimmon: the system has something for you */}
            <mesh>
              <cylinderGeometry args={[0.07, 0.07, 0.36, 10]} />
              <meshBasicMaterial color={GLOW} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
    </Spot>
  );
}

export const FLAG: Record<OpportunityKind, string> = { pilot_call: C.ember, challenge: "#c9a227", problem: C.forest2, circle: C.cream };

/** A real tall ship at anchor, flying a flag for what kind of opportunity it carries. */
function Ship({ at, kind, i }: { at: V3; kind: OpportunityKind; i: number }) {
  const g = useRef<Group>(null);
  const { reduced } = usePeople();
  useFrame(({ clock }) => {
    if (g.current && !reduced) {
      g.current.position.y = at[1] + Math.sin(clock.elapsedTime * 1.2 + i) * 0.05;
      g.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + i) * 0.04;
    }
  });
  return (
    <group ref={g} position={at} rotation={[0, i * 0.3, 0]}>
      <WorldModelClone name="ship" position={[0, 0.02, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.065} />
      {/* Hoisted at the top of the main mast */}
      <mesh position={[0.16, 1.22, 0.085]}>
        <planeGeometry args={[0.34, 0.2]} />
        <meshStandardMaterial color={FLAG[kind]} side={DoubleSide} roughness={0.9} emissive={FLAG[kind]} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

/** Opportunities: ships moored at your harbour, flagged by kind. */
export function Harbour({ opportunities }: { opportunities: OpportunitySummary[] }) {
  const ships = useMemo(() => opportunities.slice(0, 4), [opportunities]);
  const angle = Math.atan2(HARBOUR[0], HARBOUR[1]);
  const wood = useSurface("planks", [1, 3]);
  return (
    <Spot id="harbour" name={`${opportunities.length} ${opportunities.length === 1 ? "opportunity" : "opportunities"}`} hint="The harbour" marker={[HARBOUR[0], 3.2, HARBOUR[1]]}>
      {/* The pier */}
      <group rotation={[0, angle, 0]}>
        <mesh position={[0, 0.15, (HOME_R + 6.6) / 2]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.12, 6.6 - HOME_R + 0.6]} />
          <meshStandardMaterial {...wood} color="#c9b29a" />
        </mesh>
        {[HOME_R + 0.6, HOME_R + 1.8, HOME_R + 3].map((d) =>
          [-0.55, 0.55].map((x) => (
            <mesh key={`${d}${x}`} position={[x, -0.1, d]}>
              <cylinderGeometry args={[0.06, 0.07, 0.8, 10]} />
              <meshStandardMaterial {...wood} color="#7a5c44" />
            </mesh>
          )),
        )}
        {ships.map((o, i) => (
          <Ship key={o.id} at={[i % 2 ? 1.5 : -1.5, -0.45, HOME_R + 1.4 + Math.floor(i / 2) * 1.9]} kind={o.kind} i={i} />
        ))}
      </group>
    </Spot>
  );
}
