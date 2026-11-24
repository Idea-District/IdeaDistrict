"use client";

import { useSyncExternalStore } from "react";

/*
 * The investor demo has no login either: the investor id and name live in localStorage,
 * under their own keys so an investor session never mixes with a founder session.
 */

const KEYS = {
  investorId: "idd.investorId",
  investorName: "idd.investorName",
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
    /* storage blocked: nothing more we can do in this tab */
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export const investorSession = {
  investorId: () => read("investorId"),
  investorName: () => read("investorName"),

  setInvestor(id: string, name: string) {
    write("investorName", name);
    write("investorId", id);
    notify();
  },
  setName(name: string) {
    write("investorName", name);
    notify();
  },
  signOut() {
    write("investorId", null);
    write("investorName", null);
    notify();
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** `undefined` during server render / hydration, then `string | null` on the client. */
export function useInvestorStored(key: Key): string | null | undefined {
  return useSyncExternalStore<string | null | undefined>(
    subscribe,
    () => read(key),
    () => undefined,
  );
}
