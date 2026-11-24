"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Color, type CanvasTexture, type Group } from "three";

import type { Brew } from "@idea-district/api-client";

import { Model, usePBR } from "./assets";
import { useScene } from "./context";
import { Hotspot } from "./Hotspot";
import { C } from "./palette";
import { canvasTexture, wrap } from "./textures";
import { useCanvasTexture } from "./useCanvasTexture";

/** A few puffs of steam rising from a cup, on a loop. */
function Steam({ at, big = false }: { at: [number, number, number]; big?: boolean }) {
  const g = useRef<Group>(null);
  const { reduced } = useScene();
  useFrame(({ clock }) => {
    if (!g.current || reduced) return;
    g.current.children.forEach((m, i) => {
      const t = (clock.elapsedTime * 0.4 + i / 4) % 1;
      m.position.set(Math.sin((t + i) * 6) * 0.035, t * (big ? 0.7 : 0.45), 0);
      m.scale.setScalar((big ? 0.8 : 0.5) + t * 1.1);
      (m as unknown as { material: { opacity: number } }).material.opacity = 0.4 * (1 - t);
    });
  });
  return (
    <group ref={g} position={at}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Cup({ at }: { at: [number, number, number] }) {
  const { sfx } = useScene();
  return (
    <group position={at} onClick={() => sfx.current.clink()}>
      <mesh castShadow>
        <cylinderGeometry args={[0.07, 0.055, 0.11, 20]} />
        <meshPhysicalMaterial color={C.cream} roughness={0.15} clearcoat={1} />
      </mesh>
      <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.03, 0.01, 6, 12]} />
        <meshPhysicalMaterial color={C.cream} roughness={0.15} clearcoat={1} />
      </mesh>
      <mesh position={[0, -0.058, 0]}>
        <cylinderGeometry args={[0.12, 0.11, 0.012, 24]} />
        <meshPhysicalMaterial color={C.cream} roughness={0.2} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.054, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.062, 18]} />
        <meshStandardMaterial color="#5b3a22" roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Draws the board: everything up to `chars` characters of the question, with chalk dust at the tip. */
function drawBoard(tex: CanvasTexture, question: string, answered: number | null, chars: number) {
  const c = tex.image as HTMLCanvasElement;
  const ctx = c.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily || "system-ui";
  const w = c.width;
  const h = c.height;
  ctx.fillStyle = "#1f2321";
  ctx.fillRect(0, 0, w, h);
  // Ghost of yesterday's chalk.
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  for (let i = 0; i < 12; i++) ctx.fillRect(((i * 97) % w) - 40, ((i * 53) % h) + 10, 260, 26);
  ctx.fillStyle = C.emberLight;
  ctx.font = `700 34px ${font}`;
  ctx.letterSpacing = "6px";
  ctx.fillText("TODAY'S DAILY BREW", 56, 82);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#f3f3e8";
  ctx.font = `600 50px ${font}`;
  ctx.shadowColor = "rgba(243,243,232,0.5)";
  ctx.shadowBlur = 3;
  const lines = wrap(ctx, question, w - 112, 4);
  let left = chars;
  let tip: [number, number] | null = null;
  lines.forEach((l, i) => {
    if (left <= 0) return;
    const part = l.slice(0, left);
    ctx.fillText(part, 56, 160 + i * 64);
    if (left < l.length) tip = [56 + ctx.measureText(part).width, 160 + i * 64];
    left -= l.length + 1;
  });
  ctx.shadowBlur = 0;
  if (tip) {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(tip[0] + 2, tip[1] - 30, 10, 34);
  }
  if (answered !== null && chars >= question.length) {
    ctx.fillStyle = "rgba(243,243,232,0.7)";
    ctx.font = `500 30px ${font}`;
    ctx.fillText(`${answered} ${answered === 1 ? "founder has" : "founders have"} answered`, 56, h - 50);
  }
  tex.needsUpdate = true;
}

/** The chalkboard. The first time you walk up to the counter, the question is chalked up in front of you. */
function ChalkBoard({ question, answered }: { question: string; answered: number | null }) {
  const { spot, reduced } = useScene();
  const tex = useCanvasTexture(() => canvasTexture(1024, 512, () => {}), "board");
  const anim = useRef({ t: -1, done: false, chars: -1 });

  useEffect(() => {
    drawBoard(tex, question, answered, question.length);
  }, [tex, question, answered]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (spot === "counter" && !a.done && !reduced) {
      if (a.t < 0) a.t = 0;
      a.t += dt;
      const chars = Math.floor(Math.max(0, a.t - 0.6) * 34);
      if (chars !== a.chars) {
        a.chars = chars;
        drawBoard(tex, question, answered, chars);
      }
      if (chars > question.length) a.done = true;
    }
  });

  return (
    <>
      <mesh position={[-3.2, 2.75, -5.97]}>
        <boxGeometry args={[3.35, 1.8, 0.06]} />
        <meshStandardMaterial color={C.woodDark} roughness={0.8} />
      </mesh>
      <mesh position={[-3.2, 2.75, -5.93]}>
        <planeGeometry args={[3.15, 1.6]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </>
  );
}

/** The counter top: real marble. */
function MarbleTop() {
  const marble = usePBR("marble", [3, 1]);
  return (
    <mesh position={[-3.2, 1.09, -4.68]} castShadow receiveShadow>
      <boxGeometry args={[4.15, 0.07, 1.02]} />
      <meshPhysicalMaterial {...marble} roughness={1} clearcoat={0.5} clearcoatRoughness={0.25} />
    </mesh>
  );
}

