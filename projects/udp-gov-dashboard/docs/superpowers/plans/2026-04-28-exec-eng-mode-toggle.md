# Exec ↔ Engineering Mode Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the UDP Governance Dashboard to support a binary Exec ↔ Engineering mode toggle that swaps the navigation and content surface entirely, providing audience-tailored experiences without runtime dependencies.

**Architecture:** Add a `mode` state (persisted in `localStorage`) that drives both the sidebar tab list and the active view. Move all current views into `src/components/eng/`, create four new exec-tailored views in `src/components/exec/`, give shared diagrams a `mode` prop with parallel content records, and wire a mode-aware shell in `App.tsx`. Each migration step ships green so the demo stays usable throughout.

**Tech Stack:** React 18.3, TypeScript 5.5 (strict), Vite 5.4, Tailwind 3.4, lucide-react. No new runtime dependencies.

**Spec:** [`docs/superpowers/specs/2026-04-28-exec-eng-mode-toggle-design.md`](../specs/2026-04-28-exec-eng-mode-toggle-design.md)

**Testing note:** This project has no test suite. Correctness is verified by (a) `pnpm exec tsc --noEmit` for type safety and (b) manual visual checks in `pnpm dev` for behavior. Each task ends with both checks before commit.

---

## File Structure

After full implementation, the source tree will look like:

```
src/
├── App.tsx                                # mode-aware shell
├── hooks/
│   └── useLocalStorage.ts                 # NEW
└── components/
    ├── ModeToggle.tsx                     # NEW
    ├── primitives.tsx                     # unchanged
    ├── diagrams/
    │   ├── EntitlementsDiagram.tsx        # MODIFIED — mode prop
    │   ├── DefenseDiagram.tsx             # unchanged
    │   ├── SDLCDiagram.tsx                # unchanged
    │   ├── HubSpokeDiagram.tsx            # NEW — extracted from ExtensibilityView, mode prop
    │   └── index.ts                       # MODIFIED — export HubSpokeDiagram
    ├── exec/                              # NEW
    │   ├── ExecSummaryView.tsx
    │   ├── ExecArchitectureView.tsx
    │   ├── ExecSecurityView.tsx
    │   ├── ExecRoadmapView.tsx
    │   └── index.ts
    └── eng/                               # MOVED from src/components/
        ├── SandboxView.tsx
        ├── SchemaView.tsx
        ├── TaxonomyView.tsx
        ├── PolicyView.tsx
        ├── EnforcementView.tsx
        ├── ExtensibilityView.tsx          # MODIFIED — strip exec fragments
        ├── OpsView.tsx                    # MODIFIED — strip exec fragments
        └── index.ts                       # NEW barrel
```

`OverviewView.tsx` is deleted at the end of Phase H — its content disperses into the four new exec views.

---

## Phase A — Plumbing (Migration Step 1)

Goal: introduce the toggle and mode state without changing what the user sees. Both modes display the existing 9 tabs until Phase G wires the real routing.

### Task 1: Add `useLocalStorage` hook

**Files:**
- Create: `src/hooks/useLocalStorage.ts`

- [ ] **Step 1: Implement the hook**

Write the full file:

```ts
// src/hooks/useLocalStorage.ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors. The hook is unused so far; it just has to type-check.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useLocalStorage.ts
git commit -m "feat(udp-dashboard): add useLocalStorage hook for mode persistence"
```

---

### Task 2: Create `ModeToggle` component

**Files:**
- Create: `src/components/ModeToggle.tsx`

The toggle is a two-state segmented pill. It supports a collapsed presentation when the sidebar is icon-only (per spec §4.1: "compresses to a small two-cell pill"). The component is presentational — `App.tsx` owns state.

- [ ] **Step 1: Implement the component**

```tsx
// src/components/ModeToggle.tsx
import React from 'react';
import { Briefcase, Wrench } from 'lucide-react';

export type Mode = 'exec' | 'eng';

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
  collapsed?: boolean;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({
  mode,
  onChange,
  collapsed = false,
}) => {
  const isExec = mode === 'exec';

  if (collapsed) {
    return (
      <div className="mx-3 mb-3 flex flex-col gap-1 rounded-lg border border-white/15 bg-[#0a0a0a] p-1">
        <button
          onClick={() => onChange('exec')}
          aria-label="Switch to Exec mode"
          aria-pressed={isExec}
          className={`flex items-center justify-center rounded-md p-2 transition-colors ${
            isExec
              ? 'bg-red-600 text-white'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
          }`}
        >
          <Briefcase size={14} />
        </button>
        <button
          onClick={() => onChange('eng')}
          aria-label="Switch to Engineering mode"
          aria-pressed={!isExec}
          className={`flex items-center justify-center rounded-md p-2 transition-colors ${
            !isExec
              ? 'bg-red-600 text-white'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
          }`}
        >
          <Wrench size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Audience mode"
      className="mx-3 mb-3 flex h-9 items-center rounded-lg border border-white/15 bg-[#0a0a0a] p-1"
    >
      <button
        onClick={() => onChange('exec')}
        aria-pressed={isExec}
        className={`flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
          isExec
            ? 'bg-red-600 text-white shadow-sm shadow-red-900/30'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Briefcase size={12} />
        Exec
      </button>
      <button
        onClick={() => onChange('eng')}
        aria-pressed={!isExec}
        className={`flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
          !isExec
            ? 'bg-red-600 text-white shadow-sm shadow-red-900/30'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Wrench size={12} />
        Eng
      </button>
    </div>
  );
};

export default ModeToggle;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ModeToggle.tsx
git commit -m "feat(udp-dashboard): add ModeToggle pill with collapsed-sidebar variant"
```

---

### Task 3: Wire mode state into `App.tsx` (no behavior change yet)

Both modes still show the current 9 tabs. We persist `mode` and per-mode active tab into `localStorage`, but the menu/views map remains keyed on the existing `TabId`.

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx**

Replace the entire file contents with:

```tsx
// src/App.tsx
import React, { useCallback } from 'react';
import {
  Shield,
  Cpu,
  Layers,
  Tags,
  Table2,
  Code,
  Globe,
  Settings,
  Database,
  AlertTriangle,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SidebarItem } from './components/primitives';
import { ModeToggle, type Mode } from './components/ModeToggle';
import { useLocalStorage } from './hooks/useLocalStorage';
import OverviewView from './components/OverviewView';
import SandboxView from './components/SandboxView';
import EnforcementView from './components/EnforcementView';
import TaxonomyView from './components/TaxonomyView';
import PolicyView from './components/PolicyView';
import SchemaView from './components/SchemaView';
import ExtensibilityView from './components/ExtensibilityView';
import OpsView from './components/OpsView';

type TabId =
  | 'overview'
  | 'sandbox'
  | 'enforcement'
  | 'taxonomy'
  | 'schema'
  | 'policy'
  | 'extensibility'
  | 'ops';

const menuItems: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Exec Summary', icon: Shield },
  { id: 'sandbox', label: 'Developer Experience', icon: Cpu },
  { id: 'enforcement', label: 'Hardening', icon: Layers },
  { id: 'taxonomy', label: 'Tag Taxonomy', icon: Tags },
  { id: 'schema', label: 'Schema Design', icon: Table2 },
  { id: 'policy', label: 'Policy Logic', icon: Code },
  { id: 'extensibility', label: 'Extensibility', icon: Globe },
  { id: 'ops', label: 'Roadmap & Ops', icon: Settings },
];

export default function App() {
  const [mode, setMode] = useLocalStorage<Mode>('udp-mode', 'exec');
  const [activeTab, setActiveTab] = useLocalStorage<TabId>(
    'udp-active-tab',
    'overview',
  );
  const [isSidebarOpen, setSidebarOpen] = useLocalStorage<boolean>(
    'udp-sidebar-open',
    true,
  );

  const navigateTo = useCallback(
    (tabId: string) => {
      setActiveTab(tabId as TabId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setActiveTab],
  );

  const views: Record<TabId, React.ReactNode> = {
    overview: <OverviewView onNavigate={navigateTo} />,
    sandbox: <SandboxView onNavigate={navigateTo} />,
    enforcement: <EnforcementView />,
    taxonomy: <TaxonomyView />,
    schema: <SchemaView />,
    policy: <PolicyView />,
    extensibility: <ExtensibilityView />,
    ops: <OpsView />,
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex font-sans selection:bg-red-600/30">
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } fixed inset-y-0 left-0 bg-[#0d0d0d] border-r border-white/15 transition-all duration-300 z-50 flex flex-col`}
      >
        <div className="p-6 flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-600 flex items-center justify-center rounded-sm shrink-0 shadow-lg shadow-red-900/10">
              <Shield size={22} className="text-white fill-white" />
            </div>
            {isSidebarOpen && (
              <span className="font-black tracking-tighter text-2xl leading-none italic">
                UDP<span className="text-red-600">GOV</span>
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-white/5 rounded text-gray-500 transition-colors"
          >
            {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
        </div>

        <ModeToggle mode={mode} onChange={setMode} collapsed={!isSidebarOpen} />

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-6">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={isSidebarOpen ? item.label : ''}
              active={activeTab === item.id}
              onClick={() => navigateTo(item.id)}
            />
          ))}
        </nav>
      </aside>

      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        } p-10 pb-24`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="min-h-[70vh]">{views[activeTab]}</div>
        </div>
      </main>

      <footer
        className={`fixed bottom-0 right-0 h-12 bg-[#0d0d0d]/90 backdrop-blur-xl border-t border-white/15 flex items-center justify-between px-10 z-40 text-[9px] font-black text-gray-600 uppercase tracking-[.5em] transition-all duration-300 ${
          isSidebarOpen ? 'left-64' : 'left-20'
        }`}
      >
        <div className="flex items-center space-x-8">
          <span className="flex items-center gap-2 italic">
            <Database size={10} className="text-red-800" /> CROWDSTRIKE UDP
          </span>
          <span>SILVER LAYER & GOVERNANCE</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} className="text-red-800" />
          <span className="text-red-800">PROPRIETARY / INTERNAL</span>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Visual smoke test**

Run: `pnpm dev`
Open http://localhost:5173. Verify:
- The Exec/Eng toggle pill renders below the UDPGOV logo, above the menu items.
- Clicking Exec/Eng visibly toggles the active state on the pill (red highlight moves).
- Reload the page — the toggle remembers which mode was last selected.
- Collapse the sidebar — the toggle becomes a stacked pair of icon-only buttons (Briefcase + Wrench).
- The 9 menu items, the active tab content, and footer are unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(udp-dashboard): wire mode state and ModeToggle into App shell"
```

