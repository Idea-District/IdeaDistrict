"use client";

import { CameraControls, CameraControlsImpl, PerformanceMonitor, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PerspectiveCamera } from "three";

import type { ConversationSummary } from "@idea-district/api-client";

import { Effects } from "@/features/cafe/scene/Effects";
import { Hud } from "@/features/cafe/scene/Hud";
import { TIMES, timeOfDay, type TimeOfDay } from "@/features/cafe/scene/palette";
import { focus } from "@/features/cafe/shared";
import { SEA, Sea } from "@/features/people/scene/Sea";
import { preloadWorld } from "@/features/world/assets";
import { WorldLoading } from "@/features/world/Loading";
import { api } from "@/lib/api";

import { EmptyLantern, Lantern, SentLantern } from "./Lanterns";
import { lanternSpots, view, type MSpot, type V3 } from "./layout";
import { MessagesPanel } from "./MessagesPanel";
import { Pier } from "./Pier";
import { CozyPier } from "../cozy/CozyPier";
import { cozySky } from "@/features/district/cozy/CozyWorld";
import { CozySea } from "@/features/district/cozy/CozySea";

const INTRO_KEY = "pier-intro-seen";


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

/** Walks the camera out along the pier to each lantern, beside its panel. */
function Rig({ spot, target, intro, reduced }: { spot: MSpot; target: V3 | null; intro: boolean; reduced: boolean }) {
  const controls = useRef<CameraControlsImpl>(null);
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const idle = useRef(0);
  const first = useRef(true);
  const [tx, ty, tz] = target ?? [0, 0, 0];

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const narrow = size.width < size.height;
    const [p, t] = view(spot, [tx, ty, tz], narrow);
    if (first.current) {
      first.current = false;
      if (intro && !reduced) {
        // Arriving: from the shore, walk out along the pier.
        c.setLookAt(p[0], 1.8, p[2] + 9, t[0], 1.8, t[2], false);
        c.smoothTime = 1.3;
        void c.setLookAt(...p, ...t, true).then(() => {
          c.smoothTime = 0.55;
        });
      } else c.setLookAt(...p, ...t, false);
    } else void c.setLookAt(...p, ...t, !reduced);
    const dist = Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2]);
    const half = dist * Math.tan(((camera.fov / 2) * Math.PI) / 180);
    const panel = spot !== "overview";
    const ox = panel && size.width >= 640 ? half * camera.aspect * (205 / (size.width / 2)) : 0;
    const oy = panel && size.width < 640 ? half * 0.5 : 0;
    void c.setFocalOffset(ox, oy, 0, !reduced);
    idle.current = 0;
  }, [spot, tx, ty, tz, size.width, size.height, intro, reduced, camera]);

  // A slow sway when idle, like standing at the rail.
  useFrame(({ clock }, dt) => {
    const c = controls.current;
    if (!c || reduced || spot !== "overview") return;
    idle.current += dt;
    if (idle.current > 5) c.rotate(Math.sin(clock.elapsedTime * 0.15) * dt * 0.03, 0, false);
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={2.5}
      maxDistance={26}
      minPolarAngle={0.6}
      maxPolarAngle={1.62}
      smoothTime={0.55}
      mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.DOLLY, right: CameraControlsImpl.ACTION.NONE, wheel: CameraControlsImpl.ACTION.DOLLY }}
      touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY, three: CameraControlsImpl.ACTION.NONE }}
      onControlStart={() => {
        idle.current = -4;
      }}
    />
  );
}

