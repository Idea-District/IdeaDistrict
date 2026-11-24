"use client";

import { Line } from "@react-three/drei";
import { type ThreeEvent } from "@react-three/fiber";
import { Color } from "three";

import { C } from "@/features/cafe/scene/palette";
import { useSurface, WorldModelClone } from "@/features/world/assets";

import { BENCH, LETTERBOX, PIER_END } from "./layout";

const BULB = new Color(C.bulb).multiplyScalar(3);
const START = 11;

function Post({ x, z, h = 1.6 }: { x: number; z: number; h?: number }) {
  const wood = useSurface("planks", [0.5, 1.6]);
  return (
    <mesh position={[x, h / 2 - 0.9, z]} castShadow>
      <cylinderGeometry args={[0.09, 0.1, h, 12]} />
      <meshStandardMaterial {...wood} color="#7a5c44" />
    </mesh>
  );
}

/** A cast-iron lamp on the pier; it comes on at dusk. */
function Lamp({ x, z, lit }: { x: number; z: number; lit: boolean }) {
  return (
    <group position={[x, 0.09, z]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
      <WorldModelClone name="streetLamp" scale={0.62} />
      {lit ? (
        <>
          <mesh position={[0, 2.18, 0]}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshBasicMaterial color={BULB} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 2.1, 0]} intensity={5.5} distance={7} decay={1.8} color={C.bulb} />
        </>
      ) : null}
    </group>
  );
}

/** A wooden pier out over the water, with a bench at the end and a letterbox by the steps. */
export function Pier({ evening, onLetterbox, onLetterboxHover }: { evening: boolean; onLetterbox: () => void; onLetterboxHover: (on: boolean) => void }) {
  const planks = Math.floor((START - PIER_END) / 0.34);
  const deck = useSurface("planks", [1.6, 0.25]);
  const metal = useSurface("plaster", [0.4, 0.4]);
  const shore = useSurface("grass", [10, 3]);
  const path = useSurface("cobble", [2, 4]);
  const posts: number[] = [];
  for (let z = START; z >= PIER_END; z -= 2.2) posts.push(z);
  return (
    <group>
      {/* Deck */}
      {Array.from({ length: planks }, (_, i) => (
        <mesh key={i} position={[((i * 7) % 3) * 0.015, 0.05, START - i * 0.34]} receiveShadow castShadow>
          <boxGeometry args={[2.3, 0.08, 0.31]} />
          <meshStandardMaterial {...deck} color={["#d8c4ac", "#c9b29a", "#bfa68c", "#d1bba2"][(i * 7) % 4]} />
        </mesh>
      ))}
      {posts.map((z) => (
        <group key={z}>
          <Post x={-1.15} z={z} h={2.4} />
          <Post x={1.15} z={z} h={2.4} />
        </group>
      ))}
      {/* Rope rails, sagging between the posts */}
      {[-1.15, 1.15].map((x) => (
        <Line
          key={x}
          points={posts.flatMap((z, i) => (i === 0 ? [[x, 0.9, z] as [number, number, number]] : [[x, 0.72, z + 1.1] as [number, number, number], [x, 0.9, z] as [number, number, number]]))}
          color="#c9b79c"
          lineWidth={2}
        />
      ))}
      <Lamp x={-1.15} z={4} lit={evening} />
      <Lamp x={1.15} z={PIER_END + 0.4} lit={evening} />

      {/* A bench at the end, facing the water */}
      <WorldModelClone name="bench" position={[BENCH[0], 0.09, BENCH[2]]} rotation={[0, Math.PI, 0]} scale={1.1} />

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
          <cylinderGeometry args={[0.06, 0.07, 1.1, 12]} />
          <meshStandardMaterial color="#2a2c2b" metalness={0.8} roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[0.5, 0.42, 0.62]} />
          <meshPhysicalMaterial {...metal} color="#1f4a43" metalness={0.5} roughness={0.55} clearcoat={0.6} clearcoatRoughness={0.3} />
        </mesh>
        <mesh position={[0, 1.42, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.31, 0.31, 0.5, 24, 1, false, 0, Math.PI]} />
          <meshPhysicalMaterial {...metal} color="#1f4a43" metalness={0.5} roughness={0.55} clearcoat={0.6} clearcoatRoughness={0.3} />
        </mesh>
        <mesh position={[-0.255, 1.25, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.3, 0.05]} />
          <meshStandardMaterial color={C.ink} />
        </mesh>
        <mesh position={[0.27, 1.45, 0.1]}>
          <boxGeometry args={[0.03, 0.3, 0.12]} />
          <meshStandardMaterial color={C.ember} metalness={0.4} roughness={0.4} />
        </mesh>
      </group>

      {/* Soft light from the dusk sky over the water */}
      {evening ? <directionalLight position={[-16, 15, -48]} intensity={0.5} color="#e9c9d6" /> : null}

      {/* The shore you walked out from */}
      <mesh position={[0, -0.6, START + 6]} receiveShadow>
        <boxGeometry args={[40, 1.4, 12]} />
        <meshStandardMaterial {...shore} color="#a9c98a" />
      </mesh>
      <mesh position={[0, 0.105, START + 4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3, 8]} />
        <meshStandardMaterial {...path} />
      </mesh>
    </group>
  );
}
