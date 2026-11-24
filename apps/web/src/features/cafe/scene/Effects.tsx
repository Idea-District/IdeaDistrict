"use client";

import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useState } from "react";

import type { TimeOfDay } from "./palette";

function contextAlive(gl: { getContext: () => WebGLRenderingContext | WebGL2RenderingContext }) {
  const c = gl.getContext();
  return !c.isContextLost() && c.getContextAttributes() !== null;
}

/**
 * Glow, vignette and filmic colour. Only while the browser's 3D context is alive: if the GPU drops it
 * (a busy machine, a backgrounded tab), the effects step aside instead of crashing, and come back
 * when the context is restored.
 */
export function Effects({ tod, ao = false }: { tod: TimeOfDay; /** Soft contact shadows where things meet (for interiors). */ ao?: boolean }) {
  const gl = useThree((s) => s.gl);
  const [alive, setAlive] = useState(() => contextAlive(gl));
  useEffect(() => {
    const el = gl.domElement;
    const lost = () => setAlive(false);
    const back = () => setAlive(contextAlive(gl));
    el.addEventListener("webglcontextlost", lost);
    el.addEventListener("webglcontextrestored", back);
    return () => {
      el.removeEventListener("webglcontextlost", lost);
      el.removeEventListener("webglcontextrestored", back);
    };
  }, [gl]);
  if (!alive) return null;
  return (
    <EffectComposer multisampling={ao ? 0 : 4}>
      {ao ? <N8AO aoRadius={0.6} intensity={2.2} distanceFalloff={0.6} halfRes quality="medium" /> : <></>}
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={tod === "evening" ? 1.1 : 0.6} radius={0.7} />
      <Vignette offset={0.28} darkness={tod === "evening" ? 0.62 : 0.42} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
