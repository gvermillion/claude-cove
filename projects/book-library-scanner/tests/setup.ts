/**
 * Vitest global test setup.
 *
 * Extends expect with @testing-library/jest-dom matchers and provides
 * a minimal IndexedDB mock so Dexie can initialize in the jsdom environment.
 */

import "@testing-library/jest-dom";

// jsdom does not include IndexedDB. Provide a lightweight stub so Dexie
// can import without throwing. Actual DB operations are mocked at the
// repository level in tests that need them.
if (!globalThis.indexedDB) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).indexedDB = {
    open: () => ({ onupgradeneeded: null, onsuccess: null, onerror: null }),
  };
}
