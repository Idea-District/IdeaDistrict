import { createContext, useContext } from "react";

import type { Audience, Room } from "@idea-district/api-client";

import type { TimeOfDay } from "@/features/cafe/scene/palette";

import type { DSpot } from "./layout";

export type DistrictState = {
  spot: DSpot;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  select: (s: DSpot) => void;
  /** Whose eyes you're looking through. */
  lens: Audience;
  visibility: Record<Room, Audience> | null;
  reduced: boolean;
  tod: TimeOfDay;
  dragged: { current: boolean };
};

export const DistrictContext = createContext<DistrictState | null>(null);

export function useDistrict() {
  const s = useContext(DistrictContext);
  if (!s) throw new Error("useDistrict outside the District scene");
  return s;
}
