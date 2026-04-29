# Exec ↔ Engineering Mode Toggle — Design

**Date:** 2026-04-28
**Project:** UDP Governance Dashboard
**Status:** Approved — ready for implementation plan

---

## 1. Context

The dashboard currently presents nine tabs that mix executive-altitude framing with engineering-depth detail in haphazard proportions. A demo to a CISO and a demo to a platform engineer use the same tabs, so the speaker either has to skip sections live or accept that some content lands at the wrong altitude for the room.

The remedy is a binary mode toggle — **Exec ↔ Engineering** — that swaps the navigation and content surface entirely. Each mode is a curated, audience-tailored experience.

## 2. Goals

- A single sidebar toggle switches the entire dashboard between two cleanly separated audiences.
- **Exec mode:** four tabs, ~5–10 minute walkthrough, business-outcome framing, zero SQL or schema-level detail.
- **Engineering mode:** seven tabs, full technical depth, organized in a logical build-up.
- Each mode remembers its own last-active tab independently, persisted in `localStorage`.
- Default to Exec mode on first visit.
- No new runtime dependencies (no router, no state library).

## 3. Non-Goals

- Deep linking / URL routing — additive feature, deferred.
- Per-section "expand for engineering detail" within exec mode — explicitly rejected ("hard wall" decision; toggle is the only path between modes).
- Rewriting engineering tab content — content stays the same; only IA reorders and exec fragments are stripped out.
- Tab merges (e.g., folding Taxonomy into Policy) — considered and rejected; engineers benefit from distinct vocabulary/rules/data mental models.

## 4. Information Architecture

### 4.1 Mode toggle

Single binary control persisted to `localStorage`. Default `'exec'` on first visit. Lives at the top of the sidebar — it *is* the navigation control, so it belongs in the nav.

Visual: two-state segmented pill, `[ Exec | Engineering ]`. Active state filled red-600, inactive grayed. ~36px tall. When the sidebar collapses to icon-only, the toggle compresses to a small two-cell pill.

### 4.2 Exec mode tabs (4)

| # | Tab | Source content |
|---|---|---|
| 1 | **Summary** | Hero, problem statement, "Maximising UDP Investment" + "Vendor Neutrality" callouts |
| 2 | **Architecture** | PDP/PEP segregation diagram → hub-and-spoke extensibility → "3 steps to add a new platform" *(narrative builds: segregation enables plug-in model enables extensibility)* |
| 3 | **Security** | 4 vulnerability cards (exec-altitude rewrites), defense-in-depth onion diagram, "5 independent layers" framing |
| 4 | **Roadmap** | Phase 1/2 timeline, "Day 2 Ops: Governance Maps to Existing Roles" table, "Zero New Headcount" callout |

### 4.3 Engineering mode tabs (7, in this order)

```
Sandbox → Schema → Taxonomy → Policy → Enforcement → Extensibility → Ops
```

Reorder rationale (vs current order Sandbox → Enforcement → Taxonomy → Schema → Policy → Extensibility → Ops):

- Schema before Taxonomy: data model exists first, then we label it.
- Enforcement after Policy: Policy defines rules; Enforcement explains how they execute (lifecycle, defense layers, hardening).
- Extensibility + Ops keep tail position (platform-level concerns).

The reading flow becomes: *where developers work* → *what the data looks like* → *how it's labeled* → *what rules act on labels* → *how rules execute* → *how it extends* → *who maintains it*.

## 5. Exec Content Composition

### 5.1 Summary

- Hero + problem statement *(reuse from `OverviewView`)*
- "Maximising UDP Investment" callout *(reuse)*
- "Vendor Neutrality" callout *(reuse)*
- Bottom CTA: "How does it work? → Architecture"

**Drops:** Key Concepts glossary (engineering), Core Vulnerabilities cards (move to Security), full Solution Pattern visual (moves to Architecture).

### 5.2 Architecture — three-beat narrative

- **Beat 1 — Segregation:** `EntitlementsDiagram` with one-paragraph exec frame: *"Decisions live in one place; enforcement happens everywhere."*
- **Beat 2 — Extensibility:** Hub-and-spoke visual from `ExtensibilityView` (Snowflake, S3, Bedrock, Future PEP). Caption: *"Each enforcement point is a thin extension, not a parallel governance system."*
- **Beat 3 — The 3-step extension:** Three-card horizontal strip with arrows between cards: **Connect → Enforce → Done.** Each card has an icon, a one-word title, and a one-sentence subtitle. No code, no SDLC steps, no implementation detail — purely structural.

The two diagrams already exist and are exec-readable. The `EntitlementsDiagram` detail panels currently mix audiences ("invisible to analyst" alongside "memoizable function caching"). To resolve cleanly, the diagram component gains a `mode?: 'exec' | 'eng'` prop (default `'eng'` to preserve existing engineering callers); two parallel content records are defined inside the component and selected by mode. The hub-and-spoke visual in `ExtensibilityView` follows the same pattern.

