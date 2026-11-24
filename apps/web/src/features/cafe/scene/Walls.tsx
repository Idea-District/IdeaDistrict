"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import { Color, type Group, type MeshBasicMaterial } from "three";

import type { WhatsOnItem } from "@idea-district/api-client";

import { KIND_LABEL } from "../shared";
import { useScene } from "./context";
import { Hotspot } from "./Hotspot";
import { C } from "./palette";
import { noticeTexture, signTexture } from "./textures";
import { useCanvasTexture } from "./useCanvasTexture";

const SPILL = new Color("#ffd9a8").multiplyScalar(1.5);
const NEON = new Color(2.4, 2.4, 2.4);

/**
 * A door on a hinge. It opens a crack when you look at it, and swings wide as you go through,
 * letting out the light of the room beyond.
 */
function HingedDoor({ id, width, color, children }: { id: "quick" | "district"; width: number; color: string; children?: ReactNode }) {
  const { hovered, entering, reduced, spot } = useScene();
  const hinge = useRef<Group>(null);
  const target = entering === id ? -1.7 : hovered === id || spot === id ? -0.3 : 0;
  useFrame((_, dt) => {
    const g = hinge.current;
    if (g) g.rotation.y += (target - g.rotation.y) * (reduced ? 1 : Math.min(1, dt * (entering === id ? 1.8 : 4)));
  });
  return (
    <group>
      {/* The light of the room beyond, hidden until the door opens */}
      <mesh position={[0, 1.3, -0.04]}>
        <planeGeometry args={[width - 0.04, 2.56]} />
        <meshBasicMaterial color={SPILL} toneMapped={false} />
      </mesh>
      <group ref={hinge} position={[-width / 2, 0, 0]}>
        <mesh position={[width / 2, 1.3, 0]} castShadow>
          <boxGeometry args={[width, 2.6, 0.08]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
        {[0.75, 1.65].map((y) => (
          <mesh key={y} position={[width / 2, y, 0.045]}>
            <boxGeometry args={[width - 0.4, 0.6, 0.02]} />
            <meshStandardMaterial color={color} roughness={0.45} />
          </mesh>
        ))}
        <mesh position={[width - 0.16, 1.22, 0.07]}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.25} />
        </mesh>
        {children}
      </group>
      {/* Frame */}
      <mesh position={[0, 2.66, 0.02]}>
        <boxGeometry args={[width + 0.2, 0.12, 0.14]} />
        <meshStandardMaterial color={C.ink} roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (width + 0.1)) / 2, 1.3, 0.02]}>
          <boxGeometry args={[0.1, 2.6, 0.14]} />
          <meshStandardMaterial color={C.ink} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** The back door to the Quick Breaks room, under a neon sign that hums a little. */
export function QuickBreaksDoor() {
  const sign = useCanvasTexture(() => signTexture("QUICK BREAKS", { bg: "#141414", fg: C.ember, sub: "THE TOOLKIT ROOM", glow: true, w: 1024, h: 256 }), "qb");
  const mat = useRef<MeshBasicMaterial>(null);
  const { reduced } = useScene();
  useFrame(({ clock }) => {
    if (!mat.current || reduced) return;
    const t = clock.elapsedTime;
    mat.current.opacity = Math.sin(t * 13) > 0.97 || Math.sin(t * 3.1) > 0.995 ? 0.55 : 1;
  });
  return (
    <Hotspot id="quick" name="Step away and test a thought" hint="Quick Breaks" marker={[3.9, 3.75, -5.6]}>
      <group position={[3.9, 0, -5.94]}>
        <HingedDoor id="quick" width={1.5} color={C.ink} />
      </group>
      <mesh position={[3.9, 3.25, -5.95]}>
        <planeGeometry args={[1.9, 0.48]} />
        <meshBasicMaterial ref={mat} map={sign} color={NEON} toneMapped={false} transparent />
      </mesh>
      <pointLight position={[3.9, 3.1, -5.3]} intensity={3} distance={3.5} color={C.ember} />
    </Hotspot>
  );
}

/** A side door that leads to your own District. */
export function DistrictDoor() {
  const plate = useCanvasTexture(() => signTexture("YOUR DISTRICT", { bg: C.forest, fg: C.cream, sub: "YOUR PRIVATE SPACE", w: 768, h: 220 }), "district");
  return (
    <Hotspot id="district" name="Your private space" hint="Your District" marker={[5.6, 3.55, 2.7]}>
      <group position={[5.94, 0, 2.7]} rotation={[0, -Math.PI / 2, 0]}>
        <HingedDoor id="district" width={1.3} color={C.forest2} />
        <mesh position={[0, 3.0, 0.03]}>
          <planeGeometry args={[1.4, 0.4]} />
          <meshBasicMaterial map={plate} toneMapped={false} />
        </mesh>
      </group>
    </Hotspot>
  );
}

/** What's on, pinned to a corkboard by the entrance. */
export function NoticeBoard({ items }: { items: WhatsOnItem[] }) {
  const tex = useCanvasTexture(
    () => noticeTexture(items.map((w) => ({ label: KIND_LABEL[w.kind], title: w.title }))),
    items.map((w) => w.id).join(","),
  );
  return (
    <Hotspot id="notice" name="What's on this week" hint="The noticeboard" marker={[-5.6, 3.25, 0.3]}>
      <group position={[-5.96, 1.85, 0.3]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[2.5, 1.65, 0.06]} />
          <meshStandardMaterial color={C.forest} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[2.35, 1.48]} />
          <meshStandardMaterial map={tex} roughness={0.95} />
        </mesh>
        {/* A little lamp over the board */}
        <mesh position={[0, 1.0, 0.25]} rotation={[0.9, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.12, 0.22, 16, 1, true]} />
          <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.25} side={2} />
        </mesh>
        <pointLight position={[0, 0.85, 0.5]} intensity={2.2} distance={2.4} color={C.bulb} />
      </group>
    </Hotspot>
  );
}
