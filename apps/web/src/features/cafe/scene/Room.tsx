"use client";

import { Environment, Line, Sparkles } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, Object3D, type Group, type InstancedMesh, type Mesh, type Texture } from "three";

import { Model, usePBR, HDRI, type Surface } from "./assets";
import { useScene } from "./context";
import { C, LIGHT, type TimeOfDay } from "./palette";
import { BOUNDS } from "./spots";
import { beamTexture, rainTexture, signTexture, windowTexture } from "./textures";
import { useCanvasTexture } from "./useCanvasTexture";

type V3 = [number, number, number];

function Box({ size, at, color, rough = 0.9, metal = 0, rot }: { size: V3; at: V3; color: string; rough?: number; metal?: number; rot?: V3 }) {
  return (
    <mesh position={at} rotation={rot} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
    </mesh>
  );
}

/** A real surface: plaster, brick or marble, tiled to its size (about one tile per metre and a half). */
function Surfaced({ size, at, surface, tile = 1.5, rot, tint = "#ffffff" }: { size: V3; at: V3; surface: Surface; tile?: number; rot?: V3; tint?: string }) {
  const across = Math.max(size[0], size[2]);
  const pbr = usePBR(surface, [Math.max(1, across / tile), Math.max(1, size[1] / tile)]);
  return (
    <mesh position={at} rotation={rot} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial {...pbr} color={tint} roughness={1} />
    </mesh>
  );
}