### 5.3 Security

- **Vulnerabilities:** 4 risk cards from `OverviewView` ("CTAS Trap", "Decentralized SQL", "Grain Change", "Mapping Bottleneck") rewritten at exec altitude — drop SQL-specific phrasing, keep the risk and impact narrative.
- **Defense-in-depth:** `DefenseDiagram` onion. One sentence below: *"Five independent layers. Any single layer can fail without compromising the system."*
- **Drops:** ENTITLEMENTS lifecycle, SQL examples, hardening detail (all engineering territory).

### 5.4 Roadmap

- Phase 1 / Phase 2 timeline cards *(reuse from `OpsView`)*
- "Day 2 Ops: Governance Maps to Existing Roles" table *(reuse)*
- "Zero New Headcount" callout *(reuse)*
- **Drops:** Domain Steward Requirement table, Terraform enforcement callout (move to engineering Ops).

### 5.5 New content authoring required

- Architecture tab: prose connectors for the three-beat narrative; three-card "Connect → Enforce → Done" strip.
- Security tab: exec-altitude rewrites of the 4 vulnerability cards.
- `EntitlementsDiagram` and the extensibility hub-spoke: author exec-mode detail panel content (parallel to existing engineering content).

### 5.6 Component changes

- **`EntitlementsDiagram`** — adds `mode?: 'exec' | 'eng'` prop; default `'eng'` so existing callers are unaffected. Internal detail-content record is selected by mode.
- **Hub-and-spoke visual in `ExtensibilityView`** — extracted into a standalone `diagrams/HubSpokeDiagram.tsx` (or kept inline) with the same `mode` prop pattern. Decision deferred to implementation plan.
- **No other new components.** Vulnerability cards, callouts, timeline cards reuse existing patterns from `primitives.tsx`.

## 6. Engineering-Side Cleanup

### 6.1 Per-view changes

| View | Change |
|---|---|
| `SandboxView.tsx` | None — pure dev content already |
| `SchemaView.tsx` | None — pure engineering already |
| `TaxonomyView.tsx` | None — pure engineering already |
| `PolicyView.tsx` | None — pure engineering already |
| `EnforcementView.tsx` | None — pure engineering already |
| `OverviewView.tsx` | **Deleted.** Content fully relocates to exec mode (across Summary, Architecture, Security tabs). |
| `ExtensibilityView.tsx` | **Strip:** "3 steps to add a platform" exec hero, "Vendor Neutrality" + "UDP Synergy" callouts. **Keep:** spoke detail panels (mechanism, failClosed, reads), both implementation walkthroughs (PEP + Policy Source — engineering versions with actual steps), Key Properties grid, Architecture Guarantee callout. |
| `OpsView.tsx` | **Strip:** Phase 1/2 cards, "Zero New Headcount" callout, "Day 2 Ops: Governance Maps to Existing Roles" table. **Keep:** Domain Steward Requirement table (with Steward roles + ⚠ TBDs), Terraform enforcement callout. |

### 6.2 No tab merges

Considered folding engineering Ops into Enforcement (engineering Ops becomes thin after exec strip), but the boundary is conceptually distinct:

- **Enforcement** = how rules execute (lifecycle, defense layers, hardening controls)
- **Ops** = who maintains them (Domain Stewards, Terraform-enforced governance)

Engineers benefit from that boundary even when one tab is leaner than the other.

## 7. Toggle UI Behavior

### 7.1 Placement

Top of sidebar, replacing the empty space above the menu items. Sits beside or below the CrowdStrike logo. Always visible whether sidebar is expanded or collapsed.

### 7.2 Persistence

- `localStorage['udp-mode']` ∈ `'exec' | 'eng'` — read on mount, fall back to `'exec'`, written on toggle.
- `localStorage['udp-exec-tab']` ∈ `ExecTabId` — last-active exec tab.
- `localStorage['udp-eng-tab']` ∈ `EngTabId` — last-active engineering tab.

### 7.3 Tab state across mode switches

Each mode has its own active tab state. Toggling modes lands the user on the tab they were last on in that mode — no resets. Both tab states persist independently across page refreshes.

### 7.4 Default landings

- First-visit exec: **Summary**
- First-visit engineering: **Sandbox**

### 7.5 Mode-switch animation

None. The tab list change is the visible signal. Animations on a presenter tool risk reading as fragile.

## 8. Code Architecture

### 8.1 Folder structure

