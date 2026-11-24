/**
 * Idea District design tokens (from the 18-screens design).
 *
 * The one rule that carries the product: regular text is what the founder
 * DECLARED. Italic in Persimmon is what the system WORKED OUT. They never mix.
 * Ember marks the system speaking (signals, confidence, inferences) and is
 * never used decoratively.
 */

export const colors = {
  // Brand guidelines v01 (Nov 2026): Persimmon, Matte Black, Muted Dust, Dry Beige, Forest Green.
  surround: "#E2E3D0", // behind the app on wide screens, a shade under Dry Beige
  screen: "#EBECDC", // Dry Beige, the app surface
  cream: "#F7F7EF",
  card: "#FBFBF6",
  sand: "#E1E2CF", // secondary surfaces
  sand2: "#F3F3E8",
  ink: "#191919", // Matte Black, primary text
  ink2: "#4F4644", // Muted Dust, deepened for body text contrast
  ink3: "#6B5E5B", // Muted Dust, deepened to pass 4.5:1 on Dry Beige
  dust: "#7D6F6C", // Muted Dust as in the guidelines, for large text and shapes only
  rule: "#D3D4C0",
  rule2: "#DFE0CC",
  ember: "#FF6038", // Persimmon: the system speaking. Fills and marks; text on it is Matte Black
  emberDeep: "#B83A17", // Persimmon deepened for text on light backgrounds
  emberTint: "#FFE4DA",
  emberLight: "#FF8566", // Persimmon lifted for text on Forest Green or Matte Black
  espresso: "#003D38", // Forest Green: dark panels (the orbit map, "why we're asking")
  espresso2: "#0B4A44",
  good: "#003D38", // consistent pattern
  mid: "#8A5A12", // emerging pattern
} as const;

export const fonts = {
  ui: "Avenir Next", // brand typeface; Nunito Sans is the web fallback where Avenir Next is not installed
  display: "Grift", // brand display face; licensed font, falls back to the UI face until it is supplied
  inferred: "Avenir Next", // italic, in Persimmon: anything the system worked out
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
