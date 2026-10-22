/**
 * Idea District design tokens (from the 18-screens design).
 *
 * The one rule that carries the product: regular sans text is what the founder
 * DECLARED. Serif italic in ember is what the system WORKED OUT. They never mix.
 * Ember marks the system speaking (signals, confidence, inferences) and is
 * never used decoratively.
 */

export const colors = {
  surround: "#D5CDBA", // behind the app (prototype v0.2); softer on the eyes than a near-white page
  screen: "#F7F3EA", // the app surface
  cream: "#F5F1EA",
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

/**
 * Logo 01 from the brand book: a solid block with the I and the D knocked out,
 * so the D reads as a doorway. Fill it with `colors.ember`; the knock-outs are holes.
 */
export const brandMark = {
  viewBox: "0 0 391.74 286.14",
  aspectRatio: 391.74 / 286.14,
  path:
    "M0,0 H391.74 V286.14 H0 Z M37.68,29.5 H109.06 V256.64 H37.68 Z " +
    "M235.62,256.64 H141.52 V29.5 H235.62 C306.68,29.5 354.06,72 354.06,143.07 " +
    "C354.06,214.13 306.68,256.64 235.62,256.64 Z",
} as const;
