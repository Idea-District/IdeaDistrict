"use client";

import { Clone, useGLTF, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import { RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/*
 * Real assets for the Cafe: CC0 models, textures and HDR light from Poly Haven (polyhaven.com),
 * stored in public/assets/cafe and loaded only on this page.
 */
const BASE = "/assets/cafe";

export const MODELS = {
  table: `${BASE}/models/gallinera_table/gallinera_table.gltf`,
  chair: `${BASE}/models/gallinera_chair/gallinera_chair.gltf`,
  stool: `${BASE}/models/bar_chair_round_01/bar_chair_round_01.gltf`,
  cart: `${BASE}/models/CoffeeCart_01/CoffeeCart_01.gltf`,
  shelf: `${BASE}/models/Shelf_01/Shelf_01.gltf`,
  plant: `${BASE}/models/potted_plant_02/potted_plant_02.gltf`,
  lamp: `${BASE}/models/hanging_industrial_lamp/hanging_industrial_lamp.gltf`,
  croissant: `${BASE}/models/croissant/croissant.gltf`,
  vase: `${BASE}/models/ceramic_vase_01/ceramic_vase_01.gltf`,
} as const;

export const HDRI = `${BASE}/hdri/comfy_cafe_1k.hdr`;

export type Surface = "floor" | "wall" | "marble" | "brick";

/** Start every download as soon as the scene module loads. */
export function preloadCafe() {
  Object.values(MODELS).forEach((u) => useGLTF.preload(u));
}

/** A real model, cloned so it can appear many times, casting and catching shadows. */
export function Model({
  name,
  position,
  rotation,
  scale,
}: {
  name: keyof typeof MODELS;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}) {
  const { scene } = useGLTF(MODELS[name]);
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
export function usePBR(surface: Surface, repeat: [number, number]) {
  const t = useTexture({
    map: `${BASE}/textures/${surface}_color.jpg`,
    normalMap: `${BASE}/textures/${surface}_normal.jpg`,
    roughnessMap: `${BASE}/textures/${surface}_rough.jpg`,
  });
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
