"use client";

import { useEffect, useRef, type RefObject } from "react";

import type { CafeTable } from "@idea-district/api-client";

import type { Cam } from "./context";
import { tablesInRoom } from "./Tables";
import { TABLES, type SpotId } from "./spots";

/**
 * A plan of the cafe seen from above. Your marker follows the camera (updated outside React,
 * every frame), and every place on it can be clicked.
 */
export function Minimap({ cam, tables, spot, onSelect }: { cam: RefObject<Cam>; tables: CafeTable[]; spot: SpotId; onSelect: (s: SpotId) => void }) {
  const you = useRef<SVGGElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = cam.current.pose;
      you.current?.setAttribute("transform", `translate(${p.x.toFixed(2)} ${Math.min(p.z, 4.6).toFixed(2)}) rotate(${((-p.yaw * 180) / Math.PI).toFixed(1)})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cam]);

  const shown = tablesInRoom(tables);
  const hit = "cursor-pointer transition-opacity hover:opacity-80";
  const on = (s: SpotId) => (spot === s ? 1 : 0);

  return (
    <div aria-hidden className="pointer-events-auto rounded-[16px] bg-ink/75 p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur">
      <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cream/70">You are here</p>
      <svg viewBox="-6.4 -6.4 12.8 11.4" width={150} height={134} className="block">
        <rect x={-6} y={-6} width={12} height={10} rx={0.3} fill="#2a2622" stroke="#f7f7ef" strokeOpacity={0.35} strokeWidth={0.08} />
        {/* Front door gap */}
        <rect x={-0.75} y={3.9} width={1.5} height={0.25} fill="#2a2622" />
        {/* Counter */}
        <g className={hit} onClick={() => onSelect("counter")}>
          <rect x={-5.2} y={-5.15} width={4} height={0.9} rx={0.12} fill="#003d38" stroke="#ff8566" strokeWidth={on("counter") * 0.12} />
          <text x={-3.2} y={-4.55} fontSize={0.5} fontWeight={700} textAnchor="middle" fill="#f7f7ef">
            BREW
          </text>
        </g>
        {/* Window */}
        <rect x={-0.8} y={-6.05} width={2.4} height={0.12} fill="#9fc7c0" />
        {/* Tables */}
        {TABLES.map(([x, z], i) => {
          const t = shown[i];
          const open = t?.status === "open";
          return (
            <g key={i} className={t ? hit : undefined} onClick={t ? () => onSelect(`table-${i}`) : undefined}>
              <circle cx={x} cy={z} r={0.72} fill={open ? "#ffd9b0" : "#7d6f6c"} stroke="#ff8566" strokeWidth={on(`table-${i}`) * 0.14} />
              {open ? <circle cx={x} cy={z} r={1.1} fill="#ffd9b0" opacity={0.15} /> : null}
            </g>
          );
        })}
        {/* Noticeboard */}
        <g className={hit} onClick={() => onSelect("notice")}>
          <rect x={-6.05} y={-0.95} width={0.3} height={2.5} fill="#c9b79c" stroke="#ff8566" strokeWidth={on("notice") * 0.12} />
        </g>
        {/* Quick Breaks door */}
        <g className={hit} onClick={() => onSelect("quick")}>
          <rect x={3.15} y={-6.15} width={1.5} height={0.35} fill="#ff6038" />
          <text x={3.9} y={-6.35} fontSize={0.42} fontWeight={700} textAnchor="middle" fill="#ff8566">
            QUICK BREAKS
          </text>
        </g>
        {/* District door */}
        <g className={hit} onClick={() => onSelect("district")}>
          <rect x={5.8} y={2.05} width={0.35} height={1.3} fill="#0b4a44" stroke="#f7f7ef" strokeWidth={0.06} />
        </g>
        {/* You: a dot with a cone for where you're looking */}
        <g ref={you}>
          <path d="M0 0 L-1.1 -2.2 A2.4 2.4 0 0 1 1.1 -2.2 Z" fill="#ff6038" opacity={0.28} />
          <circle r={0.34} fill="#ff6038" stroke="#191919" strokeWidth={0.08} />
        </g>
      </svg>
    </div>
  );
}
