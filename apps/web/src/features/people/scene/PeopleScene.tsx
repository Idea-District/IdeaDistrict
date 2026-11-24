"use client";

import {
  CameraControls,
  CameraControlsImpl,
  PerformanceMonitor,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PerspectiveCamera } from "three";

import type {
  Connections,
  OpportunitySummary,
  Recommendation,
} from "@idea-district/api-client";

import { Effects } from "@/features/cafe/scene/Effects";
import { Hud } from "@/features/cafe/scene/Hud";
import {
  TIMES,
  timeOfDay,
  type TimeOfDay,
} from "@/features/cafe/scene/palette";
import { focus } from "@/features/cafe/shared";
import { preloadWorld } from "@/features/world/assets";
import { WorldLoading } from "@/features/world/Loading";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

import { PeopleContext, type PeopleState } from "./context";
import * as Cozy from "../cozy/CozyIslands";
import { cozySky } from "@/features/district/cozy/CozyWorld";
import { CozySea } from "@/features/district/cozy/CozySea";
import * as Real from "./Islands";
import { Bottles } from "./Islands";
import {
  HARBOUR,
  BOTTLES,
  SUGGESTION,
  view,
  type Islander,
  type PSpot,
  type XZ,
} from "./layout";
import { PeoplePanel } from "./PeoplePanel";
import { SEA, Sea } from "./Sea";


const INTRO_KEY = "people-intro-seen";

function seen() {
  try {
    return !!sessionStorage.getItem(INTRO_KEY);
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* plays again next time */
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

/** Sails the camera to each place, keeps it beside its panel, and drifts round when idle. */
function Rig({
  spot,
  target,
  intro,
  reduced,
}: {
  spot: PSpot;
  target: XZ | null;
  intro: boolean;
  reduced: boolean;
}) {
  const controls = useRef<CameraControlsImpl>(null);
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const idle = useRef(0);
  const first = useRef(true);
  const tx = target?.[0] ?? 0;
  const tz = target?.[1] ?? 0;

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const narrow = size.width < size.height;
    const [p, t] = view(spot, [tx, tz], narrow);
    if (first.current) {
      first.current = false;
      if (intro && !reduced) {
        // Arriving: from low over the water behind you, rise up to see who's around.
        c.setLookAt(p[0], 2, p[2] + 22, t[0], 1, t[2], false);
        c.smoothTime = 1.2;
        void c.setLookAt(...p, ...t, true).then(() => {
          c.smoothTime = 0.5;
        });
      } else c.setLookAt(...p, ...t, false);
    } else void c.setLookAt(...p, ...t, !reduced);
    const dist = Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2]);
    const half = dist * Math.tan(((camera.fov / 2) * Math.PI) / 180);
    const panel = spot !== "overview";
    const ox =
      panel && size.width >= 640
        ? half * camera.aspect * (200 / (size.width / 2))
        : 0;
    const oy = panel && size.width < 640 ? half * 0.45 : 0;
    void c.setFocalOffset(ox, oy, 0, !reduced);
    idle.current = 0;
  }, [spot, tx, tz, size.width, size.height, intro, reduced, camera]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c || reduced || spot !== "overview") return;
    idle.current += dt;
    if (idle.current > 6) c.rotate(dt * 0.03, 0, false);
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={5}
      maxDistance={55}
      minPolarAngle={0.15}
      maxPolarAngle={1.4}
      smoothTime={0.5}
      mouseButtons={{
        left: CameraControlsImpl.ACTION.ROTATE,
        middle: CameraControlsImpl.ACTION.DOLLY,
        right: CameraControlsImpl.ACTION.NONE,
        wheel: CameraControlsImpl.ACTION.DOLLY,
      }}
      touches={{
        one: CameraControlsImpl.ACTION.TOUCH_ROTATE,
        two: CameraControlsImpl.ACTION.TOUCH_DOLLY,
        three: CameraControlsImpl.ACTION.NONE,
      }}
      onControlStart={() => {
        idle.current = -4;
      }}
    />
  );
}

