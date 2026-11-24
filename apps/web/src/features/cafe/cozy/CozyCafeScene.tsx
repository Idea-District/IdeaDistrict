"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { CafeHome, CafeSpot, CafeTable } from "@idea-district/api-client";

import { countryside, hexCells, type Tile } from "@/features/district/cozy/board";
import { Clouds, Countryside } from "@/features/district/cozy/Countryside";
import { CozyLights, cozySky } from "@/features/district/cozy/CozyWorld";
import { Rig } from "@/features/district/scene/Rig";
import type { V3 } from "@/features/district/scene/layout";
import { api } from "@/lib/api";

import { focus } from "../shared";
import { isPlace, SceneContext, type Cam, type SceneState } from "../scene/context";
import { Effects } from "../scene/Effects";
import { Hud } from "../scene/Hud";
import { greeting, TIMES, timeOfDay, type TimeOfDay } from "../scene/palette";
import { CafeSound } from "../scene/sound";
import { SpotPanel } from "../scene/SpotPanel";
import { PLACES, type Place, type SpotId } from "../scene/spots";
import { COZY_TABLES, CozyCafe } from "./Interior";

const INTRO_KEY = "cozy-cafe-intro-seen";
const DOORS = { quick: "/quick-breaks", district: "/district/cozy" } as const;

/** The cafe sits on a little board of tiles: cobbles under it, a road out the front, countryside round about. */
function cafeBoard(): Tile[] {
  return hexCells(4).map((c) => {
    if (Math.abs(c.x) < 4.3 && Math.abs(c.z) < 3.4) return { ...c, kind: "plaza" as const };
    if (Math.abs(c.x) < 0.1 && c.z > 0) return { ...c, kind: "path" as const };
    return { ...c, kind: countryside(c.x + 3, c.z - 2, Math.max(2, c.d)) };
  });
}

/** Where the camera goes for each place: [position, target]. */
function cafeView(spot: SpotId, narrow: boolean): [V3, V3] {
  const back = (p: V3, t: V3, k: number): [V3, V3] => [[t[0] + (p[0] - t[0]) * k, t[1] + (p[1] - t[1]) * k, t[2] + (p[2] - t[2]) * k], t];
  const n = narrow ? 1.35 : 1;
  if (spot.startsWith("table-")) {
    const [x, z] = COZY_TABLES[Number(spot.slice(6))] ?? COZY_TABLES[0];
    return back([x + 0.4, 2.7, z + 2.9], [x, 0.7, z], n);
  }
  switch (spot) {
    case "counter":
      return back([-0.7, 2.8, 2.4], [-1.9, 1.1, -1.7], n);
    case "notice":
      return back([0.9, 2.5, 1.4], [-3.3, 1.4, 0.7], n);
    case "quick":
      return back([1.0, 2.8, 2.5], [2.3, 1.3, -2.3], n);
    case "district":
      return back([0.1, 2.8, 3.3], [3.5, 1.1, 1.45], n);
    case "tables":
      return back([1.6, 4.2, 4.4], [1.2, 0.6, 0], n);
    default:
      return narrow ? [[5.5, 11.5, 14], [0, 0.4, 0.3]] : [[5.2, 7.2, 9.4], [0.1, 0.6, -0.1]];
  }
}

const toVisit = (p: string): CafeSpot => (p.startsWith("table-") ? "tables" : (p as CafeSpot));

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
function seen() {
  try {
    return !!sessionStorage.getItem(INTRO_KEY);
  } catch {
    return true;
  }
}
function markSeen() {
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* private mode: the fly-in plays again */
  }
}

