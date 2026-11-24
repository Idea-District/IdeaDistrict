"use client";

import { Html, Line } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useMemo, useRef, type ReactNode } from "react";
import { Color, type Group, type Mesh } from "three";

import type { Audience, DistrictOverview, Room } from "@idea-district/api-client";

import { C } from "@/features/cafe/scene/palette";
import { signTexture } from "@/features/cafe/scene/textures";
import { useCanvasTexture } from "@/features/cafe/scene/useCanvasTexture";

import { HINT, ROOM_LABEL } from "../scene/Buildings";
import { useDistrict } from "../scene/context";
import { canSee, type XZ } from "../scene/layout";
import { Spot, Veil } from "../scene/parts";
import { corners, S, type Tile } from "./board";
import { GEO, Inst, type Item } from "./Countryside";

const LIT = new Color(C.bulb).multiplyScalar(2.4);
const WALL = "#f3ead8";
const WOOD = "#a0714f";

function Mat({ c, rough = 0.9 }: { c: string; rough?: number }) {
  return <meshStandardMaterial flatShading color={c} roughness={rough} />;
}

function Win({ at, evening, w = 0.2, h = 0.22 }: { at: [number, number, number]; evening: boolean; w?: number; h?: number }) {
  return (
    <mesh position={at}>
      <boxGeometry args={[w, h, 0.02]} />
      {evening ? <meshBasicMaterial color={LIT} toneMapped={false} /> : <meshStandardMaterial color="#3e5357" roughness={0.3} />}
    </mesh>
  );
}

/** Business: a workshop with a smoking chimney. */
function Workshop({ evening, reduced }: { evening: boolean; reduced: boolean }) {
  const smoke = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!smoke.current || reduced) return;
    smoke.current.children.forEach((p, i) => {
      const t = (clock.elapsedTime * 0.35 + i / 3) % 1;
      p.position.set(Math.sin(t * 4 + i) * 0.08, t * 1.1, 0);
      p.scale.setScalar(0.08 + t * 0.14);
    });
  });
  return (
    <group>
      <mesh position={[0, 0.47, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.95, 1]} />
        <Mat c="#efe0c2" />
      </mesh>
      <mesh position={[0, 0.95, 0]} scale={[1.68, 0.62, 1.18]} geometry={GEO.roof} castShadow>
        <Mat c="#9a5643" />
      </mesh>
      <mesh position={[0.45, 1.3, -0.2]} castShadow>
        <boxGeometry args={[0.18, 0.55, 0.18]} />
        <Mat c="#8a7d74" />
      </mesh>
      <group ref={smoke} position={[0.45, 1.62, -0.2]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial flatShading color="#f4f1ea" transparent opacity={0.75} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.26, 0.505]}>
        <boxGeometry args={[0.3, 0.52, 0.02]} />
        <Mat c={WOOD} />
      </mesh>
      <Win at={[-0.47, 0.55, 0.505]} evening={evening} />
      <Win at={[0.47, 0.55, 0.505]} evening={evening} />
      {[
        [0.95, 0.12, 0.45, 0.24],
        [1.0, 0.36, 0.42, 0.18],
        [0.72, 0.1, 0.62, 0.2],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i * 0.5, 0]} castShadow>
          <boxGeometry args={[s, s, s]} />
          <Mat c={i === 1 ? "#b88a5e" : "#a87b52"} />
        </mesh>
      ))}
    </group>
  );
}

/** Needs & Aspirations: a tall lookout tower, the highest thing in the District. */
function Tower({ evening, reduced }: { evening: boolean; reduced: boolean }) {
  const flag = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (flag.current && !reduced) flag.current.rotation.y = Math.sin(clock.elapsedTime * 2.2) * 0.25;
  });
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.78, 0.3, 8]} />
        <Mat c="#cfc6b4" />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.58, 1.9, 8]} />
        <Mat c={WALL} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.66, 0.6, 0.18, 8]} />
        <Mat c="#cfc6b4" />
      </mesh>
      <mesh position={[0, 2.29, 0]} castShadow>
        <coneGeometry args={[0.74, 1, 8]} />
        <Mat c="#5e6f63" />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.9, 5]} />
        <Mat c="#5a4a40" />
      </mesh>
      <mesh ref={flag} position={[0, 3.5, 0]}>
        <boxGeometry args={[0.02, 0.22, 0.38]} />
        <Mat c={C.forest} />
      </mesh>
      <mesh position={[0, 0.5, 0.57]}>
        <boxGeometry args={[0.28, 0.5, 0.04]} />
        <Mat c={WOOD} />
      </mesh>
      {[1.05, 1.6].map((y) => (
        <Win key={y} at={[0, y, 0.53]} evening={evening} w={0.14} h={0.26} />
      ))}
      <Win at={[0.4, 1.35, 0.36]} evening={evening} w={0.14} h={0.26} />
    </group>
  );
}

