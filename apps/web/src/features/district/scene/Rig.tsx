"use client";

import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { PerspectiveCamera } from "three";

import { view as districtView, type V3 } from "./layout";

/** Flies the camera to each place, keeps it beside its panel, and drifts slowly round when idle. */
export function Rig<T extends string>({
  spot,
  intro,
  reduced,
  view = districtView as unknown as (spot: T, narrow: boolean) => [V3, V3],
  home = "overview" as T,
  minDistance = 4,
  maxDistance = 40,
}: {
  spot: T;
  intro: boolean;
  reduced: boolean;
  /** Camera [position, target] for each place. Defaults to the District's. */
  view?: (spot: T, narrow: boolean) => [V3, V3];
  /** The place with no panel open, where the camera drifts round when idle. */
  home?: T;
  minDistance?: number;
  maxDistance?: number;
}) {
  const controls = useRef<CameraControlsImpl>(null);
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const idle = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const narrow = size.width < size.height;
    const [p, t] = view(spot, narrow);
    if (first.current) {
      first.current = false;
      if (intro && !reduced) {
        // Arriving: from high above the water, swoop down onto your District.
        c.setLookAt(p[0] + 26, p[1] + 30, p[2] + 30, t[0], t[1], t[2], false);
        c.smoothTime = 1.1;
        void c.setLookAt(...p, ...t, true).then(() => {
          c.smoothTime = 0.45;
        });
      } else {
        c.setLookAt(...p, ...t, false);
      }
    } else {
      void c.setLookAt(...p, ...t, !reduced);
    }
    // A panel covers part of the screen: shift the view so the place sits in what's left.
    const dist = Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2]);
    const half = dist * Math.tan(((camera.fov / 2) * Math.PI) / 180);
    const panel = spot !== home;
    const ox = panel && size.width >= 640 ? half * camera.aspect * (195 / (size.width / 2)) : 0;
    const oy = panel && size.width < 640 ? half * 0.42 : 0;
    void c.setFocalOffset(ox, oy, 0, !reduced);
    idle.current = 0;
  }, [spot, size.width, size.height, intro, reduced, camera, view, home]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c || reduced || spot !== home) return;
    idle.current += dt;
    if (idle.current > 5) c.rotate(dt * 0.035, 0, false);
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={0.15}
      maxPolarAngle={1.38}
      smoothTime={0.45}
      mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.DOLLY, right: CameraControlsImpl.ACTION.NONE, wheel: CameraControlsImpl.ACTION.DOLLY }}
      touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY, three: CameraControlsImpl.ACTION.NONE }}
      onControlStart={() => {
        idle.current = -4;
      }}
    />
  );
}