---

## Phase B — Move existing views into `eng/` (Migration Step 2)

Goal: relocate every current view into `src/components/eng/`. No behavior change — just imports.

### Task 4: Move view files into `src/components/eng/`

**Files:**
- Move: `src/components/{Overview,Sandbox,Enforcement,Taxonomy,Schema,Policy,Extensibility,Ops}View.tsx` → `src/components/eng/`

We keep `OverviewView` here for now even though it will be deleted in Phase H — the migration plan calls for deletion only after the exec views replace it.

- [ ] **Step 1: Move the files with `git mv` to preserve history**

```bash
mkdir -p src/components/eng
git mv src/components/OverviewView.tsx     src/components/eng/OverviewView.tsx
git mv src/components/SandboxView.tsx      src/components/eng/SandboxView.tsx
git mv src/components/EnforcementView.tsx  src/components/eng/EnforcementView.tsx
git mv src/components/TaxonomyView.tsx     src/components/eng/TaxonomyView.tsx
git mv src/components/SchemaView.tsx       src/components/eng/SchemaView.tsx
git mv src/components/PolicyView.tsx       src/components/eng/PolicyView.tsx
git mv src/components/ExtensibilityView.tsx src/components/eng/ExtensibilityView.tsx
git mv src/components/OpsView.tsx          src/components/eng/OpsView.tsx
```

- [ ] **Step 2: Update intra-`eng` imports**

Each moved file currently imports from `'./primitives'` and `'./diagrams'`. After the move, both are one directory up: `'../primitives'` and `'../diagrams'`.

Run a search to find every relative import that needs adjusting:

```bash
grep -rn "from './primitives'" src/components/eng/
grep -rn "from './diagrams" src/components/eng/
```

For each match, change `'./primitives'` → `'../primitives'` and `'./diagrams'` → `'../diagrams'`. Edit each file:

- `src/components/eng/OverviewView.tsx`
- `src/components/eng/SandboxView.tsx`
- `src/components/eng/EnforcementView.tsx`
- `src/components/eng/TaxonomyView.tsx`
- `src/components/eng/SchemaView.tsx`
- `src/components/eng/PolicyView.tsx`
- `src/components/eng/ExtensibilityView.tsx`
- `src/components/eng/OpsView.tsx`

Example diff for `SandboxView.tsx`:

```diff
-import { SectionHeader, CalloutBox, C } from './primitives';
-import { SDLCDiagram } from './diagrams';
+import { SectionHeader, CalloutBox, C } from '../primitives';
+import { SDLCDiagram } from '../diagrams';
```

- [ ] **Step 3: Update App.tsx imports**

Edit `src/App.tsx` so the eight engineering view imports point to `./components/eng/...`:

```diff
-import OverviewView from './components/OverviewView';
-import SandboxView from './components/SandboxView';
-import EnforcementView from './components/EnforcementView';
-import TaxonomyView from './components/TaxonomyView';
-import PolicyView from './components/PolicyView';
-import SchemaView from './components/SchemaView';
-import ExtensibilityView from './components/ExtensibilityView';
-import OpsView from './components/OpsView';
+import OverviewView from './components/eng/OverviewView';
+import SandboxView from './components/eng/SandboxView';
+import EnforcementView from './components/eng/EnforcementView';
+import TaxonomyView from './components/eng/TaxonomyView';
+import PolicyView from './components/eng/PolicyView';
+import SchemaView from './components/eng/SchemaView';
+import ExtensibilityView from './components/eng/ExtensibilityView';
+import OpsView from './components/eng/OpsView';
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors. If any file complains about a missing `./primitives` or `./diagrams` import, that file's relative paths still need to be bumped one level up.

- [ ] **Step 5: Visual smoke test**

Run: `pnpm dev`
Click through all 8 tabs. Each view should render exactly as before. The mode toggle still works as in Task 3.

- [ ] **Step 6: Commit**

```bash
git add src/components/eng src/App.tsx
git commit -m "refactor(udp-dashboard): move existing views into src/components/eng/"
```

---

### Task 5: Add `eng/index.ts` barrel

A barrel file is convenient for the typed mode-aware routing in Phase G. Add it now so later phases can import cleanly.

**Files:**
- Create: `src/components/eng/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
// src/components/eng/index.ts
export { default as OverviewView } from './OverviewView';
export { default as SandboxView } from './SandboxView';
export { default as EnforcementView } from './EnforcementView';
export { default as TaxonomyView } from './TaxonomyView';
export { default as SchemaView } from './SchemaView';
export { default as PolicyView } from './PolicyView';
export { default as ExtensibilityView } from './ExtensibilityView';
export { default as OpsView } from './OpsView';
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/index.ts
git commit -m "refactor(udp-dashboard): add eng/index.ts barrel"
```

---

## Phase C — Exec scaffolding (Migration Step 3)

Goal: create the `exec/` folder with four empty stub views. The stubs render a single placeholder banner so the engineer can wire routing in Phase G even before content is filled in.

### Task 6: Create exec view stubs and barrel

**Files:**
- Create: `src/components/exec/ExecSummaryView.tsx`
- Create: `src/components/exec/ExecArchitectureView.tsx`
- Create: `src/components/exec/ExecSecurityView.tsx`
- Create: `src/components/exec/ExecRoadmapView.tsx`
- Create: `src/components/exec/index.ts`

- [ ] **Step 1: Make the directory and write the stubs**

```bash
mkdir -p src/components/exec
```

`src/components/exec/ExecSummaryView.tsx`:

```tsx
import React from 'react';

const ExecSummaryView: React.FC = () => (
  <div className="space-y-10 animate-in fade-in duration-700">
    <div className="rounded-xl border border-white/15 bg-[#111] p-8">
      <p className="text-xs uppercase tracking-widest text-gray-500">
        Exec · Summary (stub)
      </p>
    </div>
  </div>
);

export default ExecSummaryView;
```

`src/components/exec/ExecArchitectureView.tsx`:

```tsx
import React from 'react';

const ExecArchitectureView: React.FC = () => (
  <div className="space-y-10 animate-in fade-in duration-700">
    <div className="rounded-xl border border-white/15 bg-[#111] p-8">
      <p className="text-xs uppercase tracking-widest text-gray-500">
        Exec · Architecture (stub)
      </p>
    </div>
  </div>
);

export default ExecArchitectureView;
```

`src/components/exec/ExecSecurityView.tsx`:

```tsx
import React from 'react';

const ExecSecurityView: React.FC = () => (
  <div className="space-y-10 animate-in fade-in duration-700">
    <div className="rounded-xl border border-white/15 bg-[#111] p-8">
      <p className="text-xs uppercase tracking-widest text-gray-500">
        Exec · Security (stub)
      </p>
    </div>
  </div>
);

export default ExecSecurityView;
```

`src/components/exec/ExecRoadmapView.tsx`:

```tsx
import React from 'react';

const ExecRoadmapView: React.FC = () => (
  <div className="space-y-10 animate-in fade-in duration-700">
    <div className="rounded-xl border border-white/15 bg-[#111] p-8">
      <p className="text-xs uppercase tracking-widest text-gray-500">
        Exec · Roadmap (stub)
      </p>
    </div>
  </div>
);

export default ExecRoadmapView;
```

`src/components/exec/index.ts`:

```ts
export { default as ExecSummaryView } from './ExecSummaryView';
export { default as ExecArchitectureView } from './ExecArchitectureView';
export { default as ExecSecurityView } from './ExecSecurityView';
export { default as ExecRoadmapView } from './ExecRoadmapView';
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors. The stubs are unused so far but must type-check.

- [ ] **Step 3: Commit**

```bash
git add src/components/exec
git commit -m "feat(udp-dashboard): scaffold exec view stubs and barrel"
```

---

## Phase D — Diagram mode-awareness (prep for Migration Step 4)

Goal: the two diagrams that appear in both modes (`EntitlementsDiagram`, hub-and-spoke) need a `mode?: 'exec' | 'eng'` prop. Default `'eng'` so existing callers stay untouched. Exec mode swaps the detail panel content; the visual diagram itself is unchanged.

