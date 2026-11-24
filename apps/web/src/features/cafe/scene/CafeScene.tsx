"use client";

import { ContactShadows, PerformanceMonitor, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode, type WheelEvent } from "react";

import type { CafeHome, CafeSpot, CafeTable } from "@idea-district/api-client";

import { api } from "@/lib/api";

import { focus } from "../shared";
import { preloadCafe } from "./assets";
import { CameraRig } from "./CameraRig";
import { isPlace, SceneContext, type Cam, type SceneState } from "./context";
import { Counter } from "./Counter";
import { Effects } from "./Effects";
import { Hud } from "./Hud";
import { Minimap } from "./Minimap";
import { C, greeting, LIGHT, TIMES, timeOfDay, type TimeOfDay } from "./palette";
import { Room } from "./Room";
import { CafeSound } from "./sound";
import { SpotPanel } from "./SpotPanel";
import { BOUNDS, EYE, PLACES, placePose, poseFrom, type SpotId } from "./spots";
import { Tables } from "./Tables";
import { DistrictDoor, NoticeBoard, QuickBreaksDoor } from "./Walls";

const INTRO_KEY = "cafe-intro-seen";

preloadCafe();

/** While the real furniture, textures and light arrive. */
function Loading() {
  const { active, progress } = useProgress();
  if (!active && progress >= 100) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-espresso text-cream transition-opacity duration-500">
      <span aria-hidden className="flex gap-2">
        <span className="pixel h-3.5 w-3.5 animate-pulse" />
        <span className="pixel h-3.5 w-3.5 animate-pulse [animation-delay:150ms]" />
        <span className="pixel h-3.5 w-3.5 animate-pulse [animation-delay:300ms]" />
      </span>
      <p className="text-[15px] font-semibold tracking-wide">Setting out the tables… {Math.round(progress)}%</p>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-cream/20">
        <div className="h-full bg-ember transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
const DOORS = {
  quick: { href: "/quick-breaks", front: poseFrom([3.9, EYE, -3.9], [3.9, 1.55, -7]), through: poseFrom([3.9, EYE, -7.4], [3.9, 1.6, -9]) },
  district: { href: "/district", front: poseFrom([4.1, EYE, 2.7], [7, 1.55, 2.7]), through: poseFrom([7.4, EYE, 2.7], [9, 1.6, 2.7]) },
} as const;

function storageGet(k: string) {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function storageSet(k: string, v: string) {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* private mode: the intro just plays again next time */
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

const narrowScreen = () => window.innerWidth < window.innerHeight;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const toVisit = (p: string): CafeSpot => (p.startsWith("table-") ? "tables" : (p as CafeSpot));

/** B1 · The District Cafe as a place you walk into, full screen. Loaded only in the browser (see CafeHome). */
export default function CafeScene({
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
  const [tod, setTod] = useState<TimeOfDay>(() => timeOfDay());
  const [spot, setSpot] = useState<SpotId>(() => (reduced || storageGet(INTRO_KEY) ? "room" : "street"));
  const [doorOpen, setDoorOpen] = useState(spot === "room");
  const [hovered, setHovered] = useState<string | null>(null);
  const [exploring, setExploring] = useState(false);
  const [entering, setEntering] = useState<"quick" | "district" | null>(null);
  const [fade, setFade] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [fx, setFx] = useState(true);
  const [dpr, setDpr] = useState(1.6);
  const [sound] = useState(() => new CafeSound());
  const sfx = useRef(sound);
  const cam = useRef<Cam>({ goal: placePose(spot, narrowScreen()), pose: placePose(spot, narrowScreen()), shift: 0, lift: 0, panel: 0, ready: false });
  const keys = useRef(new Set<string>());
  const dragged = useRef(false);
  const down = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const goTo = useCallback((s: SpotId) => {
    const c = cam.current;
    Object.assign(c.goal, placePose(s, narrowScreen()));
    c.panel = isPlace(s) ? 1 : 0;
  }, []);

  const select = useCallback(
    (id: SpotId) => {
      clearTimers();
      storageSet(INTRO_KEY, "1");
      setDoorOpen(true);
      setHovered(null);
      setSpot(id);
      goTo(id);
      if (isPlace(id)) {
        setExploring(true);
        if (id === "counter") sfx.current.hiss();
        else sfx.current.clink();
        api.cafeVisit(founderId, toVisit(id)).catch(() => {});
      }
    },
    [founderId, goTo],
  );

  // Arriving: stand on the street, the door opens with a ring of the bell, step inside.
  useEffect(() => {
    if (spot !== "street") return;
    later(800, () => {
      setDoorOpen(true);
      sfx.current.chime();
    });
    later(1500, () => {
      setSpot("room");
      goTo("room");
      storageSet(INTRO_KEY, "1");
    });
    return clearTimers;
    // Runs once, for the first spot only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Tap the floor: turn towards it and walk there. */
  const walkTo = useCallback((x: number, z: number) => {
    const c = cam.current;
    const tx = clamp(x, BOUNDS.minX, BOUNDS.maxX);
    const tz = clamp(z, BOUNDS.minZ, BOUNDS.maxZ);
    const dx = tx - c.pose.x;
    const dz = tz - c.pose.z;
    if (Math.hypot(dx, dz) < 0.25) return;
    Object.assign(c.goal, { x: tx, y: EYE, z: tz, yaw: Math.atan2(-dx, -dz), pitch: -0.06 });
    c.panel = 0;
    setSpot("room");
    setExploring(true);
  }, []);

  const onWalk = useCallback(() => {
    const c = cam.current;
    if (c.panel) {
      c.panel = 0;
      setSpot("room");
    }
    setExploring(true);
  }, []);

  /** Through a door: walk up, it swings open, step through into the light, and arrive in that room. */
  const enter = useCallback(
    (door: "quick" | "district") => {
      const d = DOORS[door];
      clearTimers();
      if (reduced) {
        router.push(d.href);
        return;
      }
      setEntering(door);
      setSpot("room");
      const c = cam.current;
      c.panel = 0;
      Object.assign(c.goal, d.front);
      sfx.current.chime();
      later(1000, () => Object.assign(c.goal, d.through));
      later(1450, () => setFade(true));
      later(2100, () => router.push(d.href));
    },
    [reduced, router],
  );

  // Keyboard: walk with WASD or the arrows, Esc steps back from a place.
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName));
    const kd = (e: KeyboardEvent) => {
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "escape") {
        if (cam.current.panel) select("room");
        return;
      }
      if (!MOVE_KEYS.has(k)) return;
      e.preventDefault();
      keys.current.add(k);
    };
    const ku = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
    };
  }, [select]);

  useEffect(() => () => sound.stop(), [sound]);

  const ctx = useMemo<SceneState>(
    () => ({ spot, hovered, setHovered, select, walkTo, entering, cam, keys, dragged, reduced, tod, name, onWalk, sfx }),
    [spot, hovered, select, walkTo, entering, reduced, tod, name, onWalk],
  );

  if (!webgl) return <>{fallback}</>;

  // Drag anywhere on the room to look around.
  function onPointerDown(e: PointerEvent) {
    dragged.current = false;
    if ((e.target as HTMLElement).tagName !== "CANVAS") return;
    const g = cam.current.goal;
    down.current = { x: e.clientX, y: e.clientY, yaw: g.yaw, pitch: g.pitch };
  }
  function onPointerMove(e: PointerEvent) {
    const d = down.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) dragged.current = true;
    if (!dragged.current) return;
    const g = cam.current.goal;
    g.yaw = d.yaw + dx * 0.0045;
    g.pitch = clamp(d.pitch + dy * 0.003, -0.7, 0.55);
  }
  function onPointerUp() {
    down.current = null;
  }
  // Scroll or swipe on a trackpad to step forwards and back.
  function onWheel(e: WheelEvent) {
    if ((e.target as HTMLElement).tagName !== "CANVAS" || entering) return;
    const c = cam.current;
    const step = clamp(-e.deltaY * 0.004, -0.6, 0.6);
    c.goal.x = clamp(c.goal.x - Math.sin(c.goal.yaw) * step, BOUNDS.minX, BOUNDS.maxX);
    c.goal.z = clamp(c.goal.z - Math.cos(c.goal.yaw) * step, BOUNDS.minZ, BOUNDS.maxZ);
    c.goal.y = EYE;
    onWalk();
  }

  function toggleSound() {
    if (soundOn) sound.stop();
    else {
      sound.start(tod === "evening");
      window.setTimeout(() => sound.chime(), 120);
    }
    setSoundOn(!soundOn);
  }
  function nextTime() {
    const t = TIMES[(TIMES.indexOf(tod) + 1) % TIMES.length];
    setTod(t);
    sound.setRain(soundOn && t === "evening");
  }

  const L = LIGHT[tod];
  const dark = tod === "evening" || spot === "street";
  const chip = (active: boolean) =>
    `flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold transition-colors ${focus} ${
      active ? "bg-ember text-ink" : "bg-ink/70 text-cream backdrop-blur-md hover:bg-ink"
    }`;

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{ background: L.bg, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
    >
      <SceneContext.Provider value={ctx}>
        <Canvas aria-hidden shadows dpr={[1, dpr]} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ fov: 55, near: 0.05, far: 80, position: [0, 1.7, 12] }} onPointerMissed={() => setHovered(null)}>
          <PerformanceMonitor
            onDecline={() => {
              setDpr(1);
              setFx(false);
            }}
          />
          <color attach="background" args={[L.bg]} />
          <fog attach="fog" args={[L.bg, 16, 34]} />
          <CameraRig />
          <Suspense fallback={null}>
            <Room tod={tod} doorOpen={doorOpen} />
            <Counter brew={home ? home.brew : undefined} />
            <Tables tables={tables} hereToday={home?.here_today ?? 0} tod={tod} />
            <NoticeBoard items={home?.whats_on ?? []} />
            <QuickBreaksDoor />
            <DistrictDoor />
            <ContactShadows position={[0, 0.003, -1]} scale={14} blur={2.6} opacity={0.35} far={3} resolution={512} frames={1} color={C.ink} />
            {fx ? <Effects tod={tod} ao /> : null}
          </Suspense>
        </Canvas>
      </SceneContext.Provider>

      <Loading />

      {/* Announced for screen readers; the visual greeting lives in the HUD. */}
      <p className="sr-only" aria-live="polite">
        {spot === "street" ? "Outside the District Cafe. The door is opening." : isPlace(spot) ? `You walked to ${PLACES.find((p) => p.id === spot)?.name ?? "a table"}.` : "Inside the District Cafe."}
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
        onTime={nextTime}
        onSound={toggleSound}
        onList={onListView}
      />

      {spot === "street" ? (
        <button type="button" onClick={() => select("room")} className={`absolute right-4 bottom-24 z-30 min-h-[44px] rounded-full bg-cream/90 px-5 text-[14px] font-bold text-ink hover:bg-cream ${focus}`}>
          Skip, go inside
        </button>
      ) : null}

      {spot === "room" && !exploring && !entering ? (
        <div
          className={`cafe-hint pointer-events-none absolute inset-x-0 bottom-[84px] z-20 mx-auto w-fit max-w-[92vw] rounded-full px-4 py-2.5 text-center text-[13px] font-semibold shadow-lg ${
            dark ? "bg-cream/92 text-ink" : "bg-ink/80 text-cream backdrop-blur"
          }`}
        >
          <span className="hidden sm:inline">Click the floor to walk · drag to look · WASD to stroll · </span>
          <span className="sm:hidden">Tap the floor to walk · drag to look · </span>
          tap a <span aria-hidden className="mx-0.5 inline-block h-2.5 w-2.5 rotate-45 bg-ember align-middle" /> to visit
        </div>
      ) : null}

      {isPlace(spot) && !entering ? (
        <SpotPanel spot={spot} home={home} tables={tables} onBack={() => select("room")} onEnter={enter} onSelect={select} />
      ) : null}

      <div className="pointer-events-none absolute bottom-[78px] left-4 z-20 hidden md:block">
        <Minimap cam={cam} tables={tables} spot={spot} onSelect={select} />
      </div>

      {/* Every place as a button: for keyboards, screen readers, and anyone who'd rather not walk. */}
      <nav aria-label="Places in the cafe" className="absolute inset-x-0 bottom-0 z-30 flex justify-start gap-2 overflow-x-auto px-3 pt-2 pb-[max(14px,env(safe-area-inset-bottom))] [scrollbar-width:none] md:justify-center">
        <button type="button" aria-pressed={spot === "room"} onClick={() => select("room")} className={chip(spot === "room")}>
          The room
        </button>
        {PLACES.map((p) => (
          <button key={p.id} type="button" aria-pressed={spot === p.id} onClick={() => select(p.id)} className={chip(spot === p.id || (p.id === "tables" && spot.startsWith("table-")))}>
            {p.hint}
          </button>
        ))}
      </nav>

      {/* Stepping through a door: the light of the next room fills the screen. */}
      <div aria-hidden className={`pointer-events-none absolute inset-0 z-40 bg-[#fff1dc] transition-opacity duration-700 ${fade ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