/** B1 · The District Cafe, as a cozy little cafe on a board of tiles you look down into. */
export default function CozyCafeScene({
  founderId,
  name,
  home,
  tables,
  fallback,
  onListView,
}: {
  founderId: string;
  name: string | null;
  home: CafeHome | null;
  tables: CafeTable[];
  fallback: ReactNode;
  onListView: () => void;
}) {
  const router = useRouter();
  const [webgl] = useState(hasWebGL);
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [intro] = useState(() => !seen());
  const [tod, setTod] = useState<TimeOfDay>(() => timeOfDay());
  const [spot, setSpot] = useState<SpotId>("room");
  const [hovered, setHovered] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [fx, setFx] = useState(true);
  const [dpr, setDpr] = useState(1.6);
  const [sound] = useState(() => new CafeSound());
  const sfx = useRef(sound);
  const dragged = useRef(false);
  const down = useRef<{ x: number; y: number } | null>(null);
  // The walking camera isn't used here; the shared parts only read these.
  const cam = useRef<Cam>({ goal: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, pose: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, shift: 0, lift: 0, panel: 0, ready: true });
  const keys = useRef(new Set<string>());
  const tiles = useMemo(() => cafeBoard(), []);

  useEffect(() => {
    if (intro) markSeen();
  }, [intro]);
  useEffect(() => () => sound.stop(), [sound]);

  const select = useCallback(
    (id: SpotId) => {
      setHovered(null);
      setSpot(id);
      if (isPlace(id)) {
        if (id === "counter") sfx.current.hiss();
        else sfx.current.clink();
        api.cafeVisit(founderId, toVisit(id)).catch(() => {});
      }
    },
    [founderId],
  );

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === "Escape") select("room");
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, [select]);

  const ctx = useMemo<SceneState>(
    () => ({ spot, hovered, setHovered, select, walkTo: () => {}, entering: null, cam, keys, dragged, reduced, tod, name, onWalk: () => {}, sfx }),
    [spot, hovered, select, reduced, tod, name],
  );

  if (!webgl) return <>{fallback}</>;

  function toggleSound() {
    if (soundOn) sound.stop();
    else {
      sound.start(false);
      window.setTimeout(() => sound.chime(), 120);
    }
    setSoundOn(!soundOn);
  }

  const bg = cozySky(tod);
  const evening = tod === "evening";
  const chip = (active: boolean) =>
    `flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold transition-colors ${focus} ${
      active ? "bg-ember text-ink" : "bg-ink/70 text-cream backdrop-blur-md hover:bg-ink"
    }`;

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{ background: bg, touchAction: "none" }}
      onPointerDown={(e) => {
        dragged.current = false;
        down.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        const d = down.current;
        if (d && Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 6) dragged.current = true;
      }}
      onPointerUp={() => (down.current = null)}
    >
      <SceneContext.Provider value={ctx}>
        <Canvas aria-hidden shadows dpr={[1, dpr]} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ fov: 45, near: 0.1, far: 200, position: [8, 12, 16] }} onPointerMissed={() => setHovered(null)}>
          <PerformanceMonitor
            onDecline={() => {
              setDpr(1);
              setFx(false);
            }}
          />
          <color attach="background" args={[bg]} />
          <fog attach="fog" args={[bg, 30, 75]} />
          <Rig spot={spot} intro={intro} reduced={reduced} view={cafeView} home={"room" as SpotId} minDistance={2} maxDistance={30} />
          <Suspense fallback={null}>
            <CozyLights tod={tod} />
            <Countryside tiles={tiles} evening={evening} />
            <CozyCafe brew={home ? home.brew : undefined} tables={tables} hereToday={home?.here_today ?? 0} whatsOn={home?.whats_on ?? []} evening={evening} />
            <Clouds evening={evening} reduced={reduced} />
          </Suspense>
          {fx ? <Effects tod={tod} /> : null}
        </Canvas>
      </SceneContext.Provider>

      <p className="sr-only" aria-live="polite">
        {isPlace(spot) ? `You went over to ${PLACES.find((p) => p.id === spot)?.name ?? "a table"}.` : "Inside the District Cafe."}
      </p>

      <Hud
        eyebrow="The District Cafe · Bengaluru"
        title={`${greeting(tod)}${name ? `, ${name}` : ""}`}
        sub={
          home && home.here_today > 0 ? (
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="cafe-live h-2 w-2 rounded-full bg-ember" />
              {home.here_today} {home.here_today === 1 ? "founder" : "founders"} dropped in today
            </span>
          ) : null
        }
        current="/cafe"
        tod={tod}
        hidden={isPlace(spot)}
        soundOn={soundOn}
        onTime={() => setTod(TIMES[(TIMES.indexOf(tod) + 1) % TIMES.length])}
        onSound={toggleSound}
        onList={onListView}
      />

      {spot === "room" && !hovered ? (
        <div className="cafe-hint pointer-events-none absolute inset-x-0 bottom-[84px] z-20 mx-auto w-fit max-w-[92vw] rounded-full bg-ink/80 px-4 py-2.5 text-center text-[13px] font-semibold text-cream shadow-lg backdrop-blur">
          Drag to turn · scroll or pinch to zoom · tap a <span aria-hidden className="mx-0.5 inline-block h-2.5 w-2.5 rotate-45 bg-ember align-middle" /> to visit
        </div>
      ) : null}

      {isPlace(spot) ? (
        <SpotPanel spot={spot as Place} home={home} tables={tables} onBack={() => select("room")} onEnter={(door) => router.push(DOORS[door])} onSelect={select} />
      ) : null}

      <nav aria-label="Places in the cafe" className="absolute inset-x-0 bottom-0 z-30 flex justify-start gap-2 overflow-x-auto px-3 pt-2 pb-[max(14px,env(safe-area-inset-bottom))] [scrollbar-width:none] md:justify-center">
        <button type="button" aria-pressed={spot === "room"} onClick={() => select("room")} className={chip(spot === "room")}>
          The whole cafe
        </button>
        {PLACES.map((p) => (
          <button key={p.id} type="button" aria-pressed={spot === p.id} onClick={() => select(p.id)} className={chip(spot === p.id || (p.id === "tables" && spot.startsWith("table-")))}>
            {p.hint}
          </button>
        ))}
      </nav>
    </div>
  );
}
