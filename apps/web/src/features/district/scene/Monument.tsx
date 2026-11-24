"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, type Group, type Mesh } from "three";

import type { FounderID } from "@idea-district/api-client";

import { C } from "@/features/cafe/scene/palette";
import { canvasTexture } from "@/features/cafe/scene/textures";
import { useCanvasTexture } from "@/features/cafe/scene/useCanvasTexture";

import { useSurface } from "@/features/world/assets";

import { useDistrict } from "./context";
import { Spot } from "./parts";

type Orbit = { label: string; text: string; inferred: boolean };

/** What you told us (plain) and how we read you (italic), as in the brand's declared/inferred rule. */
export function orbitItems(data: FounderID): Orbit[] {
  const state = data.state.slice(0, 3).map((s) => ({ label: s.field, text: s.value, inferred: false }));
  const person = [...data.person]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 6 - state.length)
    .map((p) => ({ label: p.dimension, text: p.insight, inferred: true }));
  return [...state, ...person];
}

const EMBER = new Color(C.ember);
const HALO = new Color(C.ember).multiplyScalar(2.4);

/**
 * Your ID: a Persimmon pixel monument in the plaza. It grows a level for every read ID has of you,
 * your initial turns at the top, and what we know orbits around it.
 */
export function Monument({ data }: { data: FounderID }) {
  const { reduced, spot } = useDistrict();
  const crown = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const orbit = useRef<Group>(null);
  const items = useMemo(() => orbitItems(data), [data]);
  const marble = useSurface("marble", [3, 0.4]);
  const levels = Math.max(2, Math.min(6, data.person.length));
  const initial = data.founder.name.slice(0, 1).toUpperCase();
  const face = useCanvasTexture(
    () =>
      canvasTexture(256, 256, (ctx, w, h, font) => {
        ctx.fillStyle = C.ember;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = C.ink;
        ctx.font = `800 170px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initial, w / 2, h / 2 + 8);
      }),
    initial,
  );

  // A stepped tower of pixel blocks, narrower as it rises. Deterministic, so it's the same every visit.
  const blocks = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let lv = 0; lv < levels; lv++) {
      const n = Math.max(1, 3 - Math.floor(lv / 2));
      for (let x = 0; x < n; x++)
        for (let z = 0; z < n; z++) {
          if (lv > 0 && (x + z + lv) % 4 === 0 && n > 1) continue;
          out.push([(x - (n - 1) / 2) * 0.42, 0.75 + lv * 0.42, (z - (n - 1) / 2) * 0.42]);
        }
    }
    return out;
  }, [levels]);
  const top = 0.75 + levels * 0.42 + 0.45;

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (crown.current && !reduced) {
      crown.current.rotation.y += dt * 0.6;
      crown.current.position.y = top + Math.sin(t * 1.5) * 0.08;
    }
    if (halo.current && !reduced) halo.current.rotation.z += dt * 0.25;
    if (orbit.current && !reduced) orbit.current.rotation.y += dt * (spot === "id" ? 0.05 : 0.08);
  });

  return (
    <Spot id="id" name={`${data.founder.name}'s ID`} hint="Your ID" marker={[0, top + 1.2, 0]}>
      {/* Plinth */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.25, 1.4, 0.5, 48]} />
        <meshPhysicalMaterial {...marble} roughness={1} clearcoat={0.4} clearcoatRoughness={0.3} />
      </mesh>
      <mesh position={[0, 0.52, 0]} receiveShadow>
        <cylinderGeometry args={[1.05, 1.05, 0.06, 40]} />
        <meshStandardMaterial color={C.ink} roughness={0.5} />
      </mesh>
      {blocks.map((p, i) => (
        <mesh key={i} position={p} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial color={EMBER} roughness={0.45} emissive={C.ember} emissiveIntensity={0.18} />
        </mesh>
      ))}
      <mesh ref={crown} position={[0, top, 0]} castShadow>
        <boxGeometry args={[0.62, 0.62, 0.62]} />
        <meshStandardMaterial map={face} roughness={0.4} emissive={C.ember} emissiveIntensity={0.25} />
      </mesh>
      <mesh ref={halo} position={[0, top, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.85, 0.018, 8, 64]} />
        <meshBasicMaterial color={HALO} toneMapped={false} />
      </mesh>

      {/* What we know, orbiting */}
      <group ref={orbit} visible={spot === "overview" || spot === "id"}>
        {(spot === "overview" || spot === "id" ? items : []).map((it, i) => {
          const a = (i / items.length) * Math.PI * 2;
          return (
            <Html key={`${it.label}-${i}`} position={[Math.sin(a) * 2.9, 1.7 + (i % 2) * 0.7, Math.cos(a) * 2.9]} center distanceFactor={7} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
              <div className="w-[190px] rounded-[12px] bg-cream/95 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-dust">{it.label}</p>
                <p className={`mt-0.5 line-clamp-3 text-[12.5px] leading-snug ${it.inferred ? "inferred" : "text-ink"}`}>{it.text}</p>
              </div>
            </Html>
          );
        })}
      </group>
      <pointLight position={[0, top, 1.6]} intensity={4} distance={6} color={C.bulb} />
    </Spot>
  );
}