### Task 7: Add `mode` prop to `EntitlementsDiagram` with parallel exec content

**Files:**
- Modify: `src/components/diagrams/EntitlementsDiagram.tsx`

The diagram currently has a single `ENT_DATA: Record<string, EntNode>` with seven nodes (`okta`, `sf`, `future-src`, `pdp`, `snow`, `cloud`, `future-pep`). Each node has a `content: ReactNode` and `edges: string[]`. We will:

1. Rename the existing record to `ENT_DATA_ENG`.
2. Author a parallel `ENT_DATA_EXEC` with exec-altitude content (no SQL, no schema/role names; emphasize business outcome).
3. Accept a `mode?: 'exec' | 'eng'` prop, default `'eng'`.
4. Pick the active record by `mode`.

- [ ] **Step 1: Read the current file**

```bash
rtk read src/components/diagrams/EntitlementsDiagram.tsx
```

Locate the `ENT_DATA` record and the component signature. The component is exported as a named export `EntitlementsDiagram` (per `diagrams/index.ts`).

- [ ] **Step 2: Rename existing record and add exec parallel**

Rename the existing `ENT_DATA` to `ENT_DATA_ENG` (no edits to its content — preserve current engineering copy verbatim).

Below `ENT_DATA_ENG`, add a parallel `ENT_DATA_EXEC` with the same shape and the same `edges` arrays for each node (so the diagram structure renders identically), but with audience-tailored `content`.

Use this exact authoring (place after the closing `};` of `ENT_DATA_ENG`):

```tsx
const ENT_DATA_EXEC: typeof ENT_DATA_ENG = {
  okta: {
    edges: ENT_DATA_ENG.okta.edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">Identity input.</span>{' '}
          Who works here, and what teams they belong to.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          Owned by IT/IAM. Already maintained today as part of standard SSO
          provisioning — governance reuses it.
        </p>
      </>
    ),
  },
  sf: {
    edges: ENT_DATA_ENG.sf.edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">Ownership input.</span>{' '}
          Which records belong to which person or team.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          Owned by Sales Ops and Domain Stewards. Already maintained as part of
          day-to-day account management — governance reuses it.
        </p>
      </>
    ),
  },
  'future-src': {
    edges: ENT_DATA_ENG['future-src'].edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">Any future identity or ownership system.</span>{' '}
          New HR systems, partner directories, ticketing platforms.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          Adding a new source feeds the same central rule book — every existing
          enforcement point inherits the change automatically.
        </p>
      </>
    ),
  },
  pdp: {
    edges: ENT_DATA_ENG.pdp.edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">The single rule book.</span>{' '}
          One canonical source of truth for who can see what.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          Every enforcement point — Snowflake, S3, AI agents — reads from here.
          Change a rule once; it propagates everywhere.
        </p>
      </>
    ),
  },
  snow: {
    edges: ENT_DATA_ENG.snow.edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">Snowflake — analyst access.</span>{' '}
          Dashboards and queries respect the rule book at query time.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          Invisible to the analyst. They write a query; the platform filters
          the rows they're not entitled to see.
        </p>
      </>
    ),
  },
  cloud: {
    edges: ENT_DATA_ENG.cloud.edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">AWS — services and data lakes.</span>{' '}
          The same rule book governs S3 buckets and cloud workloads.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          One identity, one rule book — applied consistently across the cloud
          estate.
        </p>
      </>
    ),
  },
  'future-pep': {
    edges: ENT_DATA_ENG['future-pep'].edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">Any future enforcement point.</span>{' '}
          A new BI tool, a custom service, an AI agent.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          Plug it in and it inherits every existing access rule on day one.
          No parallel governance system to build.
        </p>
      </>
    ),
  },
};
```

- [ ] **Step 3: Update the component signature and content selection**

Find the exported component declaration (currently `export const EntitlementsDiagram = () => { ... }` or similar). Update it to accept a `mode` prop and select the active data record:

```tsx
type EntMode = 'exec' | 'eng';

interface EntitlementsDiagramProps {
  mode?: EntMode;
}

export const EntitlementsDiagram: React.FC<EntitlementsDiagramProps> = ({
  mode = 'eng',
}) => {
  const ENT_DATA = mode === 'exec' ? ENT_DATA_EXEC : ENT_DATA_ENG;
  // ...rest of component body unchanged — every reference to ENT_DATA still resolves.
};
```

Inside the component body, every existing reference to `ENT_DATA[...]` continues to work because we shadow the constant with a `const ENT_DATA = ...` selection. Do not rename any inner usages.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors. The default `mode = 'eng'` keeps all existing callers (engineering views) unchanged.

- [ ] **Step 5: Visual smoke test**

