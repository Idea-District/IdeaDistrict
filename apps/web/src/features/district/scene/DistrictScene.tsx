"use client";

import { CameraControls, CameraControlsImpl, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PerspectiveCamera } from "three";

import type { Audience, DistrictOverview, FounderID, Room } from "@idea-district/api-client";

import { Effects } from "@/features/cafe/scene/Effects";
import { Hud } from "@/features/cafe/scene/Hud";
import { TIMES, timeOfDay, type TimeOfDay } from "@/features/cafe/scene/palette";
import { focus } from "@/features/cafe/shared";
import { preloadWorld } from "@/features/world/assets";
import { WorldLoading } from "@/features/world/Loading";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

import { Buildings, ROOM_LABEL } from "./Buildings";
import { DistrictContext, type DistrictState } from "./context";
import { DistrictPanel } from "./DistrictPanel";
import { Fog } from "./Fog";
import { Island, skyColor } from "./Island";
import { LENS_LABEL, view, type DSpot } from "./layout";
import { Monument } from "./Monument";

const INTRO_KEY = "district-intro-seen";

preloadWorld(["streetLamp", "bench", "fern", "lantern"]);
const ROOMS: Room[] = ["journey", "business", "needs", "progress", "capabilities"];

function storageGet(k: string) {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function storageSet(k: string) {
  try {
    sessionStorage.setItem(k, "1");
  } catch {
    /* private mode: the fly-in just plays again */
  }
}
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Flies the camera to each place, keeps it beside its panel, and drifts slowly round when idle. */
function Rig({ spot, intro, reduced }: { spot: DSpot; intro: boolean; reduced: boolean }) {
  const controls = useRef<CameraControlsImpl>(null);
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const idle = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const narrow = size.width < size.height;
    const [p, t] = view(spot, narrow);
    if (first.current) {
      first.current = false;
      if (intro && !reduced) {
        // Arriving: from high above the water, swoop down onto your District.
        c.setLookAt(p[0] + 26, p[1] + 30, p[2] + 30, t[0], t[1], t[2], false);
        c.smoothTime = 1.1;
        void c.setLookAt(...p, ...t, true).then(() => {
          c.smoothTime = 0.45;
        });
      } else {
        c.setLookAt(...p, ...t, false);
      }
    } else {
      void c.setLookAt(...p, ...t, !reduced);
    }
    // A panel covers part of the screen: shift the view so the place sits in what's left.
    const dist = Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2]);
    const half = dist * Math.tan(((camera.fov / 2) * Math.PI) / 180);
    const panel = spot !== "overview";
    const ox = panel && size.width >= 640 ? half * camera.aspect * (195 / (size.width / 2)) : 0;
    const oy = panel && size.width < 640 ? half * 0.42 : 0;
    void c.setFocalOffset(ox, oy, 0, !reduced);
    idle.current = 0;
  }, [spot, size.width, size.height, intro, reduced, camera]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c || reduced || spot !== "overview") return;
    idle.current += dt;
    if (idle.current > 5) c.rotate(dt * 0.035, 0, false);
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={4}
      maxDistance={40}
      minPolarAngle={0.15}
      maxPolarAngle={1.38}
      smoothTime={0.45}
      mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.DOLLY, right: CameraControlsImpl.ACTION.NONE, wheel: CameraControlsImpl.ACTION.DOLLY }}
      touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY, three: CameraControlsImpl.ACTION.NONE }}
      onControlStart={() => {
        idle.current = -4;
      }}
    />
  );
}

