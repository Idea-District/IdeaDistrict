"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Color, type PointLight } from "three";

import type { CafeTable } from "@idea-district/api-client";

import { whenText } from "../shared";
import { useScene } from "./context";
import { Model } from "./assets";
import { Hotspot } from "./Hotspot";
import { C, LIGHT, type TimeOfDay } from "./palette";
import { TABLES, yourChairAngle } from "./spots";
import { tableTentTexture } from "./textures";
import { useCanvasTexture } from "./useCanvasTexture";

type XZ = [number, number];
const LIT = new Color(C.bulb).multiplyScalar(3);

export function tableStatus(t: CafeTable) {
  if (t.status === "open") return `Open now · ${t.seated_count} seated`;
  if (t.status === "scheduled") return t.starts_at ? whenText(t.starts_at) : "Coming up";
  return "Closed for now";
}

/** Open tables first, then the next ones coming up. */
export function tablesInRoom(tables: CafeTable[]) {
  const order = { open: 0, scheduled: 1, closed: 2 } as const;
  return [...tables].sort((a, b) => order[a.status] - order[b.status]).slice(0, TABLES.length);
}

/** A folded card on the table with its topic, turned towards the door. */
function Tent({ at, table }: { at: XZ; table: CafeTable }) {
  const tex = useCanvasTexture(() => tableTentTexture(table.title, tableStatus(table), table.status === "open"), `${table.id}-${table.status}-${table.seated_count}`);
  const face = Math.atan2(0 - at[0], 3.3 - at[1]);
  return (
    <group position={[at[0], 0.9, at[1]]} rotation={[0, face, 0]}>
      <mesh position={[0, 0, 0.055]} rotation={[-0.32, 0, 0]}>
        <planeGeometry args={[0.42, 0.26]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, -0.055]} rotation={[0.32, Math.PI, 0]}>
        <planeGeometry args={[0.42, 0.26]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** "…" over someone mid-sentence, now and then: these tables are talking. */
function Talking({ at, seed }: { at: [number, number, number]; seed: number }) {
  const { reduced } = useScene();
  const el = useRef<HTMLDivElement>(null);
  useFrame(({ clock }) => {
    if (el.current) el.current.style.opacity = reduced || Math.sin(clock.elapsedTime * 0.7 + seed * 2.1) > 0.35 ? "1" : "0";
  });
  return (
    <Html position={at} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div ref={el} className="cafe-talk flex gap-1 rounded-full bg-cream/95 px-2.5 py-1.5 shadow-md transition-opacity duration-500">
        <span />
        <span />
        <span />
      </div>
    </Html>
  );
}

/** Signs someone is sitting here: a coffee still steaming, a notebook, a jacket over the chair. */
function Occupied({ at, angle, k }: { at: XZ; angle: number; k: number }) {
  const cup: [number, number, number] = [Math.sin(angle) * 0.32, 0.765, Math.cos(angle) * 0.32];
  return (
    <group>
      <group position={[at[0] + cup[0], cup[1], at[1] + cup[2]]}>
        <mesh position={[0, 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.036, 0.09, 20]} />
          <meshPhysicalMaterial color="#f4f1e8" roughness={0.12} clearcoat={1} />
        </mesh>
        <mesh position={[0, 0.088, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.04, 18]} />
          <meshStandardMaterial color="#4a2e1a" roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.004, 0]}>
          <cylinderGeometry args={[0.075, 0.07, 0.008, 24]} />
          <meshPhysicalMaterial color="#f4f1e8" roughness={0.15} clearcoat={1} />
        </mesh>
      </group>
      {k % 2 === 0 ? (
        <mesh position={[at[0] + Math.sin(angle + 0.5) * 0.25, 0.77, at[1] + Math.cos(angle + 0.5) * 0.25]} rotation={[-Math.PI / 2, 0, angle + 0.3]} castShadow>
          <boxGeometry args={[0.15, 0.21, 0.012]} />
          <meshStandardMaterial color={k % 4 === 0 ? C.forest : C.ink2} roughness={0.7} />
        </mesh>
      ) : null}
      {k === 1 ? (
        <mesh position={[at[0] + Math.sin(angle) * 0.95, 0.82, at[1] + Math.cos(angle) * 0.95]} rotation={[0, angle, 0]}>
          <boxGeometry args={[0.44, 0.42, 0.06]} />
          <meshStandardMaterial color="#3d4a52" roughness={0.95} />
        </mesh>
      ) : null}
    </group>
  );
}

