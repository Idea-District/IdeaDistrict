"use client";

import { Environment } from "@react-three/drei";
import { useRouter } from "next/navigation";
import { Color } from "three";

import { C, type TimeOfDay } from "@/features/cafe/scene/palette";
import { signTexture } from "@/features/cafe/scene/textures";
import { useCanvasTexture } from "@/features/cafe/scene/useCanvasTexture";
import { SKY_HDRI, useSurface, WorldModelClone } from "@/features/world/assets";
import { Water } from "@/features/world/Water";

import { useDistrict } from "./context";
import { BUILDINGS, CAFE_SIGN, ISLAND_R, type XZ } from "./layout";
import { Fern, Tree } from "./parts";

const SKY: Record<TimeOfDay, { haze: string; hemi: [string, string, number]; sun: [number, number, number]; sunColor: string; sunI: number; env: number; water: string }> = {
  morning: { haze: "#c8d3d8", hemi: ["#fff1dc", "#3d5a40", 0.25], sun: [-12, 14, 8], sunColor: "#ffd9a8", sunI: 2.2, env: 0.9, water: "#1d4a52" },
  afternoon: { haze: "#c3d0d6", hemi: ["#f6f8f0", "#3d5a40", 0.25], sun: [8, 18, 6], sunColor: "#fff4e0", sunI: 2.4, env: 1, water: "#1b4650" },
  evening: { haze: "#7a6e78", hemi: ["#ffb98a", "#1d2f27", 0.3], sun: [-14, 5, -10], sunColor: "#ff9a5c", sunI: 1.6, env: 0.75, water: "#1a2c36" },
};
/** The colour the horizon fades into, behind the real sky. */
export const skyColor = (t: TimeOfDay) => SKY[t].haze;

const LAMP = new Color(C.bulb).multiplyScalar(4);

/** A cobbled path from the plaza out to a building. */
function Path({ to, width = 1.1 }: { to: XZ; width?: number }) {
  const len = Math.hypot(to[0], to[1]);
  const a = Math.atan2(to[0], to[1]);
  const stone = useSurface("cobble", [width / 1.2, len / 1.2]);
  return (
    <mesh position={[to[0] / 2, 0.025, to[1] / 2]} rotation={[-Math.PI / 2, 0, -a]} receiveShadow>
      <planeGeometry args={[width, len]} />
      <meshStandardMaterial {...stone} />
    </mesh>
  );
}

/** A cast-iron street lamp; the lamps come on at dusk. */
function StreetLamp({ at, rot, lit }: { at: XZ; rot: number; lit: boolean }) {
  return (
    <group position={[at[0], 0, at[1]]} rotation={[0, rot, 0]}>
      <WorldModelClone name="streetLamp" scale={0.55} />
      {lit ? (
        <>
          <mesh position={[0, 1.9, 0]}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshBasicMaterial color={LAMP} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 1.85, 0]} intensity={4} distance={5} decay={1.6} color={C.bulb} castShadow={false} />
        </>
      ) : null}
    </group>
  );
}