/** C1 · My District as a small island you look down on and fly around. Browser only (see DistrictHome). */
export default function DistrictScene({
  founderId,
  id,
  overview,
  setOverview,
  fallback,
  onListView,
}: {
  founderId: string;
  id: FounderID;
  overview: DistrictOverview | null;
  setOverview: (d: DistrictOverview) => void;
  fallback: ReactNode;
  onListView: () => void;
}) {
  const [webgl] = useState(hasWebGL);
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [intro] = useState(() => !storageGet(INTRO_KEY));
  const [tod, setTod] = useState<TimeOfDay>(() => timeOfDay());
  const [spot, setSpot] = useState<DSpot>("overview");
  const [hovered, setHovered] = useState<string | null>(null);
  const [lens, setLens] = useState<Audience>("private");
  const [saving, setSaving] = useState<Room | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [fx, setFx] = useState(true);
  const [dpr, setDpr] = useState(1.6);
  const dragged = useRef(false);
  const down = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (intro) storageSet(INTRO_KEY);
  }, [intro]);

  const select = useCallback(
    (s: DSpot) => {
      setHovered(null);
      setSpot(s);
      if (s !== "overview") api.districtVisit(founderId, s).catch(() => {});
    },
    [founderId],
  );

  // Esc flies back out to the whole District.
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSpot("overview");
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, []);

  /** Change who can see a room. The hedge grows or shrinks as soon as you choose. */
  async function changeAudience(room: Room, a: Audience) {
    if (!overview || overview.visibility[room] === a) return;
    const before = overview;
    setOverview({ ...overview, visibility: { ...overview.visibility, [room]: a } });
    setSaving(room);
    setProblem(null);
    try {
      const v = await api.setRoomVisibility(founderId, room, a);
      setOverview({ ...before, visibility: v.rooms });
    } catch (e) {
      setOverview(before);
      setProblem(`Couldn't change who sees ${ROOM_LABEL[room]}. ${errorMessage(e)}`);
    } finally {
      setSaving(null);
    }
  }

  function chooseLens(l: Audience) {
    setLens(l);
    if (l !== "private") api.districtVisit(founderId, "lens").catch(() => {});
  }

  const ctx = useMemo<DistrictState>(
    () => ({ spot, hovered, setHovered, select, lens, visibility: overview?.visibility ?? null, reduced, tod, dragged }),
    [spot, hovered, select, lens, overview, reduced, tod],
  );

  if (!webgl) return <>{fallback}</>;

  const open = id.gaps.filter((g) => g.status !== "closed").length;
  const bg = skyColor(tod);
  const hiddenCount = overview ? ROOMS.filter((r) => {
    const a = overview.visibility[r];
    return lens === "connections" ? a === "private" : lens === "community" ? a !== "community" : false;
  }).length : 0;
  const chip = (active: boolean) =>
    `flex min-h-[42px] shrink-0 items-center rounded-full px-4 text-[13.5px] font-bold transition-colors ${focus} ${
      active ? "bg-ember text-ink" : "bg-ink/70 text-cream backdrop-blur-md hover:bg-ink"
    }`;
  const places: { id: DSpot; label: string }[] = [
    { id: "overview", label: "Whole District" },
    { id: "id", label: "Your ID" },
    ...ROOMS.map((r) => ({ id: r as DSpot, label: ROOM_LABEL[r] })),
    ...(open > 0 ? [{ id: "unknowns" as DSpot, label: "Unknowns" }] : []),
  ];

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
      <DistrictContext.Provider value={ctx}>
        <Canvas aria-hidden shadows dpr={[1, dpr]} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ fov: 45, near: 0.1, far: 200, position: [0, 30, 40] }} onPointerMissed={() => setHovered(null)}>
          <PerformanceMonitor
            onDecline={() => {
              setDpr(1);
              setFx(false);
            }}
          />
          <color attach="background" args={[bg]} />
          <fog attach="fog" args={[bg, 45, 110]} />
          <Rig spot={spot} intro={intro} reduced={reduced} />
          <Suspense fallback={null}>
            <Island tod={tod} />
            <Monument data={id} />
            <Buildings overview={overview} evening={tod === "evening"} />
            <Fog open={open} />
          </Suspense>
          {fx ? <Effects tod={tod} /> : null}
        </Canvas>
        <WorldLoading label="Landing on your island" />
      </DistrictContext.Provider>

      <p className="sr-only" aria-live="polite">
        {spot === "overview" ? `Your District, seen as ${LENS_LABEL[lens].toLowerCase()}.` : `Flew to ${spot === "id" ? "your ID" : spot === "unknowns" ? "what we don't know yet" : ROOM_LABEL[spot]}.`}
      </p>

      <Hud
        eyebrow="Your private space"
        title={`${id.founder.name}'s District`}
        sub={<span className="inferred line-clamp-2 max-w-[56ch] !text-cream/90">{id.headline}</span>}
        current="/district"
        tod={tod}
        hidden={spot !== "overview"}
        onTime={() => setTod(TIMES[(TIMES.indexOf(tod) + 1) % TIMES.length])}
        onList={onListView}
      />

      {/* See it through someone else's eyes */}
      <div className={`absolute inset-x-0 bottom-[66px] z-20 flex justify-center px-3 sm:top-[124px] sm:bottom-auto ${spot !== "overview" ? "hidden sm:flex" : ""}`}>
        <div role="group" aria-label="See your District as" className="flex items-center gap-1 rounded-full bg-ink/75 p-1 pl-3 text-cream shadow-lg backdrop-blur-md">
          <span className="mr-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-cream/70">
            <span className="sm:hidden">As</span>
            <span className="hidden sm:inline">See it as</span>
          </span>
          {(["private", "connections", "community"] as Audience[]).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lens === l}
              onClick={() => chooseLens(l)}
              className={`min-h-[36px] whitespace-nowrap rounded-full px-3 text-[12.5px] font-bold ${focus} ${lens === l ? "bg-cream text-ink" : "text-cream hover:bg-ink"}`}
            >
              {l === "connections" ? (
                <>
                  <span className="sm:hidden">Connection</span>
                  <span className="hidden sm:inline">{LENS_LABEL[l]}</span>
                </>
              ) : l === "community" ? (
                "Community"
              ) : (
                LENS_LABEL[l]
              )}
            </button>
          ))}
        </div>
      </div>
      {lens !== "private" && overview ? (
        <p className="cafe-label absolute inset-x-0 bottom-[118px] z-20 mx-auto w-fit max-w-[92vw] rounded-full bg-cream/95 px-4 py-2 text-center text-[12.5px] font-semibold text-ink shadow-lg sm:top-[172px] sm:bottom-auto">
          {hiddenCount === 0
            ? `${LENS_LABEL[lens]} can see every room.`
            : `${LENS_LABEL[lens]} can't see ${hiddenCount} of your ${ROOMS.length} rooms. They're under frosted glass.`}
        </p>
      ) : null}

      {problem ? (
        <p role="alert" className="absolute inset-x-0 top-[200px] z-30 mx-auto w-fit max-w-[92vw] rounded-[12px] bg-ember-tint px-4 py-2 text-[13px] font-semibold text-ember-deep shadow-lg">
          {problem}
        </p>
      ) : null}

      {spot === "overview" && !hovered && lens === "private" ? (
        <div className="cafe-hint pointer-events-none absolute inset-x-0 bottom-[122px] z-20 mx-auto sm:bottom-[84px] w-fit max-w-[92vw] rounded-full bg-ink/80 px-4 py-2.5 text-center text-[13px] font-semibold text-cream shadow-lg backdrop-blur">
          Drag to turn · scroll or pinch to zoom · tap a <span aria-hidden className="mx-0.5 inline-block h-2.5 w-2.5 rotate-45 bg-ember align-middle" /> to fly over
        </div>
      ) : null}

      {spot !== "overview" ? (
        <DistrictPanel spot={spot} id={id} overview={overview} saving={saving} onAudience={changeAudience} onBack={() => select("overview")} />
      ) : null}

      <nav aria-label="Places in your District" className="absolute inset-x-0 bottom-0 z-30 flex justify-start gap-2 overflow-x-auto px-3 pt-2 pb-[max(14px,env(safe-area-inset-bottom))] [scrollbar-width:none] lg:justify-center">
        {places.map((p) => (
          <button key={p.id} type="button" aria-pressed={spot === p.id} onClick={() => select(p.id)} className={chip(spot === p.id)}>
            {p.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