/** E1 · People as an archipelago around your own island. Browser only (see PeopleHome). */
export default function PeopleScene({
  founderId,
  name,
  rec,
  recError,
  people,
  connections,
  opportunities,
  reloadConnections,
  onLookAgain,
  fallback,
  onListView,
  variant = "real",
}: {
  founderId: string;
  name: string;
  rec: Recommendation | null;
  /** Why ID couldn't look for anyone, if it couldn't. */
  recError: string | null;
  people: Islander[];
  connections: Connections | null;
  opportunities: OpportunitySummary[];
  reloadConnections: () => void;
  onLookAgain: () => void;
  fallback: ReactNode;
  onListView: () => void;
  /** "real": the realistic archipelago. "cozy": hexagon-tile islands on a storybook sea. */
  variant?: "real" | "cozy";
}) {
  const [webgl] = useState(hasWebGL);
  const [reduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [intro] = useState(() => !seen());
  const [tod, setTod] = useState<TimeOfDay>(() => timeOfDay());
  const [spot, setSpot] = useState<PSpot>("overview");
  const [hovered, setHovered] = useState<string | null>(null);
  const [answering, setAnswering] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [fx, setFx] = useState(true);
  const [dpr, setDpr] = useState(1.6);
  const dragged = useRef(false);
  const down = useRef<{ x: number; y: number } | null>(null);

  // Only the realistic archipelago needs the downloaded models.
  useEffect(() => {
    if (variant === "real") preloadWorld(["ship", "buoy", "bench", "fern"]);
  }, [variant]);

  useEffect(() => {
    if (intro) markSeen();
  }, [intro]);

  const select = useCallback(
    (s: PSpot) => {
      setHovered(null);
      setSpot(s);
      if (s !== "overview")
        api
          .peopleVisit(
            founderId,
            s.startsWith("p:")
              ? "person"
              : (s as "you" | "suggestion" | "requests" | "harbour"),
          )
          .catch(() => {});
    },
    [founderId],
  );

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSpot("overview");
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, []);

  /** Open a bottle: yes builds a bridge (the new island appears, joined to yours), no lets it drift. */
  async function respond(requestId: string, accept: boolean) {
    setAnswering(requestId);
    setProblem(null);
    try {
      await api.respondToRequest(requestId, founderId, accept);
      reloadConnections();
      if (accept) setSpot("overview");
    } catch (e) {
      setProblem(errorMessage(e));
    } finally {
      setAnswering(null);
    }
  }

  const ctx = useMemo<PeopleState>(
    () => ({ spot, hovered, setHovered, select, reduced, tod, dragged }),
    [spot, hovered, select, reduced, tod],
  );

  if (!webgl) return <>{fallback}</>;

  const target: XZ | null =
    spot === "suggestion"
      ? SUGGESTION
      : spot === "harbour"
        ? HARBOUR
        : spot === "requests"
          ? BOTTLES
          : spot.startsWith("p:")
            ? (people.find((p) => `p:${p.id}` === spot)?.at ?? null)
            : null;
  const cozy = variant === "cozy";
  const bg = cozy ? cozySky(tod) : SEA[tod].bg;
  const { HomeIsland, Lighthouse, PersonIsland, Bridge, Harbour } = cozy ? Cozy : Real;
  const evening = tod === "evening";
  const waiting = connections?.received.length ?? 0;
  const match = rec?.kind === "match" ? rec : null;
  const chip = (active: boolean) =>
    `flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold transition-colors ${focus} ${
      active
        ? "bg-ember text-ink"
        : "bg-ink/70 text-cream backdrop-blur-md hover:bg-ink"
    }`;
  const places: { id: PSpot; label: ReactNode }[] = [
    { id: "overview", label: "Everyone" },
    { id: "suggestion", label: "ID's suggestion" },
    ...(waiting > 0
      ? [
          {
            id: "requests" as PSpot,
            label: (
              <>
                Requests{" "}
                <span className="rounded-full bg-cream px-1.5 text-[11px] text-ink">
                  {waiting}
                </span>
              </>
            ),
          },
        ]
      : []),
    ...people.map((p) => ({
      id: `p:${p.id}` as PSpot,
      label: p.person.name.split(" ")[0],
    })),
    { id: "harbour", label: "Opportunities" },
    { id: "you", label: "You" },
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
        if (d && Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 6)
          dragged.current = true;
      }}
      onPointerUp={() => (down.current = null)}
    >
      <PeopleContext.Provider value={ctx}>
        <Canvas
          aria-hidden
          shadows
          dpr={[1, dpr]}
          gl={{ antialias: false, powerPreference: "high-performance" }}
          camera={{ fov: 45, near: 0.1, far: 220, position: [0, 20, 40] }}
          onPointerMissed={() => setHovered(null)}
        >
          <PerformanceMonitor
            onDecline={() => {
              setDpr(1);
              setFx(false);
            }}
          />
          <color attach="background" args={[bg]} />
          <fog attach="fog" args={[bg, 45, 110]} />
          <Rig spot={spot} target={target} intro={intro} reduced={reduced} />
          <Suspense fallback={null}>
            {cozy ? <CozySea tod={tod} reduced={reduced} /> : <Sea tod={tod} reduced={reduced} />}
            <HomeIsland
              initial={name.slice(0, 1).toUpperCase()}
              evening={evening}
            />
            <Lighthouse
              name={match?.person.name ?? null}
              line={match ? match.person.building : ""}
              lit={!!match}
              evening={evening}
            />
            {people.map((p, i) => (
              <PersonIsland key={p.id} who={p} index={i} evening={evening} />
            ))}
            {people
              .filter((p) => p.kind !== "explore")
              .map((p) => (
                <Bridge key={p.id} to={p.at} />
              ))}
            <Bottles count={waiting} />
            <Harbour opportunities={opportunities} />
          </Suspense>
          {fx ? <Effects tod={tod} /> : null}
        </Canvas>
        {cozy ? null : <WorldLoading label="Sailing out" />}
      </PeopleContext.Provider>

      <p className="sr-only" aria-live="polite">
        {spot === "overview"
          ? `The people around you: ${people.filter((p) => p.kind !== "explore").length} connected, ${people.filter((p) => p.kind === "explore").length} worth a visit${match ? `, and ID suggests ${match.person.name}` : ""}.`
          : "Sailed over. Details in the panel."}
      </p>

      <Hud
        eyebrow="People"
        title={match ? "Someone you should meet" : "The people around you"}
        sub={
          match ? (
            <span>
              ID&rsquo;s lighthouse is pointing at{" "}
              <span className="font-bold text-cream">{match.person.name}</span>
            </span>
          ) : rec ? (
            "No one worth your time this week. We'd rather say so."
          ) : recError ? (
            "ID couldn't look for anyone just now."
          ) : (
            "Looking for someone worth your time…"
          )
        }
        current="/people"
        tod={tod}
        hidden={spot !== "overview"}
        onTime={() => setTod(TIMES[(TIMES.indexOf(tod) + 1) % TIMES.length])}
        onList={onListView}
      />

      {problem ? (
        <p
          role="alert"
          className="absolute inset-x-0 top-[120px] z-30 mx-auto w-fit max-w-[92vw] rounded-[12px] bg-ember-tint px-4 py-2 text-[13px] font-semibold text-ember-deep shadow-lg"
        >
          {problem}
        </p>
      ) : null}

      {spot === "overview" && !hovered ? (
        <div className="cafe-hint pointer-events-none absolute inset-x-0 bottom-[84px] z-20 mx-auto w-fit max-w-[92vw] rounded-full bg-ink/80 px-4 py-2.5 text-center text-[13px] font-semibold text-cream shadow-lg backdrop-blur">
          Drag to turn · scroll or pinch to zoom · tap a{" "}
          <span
            aria-hidden
            className="mx-0.5 inline-block h-2.5 w-2.5 rotate-45 bg-ember align-middle"
          />{" "}
          to sail over
        </div>
      ) : null}

      {spot !== "overview" ? (
        <PeoplePanel
          spot={spot}
          founderId={founderId}
          rec={rec}
          recError={recError}
          people={people}
          connections={connections}
          opportunities={opportunities}
          answering={answering}
          onRespond={respond}
          onLookAgain={onLookAgain}
          onBack={() => select("overview")}
        />
      ) : null}

      <nav
        aria-label="Places in the archipelago"
        className="absolute inset-x-0 bottom-0 z-30 flex justify-start gap-2 overflow-x-auto px-3 pt-2 pb-[max(14px,env(safe-area-inset-bottom))] [scrollbar-width:none] lg:justify-center"
      >
        {places.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={spot === p.id}
            onClick={() => select(p.id)}
            className={chip(spot === p.id)}
          >
            {p.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
