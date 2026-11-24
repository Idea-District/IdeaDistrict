"use client";

import { useSyncExternalStore } from "react";

/*
 * The admin token lives in sessionStorage (gone when the tab closes).
 * If storage is blocked, an in-memory copy keeps this tab working.
 */

const KEY = "idd.adminToken";
const listeners = new Set<() => void>();
let memory: string | null = null;

function read(): string | null {
  try {
    return window.sessionStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

function write(value: string | null) {
  memory = value;
  try {
    if (value === null) window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, value);
  } catch {
    /* storage blocked: the in-memory copy covers this tab */
  }
  listeners.forEach((l) => l());
}

export const saveAdminToken = (token: string) => write(token);
export const clearAdminToken = () => write(null);

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** `undefined` during server render / hydration, then the token or `null`. */
export function useAdminToken(): string | null | undefined {
  return useSyncExternalStore<string | null | undefined>(subscribe, read, () => undefined);
}
