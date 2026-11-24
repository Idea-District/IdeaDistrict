"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { PlaneGeometry, type BufferAttribute, type Mesh } from "three";

import type { TimeOfDay } from "@/features/cafe/scene/palette";

import { CozyLights } from "./CozyWorld";

const WATER: Record<TimeOfDay, string> = { morning: "#6fb3c4", afternoon: "#64aec2", evening: "#4a74a0" };

/** Gentle swell: each corner of the faceted sea rises and falls on its own. */
function swell(geo: PlaneGeometry, base: Float32Array, t: number) {
  const p = geo.attributes.position as BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    p.setZ(i, Math.sin(x * 0.45 + t * 0.9) * 0.09 + Math.cos(y * 0.38 + t * 0.7) * 0.08 + Math.sin((x + y) * 0.9 + t * 1.3) * 0.03);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
}

/** A faceted, storybook sea under the board's soft light. Shared by People and Messages. */
export function CozySea({ tod, reduced, y = -0.35, size = 140 }: { tod: TimeOfDay; reduced: boolean; y?: number; size?: number }) {
  const mesh = useRef<Mesh>(null);
  const { geo, base } = useMemo(() => {
    const g = new PlaneGeometry(size, size, 70, 70);
    return { geo: g, base: Float32Array.from(g.attributes.position.array as Float32Array) };
  }, [size]);
  const last = useRef(0);
  useFrame(({ clock }) => {
    if (reduced) return;
    // A few times a second is plenty for a slow swell, and keeps it cheap.
    if (clock.elapsedTime - last.current < 1 / 20) return;
    last.current = clock.elapsedTime;
    swell(geo, base, clock.elapsedTime);
  });
  return (
    <group>
      <CozyLights tod={tod} />
      <mesh ref={mesh} geometry={geo} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial flatShading color={WATER[tod]} roughness={0.35} metalness={0.05} />
      </mesh>
    </group>
  );
}
