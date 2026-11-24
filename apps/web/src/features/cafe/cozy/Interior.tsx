"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, type Group } from "three";

import type { CafeTable, Brew, WhatsOnItem } from "@idea-district/api-client";

import { GEO, Inst, type Item } from "@/features/district/cozy/Countryside";

import { KIND_LABEL } from "../shared";
import { useScene } from "../scene/context";
import { Hotspot } from "../scene/Hotspot";
import { C } from "../scene/palette";
import { tablesInRoom, tableStatus } from "../scene/Tables";
import { chalkboardTexture, noticeTexture, signTexture, tableTentTexture } from "../scene/textures";
import { useCanvasTexture } from "../scene/useCanvasTexture";

/*
 * The cozy Cafe: an open-fronted, roofless little cafe, like a dollhouse you look down into.
 * Floor x −3.4…3.4, z −2.4 (back wall) … 2.5 (front), floor top at y = F.
 */
export const F = 0.14;
const W = 3.4;
const D = 2.4;
const WALL = "#f3ead8";
const GREEN = "#2f5a4f";
const WOOD = "#9c6b48";
const LIT = new Color(C.bulb).multiplyScalar(2.6);

export const COZY_TABLES: [number, number][] = [
  [0.35, -0.85],
  [2.15, -0.45],
  [1.15, 1.05],
];

function Mat({ c, rough = 0.9 }: { c: string; rough?: number }) {
  return <meshStandardMaterial flatShading color={c} roughness={rough} />;
}

function Box({ at, size, c, shadow = true }: { at: [number, number, number]; size: [number, number, number]; c: string; shadow?: boolean }) {
  return (
    <mesh position={at} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
      <Mat c={c} />
    </mesh>
  );
}

const SKIN = ["#e9bf9b", "#c99572", "#8d5d3f", "#f1cfae", "#a87452"];
const SHIRT = ["#7d6f6c", "#3f6b63", "#c9a77c", "#5c6f8a", "#a8664c", "#e4dccb"];

/** A little figurine: round body, round head. `sit` lowers it onto a stool. */
export function Figure({ at, face, k, sit = false, apron = false }: { at: [number, number]; face: number; k: number; sit?: boolean; apron?: boolean }) {
  const y = F + (sit ? 0.3 : 0);
  return (
    <group position={[at[0], y, at[1]]} rotation={[0, face, 0]}>
      {sit ? null : (
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 0.4, 8]} />
          <Mat c="#4b4038" />
        </mesh>
      )}
      <mesh position={[0, sit ? 0.24 : 0.6, 0]} scale={[1, 1.25, 0.85]} castShadow>
        <sphereGeometry args={[0.19, 10, 8]} />
        <Mat c={apron ? C.forest : SHIRT[k % SHIRT.length]} />
      </mesh>
      <mesh position={[0, sit ? 0.58 : 0.94, 0]} castShadow>
        <sphereGeometry args={[0.13, 12, 10]} />
        <Mat c={SKIN[k % SKIN.length]} />
      </mesh>
      <mesh position={[0, sit ? 0.63 : 0.99, -0.02]} scale={[1, 0.7, 1]}>
        <sphereGeometry args={[0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat c={k % 3 === 0 ? "#2b2420" : k % 3 === 1 ? "#5a3d2b" : "#1d1a18"} />
      </mesh>
    </group>
  );
}

