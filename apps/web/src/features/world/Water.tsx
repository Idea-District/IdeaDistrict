"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CanvasTexture, RepeatWrapping, Vector2, type MeshPhysicalMaterial } from "three";

/**
 * A tileable ripple normal map, drawn once: a sum of waves whose frequencies are whole numbers,
 * so it repeats seamlessly across the sea.
 */
function rippleNormals(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const waves = [
    [3, 1, 0.0, 1],
    [1, 4, 1.3, 0.8],
    [5, -2, 2.1, 0.5],
    [-4, 6, 0.7, 0.35],
    [9, 3, 2.9, 0.22],
    [-7, -9, 1.1, 0.18],
    [13, -11, 0.4, 0.1],
  ];
  const tau = Math.PI * 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let dx = 0;
      let dy = 0;
      for (const [kx, ky, ph, a] of waves) {
        const arg = (tau * (kx * x + ky * y)) / size + ph;
        const d = Math.cos(arg) * a;
        dx += d * kx;
        dy += d * ky;
      }
      const s = 0.06;
      const nx = -dx * s;
      const ny = -dy * s;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

function drift(m: MeshPhysicalMaterial, dt: number) {
  const n = m.normalMap;
  const c = m.clearcoatNormalMap;
  if (n) n.offset.set(n.offset.x + dt * 0.006, n.offset.y + dt * 0.004);
  if (c) c.offset.set(c.offset.x - dt * 0.004, c.offset.y + dt * 0.007);
}

/**
 * Open water that reflects the real sky: two layers of ripples drifting in different directions,
 * a deep body colour, and a glossy surface. Used by every outdoor place.
 */
export function Water({ color, y = 0, radius = 120, reduced = false }: { color: string; y?: number; radius?: number; reduced?: boolean }) {
  const mat = useRef<MeshPhysicalMaterial>(null);
  const maps = useMemo(() => {
    const a = rippleNormals();
    a.repeat.set(radius / 1.3, radius / 1.1);
    const b = a.clone();
    b.repeat.set(radius / 4.7, radius / 5.3);
    b.needsUpdate = true;
    return { a, b };
  }, [radius]);
  const scale = useMemo(() => new Vector2(0.22, 0.22), []);
  useFrame((_, dt) => {
    if (mat.current && !reduced) drift(mat.current, dt);
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <circleGeometry args={[radius, 96]} />
      <meshPhysicalMaterial
        ref={mat}
        color={color}
        roughness={0.12}
        metalness={0}
        normalMap={maps.a}
        normalScale={scale}
        clearcoat={1}
        clearcoatRoughness={0.05}
        clearcoatNormalMap={maps.b}
        clearcoatNormalScale={scale}
        envMapIntensity={1.2}
      />
    </mesh>
  );
}
