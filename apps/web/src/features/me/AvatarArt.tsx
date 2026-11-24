import { useId } from "react";

import type { AvatarChoice } from "@idea-district/api-client";

import { initials } from "@/lib/format";

/* Brand palette, as hex because SVG fills need real colours. */
const INK = "#191919";
const CREAM = "#F7F7EF";
const CARD = "#FBFBF6";
const RULE = "#D3D4C0";
const BEIGE = "#EBECDC";
const FOREST = "#003D38";
const FACE = "#FFE4DA"; // Persimmon tint

export const COLOUR_HEX: Record<AvatarChoice["colour"], string> = {
  persimmon: "#FF6038",
  forest: FOREST,
  dust: "#7D6F6C",
  beige: BEIGE,
};

export const AVATAR_WORDS = {
  role: { builder: "Builder", operator: "Operator", seller: "Seller", researcher: "Researcher" },
  personality: { calm: "Calm", bold: "Bold", curious: "Curious" },
  style: { line: "Line", flat: "Flat", paper: "Paper" },
  colour: { persimmon: "Persimmon", forest: "Forest Green", dust: "Muted Dust", beige: "Dry Beige" },
} as const;

export function describeAvatar(c: AvatarChoice) {
  const w = AVATAR_WORDS;
  return `Avatar: ${w.role[c.role].toLowerCase()}, ${w.personality[c.personality].toLowerCase()}, ${w.style[c.style].toLowerCase()} style, ${w.colour[c.colour]}`;
}

const BODY = "M12 104 C12 80 30 71 50 71 C70 71 88 80 88 104 Z";
const HAIR = "M32 44 C31 27 41 21 50 21 C61 21 69 27 68 44 C64 35 57 31 50 31 C43 31 36 35 32 44 Z";