Run: `pnpm dev`. The dashboard still renders the engineering Overview/etc. views. Find a tab that uses `EntitlementsDiagram` (e.g., the existing Exec Summary's Solution Pattern section, or wherever the diagram appears today) and click each spoke to confirm the engineering content panels still appear unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/diagrams/EntitlementsDiagram.tsx
git commit -m "feat(udp-dashboard): add mode prop with exec content to EntitlementsDiagram"
```

---

### Task 8: Extract `HubSpokeDiagram` from `ExtensibilityView`

The hub-and-spoke visual currently lives inline inside `src/components/eng/ExtensibilityView.tsx` (lines containing `spokeNodes`, `SpokeLine`, the SVG, and the spoke buttons). The exec architecture view needs to render the same visual with exec-mode content. Extract into a standalone diagram with a `mode` prop.

**Files:**
- Create: `src/components/diagrams/HubSpokeDiagram.tsx`
- Modify: `src/components/diagrams/index.ts`
- Modify: `src/components/eng/ExtensibilityView.tsx`

- [ ] **Step 1: Create the standalone diagram**

Write `src/components/diagrams/HubSpokeDiagram.tsx`:

```tsx
import React, { useState } from 'react';
import { Database, Cloud, Bot, Snowflake, Plus } from 'lucide-react';
import { DetailPanel, C } from '../primitives';

type HubSpokeMode = 'exec' | 'eng';

interface SpokeNode {
  id: string;
  label: string;
  sublabel: string;
  color: 'blue' | 'amber' | 'red' | 'gray';
  icon: React.ElementType;
  dashed?: boolean;
  pos: { top: string; left: string };
  line: { x: number; y: number };
  /** Engineering-altitude detail panel content. */
  detailEng: React.ReactNode;
  /** Exec-altitude detail panel content. */
  detailExec: React.ReactNode;
  /** Engineering-only fields, rendered only in eng mode. */
  mechanism?: string;
  reads?: string;
  failClosed?: string;
}

const spokeNodes: SpokeNode[] = [
  {
    id: 'snowflake',
    label: 'Snowflake',
    sublabel: 'Row Access Policies',
    color: 'blue',
    icon: Snowflake,
    pos: { top: '10%', left: '20%' },
    line: { x: -140, y: -100 },
    mechanism: 'Tag-based Row Access Policies evaluated at query time.',
    reads:
      'USER_ENTITLEMENTS, DATA_DOMAIN, SENSITIVITY_LEVEL tags — joined via CURRENT_ROLE() and session context.',
    failClosed:
      'If ENTITLEMENTS is unavailable, the RAP returns zero rows. No silent data leak — fail-closed by default.',
    detailEng: (
      <>
        RAPs attached to Tags. The RAP inspects <C>ENTITLEMENTS</C> at query
        time — no manual join required. Enforcement is invisible to the
        analyst. Primary enforcement point for structured analytics.
      </>
    ),
    detailExec: (
      <>
        Snowflake — where analysts run dashboards and queries. Access rules
        apply automatically; analysts never see data they aren't entitled to.
      </>
    ),
  },
  {
    id: 's3',
    label: 'AWS S3',
    sublabel: 'IAM / Lake Formation',
    color: 'amber',
    icon: Cloud,
    pos: { top: '10%', left: '80%' },
    line: { x: 140, y: -100 },
    mechanism:
      'IAM policies + Lake Formation permissions consuming ENTITLEMENTS via S3 mirror.',
    reads:
      'Mirrored ENTITLEMENTS parquet files or API endpoint — same columns (USER_ID, DATA_DOMAIN, REGION).',
    failClosed:
      'Lake Formation denies by default. If the mirror is stale, the last-known entitlements apply — never a permissive fallback.',
    detailEng: (
      <>
        IAM policies and Lake Formation permissions consume the same{' '}
        <C>ENTITLEMENTS</C> data via S3 mirror or API. S3 bucket policies
        enforce row/column-level access using the same identity-to-data mapping.
      </>
    ),
    detailExec: (
      <>
        AWS S3 — data lakes and cloud services. The same rule book governs who
        can read which buckets and which rows inside them.
      </>
    ),
  },
  {
    id: 'bedrock',
    label: 'Bedrock',
    sublabel: 'Guardrails / Context',
    color: 'red',
    icon: Bot,
    pos: { top: '85%', left: '20%' },
    line: { x: -140, y: 100 },
    mechanism:
      'AI guardrails and context-window scoping via ENTITLEMENTS lookup before inference.',
    reads:
      'Same ENTITLEMENTS columns — the agent resolves the caller identity and filters context to entitled data only.',
    failClosed:
      'If ENTITLEMENTS is unreachable, the agent refuses to answer data questions. No hallucinated access grants.',
    detailEng: (
      <>
        AI agents look up <C>ENTITLEMENTS</C> to scope context windows and
        guardrails. The same "Region = West" filter applies to a chatbot as to
        a dashboard. Prevents AI agents from surfacing data the user isn't
        entitled to see.
      </>
    ),
    detailExec: (
      <>
        AI agents and copilots. The same access rules constrain what the AI
        can pull into context — a chatbot is held to the same data perimeter
        as a dashboard.
      </>
    ),
  },
  {
    id: 'future',
    label: 'Future PEP',
    sublabel: 'Any platform',
    color: 'gray',
    icon: Plus,
    dashed: true,
    pos: { top: '85%', left: '80%' },
    line: { x: 140, y: 100 },
    mechanism: 'Any platform that can query a table or call an API.',
    reads:
      'Standard ENTITLEMENTS schema — USER_ID, DATA_DOMAIN, SENSITIVITY_LEVEL, REGION, VALID_FROM, VALID_TO.',
    failClosed:
      'Implementation-specific, but the pattern is always deny-by-default. No entitlement row = no access.',
    detailEng: (
      <>
        Any future platform — a new BI tool, a custom microservice, a partner
        integration — adds enforcement by implementing a single lookup against{' '}
        <C>ENTITLEMENTS</C>. No schema changes, no new mapping tables, no
        governance redesign.
      </>
    ),
    detailExec: (
      <>
        Any future platform. Plug it in and it inherits every existing access
        rule on day one — no parallel governance system to design.
      </>
    ),
  },
];

const SpokeLine = ({
  x,
  y,
  active,
  dashed,
}: {
  x: number;
  y: number;
  active: boolean;
  dashed?: boolean;
}) => {
  const cx = 200;
  const cy = 130;
  return (
    <line
      x1={cx}
      y1={cy}
      x2={cx + x}
      y2={cy + y}
      stroke={active ? '#10b981' : '#555'}
      strokeWidth={active ? 2 : 1.5}
      strokeDasharray={dashed ? '6 4' : active ? '8 4' : 'none'}
      className="transition-all duration-500"
    >
      {active && (
        <animate
          attributeName="stroke-dashoffset"
          values="24;0"
          dur="1s"
          repeatCount="indefinite"
        />
      )}
    </line>
  );
};

interface HubSpokeDiagramProps {
  mode?: HubSpokeMode;
}

export const HubSpokeDiagram: React.FC<HubSpokeDiagramProps> = ({
  mode = 'eng',
}) => {
  const [activeSpoke, setActiveSpoke] = useState(0);
  const spoke = spokeNodes[activeSpoke];

  return (
    <div className="bg-[#111] border border-white/20 rounded-xl p-8 space-y-6">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
        PDP / PEP Architecture — Hub and Spoke
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <div className="relative w-full" style={{ minHeight: 320 }}>
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 400 260"
            preserveAspectRatio="xMidYMid meet"
          >
            {spokeNodes.map((node, i) => (
              <SpokeLine
                key={node.id}
                x={node.line.x}
                y={node.line.y}
                active={activeSpoke === i}
                dashed={node.dashed}
              />
            ))}
          </svg>

          <div
            className="absolute rounded-2xl border-2 border-emerald-600/60 bg-emerald-600/15 px-5 py-4 text-center shadow-lg shadow-emerald-900/20 z-10"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              minWidth: 170,
            }}
          >
            <Database size={20} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-400 text-[11px] font-black uppercase tracking-wider">
              ENTITLEMENTS
            </p>
            <p className="text-emerald-300/60 text-[9px] mt-1">
              Policy Decision Point
            </p>
          </div>

          {spokeNodes.map((node, i) => {
            const isActive = activeSpoke === i;
            const Icon = node.icon;
            const colorMap: Record<string, string> = {
              blue: isActive
                ? 'border-blue-500/60 bg-blue-600/20 shadow-blue-900/30'
                : 'border-blue-600/30 bg-blue-600/10',
              amber: isActive
                ? 'border-amber-500/60 bg-amber-600/20 shadow-amber-900/30'
                : 'border-amber-600/30 bg-amber-600/10',
              red: isActive
                ? 'border-red-500/60 bg-red-600/20 shadow-red-900/30'
                : 'border-red-600/30 bg-red-600/10',
              gray: isActive
                ? 'border-white/30 bg-white/10 shadow-white/5'
                : 'border-white/15 bg-white/[0.06]',
            };
            const textColor: Record<string, string> = {
              blue: 'text-blue-400',
              amber: 'text-amber-400',
              red: 'text-red-400',
              gray: 'text-gray-400',
            };
            return (
              <button
                key={node.id}
                onClick={() => setActiveSpoke(i)}
                className={`absolute z-10 rounded-xl border px-4 py-3 text-center transition-all duration-300 cursor-pointer hover:scale-105 ${colorMap[node.color]} ${
                  isActive ? 'ring-2 ring-white/20 scale-105 shadow-lg' : ''
                } ${node.dashed ? 'border-dashed' : ''}`}
                style={{
                  top: node.pos.top,
                  left: node.pos.left,
                  transform: 'translate(-50%, -50%)',
                  minWidth: 120,
                }}
              >
                <Icon
                  size={16}
                  className={`mx-auto mb-1.5 ${textColor[node.color]}`}
                />
                <p
                  className={`text-[10px] font-bold uppercase tracking-wide ${textColor[node.color]}`}
                >
                  {node.label}
                </p>
                <p className="text-[9px] text-gray-500 mt-0.5">
                  {node.sublabel}
                </p>
              </button>
            );
          })}
        </div>

        <DetailPanel activeKey={activeSpoke}>
          <div className="p-5 rounded-xl border border-white/20 bg-white/[0.03] space-y-4">
            <div className="flex items-center gap-2">
              <spoke.icon size={16} className="text-red-500 shrink-0" />
              <p className="text-sm font-bold uppercase tracking-wide text-white">
                {spoke.label}
              </p>
            </div>

            {mode === 'eng' ? (
              <>
                <div className="space-y-3 text-xs text-gray-400 leading-relaxed">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                      Enforcement Mechanism
                    </p>
                    <p>{spoke.mechanism}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                      Reads from ENTITLEMENTS
                    </p>
                    <p>{spoke.reads}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                      Fail-Closed Behavior
                    </p>
                    <p>{spoke.failClosed}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed border-t border-white/10 pt-3">
                  {spoke.detailEng}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-300 leading-relaxed">
                {spoke.detailExec}
              </p>
            )}
          </div>
        </DetailPanel>
      </div>

      <p className="text-[10px] text-gray-500 text-center italic">
        {mode === 'eng'
          ? 'Click any spoke to inspect its enforcement mechanism, data contract, and fail-closed behavior'
          : 'Click any platform to see how it fits the architecture'}
      </p>
    </div>
  );
};

export default HubSpokeDiagram;
```

- [ ] **Step 2: Add the export to the diagrams barrel**

Edit `src/components/diagrams/index.ts`:

```diff
 export { EntitlementsDiagram } from './EntitlementsDiagram';
 export { DefenseDiagram } from './DefenseDiagram';
 export { SDLCDiagram } from './SDLCDiagram';
+export { HubSpokeDiagram } from './HubSpokeDiagram';
```

- [ ] **Step 3: Replace the inline hub-spoke in `ExtensibilityView` with the standalone diagram**

In `src/components/eng/ExtensibilityView.tsx`:

1. Add `HubSpokeDiagram` to the diagrams import: `import { HubSpokeDiagram } from '../diagrams';`
2. Delete the local `interface SpokeNode`, the `spokeNodes` array, the `SpokeLine` component, and the entire JSX block that renders the hub-and-spoke diagram (the `<div className="bg-[#111] border border-white/20 rounded-xl p-8 space-y-6">` containing the SVG and spoke buttons — terminating just before the `<CalloutBox title="Vendor Neutrality" ...>` block).
3. Replace that JSX block with `<HubSpokeDiagram mode="eng" />`.
4. Remove the `useState(0)` for `activeSpoke` and any unused imports (`Snowflake`, `Cloud`, `Bot`, `Plus`, `Database` are no longer needed unless they appear elsewhere in the file — check before removing).

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors. If TypeScript flags an unused `useState` or icon import in `ExtensibilityView`, remove the unused symbol.

- [ ] **Step 5: Visual smoke test**

Run: `pnpm dev`. Navigate to the Extensibility tab. The hub-and-spoke renders identically to before. Click each spoke and confirm the engineering detail panel content (mechanism, reads, fail-closed) is unchanged. The "Adding a New PEP" and "Adding a New PDP Source" walkthroughs below should still work.

- [ ] **Step 6: Commit**

```bash
git add src/components/diagrams/HubSpokeDiagram.tsx src/components/diagrams/index.ts src/components/eng/ExtensibilityView.tsx
git commit -m "refactor(udp-dashboard): extract HubSpokeDiagram with mode prop"
```

---

## Phase E — Build out exec views (Migration Step 4)

Goal: replace each stub from Phase C with the real exec content. Lift content from `OverviewView` (and exec fragments of `ExtensibilityView` / `OpsView`) without modifying the source files yet — those are stripped in Phase F. Each exec view is wired into App.tsx in Phase G; for now, only the file content matters.

### Task 9: Implement `ExecSummaryView`

**Spec reference:** §5.1. Hero + problem statement (reuse from `OverviewView`), Maximising UDP Investment callout, Vendor Neutrality callout, bottom CTA "How does it work? → Architecture."

**Files:**
- Modify: `src/components/exec/ExecSummaryView.tsx`

- [ ] **Step 1: Replace the stub with the real implementation**

```tsx
// src/components/exec/ExecSummaryView.tsx
import React from 'react';
import { Shield, Zap, Globe, ArrowRight } from 'lucide-react';
import { InfoCard } from '../primitives';