/** Progress: a glasshouse. Each experiment is a plant growing inside. */
function Glasshouse({ plants, evening }: { plants: number; evening: boolean }) {
  const n = Math.max(2, Math.min(12, plants));
  const spots = useMemo(() => Array.from({ length: n }, (_, i) => [((i % 4) - 1.5) * 0.32, (Math.floor(i / 4) - 1) * 0.28] as const), [n]);
  return (
    <group>
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.6, 0.12, 1.1]} />
        <Mat c={WOOD} />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[1.5, 0.8, 1]} />
        <meshPhysicalMaterial color="#e3f3f0" roughness={0.08} transparent opacity={0.32} clearcoat={1} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.92, 0]} scale={[1.56, 0.5, 1.08]} geometry={GEO.roof}>
        <meshPhysicalMaterial color="#e3f3f0" roughness={0.08} transparent opacity={0.36} clearcoat={1} depthWrite={false} />
      </mesh>
      {[
        [-0.75, -0.5],
        [0.75, -0.5],
        [-0.75, 0.5],
        [0.75, 0.5],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.52, z]}>
          <boxGeometry args={[0.04, 0.8, 0.04]} />
          <Mat c="#f7f7ef" />
        </mesh>
      ))}
      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[1.56, 0.04, 0.04]} />
        <Mat c="#f7f7ef" />
      </mesh>
      {spots.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.12, z]} scale={[0.11, 0.18 + (i % 3) * 0.06, 0.11]} geometry={GEO.blob} castShadow>
          <Mat c={i % 2 ? "#5f9f55" : "#82b95c"} />
        </mesh>
      ))}
      {evening ? <pointLight position={[0, 0.8, 0]} intensity={2} distance={2.6} color={C.bulb} /> : null}
    </group>
  );
}

/** Capabilities: a small library with columns at the front. */
function Library({ evening }: { evening: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.06, 0.1]} receiveShadow castShadow>
        <boxGeometry args={[1.9, 0.12, 1.3]} />
        <Mat c="#d9d0bd" />
      </mesh>
      <mesh position={[0, 0.54, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.85, 0.9]} />
        <Mat c="#ece4d4" />
      </mesh>
      <group position={[0, 0.97, -0.1]} scale={[1, 1, 0.58]}>
        <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[1.32, 0.55, 4]} />
          <Mat c="#6f5a52" />
        </mesh>
      </group>
      {[-0.6, -0.2, 0.2, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.52, 0.55]} castShadow>
          <cylinderGeometry args={[0.055, 0.065, 0.8, 8]} />
          <Mat c="#f7f3ea" />
        </mesh>
      ))}
      <mesh position={[0, 0.95, 0.5]} castShadow>
        <boxGeometry args={[1.62, 0.08, 0.4]} />
        <Mat c="#e2d9c6" />
      </mesh>
      <mesh position={[0, 0.4, 0.36]}>
        <boxGeometry args={[0.32, 0.56, 0.02]} />
        <Mat c={WOOD} />
      </mesh>
      <Win at={[-0.55, 0.6, 0.36]} evening={evening} w={0.18} h={0.3} />
      <Win at={[0.55, 0.6, 0.36]} evening={evening} w={0.18} h={0.3} />
    </group>
  );
}

