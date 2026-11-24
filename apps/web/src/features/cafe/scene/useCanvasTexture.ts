import { useEffect, useMemo } from "react";
import type { Texture } from "three";

/** Builds a canvas texture when its inputs change and frees the GPU copy when they change again. */
export function useCanvasTexture<T extends Texture>(make: () => T, key: string): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(() => make(), [key]);
  useEffect(() => () => t.dispose(), [t]);
  return t;
}
