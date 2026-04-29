import { useCallback, useEffect, useState } from 'react';

/**
 * useLocalStorage<T>(key, initial)
 *
 * Generic typed wrapper around localStorage. SSR-safe and resilient to
 * environments where localStorage is unavailable (incognito, sandboxed iframes,
 * disabled storage). Falls back to in-memory state on read/write errors.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage unavailable — silently fall back to in-memory state.
    }
  }, [key, value]);

  const setter = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) =>
        typeof next === 'function' ? (next as (p: T) => T)(prev) : next,
      );
    },
    [],
  );

  return [value, setter];
}
