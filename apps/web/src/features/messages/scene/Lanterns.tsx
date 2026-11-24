"use client";

import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, type Group, type MeshStandardMaterial } from "three";

import type { ConversationSummary } from "@idea-district/api-client";

import { C } from "@/features/cafe/scene/palette";
import { WorldModelClone } from "@/features/world/assets";

import { BENCH, PIER_END, type MSpot, type V3 } from "./layout";

type Interact = {
  spot: MSpot;
  hovered: string | null;
  setHovered: (h: string | null) => void;
  select: (s: MSpot) => void;
  dragged: { current: boolean };
  reduced: boolean;
};

const WARM = new Color("#ffcf96");
const EMBER = new Color(C.ember);

/**
 * A real brass-and-glass lantern with a flame inside. `mat` is the flame, so the caller can make it
 * flicker and brighten.
 */
function LanternBody({ glow, color, mat }: { glow: number; color: Color; mat?: React.Ref<MeshStandardMaterial> }) {
  return (
    <group>
      <WorldModelClone name="lantern" position={[0, -0.43, 0]} scale={3} />
      <mesh position={[0, -0.06, 0]}>
        <sphereGeometry args={[0.085, 14, 10]} />
        <meshStandardMaterial ref={mat} color="#fff2d6" emissive={color} emissiveIntensity={glow} toneMapped={false} />
      </mesh>
      {/* An easy target to click, a little bigger than the lantern itself */}
      <mesh visible={false}>
        <boxGeometry args={[0.6, 1, 0.6]} />
      </mesh>
    </group>
  );
}

/**
 * One conversation, floating over the water. Unread: it glows warmer, floats a little higher and
 * shows how many. Its tag carries only their public card and the last line.
 */
export function Lantern({ c, at, i, io, lit }: { c: ConversationSummary; at: V3; i: number; io: Interact; lit: boolean }) {
  const id: MSpot = `c:${c.id}`;
  const g = useRef<Group>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const unread = c.unread > 0;
  const isHover = io.hovered === id;
  const here = io.spot === id;
  const color = useMemo(() => (unread ? WARM.clone().lerp(EMBER, 0.35) : WARM.clone()), [unread]);
  const base = unread ? 6 : 3.5;

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + i * 1.3;
    if (g.current) {
      g.current.position.y = at[1] + (unread ? 0.25 : 0) + (io.reduced ? 0 : Math.sin(t * (unread ? 1.4 : 0.8)) * 0.12);
      if (!io.reduced) g.current.rotation.y += dt * 0.15;
    }
    if (mat.current) {
      const target = (isHover || here ? base * 1.5 : base) * (io.reduced ? 1 : 0.9 + Math.sin(t * 7) * 0.05 + Math.sin(t * 13) * 0.04);
      mat.current.emissiveIntensity += (target - mat.current.emissiveIntensity) * Math.min(1, dt * 8);
    }
  });

  return (
    <group
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (here) return;
        io.setHovered(id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (io.hovered === id) io.setHovered(null);
        document.body.style.cursor = "";
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (io.dragged.current || here) return;
        document.body.style.cursor = "";
        io.select(id);
      }}
    >
      <group ref={g} position={at}>
        <group scale={1.9}>
          <LanternBody glow={base} color={color} mat={mat} />
        </group>
        {lit ? <pointLight position={[0, -0.05, 0]} intensity={unread ? 7 : 4.5} distance={7} decay={1.6} color={color} /> : null}
        {io.spot === "overview" ? (
          <Html position={[0, -1.15, 0]} center distanceFactor={9} zIndexRange={[8, 0]} style={{ pointerEvents: "none" }}>
            <div className={`w-max max-w-[210px] rounded-[12px] px-3 py-2 text-center shadow-[0_8px_22px_rgba(0,0,0,0.3)] ${isHover ? "bg-ink text-cream" : "bg-cream/95 text-ink"}`}>
              <p className="flex items-center justify-center gap-1.5 text-[13px] font-bold leading-tight">
                {c.with.name}
                {unread ? <span className="rounded-full bg-ember px-1.5 text-[10.5px] font-bold text-ink">{c.unread}</span> : null}
              </p>
              <p className={`mt-0.5 line-clamp-1 text-[11px] ${isHover ? "text-cream/75" : "text-ink3"}`}>{c.last_message ?? c.with.building}</p>
            </div>
          </Html>
        ) : null}
      </group>
      {/* A thread down to a little float on the water */}
      <mesh position={[at[0], (at[1] - 0.6) / 2 - 0.2, at[2]]}>
        <cylinderGeometry args={[0.004, 0.004, at[1] - 0.2, 4]} />
        <meshBasicMaterial color="#c9b79c" transparent opacity={0.55} />
      </mesh>
      <mesh position={[at[0], -0.32, at[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 18]} />
        <meshStandardMaterial color="#6b5444" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** No conversations yet: one unlit lantern, waiting on the bench. */
export function EmptyLantern({ io }: { io: Interact }) {
  const isHover = io.hovered === "empty";
  return (
    <group
      position={[BENCH[0] + 0.3, BENCH[1] + 0.86, BENCH[2]]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        io.setHovered("empty");
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        io.setHovered(null);
        document.body.style.cursor = "";
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (!io.dragged.current) io.select("empty");
      }}
    >
      <group scale={0.75}>
        <LanternBody glow={isHover ? 0.5 : 0.05} color={WARM} />
      </group>
      {io.spot === "overview" ? (
        <Html position={[0, 0.65, 0]} center distanceFactor={8} zIndexRange={[8, 0]} style={{ pointerEvents: "none" }}>
          <div className="w-max max-w-[220px] rounded-[12px] bg-cream/95 px-3 py-2 text-center shadow-lg">
            <p className="text-[13px] font-bold text-ink">No conversations yet</p>
            <p className="text-[11px] text-ink3">An introduction lights the first one</p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

/** When you send, a small lantern lifts off the end of the pier and floats out to theirs. */
export function SentLantern({ to, reduced }: { to: V3; reduced: boolean }) {
  const g = useRef<Group>(null);
  const t0 = useRef<number | null>(null);
  const from: V3 = [0, 1.3, PIER_END + 0.2];
  useFrame(({ clock }) => {
    const grp = g.current;
    if (!grp) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    const p = Math.min(1, (clock.elapsedTime - t0.current) / (reduced ? 0.01 : 2.2));
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    grp.position.set(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e + Math.sin(e * Math.PI) * 1.4, from[2] + (to[2] - from[2]) * e);
    grp.scale.setScalar(0.45 * (1 - p * 0.6));
    grp.visible = p < 1;
  });
  return (
    <group ref={g} position={from} scale={0.45}>
      <LanternBody glow={3} color={EMBER} />
      <pointLight intensity={2} distance={3} color={C.ember} />
    </group>
  );
}
