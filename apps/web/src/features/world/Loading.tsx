"use client";

import { useProgress } from "@react-three/drei";

/** A cover while the real models, textures and sky arrive (cached after the first visit). */
export function WorldLoading({ label }: { label: string }) {
  const { active, progress } = useProgress();
  if (!active && progress >= 100) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-espresso text-cream">
      <span aria-hidden className="flex gap-2">
        <span className="pixel h-3.5 w-3.5 animate-pulse" />
        <span className="pixel h-3.5 w-3.5 animate-pulse [animation-delay:150ms]" />
        <span className="pixel h-3.5 w-3.5 animate-pulse [animation-delay:300ms]" />
      </span>
      <p className="text-[15px] font-semibold tracking-wide">
        {label}… {Math.round(progress)}%
      </p>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-cream/20">
        <div className="h-full bg-ember transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
