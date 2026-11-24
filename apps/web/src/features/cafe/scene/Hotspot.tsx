"use client";

import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import { Color, type Mesh } from "three";

import { useScene } from "./context";
import { C } from "./palette";
import type { Place } from "./spots";

const GLOW = new Color(C.ember).multiplyScalar(2.2);

/**
 * Something in the room you can walk to. A Persimmon pixel block floats above it: in the brand,
 * Persimmon is the system speaking, here pointing out where to go. It glows, so it catches the eye.
 */
export function Hotspot({
  id,
  name,
  hint,
  marker,
  children,
}: {
  id: Place;
  name: string;
  hint: string;
  marker: [number, number, number];
  children: ReactNode;
}) {
  const { spot, hovered, setHovered, select, dragged, reduced, entering } = useScene();
  const block = useRef<Mesh>(null);
  const isHover = hovered === id;
  const here = spot === id;
  const visible = spot !== "street" && !here && !entering;
  const phase = marker[0] * 1.7 + marker[2] * 0.9;

  useFrame(({ clock }, dt) => {
    const b = block.current;
    if (!b) return;
    const t = clock.elapsedTime;
    b.position.y = marker[1] + (reduced ? 0 : Math.sin(t * 2 + phase) * 0.07);
    if (!reduced) b.rotation.y += dt * (isHover ? 3 : 0.9);
    const s = isHover ? 1.6 : 1;
    b.scale.setScalar(b.scale.x + (s - b.scale.x) * Math.min(1, dt * 10));
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (here || entering) return;
    setHovered(id);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    if (hovered === id) setHovered(null);
    document.body.style.cursor = "";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (dragged.current || here || entering) return;
    document.body.style.cursor = "";
    select(id);
  };

  return (
    <group onPointerOver={over} onPointerOut={out} onClick={click}>
      {children}
      <mesh ref={block} position={marker} rotation={[0.6, 0.6, 0]} visible={visible}>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshBasicMaterial color={GLOW} toneMapped={false} />
      </mesh>
      {visible && isHover ? (
        <Html position={[marker[0], marker[1] + 0.32, marker[2]]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="cafe-label max-w-[240px] rounded-[12px] bg-ink/95 px-3.5 py-2.5 text-center text-cream shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-light">{hint}</p>
            <p className="mt-0.5 text-[14px] font-bold leading-snug">{name}</p>
            <p className="mt-1 text-[11px] text-cream/70">Click to walk over</p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}
