"use client";

import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import { Color, IcosahedronGeometry, type Group, type Mesh } from "three";

import type { Audience } from "@idea-district/api-client";

import { C } from "@/features/cafe/scene/palette";
import { useSurface, WorldModelClone } from "@/features/world/assets";

import { useDistrict } from "./context";
import { LENS_LABEL, type DSpot, type V3, type XZ } from "./layout";

const GLOW = new Color(C.ember).multiplyScalar(2.2);

/** Something you can fly to: hover shows its name, a click flies the camera over. */
export function Spot({ id, name, hint, marker, children }: { id: DSpot; name: string; hint: string; marker: V3; children: ReactNode }) {
  const { spot, hovered, setHovered, select, dragged, reduced } = useDistrict();
  const block = useRef<Mesh>(null);
  const isHover = hovered === id;
  const here = spot === id;
  const phase = marker[0] * 1.3 + marker[2] * 0.7;
  useFrame(({ clock }, dt) => {
    const b = block.current;
    if (!b) return;
    b.position.y = marker[1] + (reduced ? 0 : Math.sin(clock.elapsedTime * 2 + phase) * 0.12);
    if (!reduced) b.rotation.y += dt * (isHover ? 3 : 0.9);
    const s = isHover ? 1.6 : 1;
    b.scale.setScalar(b.scale.x + (s - b.scale.x) * Math.min(1, dt * 10));
  });
  return (
    <group
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (here) return;
        setHovered(id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (hovered === id) setHovered(null);
        document.body.style.cursor = "";
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (dragged.current || here) return;
        document.body.style.cursor = "";
        select(id);
      }}
    >
      {children}
      <mesh ref={block} position={marker} rotation={[0.6, 0.6, 0]} visible={spot === "overview"}>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshBasicMaterial color={GLOW} toneMapped={false} />
      </mesh>
      {isHover && !here ? (
        <Html position={[marker[0], marker[1] + 0.6, marker[2]]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="cafe-label max-w-[240px] rounded-[12px] bg-ink/95 px-3.5 py-2.5 text-center text-cream shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-light">{hint}</p>
            <p className="mt-0.5 text-[14px] font-bold leading-snug">{name}</p>
            <p className="mt-1 text-[11px] text-cream/70">Click to fly over</p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

const POSTS = 28;
const HEDGE = "#4f7a45";

/**
 * Privacy you can see. Only you: a tall hedge all round. Your connections: a low picket fence.
 * The community: nothing in the way. It grows and shrinks when you change it.
 */
export function Enclosure({ at, radius, audience, gateDeg }: { at: XZ; radius: number; audience: Audience; gateDeg: number }) {
  const { reduced } = useDistrict();
  const posts = useRef<Group>(null);
  const items = useMemo(() => {
    const out: { x: number; z: number; rot: number }[] = [];
    for (let i = 0; i < POSTS; i++) {
      const a = (i / POSTS) * Math.PI * 2;
      // Leave a gap facing the plaza: that's the way in.
      const d = Math.atan2(Math.sin(a - (gateDeg * Math.PI) / 180), Math.cos(a - (gateDeg * Math.PI) / 180));
      if (Math.abs(d) < 0.35) continue;
      out.push({ x: Math.sin(a) * radius, z: Math.cos(a) * radius, rot: a });
    }
    return out;
  }, [radius, gateDeg]);
  const h = audience === "private" ? 1.25 : audience === "connections" ? 0.5 : 0.001;
  const w = audience === "private" ? 1 : 0.28;
  const color = useMemo(() => new Color(audience === "private" ? HEDGE : "#e9e2d0"), [audience]);

  useFrame((_, dt) => {
    const g = posts.current;
    if (!g) return;
    const k = reduced ? 1 : Math.min(1, dt * 3);
    g.children.forEach((m) => {
      const mesh = m as Mesh;
      mesh.scale.y += (h - mesh.scale.y) * k;
      mesh.scale.x += (w - mesh.scale.x) * k;
      mesh.position.y = mesh.scale.y / 2;
      (mesh.material as unknown as { color: Color }).color.lerp(color, k);
      mesh.visible = mesh.scale.y > 0.02;
    });
  });

  const leaves = useSurface("grass", [1.5, 1]);
  const wood = useSurface("planks", [0.4, 1]);
  const surface = audience === "private" ? leaves : wood;
  const seg = ((2 * Math.PI * radius) / POSTS) * 1.02;
  return (
    <group ref={posts} position={[at[0], 0, at[1]]}>
      {items.map((p, i) => (
        <mesh key={i} position={[p.x, 0.3, p.z]} rotation={[0, p.rot + Math.PI / 2, 0]} scale={[w, 0.6, 1]} castShadow receiveShadow>
          <boxGeometry args={[seg, 1, 0.32]} />
          <meshStandardMaterial {...surface} color={HEDGE} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** When you look through someone else's eyes, rooms they can't see sit under frosted glass. */
export function Veil({ at, radius, height, hidden }: { at: XZ; radius: number; height: number; hidden: boolean }) {
  const { lens, reduced } = useDistrict();
  const dome = useRef<Mesh>(null);
  useFrame((_, dt) => {
    const d = dome.current;
    if (!d) return;
    const target = hidden ? 1 : 0.001;
    d.scale.y += (target - d.scale.y) * (reduced ? 1 : Math.min(1, dt * 4));
    d.visible = d.scale.y > 0.01;
  });
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh ref={dome} scale={[1, 0.001, 1]}>
        <cylinderGeometry args={[radius, radius, height, 40, 1, false]} />
        <meshStandardMaterial color="#e9ebe2" transparent opacity={0.88} roughness={0.9} depthWrite={false} />
      </mesh>
      {hidden ? (
        <Html position={[0, height * 0.55, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div className="cafe-label flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink/85 px-3 py-1.5 text-[12px] font-bold text-cream">
            <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Hidden from {LENS_LABEL[lens].toLowerCase()}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

/** Shared, slightly lumpy leaf clumps: a sphere pushed in and out, the same every visit. */
function useClump() {
  return useMemo(() => {
    const g = new IcosahedronGeometry(1, 5);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const n =
        1 +
        Math.sin(x * 5.1 + y * 2.3) * 0.08 +
        Math.sin(y * 7.7 + z * 3.1) * 0.06 +
        Math.sin(z * 9.3 + x * 4.4) * 0.05 +
        Math.sin(x * 23 + z * 19) * Math.sin(y * 21 + x * 17) * 0.07 +
        Math.sin(y * 41 + z * 37) * Math.sin(x * 43) * 0.035;
      p.setXYZ(i, x * n, y * n * 0.85, z * n);
    }
    g.computeVertexNormals();
    return g;
  }, []);
}

/** A broadleaf tree: a tapering trunk and a crown of leafy clumps, real foliage texture on top. */
export function Tree({ at, s = 1, seed = 0 }: { at: XZ; s?: number; seed?: number }) {
  const clump = useClump();
  const leaves = useSurface("grass", [2, 2]);
  const bark = useSurface("planks", [0.6, 2]);
  const tint = ["#6f9a5a", "#5e8a4c", "#7aa364"][seed % 3];
  const crowns = useMemo(() => {
    const out: [number, number, number, number][] = [[0, 2.1, 0, 0.78]];
    for (let k = 0; k < 9; k++) {
      const a = k * 0.7 + seed;
      const r = 0.5 + ((k * 13) % 4) * 0.08;
      out.push([Math.sin(a) * r, 1.7 + ((k * 37 + seed * 11) % 7) * 0.12, Math.cos(a) * r, 0.36 + ((k + seed) % 3) * 0.07]);
    }
    for (let k = 0; k < 4; k++) {
      const a = k * 1.6 + seed * 0.5;
      out.push([Math.sin(a) * 0.3, 2.55 + (k % 2) * 0.15, Math.cos(a) * 0.3, 0.38]);
    }
    return out;
  }, [seed]);
  return (
    <group position={[at[0], 0, at[1]]} scale={s} rotation={[0, seed * 0.9, 0]}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.15, 1.6, 10]} />
        <meshStandardMaterial {...bark} color="#6b5444" roughness={1} />
      </mesh>
      {[0.6, -0.8, 2.2].map((r, k) => (
        <mesh key={k} position={[Math.sin(r) * 0.22, 1.45, Math.cos(r) * 0.22]} rotation={[Math.cos(r) * 0.7, 0, -Math.sin(r) * 0.7]} castShadow>
          <cylinderGeometry args={[0.03, 0.06, 0.7, 6]} />
          <meshStandardMaterial {...bark} color="#6b5444" roughness={1} />
        </mesh>
      ))}
      {crowns.map(([x, y, z, r], k) => (
        <mesh key={k} geometry={clump} position={[x, y, z]} scale={r} rotation={[0, k * 0.8, 0]} castShadow receiveShadow>
          <meshStandardMaterial {...leaves} color={tint} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** A clump of real ferns. */
export function Fern({ at, rot = 0, s = 0.5 }: { at: XZ; rot?: number; s?: number }) {
  return <WorldModelClone name="fern" position={[at[0], 0, at[1]]} rotation={[0, rot, 0]} scale={s} />;
}
