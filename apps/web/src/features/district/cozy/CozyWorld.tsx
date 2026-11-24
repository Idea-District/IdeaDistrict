"use client";

import { useMemo } from "react";

import type { DistrictOverview, FounderID } from "@idea-district/api-client";

import { C, type TimeOfDay } from "@/features/cafe/scene/palette";

import { useDistrict } from "../scene/context";
import { Monument } from "../scene/Monument";
import { makeBoard } from "./board";
import { Clouds, Countryside } from "./Countryside";
import { CafeSignpost, CozyRooms, EmptySlots } from "./Rooms";

/** Soft, warm light: a storybook sky by day, a dusky blue evening with lit windows. */
export const COZY_SKY: Record<TimeOfDay, { bg: string; sky: string; ground: string; hemi: number; sun: string; sunI: number; pos: [number, number, number] }> = {
  morning: { bg: "#f1e3cb", sky: "#fff4e2", ground: "#9a8566", hemi: 1.05, sun: "#ffdcae", sunI: 2.3, pos: [10, 15, 8] },
  afternoon: { bg: "#d8e8e3", sky: "#f6fbf7", ground: "#8f8a6a", hemi: 1.15, sun: "#fff6e6", sunI: 2.5, pos: [-7, 17, 9] },
  evening: { bg: "#2a3550", sky: "#7584ad", ground: "#2e2b33", hemi: 0.5, sun: "#b4c2ee", sunI: 0.75, pos: [-9, 13, -6] },
};

export const cozySky = (t: TimeOfDay) => COZY_SKY[t].bg;

/** The board's sun and sky light, with soft shadows. */
export function CozyLights({ tod }: { tod: TimeOfDay }) {
  const l = COZY_SKY[tod];
  return (
    <>
      <hemisphereLight args={[l.sky, l.ground, l.hemi]} />
      <directionalLight
        position={l.pos}
        intensity={l.sunI}
        color={l.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-17}
        shadow-camera-right={17}
        shadow-camera-top={17}
        shadow-camera-bottom={-17}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />
    </>
  );
}

/** A plain stone round for the ID to stand on, in the board's style. */
function StonePlinth() {
  return (
    <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.15, 1.3, 0.5, 8]} />
      <meshStandardMaterial flatShading color="#d9d0bd" roughness={1} />
    </mesh>
  );
}

/** C1 · My District, drawn as a cozy board of hexagon tiles. */
export function CozyWorld({ id, overview, tod }: { id: FounderID; overview: DistrictOverview | null; tod: TimeOfDay }) {
  const { reduced } = useDistrict();
  const open = id.gaps.filter((g) => g.status !== "closed").length;
  const { tiles, slots } = useMemo(() => makeBoard(open), [open]);
  const evening = tod === "evening";
  return (
    <>
      <CozyLights tod={tod} />
      {evening ? <pointLight position={[0, 2.5, 3]} intensity={6} distance={9} color={C.bulb} /> : null}
      <Countryside tiles={tiles} evening={evening} />
      <Monument data={id} plinth={<StonePlinth />} />
      <CozyRooms tiles={tiles} overview={overview} evening={evening} />
      <EmptySlots slots={slots} />
      <CafeSignpost tiles={tiles} />
      <Clouds evening={evening} reduced={reduced} />
    </>
  );
}