/** Walls on three sides (back, left, and a low one on the right), green below, cream above. */
function Shell({ evening }: { evening: boolean }) {
  const lights = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let i = 0; i <= 16; i++) out.push({ p: [-W + (i / 16) * 2 * W, 2.36 - Math.sin((i / 16) * Math.PI * 4) ** 2 * 0.12, -D + 0.12], s: [0.05, 0.05, 0.05], c: "#ffe2b0" });
    for (let i = 1; i <= 10; i++) out.push({ p: [-W + 0.12, 2.36 - Math.sin((i / 10) * Math.PI * 3) ** 2 * 0.12, -D + (i / 10) * 2 * D], s: [0.05, 0.05, 0.05], c: "#ffe2b0" });
    return out;
  }, []);
  return (
    <group>
      {/* Floor: warm planks, a rug in the middle */}
      <Box at={[0, F / 2, 0.05]} size={[2 * W + 0.2, F, 2 * D + 0.35]} c="#b98a5f" />
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[-W + 0.26 + i * 0.52, F + 0.002, 0.05]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.5, 2 * D + 0.3]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#b3845a" : i % 3 === 1 ? "#bf9064" : "#b68960"} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[1.2, F + 0.008, 0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.2, 2.4]} />
        <meshStandardMaterial color="#c9b79c" roughness={1} />
      </mesh>
      <mesh position={[1.2, F + 0.01, 0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.9, 2.1]} />
        <meshStandardMaterial color="#e6dcc4" roughness={1} />
      </mesh>

      {/* Back wall, with a window in the middle */}
      <Box at={[-2.05, F + 1.2, -D - 0.1]} size={[2.9, 2.4, 0.2]} c={WALL} />
      <Box at={[2.05, F + 1.2, -D - 0.1]} size={[2.9, 2.4, 0.2]} c={WALL} />
      <Box at={[0, F + 0.45, -D - 0.1]} size={[1.2, 0.9, 0.2]} c={WALL} />
      <Box at={[0, F + 2.2, -D - 0.1]} size={[1.2, 0.4, 0.2]} c={WALL} />
      <mesh position={[0, F + 1.45, -D - 0.12]}>
        <planeGeometry args={[1.2, 1.1]} />
        {evening ? <meshStandardMaterial color="#3a4a6e" roughness={0.3} /> : <meshStandardMaterial color="#cfe7ee" roughness={0.2} emissive="#cfe7ee" emissiveIntensity={0.25} />}
      </mesh>
      <Box at={[0, F + 1.45, -D - 0.02]} size={[0.06, 1.1, 0.05]} c="#f7f3ea" />
      <Box at={[0, F + 0.92, -D + 0.02]} size={[1.35, 0.06, 0.18]} c={WOOD} />
      {/* Left wall */}
      <Box at={[-W - 0.1, F + 1.2, 0]} size={[0.2, 2.4, 2 * D + 0.2]} c={WALL} />
      {/* Green wainscot on both */}
      <Box at={[0, F + 0.4, -D + 0.01]} size={[2 * W, 0.8, 0.02]} c={GREEN} shadow={false} />
      <Box at={[-W + 0.01, F + 0.4, 0]} size={[0.02, 0.8, 2 * D]} c={GREEN} shadow={false} />
      {/* Top trim */}
      <Box at={[0, F + 2.43, -D - 0.1]} size={[2 * W + 0.4, 0.08, 0.3]} c={WOOD} />
      <Box at={[-W - 0.1, F + 2.43, 0]} size={[0.3, 0.08, 2 * D + 0.4]} c={WOOD} />
      {/* Right: a low wall up to the District door */}
      <Box at={[W + 0.1, F + 0.45, -0.95]} size={[0.2, 0.9, 2.9]} c={WALL} />
      <Box at={[W + 0.1, F + 0.93, -0.95]} size={[0.3, 0.06, 2.95]} c={WOOD} />
      {/* Front: planters either side of the way in */}
      {[-2.2, 2.2].map((x) => (
        <group key={x}>
          <Box at={[x, F + 0.18, D + 0.1]} size={[1.9, 0.36, 0.34]} c={WOOD} />
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[x - 0.78 + i * 0.31, F + 0.42, D + 0.1]} scale={0.15 + (i % 2) * 0.03} geometry={GEO.blob} castShadow>
              <Mat c={i % 3 === 0 ? "#f3a6b8" : i % 3 === 1 ? "#6fae5a" : "#f6d65a"} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Fairy lights along the top of the walls */}
      <Inst geo={GEO.blob} items={lights} shadow={false} glow={evening ? 3 : 0.4} rough={0.4} />
      {/* Plants in the corners */}
      {[
        [-W + 0.35, -D + 0.35],
        [W - 0.3, -D + 0.35],
      ].map(([x, z]) => (
        <group key={x} position={[x, F, z]}>
          <mesh position={[0, 0.17, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.12, 0.34, 8]} />
            <Mat c="#c66f4f" />
          </mesh>
          <mesh position={[0, 0.3, 0]} scale={[0.3, 0.42, 0.3]} geometry={GEO.blob} castShadow>
            <Mat c="#5f9f55" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The name over the back wall. */
function Sign() {
  const tex = useCanvasTexture(() => signTexture("THE DISTRICT CAFE", { bg: C.ink, fg: C.cream, w: 1024, h: 180 }), "cozy-cafe-sign");
  return (
    <group position={[0, F + 2.85, -D - 0.1]}>
      <Box at={[0, 0, -0.03]} size={[3.3, 0.62, 0.06]} c={C.ink} />
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[3.2, 0.56]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {[-1.3, 1.3].map((x) => (
        <Box key={x} at={[x, -0.4, -0.03]} size={[0.06, 0.25, 0.06]} c="#4b4038" />
      ))}
    </group>
  );
}

/** Daily Brew: the counter, a barista, and today's question chalked on the wall. */
function Counter({ brew, hereToday, atTables }: { brew: Brew | null | undefined; hereToday: number; atTables: number }) {
  const question = brew === undefined ? "…" : (brew?.question ?? null);
  const answered = brew ? brew.answer_count : null;
  const board = useCanvasTexture(() => chalkboardTexture(question, answered), `${question}-${answered}`);
  const steam = useRef<Group>(null);
  const { reduced } = useScene();
  useFrame(({ clock }) => {
    if (!steam.current || reduced) return;
    steam.current.children.forEach((p, i) => {
      const t = (clock.elapsedTime * 0.5 + i / 3) % 1;
      p.position.set(Math.sin(t * 5 + i) * 0.03, t * 0.4, 0);
      p.scale.setScalar(0.03 + t * 0.05);
    });
  });
  const extra = Math.max(0, Math.min(2, hereToday - atTables));
  return (
    <Hotspot id="counter" name="Today's question" hint="Daily Brew" marker={[-1.9, 2.55, -1.35]}>
      <group>
        <Box at={[-1.9, F + 0.42, -1.45]} size={[2.5, 0.84, 0.55]} c="#7a5a40" />
        <Box at={[-1.9, F + 0.87, -1.45]} size={[2.62, 0.06, 0.66]} c="#ece4d4" />
        {[-2.8, -2.2, -1.6, -1.0].map((x) => (
          <Box key={x} at={[x, F + 0.42, -1.17]} size={[0.04, 0.7, 0.02]} c="#6a4c35" shadow={false} />
        ))}
        {/* Espresso machine, cups, a cake stand */}
        <Box at={[-2.55, F + 1.1, -1.55]} size={[0.5, 0.4, 0.34]} c="#c9c4bb" />
        <Box at={[-2.55, F + 1.32, -1.55]} size={[0.52, 0.04, 0.36]} c="#8a837a" />
        <mesh position={[-2.55, F + 1.15, -1.37]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshBasicMaterial color={new Color(C.ember).multiplyScalar(2)} toneMapped={false} />
        </mesh>
        <group ref={steam} position={[-2.3, F + 1.0, -1.38]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial flatShading color="#ffffff" transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
        {[-1.7, -1.5, -1.3].map((x, i) => (
          <mesh key={x} position={[x, F + 0.95, -1.5 + (i % 2) * 0.1]} castShadow>
            <cylinderGeometry args={[0.05, 0.04, 0.1, 10]} />
            <Mat c="#f7f3ea" rough={0.3} />
          </mesh>
        ))}
        <mesh position={[-0.95, F + 0.98, -1.5]} castShadow>
          <cylinderGeometry args={[0.18, 0.04, 0.16, 10]} />
          <Mat c="#f7f3ea" rough={0.3} />
        </mesh>
        <mesh position={[-0.95, F + 1.09, -1.5]} castShadow>
          <cylinderGeometry args={[0.12, 0.13, 0.08, 10]} />
          <Mat c="#e7b98a" />
        </mesh>
        {/* Chalkboard on the wall behind */}
        <Box at={[-1.9, F + 1.72, -D + 0.02]} size={[1.9, 1.0, 0.04]} c={WOOD} />
        <mesh position={[-1.9, F + 1.72, -D + 0.05]}>
          <planeGeometry args={[1.8, 0.9]} />
          <meshStandardMaterial map={board} roughness={0.95} />
        </mesh>
        <Figure at={[-2.0, -1.95]} face={0} k={2} apron />
        {/* Stools, with anyone else in today having a coffee */}
        {[-2.6, -1.9, -1.2].map((x, i) => (
          <group key={x}>
            <mesh position={[x, F + 0.25, -0.85]} castShadow>
              <cylinderGeometry args={[0.15, 0.12, 0.5, 8]} />
              <Mat c={WOOD} />
            </mesh>
            {i < extra ? <Figure at={[x, -0.85]} face={Math.PI} k={i + 4} sit /> : null}
          </group>
        ))}
      </group>
    </Hotspot>
  );
}

/** A round table with four stools, a topic card, and whoever's seated. */
function CozyTable({ i, table, evening }: { i: number; table: CafeTable | undefined; evening: boolean }) {
  const [tx, tz] = COZY_TABLES[i];
  const live = table?.status === "open";
  const seated = live ? Math.min(table.seated_count, 3) : 0;
  const tex = useCanvasTexture(
    () => tableTentTexture(table?.title ?? "", table ? tableStatus(table) : "", !!live),
    `${table?.id}-${table?.status}-${table?.seated_count}`,
  );
  const seats = [0, 1, 2, 3].map((k) => {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    return { at: [tx + Math.sin(a) * 0.68, tz + Math.cos(a) * 0.68] as [number, number], face: a + Math.PI };
  });
  const model = (
    <group>
      <mesh position={[tx, F + 0.31, tz]} castShadow>
        <cylinderGeometry args={[0.05, 0.16, 0.62, 8]} />
        <Mat c="#4b4038" />
      </mesh>
      <mesh position={[tx, F + 0.64, tz]} castShadow receiveShadow>
        <cylinderGeometry args={[0.46, 0.46, 0.06, 16]} />
        <Mat c={i === 1 ? "#d8c3a0" : "#c9a77c"} />
      </mesh>
      {seats.map((s, k) => (
        <mesh key={k} position={[s.at[0], F + 0.17, s.at[1]]} castShadow>
          <cylinderGeometry args={[0.14, 0.12, 0.34, 8]} />
          <Mat c={k % 2 ? WOOD : "#8a5d3d"} />
        </mesh>
      ))}
      {seats.slice(1, 1 + seated).map((s, k) => (
        <Figure key={k} at={s.at} face={s.face} k={i * 3 + k} sit />
      ))}
      {table ? (
        <group position={[tx, F + 0.75, tz]}>
          <mesh rotation={[-0.35, 0, 0]} position={[0, 0, 0.04]}>
            <planeGeometry args={[0.36, 0.22]} />
            <meshStandardMaterial map={tex} roughness={0.9} />
          </mesh>
          <mesh rotation={[0.35, Math.PI, 0]} position={[0, 0, -0.04]}>
            <planeGeometry args={[0.36, 0.22]} />
            <meshStandardMaterial map={tex} roughness={0.9} />
          </mesh>
        </group>
      ) : null}
      {/* A candle: lit while the table is open */}
      <mesh position={[tx + 0.25, F + 0.72, tz - 0.12]}>
        <cylinderGeometry args={[0.03, 0.03, 0.1, 8]} />
        <Mat c="#f7f3ea" />
      </mesh>
      {live ? (
        <>
          <mesh position={[tx + 0.25, F + 0.8, tz - 0.12]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshBasicMaterial color={LIT} toneMapped={false} />
          </mesh>
          {evening ? <pointLight position={[tx, F + 1.1, tz]} intensity={2.2} distance={2.6} color={C.bulb} /> : null}
        </>
      ) : null}
    </group>
  );
  if (!table) return model;
  return (
    <Hotspot id={`table-${i}`} name={table.title} hint={tableStatus(table)} marker={[tx, F + 1.65, tz]}>
      {model}
    </Hotspot>
  );
}

/** What's on, pinned to a corkboard on the left wall. */
function Noticeboard({ items }: { items: WhatsOnItem[] }) {
  const tex = useCanvasTexture(
    () => noticeTexture(items.map((w) => ({ label: KIND_LABEL[w.kind], title: w.title }))),
    items.map((w) => w.id).join(","),
  );
  return (
    <Hotspot id="notice" name="What's on this week" hint="The noticeboard" marker={[-W + 0.4, 2.5, 0.75]}>
      <group position={[-W + 0.03, F + 1.4, 0.75]} rotation={[0, Math.PI / 2, 0]}>
        <Box at={[0, 0, 0]} size={[1.75, 1.15, 0.05]} c={C.forest} />
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[1.65, 1.04]} />
          <meshStandardMaterial map={tex} roughness={0.95} />
        </mesh>
      </group>
    </Hotspot>
  );
}

/** A door in a frame, standing a little open, with a sign above. */
function Door({ label, bg, fg, leaf }: { label: string; bg: string; fg: string; leaf: string }) {
  const tex = useCanvasTexture(() => signTexture(label, { bg, fg, w: 768, h: 160 }), `cozy-door-${label}`);
  return (
    <group>
      {[-0.55, 0.55].map((x) => (
        <Box key={x} at={[x, F + 1.0, 0]} size={[0.12, 2.0, 0.26]} c={WOOD} />
      ))}
      <Box at={[0, F + 2.04, 0]} size={[1.24, 0.12, 0.28]} c={WOOD} />
      <group position={[-0.49, F, 0.02]} rotation={[0, -0.7, 0]}>
        <Box at={[0.49, 0.95, 0]} size={[0.98, 1.9, 0.05]} c={leaf} />
        <mesh position={[0.86, 0.95, 0.04]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      {/* The light of the next room through the doorway */}
      <mesh position={[0, F + 0.95, -0.02]}>
        <planeGeometry args={[0.98, 1.9]} />
        <meshBasicMaterial color="#fff1dc" />
      </mesh>
      <mesh position={[0, F + 2.36, 0.12]}>
        <planeGeometry args={[1.4, 0.29]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** The whole cafe. */
export function CozyCafe({ brew, tables, hereToday, whatsOn, evening }: { brew: Brew | null | undefined; tables: CafeTable[]; hereToday: number; whatsOn: WhatsOnItem[]; evening: boolean }) {
  const shown = tablesInRoom(tables);
  const atTables = shown.reduce((n, t) => n + (t.status === "open" ? Math.min(t.seated_count, 3) : 0), 0);
  return (
    <group>
      <Shell evening={evening} />
      <Sign />
      <Counter brew={brew} hereToday={hereToday} atTables={atTables} />
      {COZY_TABLES.map((_, i) => (
        <CozyTable key={i} i={i} table={shown[i]} evening={evening} />
      ))}
      <Noticeboard items={whatsOn} />
      <Hotspot id="quick" name="Quick Breaks" hint="The back room" marker={[2.3, 2.95, -D]}>
        <group position={[2.3, 0, -D + 0.04]}>
          <Door label="QUICK BREAKS" bg={C.ember} fg={C.ink} leaf={C.forest2} />
        </group>
      </Hotspot>
      <Hotspot id="district" name="Your District" hint="The side door" marker={[W + 0.1, 2.95, 1.45]}>
        <group position={[W + 0.1, 0, 1.45]} rotation={[0, -Math.PI / 2, 0]}>
          <Door label="YOUR DISTRICT" bg={C.forest} fg={C.cream} leaf={C.forest2} />
        </group>
      </Hotspot>
      {evening ? (
        <>
          <pointLight position={[0, 2.3, 0.2]} intensity={7} distance={8} color={C.bulb} />
          <pointLight position={[-2, 1.8, -1]} intensity={3} distance={4} color={C.bulb} />
        </>
      ) : null}
    </group>
  );
}
