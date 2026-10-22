/**
 * Idea District design tokens (from the 18-screens design).
 *
 * The one rule that carries the product: regular sans text is what the founder
 * DECLARED. Serif italic in ember is what the system WORKED OUT. They never mix.
 * Ember marks the system speaking (signals, confidence, inferences) and is
 * never used decoratively.
 */

export const colors = {
  cream: "#F5F1EA", // app background
  card: "#FFFFFF",
  sand: "#EBE6DA", // secondary surfaces
  sand2: "#F7F3EA",
  ink: "#21150B", // espresso, primary text
  ink2: "#565B57",
  ink3: "#8E8579",
  rule: "#D5CDBA",
  rule2: "#E4DED1",
  ember: "#FE4202", // the system speaking
  emberDeep: "#9C3305", // observed text on light backgrounds
  emberTint: "#FDEDE5",
  espresso: "#21150B", // dark "why we're asking" panels
  espresso2: "#2D2117",
  good: "#3F6B4A", // high confidence
  mid: "#9A6212", // medium confidence
} as const;

export const fonts = {
  ui: "Archivo", // 700/800 for headings, letter-spacing ≈ -0.03em
  inferred: "Newsreader", // italic only, for anything the system worked out
} as const;

export const radii = { sm: 10, md: 12, lg: 16, xl: 26 } as const;

export type Confidence = "low" | "medium" | "high";

export const confidenceColor: Record<Confidence, string> = {
  high: colors.good,
  medium: colors.mid,
  low: colors.ink3,
};

export type ColorToken = keyof typeof colors;
