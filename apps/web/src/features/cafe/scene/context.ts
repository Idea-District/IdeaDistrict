import { createContext, useContext, type RefObject } from "react";

import type { TimeOfDay } from "./palette";
import type { CafeSound } from "./sound";
import type { Place, Pose, SpotId } from "./spots";

/** The camera's goal and live pose. `shift` turns the view so a place isn't hidden behind its panel. */
export type Cam = {
  goal: Pose;
  pose: Pose;
  shift: number;
  lift: number;
  /** 1 while a panel is open. */
  panel: number;
  /** Set on the first frame so the camera starts exactly at its goal. */
  ready: boolean;
};

export type SceneState = {
  spot: SpotId;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  select: (id: SpotId) => void;
  walkTo: (x: number, z: number) => void;
  /** Leaving through one of the doors. */
  entering: "quick" | "district" | null;
  cam: RefObject<Cam>;
  keys: RefObject<Set<string>>;
  /** True while the pointer has moved since it went down, so a drag never counts as a click. */
  dragged: RefObject<boolean>;
  reduced: boolean;
  tod: TimeOfDay;
  name: string | null;
  /** Called from the render loop when keyboard walking starts, to close any open panel. */
  onWalk: () => void;
  sfx: RefObject<CafeSound>;
};

export const SceneContext = createContext<SceneState | null>(null);

export function useScene() {
  const s = useContext(SceneContext);
  if (!s) throw new Error("useScene outside the Cafe scene");
  return s;
}

export function isPlace(s: SpotId): s is Place {
  return s !== "street" && s !== "room";
}