/** What the barista says: hello when you come in, a nudge at the counter. */
function Barista() {
  const { spot, name, tod } = useScene();
  const [hello, setHello] = useState(false);
  const greeted = useRef(false);
  const inRoom = spot === "room";
  useEffect(() => {
    if (!inRoom || greeted.current) return;
    greeted.current = true;
    const a = window.setTimeout(() => setHello(true), 900);
    const b = window.setTimeout(() => setHello(false), 8000);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [inRoom]);
  const hi = tod === "morning" ? "Morning" : tod === "afternoon" ? "Afternoon" : "Evening";
  const line =
    spot === "counter"
      ? "Take your time. One short answer is plenty."
      : hello && inRoom
        ? `${hi}${name ? `, ${name}` : ""}! Today's question is on the board.`
        : null;
  return (
    <>
      {line ? (
        <Html position={[-3.4, 1.95, -4.9]} center zIndexRange={[15, 0]} style={{ pointerEvents: "none" }}>
          <div className="cafe-bubble relative w-max max-w-[220px] rounded-[14px] bg-cream px-3.5 py-2.5 text-[13.5px] font-semibold leading-snug text-ink shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
            {line}
            <span aria-hidden className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-cream" />
          </div>
        </Html>
      ) : null}
    </>
  );
}

const RED_LIGHT = new Color(C.ember).multiplyScalar(3);

/** The counter: the Daily Brew is chalked on the board behind it. */
export function Counter({ brew }: { brew: Brew | null | undefined }) {
  const { sfx } = useScene();
  const question = brew === undefined ? "…" : (brew?.question ?? "No question today. A new one tomorrow.");

  return (
    <Hotspot id="counter" name="Today's Daily Brew" hint="The counter" marker={[-3.2, 3.85, -5.4]}>
      <mesh position={[-3.2, 0.53, -4.7]} castShadow receiveShadow>
        <boxGeometry args={[4, 1.06, 0.9]} />
        <meshStandardMaterial color={C.forest} roughness={0.7} />
      </mesh>
      {/* Panelled front */}
      {[-4.7, -3.95, -3.2, -2.45, -1.7].map((x) => (
        <mesh key={x} position={[x, 0.55, -4.24]}>
          <boxGeometry args={[0.62, 0.7, 0.02]} />
          <meshStandardMaterial color={C.forest2} roughness={0.6} />
        </mesh>
      ))}
      <MarbleTop />
      <mesh position={[-3.2, 0.2, -4.12]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 4, 8]} />
        <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.25} />
      </mesh>

      {/* Espresso machine: tap it */}
      <group position={[-4.35, 1.12, -4.9]} onClick={() => sfx.current.hiss()}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.85, 0.6, 0.5]} />
          <meshStandardMaterial color={C.ink} roughness={0.25} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.63, 0]}>
          <boxGeometry args={[0.85, 0.06, 0.5]} />
          <meshStandardMaterial color="#d8d8d8" metalness={1} roughness={0.15} />
        </mesh>
        {[-0.18, 0.18].map((x) => (
          <mesh key={x} position={[x, 0.12, 0.27]}>
            <cylinderGeometry args={[0.04, 0.04, 0.12, 10]} />
            <meshStandardMaterial color="#d8d8d8" metalness={1} roughness={0.15} />
          </mesh>
        ))}
        <mesh position={[0.32, 0.45, 0.26]}>
          <circleGeometry args={[0.04, 14]} />
          <meshBasicMaterial color={RED_LIGHT} toneMapped={false} />
        </mesh>
        <Steam at={[0.25, 0.72, 0]} big />
      </group>

      {/* Pastry dome */}
      <group position={[-1.75, 1.13, -4.8]}>
        <mesh>
          <cylinderGeometry args={[0.28, 0.3, 0.04, 24]} />
          <meshStandardMaterial color={C.woodDark} roughness={0.6} />
        </mesh>
        <Model name="croissant" position={[-0.08, 0.025, -0.04]} rotation={[0, 0.4, 0]} scale={1.2} />
        <Model name="croissant" position={[0.1, 0.025, 0.06]} rotation={[0, -0.9, 0]} scale={1.2} />
        <Model name="croissant" position={[-0.02, 0.025, 0.14]} rotation={[0, 2.1, 0]} scale={1.2} />
        <mesh position={[0, 0.17, 0]}>
          <sphereGeometry args={[0.29, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial color="#ffffff" transmission={0.95} roughness={0.05} thickness={0.05} transparent opacity={0.35} />
        </mesh>
      </group>

      <Cup at={[-3.3, 1.18, -4.45]} />
      <Cup at={[-2.5, 1.18, -4.5]} />
      <Steam at={[-3.3, 1.26, -4.45]} />
      <Steam at={[-2.5, 1.26, -4.5]} />

      {/* Bar stools */}
      {[-4.3, -3.2, -2.1].map((x, i) => (
        <Model key={x} name="stool" position={[x, 0, -3.75]} rotation={[0, i * 0.4, 0]} scale={1.05} />
      ))}

      <ChalkBoard question={question} answered={brew ? brew.answer_count : null} />
      {/* Pendant lights over the counter */}
      {[-4.2, -2.2].map((x) => (
        <group key={x} position={[x, 0, -4.7]}>
          <mesh position={[0, 3.55, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 1.3, 4]} />
            <meshStandardMaterial color={C.ink} />
          </mesh>
          <mesh position={[0, 2.85, 0]}>
            <sphereGeometry args={[0.09, 14, 10]} />
            <meshBasicMaterial color={new Color(C.bulb).multiplyScalar(2.6)} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <pointLight position={[-3.2, 2.7, -4.6]} intensity={6} distance={5} color={C.bulb} />
      <Barista />
    </Hotspot>
  );
}
