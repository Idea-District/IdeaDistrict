"use client";

import { Line } from "@react-three/drei";
import { type ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { Color } from "three";

import { C } from "@/features/cafe/scene/palette";
import { countryside, hexCells, type Tile } from "@/features/district/cozy/board";
import { Countryside } from "@/features/district/cozy/Countryside";

import { BENCH, LETTERBOX, PIER_END } from "../scene/layout";

const BULB = new Color(C.bulb).multiplyScalar(3);
const START = 11;

function Mat({ c, rough = 0.9 }: { c: string; rough?: number }) {
  return <meshStandardMaterial flatShading color={c} roughness={rough} />;
}

/** The shore you walked out from: a strip of hexagon tiles, the road leading onto the pier. */
function shoreTiles(): Tile[] {
  return hexCells(8)
    .filter((c) => c.z > START + 0.3)
    .map((c) => {
      if (Math.abs(c.x) < 0.1) return { ...c, kind: "path" as const };
      const k = countryside(c.x * 1.3 + 5, c.z - 9, 3);
      return { ...c, kind: k === "water" ? ("meadow" as const) : k };
    });
}

/** A lamp on a wooden post; it comes on at dusk. */
function Lamp({ x, z, lit }: { x: number; z: number; lit: boolean }) {
  return (
    <group position={[x, 0.09, z]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 1.8, 6]} />
        <Mat c="#4b4038" />
      </mesh>
      <mesh position={[x < 0 ? 0.18 : -0.18, 1.78, 0]}>
        <boxGeometry args={[0.4, 0.05, 0.05]} />
        <Mat c="#4b4038" />
      </mesh>
      <group position={[x < 0 ? 0.34 : -0.34, 1.6, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <coneGeometry args={[0.14, 0.12, 6]} />
          <Mat c="#2f3a38" />
        </mesh>
        <mesh>
          <boxGeometry args={[0.16, 0.2, 0.16]} />
          {lit ? <meshBasicMaterial color={BULB} toneMapped={false} /> : <meshStandardMaterial color="#f2e3c2" roughness={0.4} />}
        </mesh>
        {lit ? <pointLight intensity={5} distance={7} decay={1.8} color={C.bulb} /> : null}
      </group>
    </group>
  );
}

/** A wooden pier over the water, a bench at the end, a letterbox by the steps. */
export function CozyPier({ evening, onLetterbox, onLetterboxHover }: { evening: boolean; onLetterbox: () => void; onLetterboxHover: (on: boolean) => void }) {
  const tiles = useMemo(() => shoreTiles(), []);
  const planks = Math.floor((START + 1 - PIER_END) / 0.36);
  const posts: number[] = [];
  for (let z = START; z >= PIER_END; z -= 2.2) posts.push(z);
  return (
    <group>
      {/* Deck */}
      {Array.from({ length: planks }, (_, i) => (
        <mesh key={i} position={[((i * 7) % 3) * 0.015, 0.05, START + 1 - i * 0.36]} receiveShadow castShadow>
          <boxGeometry args={[2.3, 0.09, 0.33]} />
          <Mat c={["#d2b48c", "#c9a77c", "#bf9b70", "#d8bd97"][(i * 7) % 4]} />
        </mesh>
      ))}
      {posts.map((z) =>
        [-1.15, 1.15].map((x) => (
          <mesh key={`${z}${x}`} position={[x, 0.1, z]} castShadow>
            <cylinderGeometry args={[0.09, 0.1, 2, 6]} />
            <Mat c="#7a5c44" />
          </mesh>
        )),
      )}
      {[-1.15, 1.15].map((x) => (
        <Line
          key={x}
          points={posts.flatMap((z, i) => (i === 0 ? [[x, 1.1, z] as [number, number, number]] : [[x, 0.92, z + 1.1] as [number, number, number], [x, 1.1, z] as [number, number, number]]))}
          color="#e2d2b0"
          lineWidth={2.5}
        />
      ))}
      <Lamp x={-1.15} z={4} lit={evening} />
      <Lamp x={1.15} z={PIER_END + 0.4} lit={evening} />

      {/* A bench at the end, facing the water */}
      <group position={[BENCH[0], 0.09, BENCH[2]]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[1.3, 0.07, 0.42]} />
          <Mat c="#a0714f" />
        </mesh>
        <mesh position={[0, 0.72, -0.2]} castShadow>
          <boxGeometry args={[1.3, 0.34, 0.06]} />
          <Mat c="#a0714f" />
        </mesh>
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} position={[x, 0.2, 0]}>
            <boxGeometry args={[0.08, 0.42, 0.38]} />
            <Mat c="#4b4038" />
          </mesh>
        ))}
      </group>

      {/* The letterbox */}
      <group
        position={LETTERBOX}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onLetterbox();
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onLetterboxHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onLetterboxHover(false);
          document.body.style.cursor = "";
        }}
      >
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 1.1, 6]} />
          <Mat c="#4b4038" />
        </mesh>
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[0.5, 0.42, 0.62]} />
          <Mat c="#2f5a4f" />
        </mesh>
        <mesh position={[0, 1.42, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.31, 0.31, 0.5, 8, 1, false, 0, Math.PI]} />
          <Mat c="#2f5a4f" />
        </mesh>
        <mesh position={[-0.255, 1.25, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.3, 0.05]} />
          <meshStandardMaterial color={C.ink} />
        </mesh>
        <mesh position={[0.27, 1.45, 0.1]}>
          <boxGeometry args={[0.03, 0.3, 0.12]} />
          <Mat c={C.ember} rough={0.5} />
        </mesh>
      </group>

      <group position={[0, 0.1, 0]}>
        <Countryside tiles={tiles} evening={evening} />
      </group>
    </group>
  );
}
