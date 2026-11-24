"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CanvasTexture, SRGBColorSpace, type Group, type Sprite } from "three";

import { useSurface } from "@/features/world/assets";

import { useDistrict } from "./context";
import { LOTS } from "./layout";
import { Spot } from "./parts";

/** A soft, wispy puff of mist, drawn once: many faint overlapping blobs inside a round falloff. */
function mistTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  for (let i = 0; i < 46; i++) {
    const a = i * 2.39996;
    const r = Math.sqrt(i / 46) * size * 0.3;
    const x = size / 2 + Math.cos(a) * r;
    const y = size / 2 + Math.sin(a) * r * 0.8;
    const rad = size * (0.12 + ((i * 37) % 11) / 90);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function drift(g: Group, t: number) {
  g.children.forEach((child, i) => {
    const m = child as Sprite;
    m.position.x = Math.sin(t + i * 1.7) * 0.45 + ((i % 4) - 1.5) * 0.5;
    m.position.y = 0.55 + Math.sin(t * 1.3 + i) * 0.12 + (i % 3) * 0.28;
    m.material.rotation = t * 0.15 * (i % 2 ? 1 : -1) + i;
  });
}

/** One drifting patch of mist over an empty, unbuilt lot. */
function FogPatch({ at, seed, mist }: { at: [number, number]; seed: number; mist: CanvasTexture }) {
  const g = useRef<Group>(null);
  const { reduced } = useDistrict();
  const dirt = useSurface("cobble", [1.2, 1.2]);
  useFrame(({ clock }) => {
    if (g.current && !reduced) drift(g.current, clock.elapsedTime * 0.3 + seed);
  });
  return (
    <group position={[at[0], 0, at[1]]}>
      {/* An empty plot, cleared and marked out but unbuilt */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} receiveShadow>
        <circleGeometry args={[1.4, 4]} />
        <meshStandardMaterial {...dirt} color="#a89580" />
      </mesh>
      <group ref={g}>
        {[2.2, 1.8, 2.5, 1.9, 1.6, 2.1, 1.7].map((r, i) => (
          <sprite key={i} position={[((i % 4) - 1.5) * 0.5, 0.7, ((i * 37) % 5) * 0.2 - 0.4]} scale={[r, r * 0.7, 1]}>
            <spriteMaterial map={mist} transparent opacity={0.75} depthWrite={false} color="#f5f4ee" />
          </sprite>
        ))}
      </group>
    </group>
  );
}

/** What we don't know yet: fog over empty lots, one patch per open question. */
export function Fog({ open }: { open: number }) {
  const mist = useMemo(() => mistTexture(), []);
  if (open <= 0) return null;
  const lots = LOTS.slice(0, Math.min(open, LOTS.length));
  return (
    <Spot id="unknowns" name={`${open} open ${open === 1 ? "question" : "questions"}`} hint="What we don't know yet" marker={[lots[0][0], 2.9, lots[0][1]]}>
      {lots.map((at, i) => (
        <FogPatch key={i} at={at} seed={i * 2.3} mist={mist} />
      ))}
    </Spot>
  );
}