/** Journey: stepping stones across the tile, one for every milestone, lit by little lamps. */
function Trail({ steps, evening }: { steps: number; evening: boolean }) {
  const n = Math.max(3, Math.min(9, steps));
  const stones = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1);
        return [Math.sin(t * Math.PI * 1.6) * 0.55, -1 + t * 2.0] as const;
      }),
    [n],
  );
  return (
    <group>
      {stones.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.02, z]} rotation={[0, i, 0]} receiveShadow>
          <cylinderGeometry args={[0.15, 0.17, 0.05, 7]} />
          <Mat c={i === n - 1 ? "#c9bfae" : "#d8d0c0"} />
        </mesh>
      ))}
      {stones
        .filter((_, i) => i % 2 === 1)
        .map(([x, z], i) => (
          <group key={i} position={[x + 0.3, 0, z]}>
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.018, 0.022, 0.5, 5]} />
              <Mat c="#4b4038" />
            </mesh>
            <mesh position={[0, 0.53, 0]}>
              <boxGeometry args={[0.08, 0.09, 0.08]} />
              {evening ? <meshBasicMaterial color={LIT} toneMapped={false} /> : <Mat c="#f2e3c2" />}
            </mesh>
          </group>
        ))}
      {/* A signpost where the trail begins */}
      <group position={[-0.7, 0, 0.75]} rotation={[0, 0.4, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.04, 0.9, 5]} />
          <Mat c={WOOD} />
        </mesh>
        <mesh position={[0.12, 0.75, 0]} castShadow>
          <boxGeometry args={[0.36, 0.1, 0.03]} />
          <Mat c="#c79a6b" />
        </mesh>
        <mesh position={[-0.1, 0.58, 0]} rotation={[0, 0, 0.12]} castShadow>
          <boxGeometry args={[0.32, 0.09, 0.03]} />
          <Mat c="#b8885a" />
        </mesh>
      </group>
      {/* An arch at the far end: where the journey is heading */}
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x + stones[n - 1][0], 0.45, stones[n - 1][1] - 0.15]} castShadow>
          <boxGeometry args={[0.08, 0.9, 0.08]} />
          <Mat c="#7a5c44" />
        </mesh>
      ))}
      <mesh position={[stones[n - 1][0], 0.92, stones[n - 1][1] - 0.15]} castShadow>
        <boxGeometry args={[1, 0.1, 0.12]} />
        <Mat c="#7a5c44" />
      </mesh>
    </group>
  );
}

/**
 * Privacy you can see, round the edge of the tile. Only you: a hedge. Your connections: a low
 * picket fence. The community: open. The side facing the plaza is always left open as a gate.
 */
function Edge({ tile, audience }: { tile: Tile; audience: Audience }) {
  const items = useMemo(() => {
    if (audience === "community") return [] as Item[];
    const cs = corners(tile.x, tile.z, S * 0.9);
    const toC = Math.atan2(-tile.z, -tile.x);
    const out: Item[] = [];
    for (let k = 0; k < 6; k++) {
      const [ax, az] = cs[k];
      const [bx, bz] = cs[(k + 1) % 6];
      const mid = Math.atan2((az + bz) / 2 - tile.z, (ax + bx) / 2 - tile.x);
      const off = Math.abs(Math.atan2(Math.sin(mid - toC), Math.cos(mid - toC)));
      if (off < 0.6) continue; // the gate
      const n = audience === "private" ? 6 : 7;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        out.push(
          audience === "private"
            ? { p: [x, -0.05, z], s: [0.17, 0.2, 0.17], r: i + k, c: i % 3 ? "#4f7f45" : "#5a8c4c" }
            : { p: [x, 0, z], s: [0.045, 0.26, 0.045], c: "#f7f3ea" },
        );
      }
    }
    return out;
  }, [tile, audience]);
  return <Inst geo={audience === "private" ? GEO.blob : GEO.box} items={items} />;
}

const BUILD: Record<Room, { marker: number; veil: number }> = {
  business: { marker: 2.7, veil: 2.1 },
  needs: { marker: 4.3, veil: 3.9 },
  progress: { marker: 2.5, veil: 1.9 },
  capabilities: { marker: 2.5, veil: 1.9 },
  journey: { marker: 2.2, veil: 1.5 },
};