interface ExecSummaryViewProps {
  onNavigate?: (tabId: string) => void;
}

const ExecSummaryView: React.FC<ExecSummaryViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#050505] border border-white/15 rounded-xl p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Shield size={300} className="text-red-600" />
        </div>
        <div className="relative z-10 max-w-4xl">
          <div className="inline-block px-3 py-1 bg-red-600/10 border border-red-600/30 rounded-full text-red-500 text-[10px] font-black uppercase tracking-widest mb-6">
            Executive Summary
          </div>
          <h1 className="text-4xl font-black text-white mb-4 leading-[1.1] tracking-tighter uppercase">
            Snowflake Governance &<br /> Access Architecture Plan
          </h1>
          <p className="text-gray-400 text-base leading-relaxed font-light max-w-3xl">
            CrowdStrike's security engineering team identified gaps in
            Snowflake's row-level security propagation. This plan closes every
            gap using standard, vendor-neutral patterns — layered onto the{' '}
            <span className="text-white font-semibold">
              Unified Data Platform (UDP)
            </span>{' '}
            build already in motion.
          </p>
        </div>
      </div>

      {/* Two callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard title="Maximising UDP Investment" icon={Zap} accent="emerald">
          <p>
            Environment setup, medallion architecture, and automated ingestion
            are already scoped as core UDP work. Governance layered on top
            moves from high-overhead manual provisioning to a{' '}
            <span className="text-emerald-400 font-semibold">
              net-negative effort operation
            </span>
            .
          </p>
        </InfoCard>
        <InfoCard
          title="Multi-Platform Vendor Neutrality"
          icon={Globe}
          accent="emerald"
        >
          <p>
            The architecture decouples decision-making from enforcement. The
            same security logic extends to AWS, S3, and Bedrock without
            duplication — and to any future platform.
          </p>
        </InfoCard>
      </div>

      {/* CTA */}
      <button
        onClick={() => onNavigate?.('architecture')}
        className="group flex items-center gap-3 rounded-xl border border-white/20 bg-[#111] px-6 py-4 transition-colors hover:border-red-600/40 hover:bg-red-600/5"
      >
        <span className="text-sm font-bold uppercase tracking-tight text-white">
          How does it work?
        </span>
        <span className="text-xs text-gray-500">→ Architecture</span>
        <ArrowRight
          size={16}
          className="ml-auto text-red-500 transition-transform group-hover:translate-x-1"
        />
      </button>
    </div>
  );
};

export default ExecSummaryView;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/exec/ExecSummaryView.tsx
git commit -m "feat(udp-dashboard): implement ExecSummaryView"
```

---

### Task 10: Implement `ExecArchitectureView` (three-beat narrative)

**Spec reference:** §5.2. Three beats: (1) Segregation via `EntitlementsDiagram` mode='exec', (2) Extensibility via `HubSpokeDiagram` mode='exec', (3) The 3-step extension: a three-card horizontal strip with arrows between cards (**Connect → Enforce → Done**), each card with an icon, a one-word title, and a one-sentence subtitle.

**Files:**
- Modify: `src/components/exec/ExecArchitectureView.tsx`

- [ ] **Step 1: Replace the stub with the real implementation**

```tsx
// src/components/exec/ExecArchitectureView.tsx
import React from 'react';
import {
  GitBranch,
  Network,
  Plug,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { SectionHeader } from '../primitives';
import { EntitlementsDiagram, HubSpokeDiagram } from '../diagrams';

const extensionSteps: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: 'blue' | 'amber' | 'emerald';
}[] = [
  {
    title: 'Connect',
    subtitle: 'Point the new platform at the central rule book.',
    icon: Plug,
    color: 'blue',
  },
  {
    title: 'Enforce',
    subtitle: 'Plug into the existing access rules — no new logic to design.',
    icon: ShieldCheck,
    color: 'amber',
  },
  {
    title: 'Done',
    subtitle: 'Every existing entitlement applies on day one.',
    icon: CheckCircle2,
    color: 'emerald',
  },
];

