"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";

import { useScene, type Cam } from "./context";
import type { CafeSound } from "./sound";
import { BOUNDS, EYE } from "./spots";

const tmp = new Vector3();
const WALK = 2.3; // metres per second
const TURN = 1.9; // radians per second

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Ctl = { keys: Set<string>; reduced: boolean; walkingKeys: () => void; sfx: CafeSound };

/** One frame: read the keys, glide towards the goal, bob the head a little, aim the camera. */
function step(camera: PerspectiveCamera, cam: Cam, ctl: Ctl, dt: number, t: number, width: number, bob: { phase: number; lastStep: number }) {
  const narrow = camera.aspect < 1;
  const fov = narrow ? 70 : 55;
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  const { goal, pose } = cam;

  // Keyboard walking: W/S or ↑/↓ forwards and back, A/D sideways, ←/→ turn.
  const k = ctl.keys;
  const fwd = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
  const side = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0);
  const turn = (k.has("arrowleft") ? 1 : 0) - (k.has("arrowright") ? 1 : 0);
  if (fwd || side || turn) {
    ctl.walkingKeys();
    goal.yaw += turn * TURN * dt;
    const sx = -Math.sin(goal.yaw);
    const sz = -Math.cos(goal.yaw);
    goal.x = clamp(goal.x + (sx * fwd - sz * side) * WALK * dt, BOUNDS.minX, BOUNDS.maxX);
    goal.z = clamp(goal.z + (sz * fwd + sx * side) * WALK * dt, BOUNDS.minZ, BOUNDS.maxZ);
    goal.y += (EYE - goal.y) * Math.min(1, dt * 3);
    goal.pitch += (-0.05 - goal.pitch) * Math.min(1, dt * 2);
  }

  if (!cam.ready) {
    Object.assign(pose, goal);
    cam.ready = true;
  }
  const kp = ctl.reduced ? 1 : 1 - Math.exp(-dt * 2.6);
  const ka = ctl.reduced ? 1 : 1 - Math.exp(-dt * 4.5);
  const px = pose.x;
  const pz = pose.z;
  pose.x += (goal.x - pose.x) * kp;
  pose.y += (goal.y - pose.y) * kp;
  pose.z += (goal.z - pose.z) * kp;
  pose.yaw += wrap(goal.yaw - pose.yaw) * ka;
  pose.pitch += (goal.pitch - pose.pitch) * ka;

  // Walking feels like walking: a gentle head bob and footsteps in time with it.
  const speed = Math.hypot(pose.x - px, pose.z - pz) / Math.max(dt, 1e-3);
  const walking = speed > 0.35 && pose.y < 2.2 && !ctl.reduced;
  bob.phase += walking ? dt * Math.min(speed, 2.5) * 4.2 : 0;
  const bobY = walking ? Math.sin(bob.phase * 2) * 0.03 : 0;
  if (walking && Math.floor(bob.phase / Math.PI) !== bob.lastStep) {
    bob.lastStep = Math.floor(bob.phase / Math.PI);
    if (pose.z < 4) ctl.sfx.step();
  }

  // With a panel open, turn so the place stays in the uncovered part of the screen.
  const half = Math.tan(((camera.fov / 2) * Math.PI) / 180);
  const sideways = width >= 640 ? Math.atan((190 / (width / 2)) * half * camera.aspect) : 0;
  const upwards = width < 640 ? Math.atan(0.22 * half) : 0;
  const ks = ctl.reduced ? 1 : 1 - Math.exp(-dt * 2.2);
  cam.shift += (-sideways * cam.panel - cam.shift) * ks;
  cam.lift += (-upwards * cam.panel - cam.lift) * ks;

  const yaw = pose.yaw + cam.shift;
  const pitch = clamp(pose.pitch + cam.lift, -1.2, 1.2);
  camera.position.set(pose.x, pose.y + bobY, pose.z);
  tmp.set(pose.x - Math.sin(yaw) * Math.cos(pitch), pose.y + bobY + Math.sin(pitch), pose.z - Math.cos(yaw) * Math.cos(pitch));
  camera.lookAt(tmp);
  // A breath of sway when standing still, so the room never feels frozen.
  if (!ctl.reduced && !walking) camera.rotation.z += Math.sin(t * 0.6) * 0.0015;
}

/** Walks the camera like a person: glides to places, follows keys and floor taps. */
export function CameraRig() {
  const { cam, keys, reduced, onWalk, sfx } = useScene();
  const bob = useRef({ phase: 0, lastStep: 0 });
  useFrame((state, dt) =>
    step(state.camera as PerspectiveCamera, cam.current, { keys: keys.current, reduced, walkingKeys: onWalk, sfx: sfx.current }, Math.min(dt, 0.05), state.clock.elapsedTime, state.size.width, bob.current),
  );
  return null;
}