/** The way back to the Cafe: a wooden signpost at the front edge of the island. */
function CafeSign() {
  const router = useRouter();
  const { dragged } = useDistrict();
  const wood = useSurface("planks", [0.3, 1]);
  const sign = useCanvasTexture(() => signTexture("← THE CAFE", { bg: C.ink, fg: C.cream, sub: "PULL UP A CHAIR", w: 768, h: 240 }), "to-cafe");
  return (
    <group
      position={[CAFE_SIGN[0], 0, CAFE_SIGN[1]]}
      onClick={(e) => {
        e.stopPropagation();
        if (!dragged.current) router.push("/cafe");
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.1, 1.6, 0.1]} />
        <meshStandardMaterial {...wood} color="#8a6a4c" />
      </mesh>
      <mesh position={[0.15, 1.45, 0.03]} castShadow>
        <boxGeometry args={[1.6, 0.55, 0.05]} />
        <meshStandardMaterial {...wood} color="#8a6a4c" />
      </mesh>
      <mesh position={[0.15, 1.45, 0.056]}>
        <planeGeometry args={[1.5, 0.47]} />
        <meshStandardMaterial map={sign} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** The ground: real grass and rock on top, a rocky edge dropping into the sea. */
function Ground() {
  const grass = useSurface("grass", [9, 9]);
  const edge = useSurface("grass", [14, 1]);
  const plaza = useSurface("cobble", [6, 6]);
  return (
    <>
      <mesh position={[0, -0.5, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[ISLAND_R, ISLAND_R - 1.2, 1, 96, 1, true]} />
        <meshStandardMaterial {...edge} color="#9b8f80" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[ISLAND_R, 96]} />
        <meshStandardMaterial {...grass} color="#a9c98a" />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[4.3, 64]} />
        <meshStandardMaterial {...plaza} />
      </mesh>
    </>
  );
}

const TREES: [XZ, number][] = [
  [[-3.5, 10.2], 1.1],
  [[3.8, 10.4], 0.9],
  [[-10.6, 3.6], 1.2],
  [[10.9, -4.6], 1.0],
  [[-6.2, -9.8], 1.1],
  [[6.6, -9.6], 0.95],
  [[-11.2, -4.4], 0.9],
  [[11.3, 4.3], 1.15],
  [[0.2, -11.4], 1.0],
  [[-9.4, 7.6], 0.85],
  [[9.2, 7.9], 1.0],
];
const FERNS: [XZ, number][] = [
  [[-2.2, 10.6], 0],
  [[2.6, 9.9], 1.2],
  [[-10.1, 2.2], 2.5],
  [[10.2, -3.2], 0.6],
  [[-5.1, -10.4], 1.8],
  [[7.9, -9.1], 3.1],
  [[-11.6, -2.8], 0.4],
  [[11.8, 2.9], 2.2],
  [[1.4, -11.8], 1.1],
  [[-8.6, 8.8], 2.8],
  [[8.1, 9.0], 0.9],
  [[4.7, 6.4], 1.6],
  [[-4.9, 6.1], 0.3],
  [[-2.4, -6.9], 2.0],
  [[2.6, -6.6], 0.8],
];
// Benches round the plaza, between the paths, all facing the ID.
const BENCHES = [26, -26, 97, -97, 160, -160];
// Lamps on the plaza's edge, between the paths so none stands in front of a door.
const ring = (deg: number, r: number): XZ => [Math.sin((deg * Math.PI) / 180) * r, Math.cos((deg * Math.PI) / 180) * r];
const LAMPS: [XZ, number][] = [
  ...[46, -46, 143, -143].map((d): [XZ, number] => [ring(d, 4.15), (d * Math.PI) / 180]),
  [[1, 8.2], Math.PI / 2],
  [[-1, 8.2], -Math.PI / 2],
];

/** The island, the sea around it, the real sky and the light. */
export function Island({ tod }: { tod: TimeOfDay }) {
  const S = SKY[tod];
  const { reduced } = useDistrict();
  const evening = tod === "evening";
  return (
    <group>
      <Environment files={SKY_HDRI[tod]} background environmentIntensity={S.env} backgroundIntensity={evening ? 0.85 : 1} />
      <hemisphereLight args={S.hemi} />
      <directionalLight
        position={S.sun}
        intensity={S.sunI}
        color={S.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      <Water color={S.water} y={-0.9} reduced={reduced} />
      <Ground />
      {(["business", "needs", "progress", "capabilities"] as const).map((r) => (
        <Path key={r} to={BUILDINGS[r].at} />
      ))}
      <Path to={CAFE_SIGN} width={1.3} />

      {TREES.map(([at, s], i) => (
        <Tree key={i} at={at} s={s} seed={i} />
      ))}
      {FERNS.map(([at, r], i) => (
        <Fern key={i} at={at} rot={r} s={0.45 + (i % 3) * 0.08} />
      ))}
      {BENCHES.map((deg) => {
        const a = (deg * Math.PI) / 180;
        return <WorldModelClone key={deg} name="bench" position={[Math.sin(a) * 3.75, 0.03, Math.cos(a) * 3.75]} rotation={[0, a + Math.PI, 0]} scale={0.62} />;
      })}
      {LAMPS.map(([at, rot], i) => (
        <StreetLamp key={i} at={at} rot={rot} lit={evening} />
      ))}
      <CafeSign />
    </group>
  );
}
