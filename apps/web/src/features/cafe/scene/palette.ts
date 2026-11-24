/** Brand guidelines v01, as hex for the 3D scene (CSS variables don't reach WebGL). */
export const C = {
  beige: "#ebecdc", // Dry Beige
  cream: "#f7f7ef",
  sand: "#e1e2cf",
  ink: "#191919", // Matte Black
  ink2: "#4f4644",
  dust: "#7d6f6c", // Muted Dust
  ember: "#ff6038", // Persimmon: the system pointing something out
  emberDeep: "#b83a17",
  emberLight: "#ff8566",
  forest: "#003d38", // Forest Green
  forest2: "#0b4a44",
  // Natural materials, kept muted so the brand colours lead.
  wood: "#b48a66",
  woodDark: "#7a5a40",
  bulb: "#ffd9b0",
} as const;

export type TimeOfDay = "morning" | "afternoon" | "evening";

export function timeOfDay(d = new Date()): TimeOfDay {
  const h = d.getHours();
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  return "evening";
}

export function greeting(t: TimeOfDay) {
  return t === "morning" ? "Good morning" : t === "afternoon" ? "Good afternoon" : "Good evening";
}

/** How the room is lit at each time of day. The window leads by day, the lamps after dark. */
export const LIGHT: Record<
  TimeOfDay,
  { bg: string; sky: string; ground: string; hemi: number; sun: [number, number, number]; sunColor: string; sunI: number; fill: number; lamp: number; beam: number }
> = {
  morning: { bg: "#f2e2cb", sky: "#fff1dc", ground: C.woodDark, hemi: 0.55, sun: [2.5, 5, -9], sunColor: "#ffc88a", sunI: 1.7, fill: 3, lamp: 4, beam: 0.28 },
  afternoon: { bg: "#dde8e3", sky: "#f6f8f0", ground: C.woodDark, hemi: 0.65, sun: [-1, 8, -6], sunColor: "#fff3dc", sunI: 1.4, fill: 3.5, lamp: 4, beam: 0.18 },
  evening: { bg: "#0d1d1a", sky: "#7f9893", ground: "#2a1d14", hemi: 0.32, sun: [-2, 6, -7], sunColor: "#b9c8ff", sunI: 0.25, fill: 8, lamp: 8, beam: 0 },
};

export const TIMES: TimeOfDay[] = ["morning", "afternoon", "evening"];
