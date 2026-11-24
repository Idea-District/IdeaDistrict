import { createContext, useContext } from "react";

import type { TimeOfDay } from "@/features/cafe/scene/palette";

import type { PSpot } from "./layout";

export type PeopleState = {
  spot: PSpot;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  select: (s: PSpot) => void;
  reduced: boolean;
  tod: TimeOfDay;
  dragged: { current: boolean };
};

export const PeopleContext = createContext<PeopleState | null>(null);

export function usePeople() {
  const s = useContext(PeopleContext);
  if (!s) throw new Error("usePeople outside the archipelago");
  return s;
}
