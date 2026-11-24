"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import { CatmullRomCurve3, Color, Shape, Vector3, type Mesh } from "three";

import type { Audience, DistrictOverview, Room } from "@idea-district/api-client";

import { C } from "@/features/cafe/scene/palette";
import { signTexture } from "@/features/cafe/scene/textures";
import { useCanvasTexture } from "@/features/cafe/scene/useCanvasTexture";

import { useSurface, WorldModelClone } from "@/features/world/assets";

import { useDistrict } from "./context";
import { BUILDINGS, canSee, type XZ } from "./layout";
import { Enclosure, Fern, Spot, Veil } from "./parts";

const LIT = new Color(C.bulb).multiplyScalar(2.6);
const BEACON = new Color(C.ember).multiplyScalar(3);
export const ROOM_LABEL: Record<Room, string> = {
  journey: "Journey",
  business: "Business",
  needs: "Needs & Aspirations",
  progress: "Progress",
  capabilities: "Capabilities",
};
export const HINT: Record<Room, string> = {
  journey: "Milestones and decisions",
  business: "What you're building",
  needs: "What would help most",
  progress: "Experiments and outcomes",
  capabilities: "What you can offer",
};

/** A small name plate on the front of each building. */
function Plate({ text, y, z, w = 1.6 }: { text: string; y: number; z: number; w?: number }) {
  const tex = useCanvasTexture(() => signTexture(text.toUpperCase(), { bg: C.ink, fg: C.cream, w: 768, h: 160 }), text);
  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[w, w * (160 / 768)]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function Windows({ evening, positions }: { evening: boolean; positions: [number, number, number][] }) {
  return (
    <>
      {positions.map((p, i) => (
        <mesh key={i} position={p}>
          <planeGeometry args={[0.38, 0.48]} />
          {evening && i % 3 !== 2 ? <meshBasicMaterial color={LIT} toneMapped={false} /> : <meshPhysicalMaterial color="#2b3a3c" roughness={0.05} metalness={0.1} clearcoat={1} envMapIntensity={1.4} />}
        </mesh>
      ))}
    </>
  );
}

type Maps = ReturnType<typeof useSurface>;

/** A pitched roof: two tiled slopes and plastered gable ends. */
function Gable({ w, d, h, y, roof, wall }: { w: number; d: number; h: number; y: number; roof: Maps; wall: Maps }) {
  const half = d / 2;
  const slope = Math.hypot(half, h);
  const tilt = Math.atan2(h, half);
  const shape = useMemo(() => gableShape(half - 0.15, h - 0.05), [half, h]);
  return (
    <group position={[0, y, 0]}>
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, h / 2, (side * half) / 2]} rotation={[side * tilt, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.06, slope + 0.12]} />
          <meshStandardMaterial {...roof} />
        </mesh>
      ))}
      {[1, -1].map((side) => (
        <mesh key={side} position={[(side * (w - 0.2)) / 2, 0, 0]} rotation={[0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} castShadow>
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial {...wall} color="#f1e9da" side={2} />
        </mesh>
      ))}
    </group>
  );
}

function gableShape(half: number, h: number) {
  const s = new Shape();
  s.moveTo(-half, 0);
  s.lineTo(half, 0);
  s.lineTo(0, h);
  s.closePath();
  return s;
}

/** Business: a workshop with your project on the sign over the door. */
function Workshop({ evening }: { evening: boolean }) {
  const wall = useSurface("plaster", [1.3, 0.9]);
  const roof = useSurface("roof", [2, 1.2]);
  const stone = useSurface("cobble", [0.3, 0.9]);
  const wood = useSurface("planks", [0.4, 0.8]);
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.8, 2]} />
        <meshStandardMaterial {...wall} color="#f1e9da" />
      </mesh>
      <Gable w={2.8} d={2.3} h={0.95} y={1.8} roof={roof} wall={wall} />
      <mesh position={[0.75, 2.6, -0.4]} castShadow>
        <boxGeometry args={[0.3, 0.9, 0.3]} />
        <meshStandardMaterial {...stone} color="#b9a99a" />
      </mesh>
      <mesh position={[0, 0.6, 1.01]}>
        <planeGeometry args={[0.6, 1.2]} />
        <meshStandardMaterial {...wood} color="#2f4a3c" />
      </mesh>
      <Windows evening={evening} positions={[[-0.8, 1.05, 1.01], [0.8, 1.05, 1.01], [-0.8, 1.05, -1.01], [0.8, 1.05, -1.01]]} />
    </group>
  );
}