/** A real bistro table with four chairs, an industrial pendant over it, lit while the table is open. */
function CafeTableModel({ i, table, tod }: { i: number; table: CafeTable | undefined; tod: TimeOfDay }) {
  const { hovered, spot } = useScene();
  const at = TABLES[i];
  const live = table?.status === "open";
  const light = useRef<PointLight>(null);
  const focus = hovered === `table-${i}` || spot === `table-${i}`;
  const lampI = LIGHT[tod].lamp;
  useFrame((_, dt) => {
    const l = light.current;
    if (l) l.intensity += ((focus ? lampI * 1.3 : lampI) - l.intensity) * Math.min(1, dt * 6);
  });
  const a0 = yourChairAngle(i);
  // Two chairs on each long side; chair 0 is yours, facing the room.
  const seats = [
    [0.36, 0.62],
    [-0.36, 0.62],
    [-0.36, -0.62],
    [0.36, -0.62],
  ].map(([x, z]) => {
    const wx = at[0] + x * Math.cos(a0) + z * Math.sin(a0);
    const wz = at[1] - x * Math.sin(a0) + z * Math.cos(a0);
    return { at: [wx, wz] as XZ, face: z > 0 ? a0 + Math.PI : a0 };
  });
  const seated = live ? Math.min(table.seated_count, 3) : 0;

  const model = (
    <group>
      <Model name="table" position={[at[0], 0, at[1]]} rotation={[0, a0, 0]} scale={[1.45, 1.55, 1.45]} />
      {seats.map((st, k) => (
        <Model key={k} name="chair" position={[st.at[0], 0, st.at[1]]} rotation={[0, st.face, 0]} />
      ))}
      {seats.slice(1, 1 + seated).map((st, k) => (
        <Occupied key={k} at={at} angle={Math.atan2(st.at[0] - at[0], st.at[1] - at[1])} k={k} />
      ))}
      <Model name="lamp" position={[at[0], 4.2, at[1]]} />
      <mesh position={[at[0], 2.86, at[1]]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        {live ? <meshBasicMaterial color={LIT} toneMapped={false} /> : <meshStandardMaterial color="#d8d2bf" roughness={0.3} />}
      </mesh>
      {live ? <pointLight ref={light} position={[at[0], 2.7, at[1]]} intensity={lampI} distance={5} decay={2} color={C.bulb} castShadow shadow-mapSize={[512, 512]} shadow-bias={-0.002} /> : null}
      {table ? <Tent at={at} table={table} /> : null}
      {seated >= 2 ? <Talking at={[seats[1].at[0], 1.45, seats[1].at[1]]} seed={i} /> : null}
    </group>
  );

  if (!table) return model;
  return (
    <Hotspot id={`table-${i}`} name={table.title} hint={tableStatus(table)} marker={[at[0], 3.3, at[1]]}>
      {model}
    </Hotspot>
  );
}

/** Open Table: three tables, open ones first. Figures follow the real seated counts. */
export function Tables({ tables, hereToday, tod }: { tables: CafeTable[]; hereToday: number; tod: TimeOfDay }) {
  const shown = tablesInRoom(tables);
  const atTables = shown.reduce((n, t) => n + (t.status === "open" ? Math.min(t.seated_count, 3) : 0), 0);
  // Anyone else who dropped in today sits at the counter.
  const stools: XZ[] = [
    [-4.3, -3.75],
    [-2.1, -3.75],
    [-3.2, -3.75],
  ];
  const atCounter = Math.max(0, Math.min(stools.length, hereToday - atTables));
  return (
    <>
      {TABLES.map((_, i) => (
        <CafeTableModel key={i} i={i} table={shown[i]} tod={tod} />
      ))}
      {/* Anyone else here today has a coffee going at the counter */}
      {stools.slice(0, atCounter).map((s, i) => (
        <group key={i} position={[s[0], 1.125, -4.32]}>
          <mesh position={[0, 0.045, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.036, 0.09, 20]} />
            <meshPhysicalMaterial color="#f4f1e8" roughness={0.12} clearcoat={1} />
          </mesh>
          <mesh position={[0, 0.088, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.04, 18]} />
            <meshStandardMaterial color="#4a2e1a" roughness={0.25} />
          </mesh>
        </group>
      ))}
    </>
  );
}