function RoomTile({ tile, room, audience, overview, evening }: { tile: Tile; room: Room; audience: Audience; overview: DistrictOverview | null; evening: boolean }) {
  const { lens, reduced, spot } = useDistrict();
  const face = Math.atan2(-tile.x, -tile.z);
  const { marker, veil } = BUILD[room];
  const count = overview?.rooms[room].count ?? 0;
  let body: ReactNode;
  if (room === "business") body = <Workshop evening={evening} reduced={reduced} />;
  else if (room === "needs") body = <Tower evening={evening} reduced={reduced} />;
  else if (room === "progress") body = <Glasshouse plants={count} evening={evening} />;
  else if (room === "capabilities") body = <Library evening={evening} />;
  else body = <Trail steps={count} evening={evening} />;
  return (
    <>
      <Spot id={room} name={ROOM_LABEL[room]} hint={HINT[room]} marker={[tile.x, marker, tile.z]}>
        <group position={[tile.x, 0, tile.z]} rotation={[0, face, 0]}>
          {body}
        </group>
      </Spot>
      {spot === "overview" ? (
        <Html position={[tile.x, marker - 0.55, tile.z]} center zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
          <span className="cafe-label whitespace-nowrap rounded-full bg-cream/95 px-2.5 py-1 text-[11.5px] font-bold text-ink shadow-md">{ROOM_LABEL[room]}</span>
        </Html>
      ) : null}
      <Edge tile={tile} audience={audience} />
      <Veil at={[tile.x, tile.z]} radius={S * 1.02} height={veil} hidden={!canSee(lens, audience)} />
    </>
  );
}

/** The five rooms, each on its own tile. */
export function CozyRooms({ tiles, overview, evening }: { tiles: Tile[]; overview: DistrictOverview | null; evening: boolean }) {
  const { visibility } = useDistrict();
  return (
    <>
      {tiles
        .filter((t) => t.kind === "room" && t.room)
        .map((t) => (
          <RoomTile key={t.key} tile={t} room={t.room!} audience={visibility?.[t.room!] ?? "private"} overview={overview} evening={evening} />
        ))}
    </>
  );
}

/** What we don't know yet: gaps in the board where no tile has been laid. A ghost tile hovers over each. */
export function EmptySlots({ slots }: { slots: XZ[] }) {
  const { reduced } = useDistrict();
  const ghosts = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ghosts.current || reduced) return;
    ghosts.current.children.forEach((g, i) => {
      g.position.y = 0.75 + Math.sin(clock.elapsedTime * 1.2 + i * 2) * 0.12;
      g.rotation.y = Math.sin(clock.elapsedTime * 0.4 + i) * 0.3;
    });
  });
  if (!slots.length) return null;
  const outline = (x: number, z: number) => [...corners(x, z, S * 0.93), corners(x, z, S * 0.93)[0]].map(([a, b]) => [a, 0.02, b] as [number, number, number]);
  return (
    <Spot id="unknowns" name="What we don't know yet" hint={`${slots.length} empty ${slots.length === 1 ? "tile" : "tiles"}`} marker={[slots[0][0], 2.1, slots[0][1]]}>
      {slots.map(([x, z], i) => (
        <group key={i}>
          <Line points={outline(x, z)} color={C.emberLight} lineWidth={2} dashed dashSize={0.25} gapSize={0.18} />
          <mesh position={[x, -0.4, z]} rotation={[0, Math.PI / 6, 0]}>
            <cylinderGeometry args={[S * 0.97, S * 0.97, 0.02, 6]} />
            <meshStandardMaterial color="#000000" transparent opacity={0.12} />
          </mesh>
        </group>
      ))}
      <group ref={ghosts}>
        {slots.map(([x, z], i) => (
          <group key={i} position={[x, 0.75, z]}>
            <mesh rotation={[0, Math.PI / 6, 0]}>
              <cylinderGeometry args={[S * 0.8, S * 0.8, 0.14, 6]} />
              <meshStandardMaterial color="#fbf8ef" transparent opacity={0.55} roughness={1} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </group>
    </Spot>
  );
}

/** At the end of the road: a signpost back to the Cafe. */
export function CafeSignpost({ tiles }: { tiles: Tile[] }) {
  const router = useRouter();
  const end = useMemo(() => tiles.filter((t) => t.kind === "path").reduce((a, b) => (b.z > a.z ? b : a), { x: 0, z: 6 } as Tile), [tiles]);
  const tex = useCanvasTexture(() => signTexture("CAFE", { bg: "#6e5139", fg: C.cream, w: 512, h: 160 }), "cozy-cafe");
  return (
    <group
      position={[0.55, 0, end.z + 0.4]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => (document.body.style.cursor = "")}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = "";
        router.push("/cafe");
      }}
    >
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 1, 5]} />
        <Mat c={WOOD} />
      </mesh>
      <mesh position={[0, 0.88, 0.03]} castShadow>
        <boxGeometry args={[0.66, 0.22, 0.04]} />
        <Mat c="#6e5139" />
      </mesh>
      <mesh position={[0, 0.88, 0.052]}>
        <planeGeometry args={[0.62, 0.19]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}