/** Needs & Aspirations: a tower reaching up, a beacon at the top. */
function Tower({ evening }: { evening: boolean }) {
  const beacon = useRef<Mesh>(null);
  const wall = useSurface("plaster", [0.8, 0.7]);
  const roof = useSurface("roof", [1.5, 1]);
  const { reduced } = useDistrict();
  useFrame(({ clock }) => {
    if (beacon.current && !reduced) beacon.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.2) * 0.15);
  });
  return (
    <group>
      {[
        [1.7, 1.4, 0.7],
        [1.35, 1.3, 2.05],
        [1.0, 1.2, 3.3],
      ].map(([w, h, y], i) => (
        <mesh key={i} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, w]} />
          <meshStandardMaterial {...wall} color={i === 1 ? "#e6dcc8" : "#f1e9da"} />
        </mesh>
      ))}
      <mesh position={[0, 4.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.78, 0.75, 4]} />
        <meshStandardMaterial {...roof} flatShading />
      </mesh>
      <mesh ref={beacon} position={[0, 4.6, 0]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshBasicMaterial color={BEACON} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 4.6, 0]} intensity={evening ? 6 : 2} distance={6} color={C.ember} />
      <Windows evening={evening} positions={[[0, 2.05, 0.68], [0, 3.3, 0.51], [0, 0.75, 0.86]]} />
    </group>
  );
}

