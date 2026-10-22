"use client";

import { useSyncExternalStore } from "react";

import type { KnownUnknown, SituationView } from "@idea-district/api-client";

/*
 * The demo has no login: the founder id and the discovery session id live in localStorage.
 * Small in-memory hand-offs (the known list, the first situation) avoid a second round trip
 * when one screen already has the data the next one needs.
 */

const KEYS = {
  founderId: "idd.founderId",
  founderName: "idd.founderName",
  sessionId: "idd.sessionId",
} as const;

type Key = keyof typeof KEYS;

const listeners = new Set<() => void>();

function read(key: Key): string | null {
  try {
    return window.localStorage.getItem(KEYS[key]);
  } catch {
    return null;
  }
}

function write(key: Key, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(KEYS[key]);
    else window.localStorage.setItem(KEYS[key], value);
  } catch {
    /* storage blocked: the flow still works for this tab via memory */
  }
  listeners.forEach((l) => l());
}

export const session = {
  founderId: () => read("founderId"),
  founderName: () => read("founderName"),
  sessionId: () => read("sessionId"),

  /** Starts a fresh founder: clears everything from a previous run. */
  setFounder(id: string, name: string) {
    write("sessionId", null);
    memory.known = null;
    memory.firstSituation = null;
    write("founderName", name);
    write("founderId", id);
  },
  setSessionId: (id: string) => write("sessionId", id),
};

/** In-memory hand-offs between screens (lost on reload, which is fine: screens refetch). */
export const memory: {
  known: KnownUnknown | null;
  firstSituation: SituationView | null;
} = { known: null, firstSituation: null };

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Reads a stored value. Returns `undefined` during server render / hydration (not known yet),
 * then `string | null` on the client.
 */
export function useStored(key: Key): string | null | undefined {
  return useSyncExternalStore<string | null | undefined>(
    subscribe,
    () => read(key),
    () => undefined,
  );
}
