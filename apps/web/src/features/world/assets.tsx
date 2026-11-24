"use client";

import { Clone, useGLTF, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import { RepeatWrapping, SRGBColorSpace, type Texture } from "three";

import type { TimeOfDay } from "@/features/cafe/scene/palette";

/*
 * Real assets for the outdoor places (District, People, Messages): CC0 models, textures and HDR skies
 * from Poly Haven (polyhaven.com), stored in public/assets/world and loaded only on those pages.
 */
const BASE = "/assets/world";

export const WORLD_MODELS = {
  pier: `${BASE}/models/modular_wooden_pier/modular_wooden_pier.gltf`,
  lantern: `${BASE}/models/Lantern_01/Lantern_01.gltf`,
  bench: `${BASE}/models/painted_wooden_bench/painted_wooden_bench.gltf`,
  streetLamp: `${BASE}/models/street_lamp_01/street_lamp_01.gltf`,
  ship: `${BASE}/models/dutch_ship_medium/dutch_ship_medium.gltf`,
  buoy: `${BASE}/models/ocean_buoy/ocean_buoy.gltf`,
  fern: `${BASE}/models/fern_02/fern_02.gltf`,
} as const;
export type WorldModel = keyof typeof WORLD_MODELS;

/** The real sky for each time of day: a partly cloudy day, then dusk. A moonless night is there too. */
export const SKY_HDRI: Record<TimeOfDay, string> = {
  morning: `${BASE}/hdri/day_1k.hdr`,
  afternoon: `${BASE}/hdri/day_1k.hdr`,
  evening: `${BASE}/hdri/dusk_1k.hdr`,
};
export const NIGHT_HDRI = `${BASE}/hdri/night_1k.hdr`;

const SURFACES = {
  planks: `${BASE}/textures/planks`,
  cobble: `${BASE}/textures/cobble`,
  grass: `${BASE}/textures/grass`,
  roof: `${BASE}/textures/roof`,
  plaster: `${BASE}/textures/plaster`,
  marble: `/assets/cafe/textures/marble`,
} as const;
export type WorldSurface = keyof typeof SURFACES;

/** Start downloading what a page needs as soon as its scene module loads. */
export function preloadWorld(models: WorldModel[]) {
  models.forEach((m) => useGLTF.preload(WORLD_MODELS[m]));
}

/** A real model, cloned so it can appear many times, casting and catching shadows. */
export function WorldModelClone({
  name,
  position,
  rotation,
  scale,
}: {
  name: WorldModel;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}) {
  const { scene } = useGLTF(WORLD_MODELS[name]);
  return <Clone object={scene} position={position} rotation={rotation} scale={scale} castShadow receiveShadow />;
}

function configure(t: Texture, repeat: [number, number], color: boolean) {
  const c = t.clone();
  c.wrapS = c.wrapT = RepeatWrapping;
  c.repeat.set(repeat[0], repeat[1]);
  if (color) c.colorSpace = SRGBColorSpace;
  c.anisotropy = 8;
  c.needsUpdate = true;
  return c;
}

/** A physically based surface (colour, bumps, roughness), tiled for the size of the thing it covers. */
export function useSurface(surface: WorldSurface, repeat: [number, number]) {
  const base = SURFACES[surface];
  const t = useTexture({ map: `${base}_color.jpg`, normalMap: `${base}_normal.jpg`, roughnessMap: `${base}_rough.jpg` });
  const [rx, ry] = repeat;
  return useMemo(
    () => ({
      map: configure(t.map, [rx, ry], true),
      normalMap: configure(t.normalMap, [rx, ry], false),
      roughnessMap: configure(t.roughnessMap, [rx, ry], false),
    }),
    [t, rx, ry],
  );
}