/** A 2D illustrated portrait built from the founder's choices. Never a photo. */
export function AvatarArt({ choice, size = 96, label }: { choice: AvatarChoice; size?: number; label?: string }) {
  const clip = useId();
  const line = choice.style === "line";
  const main = COLOUR_HEX[choice.colour];
  const light = choice.colour === "beige";

  const backdrop = line ? CARD : light ? FOREST : BEIGE;
  const bodyFill = line ? "none" : main;
  const bodyStroke = line ? (light ? INK : main) : INK;
  const faceFill = line ? "none" : FACE;
  const hairFill = line ? "none" : INK;
  const detail = line || light ? INK : CREAM;
  const sw = line ? 2.2 : 1.4;
  const stroke = { stroke: INK, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" } as const;

  return (
    <svg role="img" aria-label={label ?? describeAvatar(choice)} width={size} height={size} viewBox="0 0 100 100" className="shrink-0">
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r={line ? 49 : 50} fill={backdrop} stroke={line ? RULE : "none"} strokeWidth={line ? 2 : 0} />
      <g clipPath={`url(#${clip})`}>
        {choice.style === "paper" ? (
          <g transform="translate(4 4)" fill={INK} opacity="0.22">
            <path d={BODY} />
            <rect x="43" y="56" width="14" height="18" />
            <ellipse cx="50" cy="44" rx="18" ry="20" />
          </g>
        ) : null}

        {/* Shoulders and neck */}
        <path d={BODY} fill={bodyFill} stroke={bodyStroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M43 56 V72 C46 75 54 75 57 72 V56" fill={faceFill} {...stroke} />

        {/* Role */}
        {choice.role === "builder" ? (
          <g fill={line ? "none" : CREAM} {...stroke}>
            <path d="M43 70 L50 80 L40 84 L37 74 Z" />
            <path d="M57 70 L50 80 L60 84 L63 74 Z" />
          </g>
        ) : null}
        {choice.role === "seller" ? (
          <g strokeLinecap="round" strokeLinejoin="round">
            <path d="M44 73 L50 90 L56 73 Z" fill={line ? "none" : CREAM} stroke={INK} strokeWidth={sw} />
            <path d="M50 90 L48 104 M50 90 L52 104" stroke={line ? INK : COLOUR_HEX.persimmon === main ? FOREST : COLOUR_HEX.persimmon} strokeWidth={3} />
            <path d="M42 72 L36 86 L44 88 L50 92" fill="none" stroke={detail} strokeWidth={2} />
            <path d="M58 72 L64 86 L56 88 L50 92" fill="none" stroke={detail} strokeWidth={2} />
          </g>
        ) : null}
        {choice.role === "operator" ? <path d="M36 82 C40 88 44 90 50 90 C56 90 60 88 64 82" fill="none" stroke={detail} strokeWidth={2} strokeLinecap="round" /> : null}
        {choice.role === "researcher" ? <path d="M40 74 V100 M60 74 V100" fill="none" stroke={detail} strokeWidth={2} strokeLinecap="round" /> : null}

        {/* Head and hair */}
        <ellipse cx="50" cy="44" rx="18" ry="20" fill={faceFill} {...stroke} />
        <path d={HAIR} fill={hairFill} {...stroke} />

        {/* Eyes */}
        <circle cx="43.5" cy="45" r="1.9" fill={INK} />
        <circle cx="56.5" cy="45" r="1.9" fill={INK} />

        {/* Personality: brows and mouth */}
        {choice.personality === "calm" ? (
          <g fill="none" {...stroke} strokeWidth={1.8}>
            <path d="M40 40 H47 M53 40 H60" />
            <path d="M45 54 C47.5 56.5 52.5 56.5 55 54" />
          </g>
        ) : null}
        {choice.personality === "bold" ? (
          <g {...stroke} strokeWidth={2.2}>
            <path d="M39.5 38.5 L47.5 41 M60.5 38.5 L52.5 41" fill="none" />
            <path d="M43 52.5 H57 C56 58.5 44 58.5 43 52.5 Z" fill={line ? "none" : INK} strokeWidth={1.8} />
          </g>
        ) : null}
        {choice.personality === "curious" ? (
          <g fill="none" {...stroke} strokeWidth={1.8}>
            <path d="M40 40.5 H47 M53 39 C55 36.5 58 36.5 60.5 38" />
            <ellipse cx="51" cy="55" rx="2.4" ry="2.8" />
          </g>
        ) : null}

        {/* Role details on the head */}
        {choice.role === "researcher" ? (
          <g fill="none" stroke={INK} strokeWidth={1.8}>
            <circle cx="43.5" cy="45" r="5" />
            <circle cx="56.5" cy="45" r="5" />
            <path d="M48.5 45 H51.5 M38.5 44 L32.5 42 M61.5 44 L67.5 42" />
          </g>
        ) : null}
        {choice.role === "operator" ? (
          <g fill="none" strokeLinecap="round">
            <path d="M30 46 C29 25 40 18 50 18 C60 18 71 25 70 46" stroke={INK} strokeWidth={3} />
            <rect x="27" y="42" width="6" height="11" rx="3" fill={line ? "none" : main === BEIGE ? FOREST : main} stroke={INK} strokeWidth={1.6} />
            <rect x="67" y="42" width="6" height="11" rx="3" fill={line ? "none" : main === BEIGE ? FOREST : main} stroke={INK} strokeWidth={1.6} />
            <path d="M30 52 C31 58 36 60 42 59" stroke={INK} strokeWidth={1.8} />
          </g>
        ) : null}
      </g>
    </svg>
  );
}

const INITIAL_COLOURS = ["bg-ember text-ink", "bg-espresso text-cream", "bg-dust text-cream"];

/** The avatar when the founder has made one; otherwise a coloured initial. */
export function AvatarOrInitial({
  name,
  avatar,
  size = 48,
  label,
}: {
  name: string;
  avatar: AvatarChoice | null | undefined;
  size?: number;
  label?: string;
}) {
  if (avatar) return <AvatarArt choice={avatar} size={size} label={label ?? `${name}'s avatar`} />;
  const n = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${INITIAL_COLOURS[n % INITIAL_COLOURS.length]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials(name) || "?"}
    </span>
  );
}
