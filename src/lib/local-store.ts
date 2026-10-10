import { useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed external store for useSyncExternalStore. Snapshots
 * are cached per raw string so React sees a stable reference between changes.
 * `parse` must validate untrusted JSON (users can edit localStorage).
 */
export function createLocalStore<T>(key: string, empty: T, parse: (raw: unknown) => T) {
  let cachedRaw: string | null | undefined;
  let cached: T = empty;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (typeof window === "undefined") return empty;
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return empty;
    }
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    try {
      cached = raw ? parse(JSON.parse(raw)) : empty;
    } catch {
      cached = empty;
    }
    return cached;
  };

  const write = (value: T) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: keep the in-memory value for this session.
      cachedRaw = undefined;
      cached = value;
    }
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  const useStore = () => useSyncExternalStore(subscribe, read, () => empty);

  return { read, write, useStore };
}

const subscribeNever = () => () => {};

/** False during SSR and the hydration render, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}