/** The front door swings open as you arrive. */
function FrontDoor({ open }: { open: boolean }) {
  const hinge = useRef<Group>(null);
  const { reduced } = useScene();
  useFrame((_, dt) => {
    const g = hinge.current;
    if (!g) return;
    const target = open ? -1.75 : 0; // opens outward, onto the street, so it never stands in the room
    g.rotation.y += (target - g.rotation.y) * (reduced ? 1 : Math.min(1, dt * 2.4));
  });
  return (
    <group ref={hinge} position={[-0.75, 0, 4.18]}>
      <Box size={[1.5, 2.5, 0.08]} at={[0.75, 1.25, 0]} color={C.forest2} rough={0.6} />
      <mesh position={[0.75, 1.7, 0.05]}>
        <planeGeometry args={[0.9, 0.8]} />
        <meshStandardMaterial color={C.bulb} emissive={C.bulb} emissiveIntensity={0.5} />
      </mesh>
      <Box size={[0.06, 0.3, 0.06]} at={[1.3, 1.15, 0.08]} color="#c9a227" rough={0.25} metal={0.9} />
      {/* The bell over the door */}
      <mesh position={[0.15, 2.4, -0.12]}>
        <sphereGeometry args={[0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.25} side={2} />
      </mesh>
    </group>
  );
}

function Plant({ at, s = 1 }: { at: V3; s?: number }) {
  return <Model name="plant" position={at} scale={1.6 * s} />;
}

/** A ceiling fan, turning slowly: it's Bengaluru. */
function Fan({ at }: { at: V3 }) {
  const blades = useRef<Group>(null);
  const { reduced } = useScene();
  useFrame((_, dt) => {
    if (blades.current && !reduced) blades.current.rotation.y += dt * 2.2;
  });
  return (
    <group position={at}>
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
        <meshStandardMaterial color={C.ink} />
      </mesh>
      <mesh position={[0, -0.55, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.16, 18]} />
        <meshStandardMaterial color={C.ink} roughness={0.4} metalness={0.4} />
      </mesh>
      <group ref={blades} position={[0, -0.6, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3, 0.06]} position={[Math.cos((i * Math.PI * 2) / 3) * 0.55, 0, -Math.sin((i * Math.PI * 2) / 3) * 0.55]} castShadow>
            <boxGeometry args={[0.85, 0.02, 0.16]} />
            <meshStandardMaterial color={C.woodDark} roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const BULB = new Color(C.bulb).multiplyScalar(3.2);

/** Strings of warm bulbs across the ceiling. */
function StringLights({ evening }: { evening: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const strands = useMemo(() => {
    return [-4.2, -1.2, 1.8].map((z, si) => {
      const pts: V3[] = [];
      for (let i = 0; i <= 40; i++) {
        const x = -6 + (12 * i) / 40;
        const u = x / 6;
        pts.push([x, 4.05 - 0.5 * (1 - u * u) + Math.sin(si + i) * 0.01, z + Math.sin(u * 2 + si) * 0.25]);
      }
      return pts;
    });
  }, []);
  const bulbs = useMemo(() => strands.flatMap((s) => s.filter((_, i) => i % 2 === 1)), [strands]);
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new Object3D();
    bulbs.forEach(([x, y, z], i) => {
      o.position.set(x, y - 0.06, z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [bulbs]);
  return (
    <group>
      {strands.map((pts, i) => (
        <Line key={i} points={pts} color={C.ink} lineWidth={1.2} />
      ))}
      <instancedMesh ref={mesh} args={[undefined, undefined, bulbs.length]}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshBasicMaterial color={evening ? BULB : new Color(C.bulb).multiplyScalar(1.6)} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function scroll(t: Texture, by: number) {
  t.offset.y += by;
}

/** Rain running down the window glass. */
function Rain() {
  const tex = useCanvasTexture(rainTexture, "rain");
  const { reduced } = useScene();
  useFrame((_, dt) => {
    if (!reduced) scroll(tex, dt * 0.9);
  });
  return (
    <mesh position={[0.4, 2.35, -5.975]}>
      <planeGeometry args={[2.4, 1.6]} />
      <meshBasicMaterial map={tex} transparent opacity={0.65} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Window light falling across the floor, with dust drifting in it. */
function SunBeam({ strength }: { strength: number }) {
  const tex = useCanvasTexture(beamTexture, "beam");
  if (strength <= 0) return null;
  return (
    <group>
      <mesh position={[0.4, 1.4, -4.6]} rotation={[-0.55, 0, 0]}>
        <planeGeometry args={[2.6, 3.4]} />
        <meshBasicMaterial map={tex} transparent opacity={strength} blending={AdditiveBlending} depthWrite={false} side={2} />
      </mesh>
      <Sparkles count={70} position={[0.4, 1.6, -4.2]} scale={[2.6, 2.4, 2.6]} size={2.2} speed={0.18} opacity={0.7} color="#fff1d0" />
    </group>
  );
}

/** Tap the floor to walk there. A ring shows where you'll stand. */
function Floor() {
  const { walkTo, dragged, hovered, entering } = useScene();
  const floor = usePBR("floor", [7, 6]);
  const ring = useRef<Mesh>(null);
  const inside = (x: number, z: number) => x > BOUNDS.minX - 0.4 && x < BOUNDS.maxX + 0.4 && z > BOUNDS.minZ - 0.4 && z < BOUNDS.maxZ + 0.4;
  useFrame(({ clock }) => {
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.08);
  });
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, -1]}
        receiveShadow
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          const r = ring.current;
          if (!r) return;
          const ok = inside(e.point.x, e.point.z) && !hovered && !entering;
          r.visible = ok;
          r.position.set(e.point.x, 0.012, e.point.z);
          document.body.style.cursor = ok ? "crosshair" : "";
        }}
        onPointerOut={() => {
          if (ring.current) ring.current.visible = false;
          document.body.style.cursor = "";
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (dragged.current || entering || !inside(e.point.x, e.point.z)) return;
          walkTo(e.point.x, e.point.z);
        }}
      >
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial {...floor} roughness={1} envMapIntensity={0.9} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.18, 0.24, 32]} />
        <meshBasicMaterial color={new Color(C.ember).multiplyScalar(1.6)} toneMapped={false} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

/** A wooden shelf on the left wall by the counter, with a vase and a plant. */
function Shelf() {
  return (
    <group position={[-5.93, 0, -2.4]} rotation={[0, Math.PI / 2, 0]}>
      <Model name="shelf" />
      <Model name="vase" position={[-0.25, 1.05, 0.13]} scale={0.8} />
      <Model name="plant" position={[0.22, 1.6, 0.12]} scale={0.45} />
    </group>
  );
}

/** Walls, floor, ceiling, the street outside and the window onto Bengaluru. */
export function Room({ tod, doorOpen }: { tod: TimeOfDay; doorOpen: boolean }) {
  const L = LIGHT[tod];
  const sky = useCanvasTexture(() => windowTexture(tod), tod);
  const sign = useCanvasTexture(
    () => signTexture("THE DISTRICT CAFE", { bg: C.ink, fg: C.cream, sub: "BENGALURU · PULL UP A CHAIR", pixels: true, w: 1024, h: 240 }),
    "sign",
  );
  const evening = tod === "evening";

  return (
    <group>
      {/* Light */}
      <hemisphereLight args={[L.sky, L.ground, L.hemi]} />
      <directionalLight
        position={L.sun}
        intensity={L.sunI}
        color={L.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight position={[0, 3.7, -0.5]} intensity={L.fill} distance={14} decay={1.6} color={C.bulb} />
      {/* Light and reflections from an HDR photo taken inside a real cafe */}
      <Environment files={HDRI} environmentIntensity={evening ? 0.35 : 0.9} />

      <Floor />
      <Surfaced size={[12, 0.05, 10]} at={[0, 4.22, -1]} surface="wall" tile={2} />
      {/* Exposed beams */}
      {[-3.5, -0.5, 2.5].map((z) => (
        <Box key={z} size={[12, 0.22, 0.26]} at={[0, 4.08, z]} color={C.woodDark} rough={0.8} />
      ))}
      <Fan at={[-2.5, 4.2, -1.6]} />
      <Fan at={[2.6, 4.2, 0.9]} />
      <StringLights evening={evening} />

      {/* Back, left and right walls with a Forest Green lower band and a brass rail */}
      <Surfaced size={[12, 4.2, 0.2]} at={[0, 2.1, -6.1]} surface="brick" tile={1.2} tint="#f3cfb0" />
      <Box size={[12, 1.1, 0.06]} at={[0, 0.55, -5.98]} color={C.forest} />
      <Surfaced size={[0.2, 4.2, 10]} at={[-6.1, 2.1, -1]} surface="wall" />
      <Box size={[0.06, 1.1, 10]} at={[-5.98, 0.55, -1]} color={C.forest} />
      <Surfaced size={[0.2, 4.2, 10]} at={[6.1, 2.1, -1]} surface="wall" />
      <Box size={[0.06, 1.1, 10]} at={[5.98, 0.55, -1]} color={C.forest} />
      <Box size={[12, 0.04, 0.04]} at={[0, 1.12, -5.95]} color="#c9a227" rough={0.25} metal={0.9} />
      <Box size={[0.04, 0.04, 10]} at={[-5.95, 1.12, -1]} color="#c9a227" rough={0.25} metal={0.9} />
      <Box size={[0.04, 0.04, 10]} at={[5.95, 1.12, -1]} color="#c9a227" rough={0.25} metal={0.9} />
      <Shelf />

      {/* Front wall with the doorway (inside face beige, street face green) */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Surfaced size={[5.25, 4.2, 0.2]} at={[s * 3.375, 2.1, 4.1]} surface="wall" />
          <Box size={[5.25, 4.2, 0.1]} at={[s * 3.375, 2.1, 4.25]} color={C.forest} />
          <mesh position={[s * 3.2, 1.75, 4.31]}>
            <planeGeometry args={[3, 1.7]} />
            <meshStandardMaterial color={C.bulb} emissive={C.bulb} emissiveIntensity={evening ? 1.1 : 0.4} />
          </mesh>
          <Box size={[3.15, 0.1, 0.06]} at={[s * 3.2, 0.88, 4.33]} color={C.ink} />
          <Box size={[3.15, 0.1, 0.06]} at={[s * 3.2, 2.62, 4.33]} color={C.ink} />
          <Box size={[0.08, 1.7, 0.06]} at={[s * 3.2, 1.75, 4.33]} color={C.ink} />
          {/* Awning */}
          <mesh position={[s * 3.2, 2.95, 4.65]} rotation={[0.5, 0, 0]} castShadow>
            <boxGeometry args={[3.3, 0.04, 0.9]} />
            <meshStandardMaterial color={C.ink} roughness={0.8} />
          </mesh>
          <Plant at={[s * 1.4, 0, 4.9]} />
        </group>
      ))}
      <Surfaced size={[1.5, 1.7, 0.2]} at={[0, 3.35, 4.1]} surface="wall" />
      <Box size={[1.5, 1.7, 0.1]} at={[0, 3.35, 4.25]} color={C.forest} />
      <FrontDoor open={doorOpen} />
      <mesh position={[0, 3.45, 4.32]}>
        <planeGeometry args={[3.6, 0.85]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 3.2, 5.2]} intensity={evening ? 6 : 2} distance={6} color={C.bulb} />

      {/* The street */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 11]} receiveShadow>
        <planeGeometry args={[40, 14]} />
        <meshStandardMaterial color={evening ? "#1d1d1d" : "#3a3634"} roughness={evening ? 0.35 : 1} metalness={evening ? 0.2 : 0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 5.2]} receiveShadow>
        <planeGeometry args={[40, 2]} />
        <meshStandardMaterial color={C.sand} roughness={1} />
      </mesh>

      {/* Window onto the city, on the back wall */}
      <mesh position={[0.4, 2.35, -5.99]}>
        <planeGeometry args={[2.4, 1.6]} />
        <meshBasicMaterial map={sky} toneMapped={false} />
      </mesh>
      {evening ? <Rain /> : null}
      <Box size={[2.6, 0.1, 0.1]} at={[0.4, 3.2, -5.95]} color={C.ink} />
      <Box size={[2.6, 0.14, 0.22]} at={[0.4, 1.5, -5.9]} color={C.ink} />
      <Box size={[0.1, 1.7, 0.1]} at={[-0.85, 2.35, -5.95]} color={C.ink} />
      <Box size={[0.1, 1.7, 0.1]} at={[1.65, 2.35, -5.95]} color={C.ink} />
      <Box size={[0.06, 1.6, 0.08]} at={[0.4, 2.35, -5.95]} color={C.ink} />
      <SunBeam strength={L.beam} />

      <Plant at={[5.3, 0, -5.3]} s={1.2} />
      <Plant at={[-5.4, 0, 3.75]} />
      {/* An Italian coffee cart by the entrance */}
      <Model name="cart" position={[-5.15, 0, 1.9]} rotation={[0, Math.PI / 2, 0]} />
      <Plant at={[5.3, 0, 3.4]} s={0.9} />
    </group>
  );
}
