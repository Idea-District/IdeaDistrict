import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

import { C, type TimeOfDay } from "./palette";

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, font: string) => void;

/** Text and patterns are drawn on a 2D canvas so they use the app's own fonts, offline. */
export function canvasTexture(w: number, h: number, draw: Draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  draw(ctx, w, h, font);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[\s,.;:]+\S*$/, "")}…`;
    return kept;
  }
  return lines;
}

/** Tiny deterministic random so the skyline and floor look the same on every visit. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function floorTexture() {
  const t = canvasTexture(512, 512, (ctx, w, h) => {
    const rnd = seeded(7);
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 200;
      while (x < w) {
        const len = 180 + rnd() * 160;
        const shade = 0.86 + rnd() * 0.14;
        ctx.fillStyle = `rgb(${Math.round(180 * shade)},${Math.round(138 * shade)},${Math.round(102 * shade)})`;
        ctx.fillRect(x, (r * h) / rows, len, h / rows);
        ctx.fillStyle = "rgba(60,40,25,0.35)";
        ctx.fillRect(x, (r * h) / rows, 2, h / rows);
        x += len;
      }
      ctx.fillStyle = "rgba(60,40,25,0.4)";
      ctx.fillRect(0, (r * h) / rows, w, 2);
    }
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

const SKY: Record<TimeOfDay, [string, string, string]> = {
  // top, horizon, building
  morning: ["#f6d9b8", "#fbefdc", "#4f4644"],
  afternoon: ["#cfe3e0", "#f4f1e2", "#4f4644"],
  evening: [C.forest, "#24524b", C.ink],
};

/** Bengaluru out of the window: a skyline silhouette, lit windows after dark. */
export function windowTexture(tod: TimeOfDay) {
  return canvasTexture(768, 512, (ctx, w, h) => {
    const [top, horizon, building] = SKY[tod];
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(1, horizon);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Sun or moon
    ctx.fillStyle = tod === "evening" ? "#f3f3e8" : C.emberLight;
    ctx.globalAlpha = tod === "evening" ? 0.9 : 0.8;
    ctx.beginPath();
    ctx.arc(w * 0.74, h * (tod === "morning" ? 0.38 : 0.24), 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const rnd = seeded(23);
    let x = -10;
    while (x < w) {
      const bw = 40 + rnd() * 70;
      const bh = h * (0.25 + rnd() * 0.45);
      ctx.fillStyle = building;
      ctx.globalAlpha = 0.55 + rnd() * 0.35;
      ctx.fillRect(x, h - bh, bw, bh);
      ctx.globalAlpha = 1;
      if (tod === "evening") {
        for (let wy = h - bh + 12; wy < h - 10; wy += 22)
          for (let wx = x + 8; wx < x + bw - 10; wx += 16)
            if (rnd() > 0.62) {
              ctx.fillStyle = rnd() > 0.8 ? C.emberLight : "#f3e6c4";
              ctx.fillRect(wx, wy, 6, 9);
            }
      }
      x += bw + 4;
    }
    // Trees along the street: Bengaluru is the garden city.
    ctx.fillStyle = tod === "evening" ? "#0f2b27" : C.forest2;
    for (let i = 0; i < 9; i++) {
      const tx = 30 + i * 90 + rnd() * 30;
      ctx.beginPath();
      ctx.arc(tx, h - 18, 30 + rnd() * 16, Math.PI, 0);
      ctx.fill();
    }
  });
}

export function chalkboardTexture(question: string | null, answered: number | null) {
  return canvasTexture(1024, 512, (ctx, w, h, font) => {
    ctx.fillStyle = "#1f2321";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = C.emberLight;
    ctx.font = `700 34px ${font}`;
    ctx.letterSpacing = "6px";
    ctx.fillText("TODAY'S DAILY BREW", 56, 82);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#f3f3e8";
    ctx.font = `600 50px ${font}`;
    const lines = wrap(ctx, question ?? "No question today. A new one tomorrow.", w - 112, 4);
    lines.forEach((l, i) => ctx.fillText(l, 56, 160 + i * 64));
    if (answered !== null) {
      ctx.fillStyle = "rgba(243,243,232,0.7)";
      ctx.font = `500 30px ${font}`;
      ctx.fillText(`${answered} ${answered === 1 ? "founder has" : "founders have"} answered`, 56, h - 50);
    }
  });
}

/** A flat sign: text centred on a colour, optional glow for the neon ones. */
export function signTexture(
  text: string,
  opts: { bg: string; fg: string; sub?: string; glow?: boolean; w?: number; h?: number; pixels?: boolean },
) {
  const w = opts.w ?? 1024;
  const h = opts.h ?? 256;
  return canvasTexture(w, h, (ctx, cw, ch, font) => {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, cw, ch);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (opts.glow) {
      ctx.shadowColor = opts.fg;
      ctx.shadowBlur = 28;
    }
    ctx.fillStyle = opts.fg;
    ctx.font = `800 ${Math.round(ch * 0.34)}px ${font}`;
    ctx.letterSpacing = `${Math.round(ch * 0.04)}px`;
    ctx.fillText(text, cw / 2, opts.sub ? ch * 0.42 : ch / 2);
    ctx.shadowBlur = 0;
    if (opts.sub) {
      ctx.font = `600 ${Math.round(ch * 0.15)}px ${font}`;
      ctx.letterSpacing = "2px";
      ctx.globalAlpha = 0.8;
      ctx.fillText(opts.sub, cw / 2, ch * 0.76);
      ctx.globalAlpha = 1;
    }
    if (opts.pixels) {
      // The brand's pixel-block motif.
      ctx.fillStyle = C.ember;
      ctx.fillRect(cw - 70, 26, 26, 26);
      ctx.fillRect(cw - 104, 60, 16, 16);
      ctx.fillRect(40, ch - 52, 16, 16);
    }
  });
}

/** The little folded card on a table, with its topic. */
export function tableTentTexture(title: string, status: string, live: boolean) {
  return canvasTexture(512, 320, (ctx, w, h, font) => {
    ctx.fillStyle = C.cream;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = live ? C.ember : C.dust;
    ctx.fillRect(0, 0, w, 14);
    ctx.fillStyle = live ? C.emberDeep : C.ink2;
    ctx.font = `700 26px ${font}`;
    ctx.fillText(status.toUpperCase(), 28, 62);
    ctx.fillStyle = C.ink;
    ctx.font = `700 40px ${font}`;
    wrap(ctx, title, w - 56, 4).forEach((l, i) => ctx.fillText(l, 28, 120 + i * 48));
  });
}

export function noticeTexture(items: { label: string; title: string }[]) {
  return canvasTexture(1024, 640, (ctx, w, h, font) => {
    ctx.fillStyle = "#c9b79c"; // cork
    ctx.fillRect(0, 0, w, h);
    const rnd = seeded(11);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rnd() > 0.5 ? "rgba(120,90,60,0.18)" : "rgba(255,255,255,0.12)";
      ctx.fillRect(rnd() * w, rnd() * h, 3, 3);
    }
    ctx.fillStyle = C.ink;
    ctx.font = `800 40px ${font}`;
    ctx.letterSpacing = "6px";
    ctx.fillText("WHAT'S ON", 48, 72);
    ctx.letterSpacing = "0px";
    if (items.length === 0) {
      ctx.fillStyle = C.cream;
      ctx.fillRect(48, 120, 420, 180);
      ctx.fillStyle = C.ink2;
      ctx.font = `600 34px ${font}`;
      wrap(ctx, "Nothing pinned this week.", 360, 3).forEach((l, i) => ctx.fillText(l, 76, 190 + i * 44));
      return;
    }
    items.slice(0, 3).forEach((it, i) => {
      const x = 48 + i * 318;
      const y = 120 + (i % 2) * 40;
      ctx.save();
      ctx.translate(x + 140, y + 200);
      ctx.rotate((i - 1) * 0.035);
      ctx.fillStyle = C.cream;
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 12;
      ctx.fillRect(-140, -200, 280, 380);
      ctx.shadowBlur = 0;
      ctx.fillStyle = C.ember;
      ctx.beginPath();
      ctx.arc(0, -180, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.emberDeep;
      ctx.font = `700 24px ${font}`;
      ctx.fillText(it.label.toUpperCase(), -116, -128);
      ctx.fillStyle = C.ink;
      ctx.font = `700 34px ${font}`;
      wrap(ctx, it.title, 232, 6).forEach((l, j) => ctx.fillText(l, -116, -78 + j * 42));
      ctx.restore();
    });
  });
}

/** Streaks of rain, tiled and scrolled down the window glass. */
export function rainTexture() {
  const t = canvasTexture(256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const rnd = seeded(5);
    ctx.lineCap = "round";
    for (let i = 0; i < 90; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const len = 14 + rnd() * 30;
      ctx.strokeStyle = `rgba(220,235,240,${0.25 + rnd() * 0.45})`;
      ctx.lineWidth = 1 + rnd() * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + len);
      ctx.stroke();
    }
    // A few drops resting on the glass.
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(230,240,245,${0.3 + rnd() * 0.4})`;
      ctx.beginPath();
      ctx.arc(rnd() * w, rnd() * h, 1.5 + rnd() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** A soft vertical fade, for the beam of light from the window. */
export function beamTexture() {
  return canvasTexture(64, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(255,240,210,0.9)");
    g.addColorStop(1, "rgba(255,240,210,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const s = ctx.createLinearGradient(0, 0, w, 0);
    s.addColorStop(0, "rgba(0,0,0,1)");
    s.addColorStop(0.2, "rgba(0,0,0,0)");
    s.addColorStop(0.8, "rgba(0,0,0,0)");
    s.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, w, h);
  });
}
