import { useSyncExternalStore } from "react";
import { makeSeed } from "./seed";
import type { State } from "./types";

export const P07_KEY = "ipp-p07-v1";

let cache: State | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): State | null {
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as State;
    return state?.placement?.placement_id && Array.isArray(state.logs) ? state : null;
  } catch {
    return null;
  }
}

function read(): State {
  if (cache) return cache;
  try {
    cache = parse(window.localStorage.getItem(P07_KEY));
  } catch {
    cache = null;
  }
  return (cache ??= makeSeed());
}

export function setP07(next: State) {
  cache = next;
  try {
    window.localStorage.setItem(P07_KEY, JSON.stringify(next));
  } catch {
    // The page still works until it is closed.
  }
  listeners.forEach((listener) => listener());
}

export function updateP07(rule: (state: State) => State): State {
  try {
    const stored = parse(window.localStorage.getItem(P07_KEY));
    if (stored) cache = stored;
  } catch {
    // Use the in-memory copy.
  }
  const next = rule(read());
  setP07(next);
  return next;
}

export const resetP07 = () => setP07(makeSeed());

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== P07_KEY && event.key !== null) return;
    cache = null;
    listeners.forEach((item) => item());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useP07(): State | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