/** Messages as a pier at the water's edge: each conversation a lantern. Browser only (see ConversationList). */
export default function MessagesScene({
  founderId,
  list,
  reload,
  fallback,
  onListView,
  variant = "real",
}: {
  founderId: string;
  list: ConversationSummary[] | null;
  reload: () => void;
  fallback: ReactNode;
  onListView: () => void;
  /** "real": the realistic pier. "cozy": a storybook pier with paper lanterns. */
  variant?: "real" | "cozy";
}) {
  const [webgl] = useState(hasWebGL);
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [intro] = useState(() => !seen());
  const [tod, setTod] = useState<TimeOfDay>(() => timeOfDay());
  const [spot, setSpot] = useState<MSpot>("overview");
  const [hovered, setHovered] = useState<string | null>(null);
  const [flights, setFlights] = useState<{ key: number; to: V3 }[]>([]);
  const [fx, setFx] = useState(true);
  const [dpr, setDpr] = useState(1.6);
  const dragged = useRef(false);
  const down = useRef<{ x: number; y: number } | null>(null);
  const flightKey = useRef(0);

  // Only the realistic pier needs the downloaded models.
  useEffect(() => {
    if (variant === "real") preloadWorld(["lantern", "streetLamp", "bench"]);
  }, [variant]);

  useEffect(() => {
    if (intro) markSeen();
  }, [intro]);

  const convos = useMemo(() => list ?? [], [list]);
  const spots = useMemo(() => lanternSpots(convos.length), [convos.length]);

  const spotRef = useRef<MSpot>("overview");
  useEffect(() => {
    spotRef.current = spot;
  }, [spot]);

  const select = useCallback(
    (s: MSpot) => {
      setHovered(null);
      // Leaving a conversation: refresh the unread counts on the lanterns.
      if (spotRef.current.startsWith("c:") && spotRef.current !== s) reload();
      setSpot(s);
      if (s !== "overview") api.pierVisit(founderId, s === "letterbox" || s === "empty" ? "letterbox" : "lantern").catch(() => {});
    },
    [founderId, reload],
  );

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === "Escape") select("overview");
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, [select]);

  // New messages arrive: refresh the lanterns every 20 seconds while you're looking.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, 20_000);
    return () => window.clearInterval(t);
  }, [reload]);

  function sent(conversationId: string) {
    const i = convos.findIndex((c) => c.id === conversationId);
    if (i < 0) return;
    const key = ++flightKey.current;
    setFlights((f) => [...f, { key, to: spots[i] }]);
    window.setTimeout(() => setFlights((f) => f.filter((x) => x.key !== key)), 2600);
  }

  const io = useMemo(() => ({ spot, hovered, setHovered, select, dragged, reduced, cozy: variant === "cozy" }), [spot, hovered, select, reduced, variant]);

  if (!webgl) return <>{fallback}</>;

  const target: V3 | null = spot.startsWith("c:") ? (spots[convos.findIndex((c) => `c:${c.id}` === spot)] ?? null) : null;
  const cozy = variant === "cozy";
  const PierKind = cozy ? CozyPier : Pier;
  const bg = cozy ? cozySky(tod) : SEA[tod].bg;
  const evening = tod === "evening";
  const unread = convos.reduce((n, c) => n + c.unread, 0);
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
      <Canvas aria-hidden shadows dpr={[1, dpr]} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ fov: 50, near: 0.05, far: 200, position: [0, 2, 20] }} onPointerMissed={() => setHovered(null)}>
        <PerformanceMonitor
          onDecline={() => {
            setDpr(1);
            setFx(false);
          }}
        />
        <color attach="background" args={[bg]} />
        <fog attach="fog" args={[bg, 25, 80]} />
        <Rig spot={spot} target={target} intro={intro} reduced={reduced} />
        <Suspense fallback={null}>
        {cozy ? <CozySea tod={tod} reduced={reduced} /> : <Sea tod={tod} reduced={reduced} />}
        <PierKind
          evening={evening}
          onLetterbox={() => {
            if (!dragged.current) select("letterbox");
          }}
          onLetterboxHover={(on) => setHovered(on ? "letterbox" : null)}
        />
        {convos.length === 0 && list ? <EmptyLantern io={io} /> : null}
        {convos.map((c, i) => (
          <Lantern key={c.id} c={c} at={spots[i]} i={i} io={io} lit={i < 6} />
        ))}
        {flights.map((f) => (
          <SentLantern key={f.key} to={f.to} reduced={reduced} cozy={cozy} />
        ))}
        </Suspense>
        {/* Fireflies over the water */}
        <Sparkles count={evening ? 70 : 30} position={[0, 2.2, -7]} scale={[16, 3, 10]} size={evening ? 3 : 2} speed={0.3} opacity={evening ? 0.9 : 0.5} color={evening ? "#ffd9a0" : "#fff3d6"} />
        {fx ? <Effects tod={tod} /> : null}
      </Canvas>
      {cozy ? null : <WorldLoading label="Walking out onto the pier" />}

      <p className="sr-only" aria-live="polite">
        {list === null
          ? "Walking out onto the pier."
          : convos.length === 0
            ? "No conversations yet."
            : `${convos.length} ${convos.length === 1 ? "conversation" : "conversations"}${unread ? `, ${unread} unread` : ""}.`}
      </p>

      <Hud
        eyebrow="Messages"
        title={unread ? `${unread} new ${unread === 1 ? "message" : "messages"}` : "The lantern pier"}
        sub={
          list === null
            ? "Walking out…"
            : convos.length === 0
              ? "No conversations yet. An introduction lights the first lantern."
              : "Each lantern is a conversation. The warm ones have something new."
        }
        current="/messages"
        tod={tod}
        hidden={spot !== "overview"}
        onTime={() => setTod(TIMES[(TIMES.indexOf(tod) + 1) % TIMES.length])}
        onList={onListView}
      />

      {spot === "overview" && !hovered && convos.length > 0 ? (
        <div className="cafe-hint pointer-events-none absolute inset-x-0 bottom-[84px] z-20 mx-auto w-fit max-w-[92vw] rounded-full bg-ink/80 px-4 py-2.5 text-center text-[13px] font-semibold text-cream shadow-lg backdrop-blur">
          Tap a lantern to read and reply · drag to look around
        </div>
      ) : null}

      {spot !== "overview" ? <MessagesPanel spot={spot} founderId={founderId} list={convos} onSent={sent} onBack={() => select("overview")} /> : null}

      <nav aria-label="Conversations" className="absolute inset-x-0 bottom-0 z-30 flex justify-start gap-2 overflow-x-auto px-3 pt-2 pb-[max(14px,env(safe-area-inset-bottom))] [scrollbar-width:none] lg:justify-center">
        <button type="button" aria-pressed={spot === "overview"} onClick={() => select("overview")} className={chip(spot === "overview")}>
          The pier
        </button>
        {convos.map((c) => (
          <button key={c.id} type="button" aria-pressed={spot === `c:${c.id}`} onClick={() => select(`c:${c.id}`)} className={chip(spot === `c:${c.id}`)}>
            {c.with.name.split(" ")[0]}
            {c.unread ? <span className="rounded-full bg-cream px-1.5 text-[11px] text-ink">{c.unread}</span> : null}
          </button>
        ))}
        <button type="button" aria-pressed={spot === "letterbox"} onClick={() => select("letterbox")} className={chip(spot === "letterbox")}>
          Letterbox
        </button>
      </nav>
    </div>
  );
}