const ExecArchitectureView: React.FC = () => {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <SectionHeader
        title="Architecture"
        subtitle="One rule book. Many enforcement points. Adding a new platform takes three steps — never a redesign."
        icon={Network}
      />

      {/* Beat 1 — Segregation */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <GitBranch size={18} className="text-red-600" /> Decisions live in
          one place; enforcement happens everywhere.
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Identity and ownership flow into a single rule book. Every platform
          reads from it. Change a rule once; it propagates.
        </p>
        <EntitlementsDiagram mode="exec" />
      </section>

      {/* Beat 2 — Extensibility */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <Network size={18} className="text-red-600" /> Each enforcement point
          is a thin extension — not a parallel governance system.
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Snowflake, AWS S3, AI agents — each one is a spoke that reads from
          the same hub. New platforms plug in without rebuilding the
          governance model.
        </p>
        <HubSpokeDiagram mode="exec" />
      </section>

      {/* Beat 3 — Three-card extension strip */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <Plug size={18} className="text-red-600" /> Adding a New Platform —
          Three Steps
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-4">
          {extensionSteps.map((step, i) => {
            const colorAccent = {
              blue: 'border-blue-600/40 bg-blue-600/10 text-blue-400',
              amber: 'border-amber-600/40 bg-amber-600/10 text-amber-400',
              emerald: 'border-emerald-600/40 bg-emerald-600/10 text-emerald-400',
            }[step.color];
            const StepIcon = step.icon;
            return (
              <React.Fragment key={step.title}>
                <div
                  className={`rounded-xl border ${colorAccent} p-6 flex flex-col items-center text-center gap-3`}
                >
                  <StepIcon size={28} />
                  <p className="text-lg font-black uppercase tracking-tight text-white">
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {step.subtitle}
                  </p>
                </div>
                {i < extensionSteps.length - 1 && (
                  <div className="hidden md:flex items-center justify-center text-gray-500">
                    <ArrowRight size={20} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ExecArchitectureView;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/exec/ExecArchitectureView.tsx
git commit -m "feat(udp-dashboard): implement ExecArchitectureView three-beat narrative"
```

---

### Task 11: Implement `ExecSecurityView`

**Spec reference:** §5.3. 4 vulnerability cards rewritten at exec altitude (drop SQL phrasing, keep risk and impact narrative). `DefenseDiagram` onion. Caption: *"Five independent layers. Any single layer can fail without compromising the system."*

**Files:**
- Modify: `src/components/exec/ExecSecurityView.tsx`

- [ ] **Step 1: Replace the stub with the real implementation**

```tsx
// src/components/exec/ExecSecurityView.tsx
import React, { useState } from 'react';
import {
  Shield,
  AlertOctagon,
  Code,
  Users,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import {
  SectionHeader,
  InfoCard,
  DetailPanel,
  PrevNextNav,
  colorStyles,
} from '../primitives';
import { DefenseDiagram } from '../diagrams';

const VULN_ITEMS_EXEC = [
  {
    label: 'Hidden Pipeline Data',
    icon: AlertOctagon,
    color: 'red' as const,
    title: 'Risk: Data Copies Lose Their Protection',
    content: (
      <p>
        Access controls are attached to the original table. When a downstream
        pipeline copies data into a new table, those controls don't follow —
        the copy is unprotected and nobody is notified. The result: sensitive
        data ends up in places it shouldn't be.
      </p>
    ),
  },
  {
    label: 'Forgotten Joins',
    icon: Code,
    color: 'amber' as const,
    title: 'Risk: Enforcement Depends on Discipline',
    content: (
      <p>
        Today, security only works if every developer remembers to manually
        attach the rule book to their query. A forgotten join silently returns
        unfiltered data — the query succeeds, just without protection. There's
        no central audit trail to catch the miss.
      </p>
    ),
  },
  {
    label: 'Aggregation Drift',
    icon: GitBranch,
    color: 'red' as const,
    title: 'Risk: Reshaping Data Strips the Rules',
    content: (
      <p>
        When a table is summarized to a different level (e.g., individual
        records rolled up to a region), the columns that drove the access
        rules may disappear. The protection technically still applies, but
        with nothing to filter on, every row is visible.
      </p>
    ),
  },
  {
    label: 'Manual Bottleneck',
    icon: Users,
    color: 'amber' as const,
    title: 'Risk: Onboarding Takes Engineering Tickets',
    content: (
      <>
        <p>
          Today, every new user or role change requires a manual update to the
          access matrix. Data Engineering is in the loop for every personnel
          change — slow, error-prone, and at odds with how identity systems
          already work.
        </p>
        <p className="text-emerald-400 font-semibold text-xs mt-2">
          Solved by sourcing identity and ownership directly from Okta and
          Salesforce.
        </p>
      </>
    ),
  },
];

const ExecSecurityView: React.FC = () => {
  const [activeVuln, setActiveVuln] = useState(0);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <SectionHeader
        title="Security"
        subtitle="Four risks the current architecture can't catch — and the layered defenses that close them."
        icon={Shield}
      />

      {/* Vulnerability cards */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
          Risks in the Current State
          <span className="text-gray-500 font-normal text-xs ml-2 normal-case tracking-normal">
            — click each to explore
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          <div className="space-y-1">
            {VULN_ITEMS_EXEC.map((v, i) => {
              const isActive = i === activeVuln;
              const s = colorStyles[v.color];
              return (
                <button
                  key={v.label}
                  onClick={() => setActiveVuln(i)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 border ${
                    isActive
                      ? `${s.border} ${s.bg} shadow-lg`
                      : 'border-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <v.icon
                      size={14}
                      className={isActive ? s.accent : 'text-gray-500'}
                    />
                    <span
                      className={`text-xs font-semibold ${
                        isActive ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {v.label}
                    </span>
                  </div>
                </button>
              );
            })}
            <PrevNextNav
              current={activeVuln}
              total={VULN_ITEMS_EXEC.length}
              onPrev={() => setActiveVuln((s) => Math.max(0, s - 1))}
              onNext={() =>
                setActiveVuln((s) =>
                  Math.min(VULN_ITEMS_EXEC.length - 1, s + 1),
                )
              }
            />
          </div>

          <DetailPanel activeKey={activeVuln}>
            <InfoCard
              title={VULN_ITEMS_EXEC[activeVuln].title}
              icon={VULN_ITEMS_EXEC[activeVuln].icon}
              accent={
                VULN_ITEMS_EXEC[activeVuln].color === 'red' ? 'red' : 'amber'
              }
            >
              {VULN_ITEMS_EXEC[activeVuln].content}
            </InfoCard>
          </DetailPanel>
        </div>
      </section>

      {/* Defense in depth */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/20 pb-2">
          <ShieldCheck size={18} className="text-red-600" /> Defense in Depth
        </h3>
        <DefenseDiagram />
        <p className="text-sm text-gray-400 italic leading-relaxed">
          Five independent layers. Any single layer can fail without
          compromising the system.
        </p>
      </section>
    </div>
  );
};

export default ExecSecurityView;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors. If `DefenseDiagram` accepts no props and self-renders, this Just Works. If it needs props, check `src/components/diagrams/DefenseDiagram.tsx` for its signature and adjust the JSX in this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/exec/ExecSecurityView.tsx
git commit -m "feat(udp-dashboard): implement ExecSecurityView with exec-altitude vuln rewrites"
```

---

### Task 12: Implement `ExecRoadmapView`

**Spec reference:** §5.4. Phase 1/2 timeline cards (reuse from `OpsView`), Day 2 Ops table (reuse), Zero New Headcount callout (reuse).

**Files:**
- Modify: `src/components/exec/ExecRoadmapView.tsx`

- [ ] **Step 1: Replace the stub with the real implementation**

```tsx
// src/components/exec/ExecRoadmapView.tsx
import React, { useState } from 'react';
import { Settings, CheckCircle2, ChevronDown } from 'lucide-react';
import {
  SectionHeader,
  DataTable,
  CalloutBox,
  C,
} from '../primitives';

const ExecRoadmapView: React.FC = () => {
  const [expandedPhase, setExpandedPhase] = useState<
    'phase1' | 'phase2' | null
  >('phase1');

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <SectionHeader
        title="Roadmap"
        subtitle="What ships before UDP Go-Live, what completes at Go-Live, and who maintains it after — without adding a single new team."
        icon={Settings}
      />

      {/* Phase 1 / 2 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className={`p-6 bg-amber-500/10 border border-amber-500/40 rounded-xl space-y-4 cursor-pointer transition-all duration-200 ${
            expandedPhase === 'phase1' ? '' : 'opacity-60 hover:opacity-100'
          }`}
          onClick={() =>
            setExpandedPhase(expandedPhase === 'phase1' ? null : 'phase1')
          }
        >
          <div className="flex items-center justify-between">
            <h4 className="text-amber-500 font-bold uppercase tracking-widest text-xs">
              Phase 1 — Pre-UDP Go-Live (Bootstrap)
            </h4>
            <ChevronDown
              size={14}
              className={`text-amber-500 transition-transform duration-200 ${
                expandedPhase === 'phase1' ? 'rotate-180' : ''
              }`}
            />
          </div>
          {expandedPhase === 'phase1' && (
            <ul className="text-xs space-y-3 text-gray-400 animate-in fade-in slide-in-from-top-2 duration-300">
              {[
                {
                  label: 'Curated Seed Data',
                  desc: 'Initial access matrix loaded from a validated seed file.',
                },
                {
                  label: 'Pre-Ingestion Review',
                  desc: 'IAM team reviews proposed changes before they take effect.',
                },
                {
                  label: 'Direct Policy Application',
                  desc: 'Access policies applied directly to published data products.',
                },
                {
                  label: 'Sandbox Write Enabled',
                  desc: 'Developers can iterate; distribution stays under manual review.',
                },
              ].map(({ label, desc }) => (
                <li key={label} className="flex items-start gap-2">
                  <CheckCircle2
                    size={12}
                    className="text-amber-500 mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="text-white font-semibold">{label}:</span>{' '}
                    {desc}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className={`p-6 bg-emerald-500/10 border border-emerald-500/40 rounded-xl space-y-4 cursor-pointer transition-all duration-200 ${
            expandedPhase === 'phase2' ? '' : 'opacity-60 hover:opacity-100'
          }`}
          onClick={() =>
            setExpandedPhase(expandedPhase === 'phase2' ? null : 'phase2')
          }
        >
          <div className="flex items-center justify-between">
            <h4 className="text-emerald-500 font-bold uppercase tracking-widest text-xs">
              Phase 2 — UDP Go-Live (Full Automation)
            </h4>
            <ChevronDown
              size={14}
              className={`text-emerald-500 transition-transform duration-200 ${
                expandedPhase === 'phase2' ? 'rotate-180' : ''
              }`}
            />
          </div>
          {expandedPhase === 'phase2' && (
            <ul className="text-xs space-y-3 text-gray-400 animate-in fade-in slide-in-from-top-2 duration-300">
              {[
                {
                  label: 'Automated Identity Sync',
                  desc: 'Okta and Salesforce feed the central rule book directly — no manual updates.',
                },
                {
                  label: 'Universal Tag Inheritance',
                  desc: 'Every new dataset inherits its protection automatically.',
                },
                {
                  label: 'AI Copilot Skills',
                  desc: 'Developers get routing and sharing guidance inline — no governance memorization required.',
                },
              ].map(({ label, desc }, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2
                    size={12}
                    className="text-emerald-500 mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="text-white font-semibold">{label}:</span>{' '}
                    {desc}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Day 2 Ops */}
      <section className="space-y-4 pt-4">
        <h3 className="text-lg font-bold text-white uppercase tracking-tight border-b border-white/20 pb-2">
          Day 2 Ops: Governance Maps to Existing Roles
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
          Every governance maintenance task maps onto an organizational
          function that already exists. No new teams, no new headcount —
          governance is absorbed by the people who already own the underlying
          systems.
        </p>
        <DataTable
          columns={[
            'Domain',
            'Existing Function',
            'What They Already Do',
            'Governance Extension',
          ]}
          data={[
            [
              'Identity',
              'IT / IAM',
              'Manages Okta groups and SSO provisioning',
              'Maintains identity inputs that feed the rule book',
            ],
            [
              'Record Ownership',
              'Domain Data Stewards',
              'Manages Salesforce team/owner records',
              'Maintains record-level ownership that drives row-level access',
            ],
            [
              'Infrastructure',
              'Data Platform Engineering',
              'Runs pipelines and monitors data freshness',
              'Maintains rule-book promotion and tag consistency',
            ],
            [
              'Auditing',
              'SecOps',
              'Audits access logs and compliance controls',
              'Reviews the access matrix and governance audit trail',
            ],
          ]}
        />
        <CalloutBox title="Zero New Headcount" variant="emerald">
          <p>
            No new teams or headcount required. Every governance maintenance
            task maps to an existing operational role. The central{' '}
            <C>ENTITLEMENTS</C> matrix is maintained by the same people who
            already maintain the source systems that feed it.
          </p>
        </CalloutBox>
      </section>
    </div>
  );
};

export default ExecRoadmapView;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/exec/ExecRoadmapView.tsx
git commit -m "feat(udp-dashboard): implement ExecRoadmapView with phase cards and Day 2 ops"
```

---

## Phase F — Strip exec fragments from engineering views (Migration Step 5)

Goal: remove exec-altitude content from `ExtensibilityView` and `OpsView` now that the exec views own it. Engineering versions stay focused on what engineers need.

### Task 13: Strip exec fragments from `ExtensibilityView`

**Spec reference:** §6.1. **Strip:** "3 steps to add a platform" exec hero, "Vendor Neutrality" + "UDP Synergy" callouts. **Keep:** spoke detail panels (mechanism, failClosed, reads — already inside `HubSpokeDiagram`), both implementation walkthroughs (PEP + Policy Source), Key Properties grid, Architecture Guarantee callout.

**Files:**
- Modify: `src/components/eng/ExtensibilityView.tsx`

- [ ] **Step 1: Remove the Vendor Neutrality and UDP Synergy callouts**

In `src/components/eng/ExtensibilityView.tsx`, locate and delete these two `<CalloutBox>` blocks (currently rendered between the hub-spoke diagram and the "Adding a New PEP" walkthrough):

```tsx
<CalloutBox title="Vendor Neutrality" variant="blue">
  <p>
    Every platform named here is illustrative. The <C>ENTITLEMENTS</C> table is the universal policy interface.
    Adding a new enforcement point requires only a lookup against this table — no redesign of access logic.
  </p>
</CalloutBox>

<CalloutBox title="UDP Synergy" variant="emerald">
  <p>
    The UDP build handles the heavy infrastructure — environment setup, medallion architecture, automated ingestion.
    From there, governance becomes a federated service that layers on with net-negative operational cost.
  </p>
</CalloutBox>
```

The "3 steps to add a platform" exec hero referenced in the spec is the inline section heading + lead paragraph that previews the walkthrough. The detailed walkthroughs ("Adding a New Enforcement Point (PEP)" and "Adding a New Policy Source (PDP)") are engineering-grade and must stay. Keep their headers and bodies intact. Only remove any standalone exec-flavored framing prose that doesn't belong in the engineering view (e.g., remove the lead sentence "What happens when a new platform needs governance? Three steps — no governance redesign." if it functions as exec framing — but keep the engineering walkthrough that follows). Use judgment: the engineering view must read coherently to an engineer.

- [ ] **Step 2: Clean up unused imports**

Removing the callouts may leave `CalloutBox`, `Globe`, or `C` unused in this file. Run:

```bash
pnpm exec tsc --noEmit
```

If TypeScript reports unused imports, remove them. If it doesn't (TS strict doesn't flag unused imports), do a manual check by searching the file for each remaining import and removing any that have no usages.

- [ ] **Step 3: Visual smoke test**

Run: `pnpm dev`. Navigate to Extensibility (still wired to the engineering view). Verify:
- Hub-and-spoke diagram still renders with engineering detail panels.
- Both walkthroughs ("Adding a New Enforcement Point" and "Adding a New Policy Source") still render with their step sidebars and detail panels.
- Key Properties 3-card grid still renders.
- Architecture Guarantee callout still renders at the bottom.
- The Vendor Neutrality and UDP Synergy callouts are gone.

- [ ] **Step 4: Commit**

```bash
git add src/components/eng/ExtensibilityView.tsx
git commit -m "refactor(udp-dashboard): strip exec fragments from ExtensibilityView"
```

---

### Task 14: Strip exec fragments from `OpsView`

**Spec reference:** §6.1. **Strip:** Phase 1/2 cards, "Zero New Headcount" callout, "Day 2 Ops: Governance Maps to Existing Roles" table. **Keep:** Domain Steward Requirement table (with Steward roles + ⚠ TBDs), Terraform enforcement callout.

**Files:**
- Modify: `src/components/eng/OpsView.tsx`

- [ ] **Step 1: Remove the Phase 1/2 cards block**

Delete the entire `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">` block that contains the two collapsible Phase cards. This includes the `useState<'phase1' | 'phase2' | null>` and its setter — remove those too.

- [ ] **Step 2: Remove the Day 2 Ops section**

Delete the entire section starting with `<h3>§10 — Day 2 Ops: Governance Maps to Existing Roles</h3>` through the "Zero New Headcount" `CalloutBox` (closing tag inclusive). This is roughly the section between the phase cards and the Domain Steward block.

- [ ] **Step 3: Update the SectionHeader**

The current header reads:

```tsx
<SectionHeader
  title="Implementation Phasing"
  subtitle="Governance layers onto the existing UDP investment. This section maps what ships before UDP Go-Live and what completes at Go-Live — and who owns what afterward."
  icon={Settings}
  badge="Sections 9 & 10"
/>
```

Change `title` to `"Operational Setup"`, change `subtitle` to `"Domain stewardship requirements and Terraform-enforced provisioning controls."`, change `badge` to `"Section 10"`.

- [ ] **Step 4: Clean up unused imports**

After removing the Phase cards, `useState`, `CheckCircle2`, `ChevronDown`, and `DataTable` may go unused. Verify each remaining import is still used. Remove any that aren't.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Visual smoke test**

Run: `pnpm dev`. Navigate to Roadmap & Ops. Verify only the Domain Steward Requirement section + Terraform Enforcement callout remain. Phase cards and Day 2 Ops table are gone. The view still renders coherently with the updated header.

- [ ] **Step 7: Commit**

```bash
git add src/components/eng/OpsView.tsx
git commit -m "refactor(udp-dashboard): strip exec fragments from OpsView"
```

---

## Phase G — Wire mode-aware routing (Migration Step 6)

Goal: replace the single `TabId` and unified `views` map with separate exec and engineering tab maps, then select by `mode`. This is the first real mode-switch.

### Task 15: Convert `App.tsx` to mode-aware shell

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the routing core**

Replace the entire `App.tsx` with the mode-aware version below. (`OverviewView` is still imported and rendered for the Engineering "overview" slot — it gets deleted in Task 16 along with that slot.)

```tsx
// src/App.tsx
import React, { useCallback } from 'react';
import {
  Shield,
  Cpu,
  Layers,
  Tags,
  Table2,
  Code,
  Globe,
  Settings,
  Database,
  AlertTriangle,
  PanelLeftClose,
  PanelLeft,
  Briefcase,
  Network,
  ShieldCheck,
  Map,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SidebarItem } from './components/primitives';
import { ModeToggle, type Mode } from './components/ModeToggle';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  ExecSummaryView,
  ExecArchitectureView,
  ExecSecurityView,
  ExecRoadmapView,
} from './components/exec';
import {
  OverviewView,
  SandboxView,
  EnforcementView,
  TaxonomyView,
  PolicyView,
  SchemaView,
  ExtensibilityView,
  OpsView,
} from './components/eng';

type ExecTabId = 'summary' | 'architecture' | 'security' | 'roadmap';
type EngTabId =
  | 'overview'
  | 'sandbox'
  | 'enforcement'
  | 'taxonomy'
  | 'schema'
  | 'policy'
  | 'extensibility'
  | 'ops';

const execMenu: { id: ExecTabId; label: string; icon: LucideIcon }[] = [
  { id: 'summary', label: 'Summary', icon: Briefcase },
  { id: 'architecture', label: 'Architecture', icon: Network },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
];

const engMenu: { id: EngTabId; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Exec Summary', icon: Shield },
  { id: 'sandbox', label: 'Developer Experience', icon: Cpu },
  { id: 'enforcement', label: 'Hardening', icon: Layers },
  { id: 'taxonomy', label: 'Tag Taxonomy', icon: Tags },
  { id: 'schema', label: 'Schema Design', icon: Table2 },
  { id: 'policy', label: 'Policy Logic', icon: Code },
  { id: 'extensibility', label: 'Extensibility', icon: Globe },
  { id: 'ops', label: 'Roadmap & Ops', icon: Settings },
];

export default function App() {
  const [mode, setMode] = useLocalStorage<Mode>('udp-mode', 'exec');
  const [execTab, setExecTab] = useLocalStorage<ExecTabId>(
    'udp-exec-tab',
    'summary',
  );
  const [engTab, setEngTab] = useLocalStorage<EngTabId>(
    'udp-eng-tab',
    'overview',
  );
  const [isSidebarOpen, setSidebarOpen] = useLocalStorage<boolean>(
    'udp-sidebar-open',
    true,
  );

  const navigateExec = useCallback(
    (tabId: string) => {
      setExecTab(tabId as ExecTabId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setExecTab],
  );

  const navigateEng = useCallback(
    (tabId: string) => {
      setEngTab(tabId as EngTabId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setEngTab],
  );

  const execViews: Record<ExecTabId, React.ReactNode> = {
    summary: <ExecSummaryView onNavigate={navigateExec} />,
    architecture: <ExecArchitectureView />,
    security: <ExecSecurityView />,
    roadmap: <ExecRoadmapView />,
  };

  const engViews: Record<EngTabId, React.ReactNode> = {
    overview: <OverviewView onNavigate={navigateEng} />,
    sandbox: <SandboxView onNavigate={navigateEng} />,
    enforcement: <EnforcementView />,
    taxonomy: <TaxonomyView />,
    schema: <SchemaView />,
    policy: <PolicyView />,
    extensibility: <ExtensibilityView />,
    ops: <OpsView />,
  };

  const activeView =
    mode === 'exec' ? execViews[execTab] : engViews[engTab];
  const menuItems = mode === 'exec' ? execMenu : engMenu;
  const activeId: string = mode === 'exec' ? execTab : engTab;
  const onNavigate = mode === 'exec' ? navigateExec : navigateEng;

  return (
    <div className="min-h-screen bg-[#080808] text-white flex font-sans selection:bg-red-600/30">
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } fixed inset-y-0 left-0 bg-[#0d0d0d] border-r border-white/15 transition-all duration-300 z-50 flex flex-col`}
      >
        <div className="p-6 flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-600 flex items-center justify-center rounded-sm shrink-0 shadow-lg shadow-red-900/10">
              <Shield size={22} className="text-white fill-white" />
            </div>
            {isSidebarOpen && (
              <span className="font-black tracking-tighter text-2xl leading-none italic">
                UDP<span className="text-red-600">GOV</span>
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-white/5 rounded text-gray-500 transition-colors"
          >
            {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
        </div>

        <ModeToggle mode={mode} onChange={setMode} collapsed={!isSidebarOpen} />

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-6">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={isSidebarOpen ? item.label : ''}
              active={activeId === item.id}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </nav>
      </aside>

      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        } p-10 pb-24`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="min-h-[70vh]">{activeView}</div>
        </div>
      </main>

      <footer
        className={`fixed bottom-0 right-0 h-12 bg-[#0d0d0d]/90 backdrop-blur-xl border-t border-white/15 flex items-center justify-between px-10 z-40 text-[9px] font-black text-gray-600 uppercase tracking-[.5em] transition-all duration-300 ${
          isSidebarOpen ? 'left-64' : 'left-20'
        }`}
      >
        <div className="flex items-center space-x-8">
          <span className="flex items-center gap-2 italic">
            <Database size={10} className="text-red-800" /> CROWDSTRIKE UDP
          </span>
          <span>SILVER LAYER & GOVERNANCE</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} className="text-red-800" />
          <span className="text-red-800">PROPRIETARY / INTERNAL</span>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Remove the now-stale `udp-active-tab` storage key**

Open the browser dev tools while running `pnpm dev`. In the Application tab, delete the `udp-active-tab` key from localStorage (Task 3 wrote it; Task 15 replaces it with `udp-exec-tab` + `udp-eng-tab`). This avoids stale state during local testing. End users won't have this key, so no migration code is needed.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors. The barrel imports from `'./components/exec'` and `'./components/eng'` resolve via the `index.ts` files written in Tasks 5 and 6.

- [ ] **Step 4: Visual smoke test — the headline behavior**

Run: `pnpm dev`. Verify:
- Default load (with localStorage cleared) lands in Exec mode on the Summary tab.
- Sidebar shows 4 exec tabs: Summary, Architecture, Security, Roadmap.
- Each exec tab renders its real view from Phase E.
- Clicking the Engineering toggle swaps the sidebar to 8 engineering tabs (Exec Summary, Developer Experience, …, Roadmap & Ops).
- Each engineering tab renders the existing engineering view.
- Toggling back to Exec lands on whichever exec tab was last active.
- Toggling to Engineering lands on whichever engineering tab was last active.
- Reload the page in either mode — the mode and per-mode active tab persist.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(udp-dashboard): wire mode-aware routing with separate exec/eng tab maps"
```

---

## Phase H — Cleanup (Migration Steps 7–8)

### Task 16: Delete `OverviewView` and remove from engineering tabs

**Spec reference:** §4.3 + §6.1 — `OverviewView.tsx` is deleted; its content fully relocates to exec mode.

**Files:**
- Delete: `src/components/eng/OverviewView.tsx`
- Modify: `src/components/eng/index.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Remove from the engineering barrel**

Edit `src/components/eng/index.ts`:

```diff
-export { default as OverviewView } from './OverviewView';
 export { default as SandboxView } from './SandboxView';
```

- [ ] **Step 2: Remove from `App.tsx`**

In `src/App.tsx`:

1. Remove `OverviewView` from the engineering barrel import:

```diff
 import {
-  OverviewView,
   SandboxView,
   EnforcementView,
   ...
 } from './components/eng';
```

2. Remove `'overview'` from the `EngTabId` union:

```diff
 type EngTabId =
-  | 'overview'
   | 'sandbox'
   | 'enforcement'
   | ...;
```

3. Remove the `overview` entry from `engMenu`:

```diff
 const engMenu: { id: EngTabId; label: string; icon: LucideIcon }[] = [
-  { id: 'overview', label: 'Exec Summary', icon: Shield },
   { id: 'sandbox', label: 'Developer Experience', icon: Cpu },
   ...
 ];
```

4. Remove the `overview` entry from `engViews`:

```diff
 const engViews: Record<EngTabId, React.ReactNode> = {
-  overview: <OverviewView onNavigate={navigateEng} />,
   sandbox: <SandboxView onNavigate={navigateEng} />,
   ...
 };
```

5. Update the engineering tab default:

```diff
   const [engTab, setEngTab] = useLocalStorage<EngTabId>(
     'udp-eng-tab',
-    'overview',
+    'sandbox',
   );
```

- [ ] **Step 3: Delete the file**

```bash
git rm src/components/eng/OverviewView.tsx
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors. If anything still references `OverviewView`, fix the import or remove the reference.

- [ ] **Step 5: Visual smoke test**

Run: `pnpm dev`. Verify:
- Engineering mode now shows 7 tabs (no "Exec Summary" tab).
- Default landing for first-visit Engineering mode is Sandbox.
- Switching to Exec and back to Engineering works as before.
- Existing engineering tab content renders unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/eng/index.ts src/App.tsx
git commit -m "refactor(udp-dashboard): delete OverviewView (content relocated to exec views)"
```

---

### Task 17: Reorder engineering tabs

**Spec reference:** §4.3. New order: `Sandbox → Schema → Taxonomy → Policy → Enforcement → Extensibility → Ops`. Reading flow becomes: where developers work → what the data looks like → how it's labeled → what rules act on labels → how rules execute → how it extends → who maintains it.

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Reorder the `engMenu` array**

```tsx
const engMenu: { id: EngTabId; label: string; icon: LucideIcon }[] = [
  { id: 'sandbox', label: 'Developer Experience', icon: Cpu },
  { id: 'schema', label: 'Schema Design', icon: Table2 },
  { id: 'taxonomy', label: 'Tag Taxonomy', icon: Tags },
  { id: 'policy', label: 'Policy Logic', icon: Code },
  { id: 'enforcement', label: 'Hardening', icon: Layers },
  { id: 'extensibility', label: 'Extensibility', icon: Globe },
  { id: 'ops', label: 'Roadmap & Ops', icon: Settings },
];
```

The `engViews` Record and `EngTabId` union are unordered; only `engMenu` controls display order.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Visual smoke test**

Run: `pnpm dev`. In Engineering mode, verify the sidebar tab order matches the new sequence top-to-bottom. Click each tab to confirm the correct view loads.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "refactor(udp-dashboard): reorder engineering tabs (Sandbox → Schema → ... → Ops)"
```

---

## Phase I — Polish (Migration Step 9)

### Task 18: Polish pass — toggle styling, persistence, defaults, copy

This is a single integrated task with multiple verification steps. No new code unless something is broken.

**Files:**
- Possibly modify: `src/components/ModeToggle.tsx`, `src/App.tsx`, exec view files (typo / copy fixes only)

- [ ] **Step 1: Toggle styling check**

Run: `pnpm dev`. Verify in both expanded and collapsed sidebar states:
- The toggle's active half is filled red-600.
- The inactive half is muted but still readable on the dark background.
- Hover on the inactive half lifts the text contrast (gray-300 vs gray-500).
- The pill height is consistent with the sidebar logo row.

If any of the above is off, edit `src/components/ModeToggle.tsx` and re-verify.

- [ ] **Step 2: Persistence verification**

In dev tools → Application → Local Storage:
- Switching modes writes `udp-mode` correctly.
- Switching exec tabs writes `udp-exec-tab`.
- Switching engineering tabs writes `udp-eng-tab`.
- Reload — every value rehydrates correctly.
- Clear all storage and reload — defaults to Exec / Summary, sidebar open.

- [ ] **Step 3: Default landings**

With localStorage cleared:
- First visit lands in Exec mode on Summary (per spec §7.4).
- Toggle to Engineering — the engineering tab defaults to Sandbox (per spec §7.4).

- [ ] **Step 4: Copy review on shared diagrams**

Click each spoke / node in `EntitlementsDiagram` (in exec Architecture) and `HubSpokeDiagram` (in exec Architecture). Read each detail panel:
- No SQL keywords (`GRANT`, `RAP`, `CTAS`, `CURRENT_ROLE()`).
- No table or column names referenced verbatim (e.g., `ENTITLEMENTS_STAGING`, `USER_ENTITLEMENTS`).
- Each panel reads as one or two short business-outcome sentences.

If any exec panel still leaks engineering vocabulary, edit the corresponding exec content record (in `EntitlementsDiagram.tsx` or `HubSpokeDiagram.tsx`).

- [ ] **Step 5: Cross-tab smoke test**

Walk through all 11 tabs (4 exec + 7 engineering):
- Each renders without console errors. Open the browser console, click through every tab in both modes, and confirm zero errors.
- Each renders within the 70vh `min-h` content frame without obvious layout regression.

- [ ] **Step 6: Production build check**

```bash
pnpm build
```

Expected: build succeeds, no type errors, no warnings about unused exports. The output goes to `dist/`.

```bash
pnpm preview
```

Open the preview URL and re-run the smoke test from Step 5 against the production build.

- [ ] **Step 7: Final commit (if any polish edits were made)**

```bash
git add -A
git commit -m "polish(udp-dashboard): exec/eng mode-toggle styling and copy review"
```

If no edits were needed in this phase, skip the commit — Phase I was verification only.

---

## Done

The dashboard now offers a clean Exec ↔ Engineering toggle:
- Exec mode: 4 tabs, ~5–10 minute walkthrough, business-outcome framing, zero SQL.
- Engineering mode: 7 tabs in build-up order, full technical depth.
- Each mode remembers its last-active tab independently.
- No new runtime dependencies.

**Verification gates passed:**
- `pnpm exec tsc --noEmit` zero errors at every step.
- `pnpm build` succeeds.
- Both modes manually verified in dev and preview.