/** Progress: a glasshouse. One plant for each experiment; the ones still running are flagged. */
function Greenhouse({ plants, running }: { plants: number; running: boolean }) {
  const shown = Math.min(plants, 8);
  const stone = useSurface("cobble", [2, 0.4]);
  return (
    <group>
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.6, 0.4, 1.9]} />
        <meshStandardMaterial {...stone} color="#c9bcae" />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[2.5, 1.4, 1.8]} />
        <meshPhysicalMaterial color="#e8f3f0" transparent opacity={0.18} roughness={0.02} clearcoat={1} envMapIntensity={1.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 2.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.6, 0.6, 2.55, 3, 1, true]} />
        <meshPhysicalMaterial color="#e8f3f0" transparent opacity={0.2} roughness={0.02} clearcoat={1} envMapIntensity={1.5} side={2} depthWrite={false} />
      </mesh>
      {/* Frame */}
      {[-1.25, 0, 1.25].map((x) => (
        <mesh key={x} position={[x, 1.25, 0.9]}>
          <boxGeometry args={[0.05, 1.7, 0.05]} />
          <meshStandardMaterial color="#2a2c2b" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {Array.from({ length: shown }, (_, i) => {
        const x = -0.9 + (i % 4) * 0.6;
        const z = i < 4 ? -0.4 : 0.4;
        const h = 0.35 + ((i * 37) % 5) * 0.08;
        return (
          <group key={i} position={[x, 0.4, z]}>
            <mesh position={[0, 0.07, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.1, 0.14, 12]} />
              <meshStandardMaterial color="#a65e3e" roughness={0.9} />
            </mesh>
            <WorldModelClone name="fern" position={[-0.1, 0.13, -0.1]} rotation={[0, i * 1.3, 0]} scale={0.12 + h * 0.18} />
            {running && i === shown - 1 ? (
              <mesh position={[0.12, h + 0.12, 0]}>
                <boxGeometry args={[0.12, 0.12, 0.12]} />
                <meshBasicMaterial color={BEACON} toneMapped={false} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

/** Capabilities: a small library. Each read of what you can offer is a book on the pile outside. */
function Library({ books }: { books: number }) {
  const n = Math.min(books, 9);
  const wall = useSurface("plaster", [1.1, 0.9]);
  const step = useSurface("cobble", [2.4, 0.2]);
  const marble = useSurface("marble", [0.3, 1.5]);
  const roof = useSurface("roof", [2, 1]);
  const colors = [C.forest, C.ember, C.ink2, C.dust, C.forest2, "#c9a227"];
  return (
    <group>
      {[0.1, 0.25].map((y, i) => (
        <mesh key={y} position={[0, y, 0.15 * i]} receiveShadow castShadow>
          <boxGeometry args={[2.8 - i * 0.2, 0.15, 2.1 - i * 0.2]} />
          <meshStandardMaterial {...step} color="#d8cfc0" />
        </mesh>
      ))}
      <mesh position={[0, 1.25, -0.3]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.8, 1.2]} />
        <meshStandardMaterial {...wall} color="#f1e9da" />
      </mesh>
      {[-0.9, -0.3, 0.3, 0.9].map((x) => (
        <mesh key={x} position={[x, 1.25, 0.55]} castShadow>
          <cylinderGeometry args={[0.1, 0.11, 1.8, 16]} />
          <meshPhysicalMaterial {...marble} roughness={1} clearcoat={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 2.35, 0.05]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[2.5, 0.22, 1.9]} />
        <meshPhysicalMaterial {...marble} roughness={1} clearcoat={0.3} />
      </mesh>
      <mesh position={[0, 2.75, 0.05]} rotation={[0, Math.PI / 4, 0]} scale={[1.75, 0.45, 1.3]} castShadow>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial {...roof} flatShading />
      </mesh>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[1.15 + (i % 2) * 0.02, 0.4 + i * 0.09, 1.05]} rotation={[0, (i * 0.37) % 0.5, 0]} castShadow>
          <boxGeometry args={[0.42, 0.08, 0.3]} />
          <meshStandardMaterial color={colors[i % colors.length]} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** Journey: a winding path with a lantern for each milestone, under an arch. */
function JourneyPath({ steps, evening }: { steps: number; evening: boolean }) {
  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        [
          [0, 0, 5.3],
          [0.9, 0, 3.6],
          [-0.6, 0, 2.2],
          [0.7, 0, 0.9],
          [0, 0, 0],
        ].map(([x, y, z]) => new Vector3(x, y, z)),
      ),
    [],
  );
  const n = Math.max(1, Math.min(steps, 10));
  const lanterns = useMemo(() => Array.from({ length: n }, (_, i) => curve.getPointAt((i + 0.5) / n)), [curve, n]);
  const stone = useSurface("cobble", [6, 1]);
  const wood = useSurface("planks", [0.3, 1.4]);
  return (
    <group>
      <mesh position={[0, 0.03, 0]} scale={[1, 0.06, 1]} receiveShadow>
        <tubeGeometry args={[curve, 64, 0.45, 8, false]} />
        <meshStandardMaterial {...stone} />
      </mesh>
      {lanterns.map((p, i) => (
        <group key={i} position={[p.x + (i % 2 ? 0.6 : -0.6), 0, p.z]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.03, 0.9, 8]} />
            <meshStandardMaterial color="#2a2c2b" metalness={0.7} roughness={0.45} />
          </mesh>
          <WorldModelClone name="lantern" position={[0, 0.9, 0]} scale={1.1} />
          <mesh position={[0, 1.02, 0]}>
            <sphereGeometry args={[0.03, 8, 6]} />
            <meshBasicMaterial color={LIT} toneMapped={false} />
          </mesh>
          {evening && i % 2 === 0 ? <pointLight position={[0, 1, 0]} intensity={1.5} distance={2.2} color={C.bulb} /> : null}
        </group>
      ))}
      {/* The arch at the end of the path */}
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, 1.2, 0]} castShadow>
          <boxGeometry args={[0.28, 2.4, 0.28]} />
          <meshStandardMaterial {...wood} color="#7a5c44" />
        </mesh>
      ))}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[2.4, 0.3, 0.36]} />
        <meshStandardMaterial {...wood} color="#7a5c44" />
      </mesh>
      <Fern at={[-1.3, 0.4]} rot={0.5} s={0.35} />
      <Fern at={[1.2, -0.3]} rot={2.4} s={0.3} />
    </group>
  );
}

function Building({
  room,
  audience,
  marker,
  height,
  plate,
  children,
}: {
  room: Room;
  audience: Audience;
  marker: number;
  height: number;
  plate: [number, number];
  children: ReactNode;
}) {
  const { lens } = useDistrict();
  const { at } = BUILDINGS[room];
  const face = Math.atan2(-at[0], -at[1]);
  const gateDeg = (face * 180) / Math.PI;
  const hidden = !canSee(lens, audience);
  return (
    <>
      <Spot id={room} name={ROOM_LABEL[room]} hint={HINT[room]} marker={[at[0], marker, at[1]]}>
        <group position={[at[0], 0, at[1]]} rotation={[0, face, 0]}>
          {children}
          <Plate text={ROOM_LABEL[room]} y={plate[0]} z={plate[1]} />
        </group>
      </Spot>
      {room !== "journey" ? <Enclosure at={at} radius={2.45} audience={audience} gateDeg={gateDeg} /> : null}
      <Veil at={at as XZ} radius={2.7} height={height} hidden={hidden} />
    </>
  );
}

/** The five rooms of your District. */
export function Buildings({ overview, evening }: { overview: DistrictOverview | null; evening: boolean }) {
  const { visibility } = useDistrict();
  const aud = (r: Room): Audience => visibility?.[r] ?? "private";
  const count = (r: Room) => overview?.rooms[r].count ?? 0;
  return (
    <>
      <Building room="business" audience={aud("business")} marker={3.8} height={3.4} plate={[1.55, 1.02]}>
        <Workshop evening={evening} />
      </Building>
      <Building room="needs" audience={aud("needs")} marker={5.6} height={5.2} plate={[1.25, 0.87]}>
        <Tower evening={evening} />
      </Building>
      <Building room="progress" audience={aud("progress")} marker={3.4} height={3} plate={[0.32, 0.96]}>
        <Greenhouse plants={count("progress")} running={!!overview?.rooms.progress.latest} />
      </Building>
      <Building room="capabilities" audience={aud("capabilities")} marker={4} height={3.6} plate={[2.35, 1.0]}>
        <Library books={count("capabilities")} />
      </Building>
      <Building room="journey" audience={aud("journey")} marker={3.6} height={3.2} plate={[2.25, 0.2]}>
        <JourneyPath steps={count("journey")} evening={evening} />
      </Building>
    </>
  );
}
