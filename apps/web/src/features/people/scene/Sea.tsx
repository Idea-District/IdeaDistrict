"use client";

import { Environment, Sparkles } from "@react-three/drei";

import type { TimeOfDay } from "@/features/cafe/scene/palette";
import { SKY_HDRI } from "@/features/world/assets";
import { Water } from "@/features/world/Water";

/** `bg` is the haze the far water fades into, under the real sky. */
export const SEA: Record<TimeOfDay, { bg: string; water: string; hemi: [string, string, number]; sun: [number, number, number]; sunColor: string; sunI: number; env: number }> = {
  morning: { bg: "#c8d3d8", water: "#1d4a52", hemi: ["#fff1dc", "#2f5a52", 0.25], sun: [-14, 12, 6], sunColor: "#ffd9a8", sunI: 2.2, env: 0.9 },
  afternoon: { bg: "#c3d0d6", water: "#1b4650", hemi: ["#f6f8f0", "#2f5a52", 0.25], sun: [10, 18, 4], sunColor: "#fff4e0", sunI: 2.4, env: 1 },
  evening: { bg: "#7a6e78", water: "#1a2c36", hemi: ["#ffb98a", "#0f221e", 0.3], sun: [-14, 5, -12], sunColor: "#ff9a5c", sunI: 1.6, env: 0.75 },
};

/** Open water under a real sky, and the light over the archipelago. Shared with the Messages pier. */
export function Sea({ tod, reduced }: { tod: TimeOfDay; reduced: boolean }) {
  const S = SEA[tod];
  const evening = tod === "evening";
  return (
    <group>
      <Environment files={SKY_HDRI[tod]} background environmentIntensity={S.env} backgroundIntensity={evening ? 0.85 : 1} />
      <hemisphereLight args={S.hemi} />
      <directionalLight
        position={S.sun}
        intensity={S.sunI}
        color={S.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />
      <Water color={S.water} y={-0.45} reduced={reduced} />
      {evening ? <Sparkles count={80} position={[0, 0.3, -2]} scale={[40, 0.6, 40]} size={2} speed={0.25} opacity={0.5} color="#ffd9b0" /> : null}
    </group>
  );
}
