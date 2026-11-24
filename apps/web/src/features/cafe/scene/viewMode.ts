import { useSyncExternalStore } from "react";

/* 3D or the plain page: a per-browser choice for each place, remembered. Server render is always 3D. */
const listeners = new Set<() => void>();

function read(key: string): "3d" | "list" {
  try {
    return localStorage.getItem(key) === "list" ? "list" : "3d";
  } catch {
    return "3d";
  }
}

export function setViewMode(key: string, v: "3d" | "list") {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* storage blocked: the choice lasts until the page reloads */
  }
  listeners.forEach((l) => l());
}

export function useViewMode(key: string) {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => read(key),
    () => "3d" as const,
  );
}