```
src/
├── App.tsx                              # mode-aware shell
├── hooks/
│   └── useLocalStorage.ts               # NEW: tiny LS hook
└── components/
    ├── ModeToggle.tsx                   # NEW: sidebar pill
    ├── primitives.tsx                   # unchanged (shared)
    ├── diagrams/                        # unchanged (shared by both modes)
    │   ├── EntitlementsDiagram.tsx
    │   ├── DefenseDiagram.tsx
    │   ├── SDLCDiagram.tsx
    │   └── index.ts
    ├── exec/                            # NEW
    │   ├── ExecSummaryView.tsx
    │   ├── ExecArchitectureView.tsx
    │   ├── ExecSecurityView.tsx
    │   ├── ExecRoadmapView.tsx
    │   └── index.ts
    └── eng/                             # existing files moved here
        ├── SandboxView.tsx
        ├── SchemaView.tsx
        ├── TaxonomyView.tsx
        ├── PolicyView.tsx
        ├── EnforcementView.tsx
        ├── ExtensibilityView.tsx
        ├── OpsView.tsx
        └── index.ts
```

`OverviewView.tsx` is deleted; its content disperses across the four new exec views.

### 8.2 Mode state in `App.tsx`

```ts
type Mode = 'exec' | 'eng';
type ExecTabId = 'summary' | 'architecture' | 'security' | 'roadmap';
type EngTabId  = 'sandbox' | 'schema' | 'taxonomy' | 'policy'
               | 'enforcement' | 'extensibility' | 'ops';

const [mode,    setMode]    = useLocalStorage<Mode>     ('udp-mode',     'exec');
const [execTab, setExecTab] = useLocalStorage<ExecTabId>('udp-exec-tab', 'summary');
const [engTab,  setEngTab]  = useLocalStorage<EngTabId> ('udp-eng-tab',  'sandbox');
```

### 8.3 Mode-aware shell

`menuItems` is selected by `mode`. Active view is rendered via plain switch on `(mode, activeTab)`. No router, no state library — same pattern as today, just keyed on a tuple instead of a single tab id.

### 8.4 Cross-mode reuse

- All `diagrams/*` components (mode-neutral)
- All `primitives.tsx` exports (SectionHeader, CalloutBox, C, etc.)

### 8.5 New code surface

- `src/hooks/useLocalStorage.ts` — generic typed `useLocalStorage<T>(key, default)` hook.
- `src/components/ModeToggle.tsx` — two-state segmented pill.
- `src/components/exec/*` — four new view files.
- `src/components/exec/index.ts` — barrel.
- `src/components/eng/index.ts` — barrel for moved files.
- `src/components/diagrams/EntitlementsDiagram.tsx` — gains `mode?: 'exec' | 'eng'` prop and a parallel exec-mode content record.
- Hub-spoke from `ExtensibilityView` — gains the same `mode` prop pattern (extracted to `diagrams/` or kept inline; decided in plan).

### 8.6 No new dependencies

Existing stack is sufficient: React 18.3, TypeScript 5.5, Tailwind 3.4, lucide-react.

## 9. Migration Order

Each step ships green and the app stays demo-ready throughout.

1. Add `ModeToggle` + mode state in `App.tsx`. Both modes show the **current 9 tabs** (no behavior change yet — just plumbing).
2. Move existing views into `src/components/eng/` and update imports. Still no behavior change.
3. Create `src/components/exec/` skeletons (empty stubs).
4. Build out the four exec views one at a time, lifting content from `OverviewView.tsx` and the exec fragments of `ExtensibilityView` / `OpsView`.
5. Strip the exec fragments out of `ExtensibilityView` and `OpsView`.
6. Wire `mode` → `menuItems` → tab routing properly. The first real mode-switch happens here.
7. Delete `OverviewView.tsx`.
8. Reorder engineering tabs (Sandbox → Schema → Taxonomy → Policy → Enforcement → Extensibility → Ops).
9. Polish pass: toggle styling, mode-switch tab persistence, default tab landings, copy review on shared diagrams.

## 10. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Exec content authoring quality varies (vulnerability rewrites, narrative connectors) | Treat exec copy as first-class content; review before each tab is wrapped |
| Hub-spoke extraction adds scope | Acceptable — keeping it inline is also fine; decision deferred to implementation plan based on reuse needs |
| Tab reorder confuses users who memorized current order | Acceptable — current order isn't load-bearing for any external workflow; reorder is one-time |
| `localStorage` unavailable (incognito, edge cases) | `useLocalStorage` falls back to in-memory state; no crash |
| Future deep-link request | Adding URL hash routing is additive (`#/exec/architecture`) — design accommodates |

## 11. Success Criteria

- Toggling between modes changes the tab list, the active view, and persists across refresh.
- A first-time exec viewer can complete a 5–10 minute walkthrough without seeing any SQL, schema, or RAP-level detail.
- An engineer in engineering mode finds all the technical reference content currently in the dashboard, in a logical order.
- Each tab in each mode is approved as audience-appropriate before exec walkthroughs go to live demos.
- TypeScript stays clean (`pnpm tsc --noEmit` passes); no new runtime dependencies in `package.json`.
