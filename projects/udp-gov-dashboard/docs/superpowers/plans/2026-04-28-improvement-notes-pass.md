# Improvement Notes Pass — Post Mode-Toggle Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 10 reviewer-collected improvement notes plus 6 unresolved code-review issues from the prior pass, restoring lost components from the original executive summary and re-framing the toggle as audience-appropriate views of the **same** information.

**Architecture:** Unify the Summary tab across both modes (Exec ↔ Engineering see the same topics, framed for their audience). Restore Key Concepts / Governance Challenge / Core Vulnerabilities / Solution Pattern / Solution Patterns / UDP Synergy / Document Roadmap into a shared content pool. Apply surgical content + visual fixes for the rest.

**Tech Stack:** React 18.3, TypeScript 5.5 strict, Vite, Tailwind, lucide-react. No new deps.

**Plan-as-checkpoint:** This file is committed and updated after every task completes (re-commit with checkbox state). A new session can resume by reading the latest commit of this plan and continuing at the next unchecked task.

---

## Operating Mode

- **Full auto:** Each task dispatches an implementer subagent, then a spec-compliance reviewer, then a code-quality reviewer. Loop on failures. No human-in-loop between tasks.
- **Per-task model selection:** specified at the top of each task. Cheap models for mechanical work, capable models for design judgment.
- **Per-task commit:** implementer commits the task's changes. After review approval, the controller commits the plan checkpoint update (`docs(plan): check off task N`).
- **Build gate:** every task ends with `pnpm exec tsc --noEmit` green; selected tasks add `pnpm build`.

---

## Phase 1 — Structural: Unified Summary

### Task 1: Restore lost components and design dual-render summary

**Model:** Opus (architecture + judgment + bringing back rich content)

**Files:**
- Create: `src/components/summary/summaryContent.tsx` (shared data + sub-components)
- Modify: `src/components/exec/ExecSummaryView.tsx` (refactor to consume shared content with `mode='exec'`)
- Create: `src/components/eng/EngOverviewView.tsx` (consumes shared content with `mode='eng'`)
- Modify: `src/components/eng/index.ts` (export `EngOverviewView`)

**Source of truth for restored content:** the deleted `OverviewView` from commit `d69054b^` (lines pulled into spec below). Save inspection copy: `git show d69054b^:projects/udp-gov-dashboard/src/components/eng/OverviewView.tsx`

**What to restore (verbatim where indicated):**

1. **Hero** — exec keeps "Executive Summary" pill; eng uses "Section 1 · Architecture Overview" pill. Title/subtitle identical across modes (already in current ExecSummaryView). Vendor framing per Note 5 (Task 3 will reframe).

2. **Key Concepts** grid (6 cards: PDP, PEP, RAP, CTAS, ENTITLEMENTS, RLS) — restore verbatim from old OverviewView lines 62–69 / 181–207. Render in **both** modes (concepts are shared vocabulary).

3. **The Governance Challenge** — interactive PEP sidebar + detail panel — restore from old lines 35–60 / 209–294. Render in **both** modes. In exec, lower information density per cell (no internal ENTITLEMENTS reference); in eng, full detail.

4. **Core Vulnerabilities** — interactive vulnerability sidebar + detail panel (CTAS, Decentralized SQL, Grain Change, Mapping Bottleneck) — restore from old lines 71–127 / 296–356. Render in **both** modes; eng version unchanged, exec version uses lighter prose (controller picks lines).

5. **Solution Pattern (PDP/PEP segregation)** — restore from old lines 358–443 with the visual PDP→PEPs flow box. Render in **both** modes; this is the same architectural answer for both audiences.

6. **Solution Patterns Employed** — 6-card grid (NIST/ABAC/etc.) — restore from old lines 138–145 / 446–465. Render in **both** modes (eng audience can map to implementations; exec audience reads the standards).

7. **UDP Synergy callout** — already contains the "byproduct / no one-way doors / no vendor-binding" language Note 7 wants — restore verbatim from old lines 467–475. Render in **both** modes. **This satisfies Note 7.**

8. **Document Roadmap chips** — restore from old lines 129–136 / 478–498, but with mode-aware tab routing:
   - In exec: chips link to exec tabs (`summary` / `architecture` / `security` / `roadmap`).
   - In eng: chips link to eng tabs (`sandbox` / `taxonomy` / `schema` / `policy` / `enforcement` / `extensibility` / `ops`).
   - Drives the `onNavigate` callback supplied by App.tsx.

**Shape of `summaryContent.tsx`:**

```tsx
// summaryContent.tsx
import type { LucideIcon } from 'lucide-react';

export type Mode = 'exec' | 'eng';

export const KEY_CONCEPTS = [ /* 6 entries — restored verbatim */ ];
export const PEP_ITEMS    = [ /* 3 entries — restored verbatim */ ];
export const VULN_ITEMS   = [ /* 4 entries — restored verbatim */ ];
export const SOLUTION_PATTERNS = [ /* 6 entries — restored verbatim */ ];

export const ROADMAP_EXEC = [
  { section: '§1', label: 'Summary',      tabId: 'summary'      },
  { section: '§2', label: 'Architecture', tabId: 'architecture' },
  { section: '§3', label: 'Security',     tabId: 'security'     },
  { section: '§4', label: 'Roadmap',      tabId: 'roadmap'      },
];

export const ROADMAP_ENG = [
  { section: '§1',    label: 'Overview',          tabId: 'overview'      },
  { section: '§2',    label: 'Developer Sandbox', tabId: 'sandbox'       },
  { section: '§3',    label: 'Schema Design',     tabId: 'schema'        },
  { section: '§4',    label: 'Tag Taxonomy',      tabId: 'taxonomy'      },
  { section: '§5',    label: 'Policy Logic',      tabId: 'policy'        },
  { section: '§6',    label: 'Hardening',         tabId: 'enforcement'   },
  { section: '§7',    label: 'Extensibility',     tabId: 'extensibility' },
  { section: '§8',    label: 'Roadmap & Ops',     tabId: 'ops'           },
];

// Sub-components: HeroBlock, KeyConceptsGrid, GovernanceChallenge,
// CoreVulnerabilities, SolutionPatternViz, SolutionPatternsGrid,
// UDPSynergyCallout, DocumentRoadmap
// Each accepts mode?: Mode and renders audience-appropriate copy.
```

**Files compose them:**

```tsx
// ExecSummaryView.tsx (now thin shell)
export default function ExecSummaryView({ onNavigate }: Props) {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <HeroBlock         mode="exec" />
      <KeyConceptsGrid   mode="exec" />
      <GovernanceChallenge mode="exec" />
      <CoreVulnerabilities mode="exec" />
      <SolutionPatternViz mode="exec" />
      <SolutionPatternsGrid mode="exec" />
      <UDPSynergyCallout />
      <DocumentRoadmap mode="exec" onNavigate={onNavigate} />
    </div>
  );
}

// EngOverviewView.tsx — same composition with mode="eng"
```

**Why a shared content module?** The user's instruction: "We don't want to isolate information by the toggles. We want the toggles to present audience appropriate versions of the same information." A single source of truth for concepts + diagrams + patterns prevents drift; mode prop tunes copy + density.

**Where exec vs eng diverge:**
- Hero badge: `Executive Summary` vs `Section 1 · Architecture Overview`
- Hero density: same prose; eng version may add small subtitle line referencing onward sections
- Governance Challenge / Vulnerabilities: detail panel prose differs (exec → no internal table refs; eng → use `<C>ENTITLEMENTS</C>` and full pipeline language)
- Roadmap chips: mode-aware tab list (above)

- [x] **Step 1: Inspect deleted OverviewView**
  Run: `git show d69054b^:projects/udp-gov-dashboard/src/components/eng/OverviewView.tsx | head -200`

- [x] **Step 2: Create `src/components/summary/summaryContent.tsx`**
  Implement the data exports + sub-components as described. Re-use existing primitives (`SectionHeader`, `InfoCard`, `CalloutBox`, `StepSidebar`, `DetailPanel`, `PrevNextNav`, `C`, `colorStyles`).

- [x] **Step 3: Refactor `ExecSummaryView.tsx`** to consume `summaryContent` with `mode="exec"`.

- [x] **Step 4: Create `EngOverviewView.tsx`** as parallel composition with `mode="eng"`.

- [x] **Step 5: Export from `eng/index.ts`**

- [x] **Step 6: Verify**
  Run: `pnpm exec tsc --noEmit` — expect 0 errors.

- [x] **Step 7: Commit**
  ```bash
  git add src/components/summary src/components/exec/ExecSummaryView.tsx src/components/eng/EngOverviewView.tsx src/components/eng/index.ts
  git commit -m "refactor(udp-dashboard): extract shared summary content; add EngOverviewView"
  ```

**Success criteria:**
- `tsc --noEmit` green
- ExecSummaryView and EngOverviewView render the same 8 sections (hero, concepts, challenge, vulns, solution viz, solution patterns, synergy, roadmap)
- Mode-specific divergences are limited to copy, badge, density — never structural

**✅ COMPLETED** — commits `03e06ca` (initial) + `32ddc50` (review fixes: dropped unused mode props on 4 invariant sub-components, replaced React.createElement with JSX-variable idiom)

---

### Task 2: Wire EngOverviewView as first eng tab

**Model:** Sonnet (multi-file integration)

**Files:**
- Modify: `src/App.tsx` (add `'overview'` to `EngTabId`, prepend menu entry, set as default, route to `EngOverviewView`)

**Code shape:**

```tsx
type EngTabId =
  | 'overview'
  | 'sandbox'
  | 'enforcement'
  | 'taxonomy'
  | 'schema'
  | 'policy'
  | 'extensibility'
  | 'ops';

const engMenu: { id: EngTabId; label: string; icon: LucideIcon }[] = [
  { id: 'overview',       label: 'Overview',            icon: LayoutDashboard }, // NEW first item
  { id: 'sandbox',        label: 'Developer Experience', icon: Cpu },
  { id: 'schema',         label: 'Schema Design',       icon: Table2 },
  { id: 'taxonomy',       label: 'Tag Taxonomy',        icon: Tags },
  { id: 'policy',         label: 'Policy Logic',        icon: Code },
  { id: 'enforcement',    label: 'Hardening',           icon: Layers },
  { id: 'extensibility',  label: 'Extensibility',       icon: Globe },
  { id: 'ops',            label: 'Roadmap & Ops',       icon: Settings },
];

const [engTab, setEngTab] = useLocalStorage<EngTabId>('udp-eng-tab', 'overview');

const engViews: Record<EngTabId, React.ReactNode> = {
  overview: <EngOverviewView onNavigate={navigateEng} />,
  sandbox: <SandboxView onNavigate={navigateEng} />,
  // …rest unchanged
};
```

Import `LayoutDashboard` from `lucide-react`.

- [x] **Step 1: Add `'overview'` to `EngTabId` union, default `useLocalStorage` value, and prepend menu entry**

- [x] **Step 2: Wire `EngOverviewView` into `engViews` dict** with `onNavigate={navigateEng}`

- [x] **Step 3: Verify**
  Run: `pnpm exec tsc --noEmit && pnpm build`

- [x] **Step 4: Commit**
  ```bash
  git add src/App.tsx
  git commit -m "feat(udp-dashboard): add Overview as first engineering tab"
  ```

**Success criteria:**
- App boots in eng mode landing on Overview by default
- Roadmap chips in EngOverviewView navigate to other eng tabs via `navigateEng`
- Build succeeds

**✅ COMPLETED** — commit `acdc772`

---

## Phase 2 — Improvement Notes (Content Quality)

### Task 3: Reframe definitive CrowdStrike claims as demonstrative

**Model:** Sonnet (judgment in copy editing across multiple files)

**Note 5:** Don't make definitive claims about current CrowdStrike state. Frame Snowflake / AWS / Bedrock as demonstrative examples; leave room for the org to extend.

**Files (sweep these — adjust as encountered):**
- `src/components/summary/summaryContent.tsx` (Hero subtitle, Governance Challenge intro, PEP detail)
- `src/components/eng/ExtensibilityView.tsx` (subtitle line ~111: "CrowdStrike's data estate spans Snowflake, AWS S3, and Bedrock AI agents")
- `src/components/exec/ExecSummaryView.tsx` (only if not already covered by summaryContent.tsx after Task 1)
- Any other view that asserts "CrowdStrike does X today" — search and triage

**Concrete rewrites:**

| Before | After |
|--------|-------|
| "CrowdStrike's security engineering team identified gaps…" | "Identified gaps in Snowflake's row-level security propagation can be addressed using standard, vendor-neutral patterns…" |
| "CrowdStrike's data estate spans Snowflake, AWS S3, and Bedrock AI agents" | "A representative data estate — illustrated here as Snowflake, AWS S3, and Bedrock — spans multiple enforcement points. The pattern extends to any platform." |
| "Today: each platform maintains its own access rules" | "In a typical multi-platform deployment, each platform maintains its own access rules" |

**Rule of thumb:** any sentence that begins "CrowdStrike X…" needs a softening rewrite. Use phrases like "in a typical UDP deployment", "platforms in this pattern", "an illustrative target stack of …".

- [ ] **Step 1: Scan for definitive CrowdStrike state claims**
  Run: `rtk grep -n -i "crowdstrike" src/` (fall back to `grep -RIn -i 'crowdstrike' src` if rtk unavailable)

- [ ] **Step 2: Rewrite each occurrence per the rule of thumb**

- [ ] **Step 3: Verify**
  Run: `pnpm exec tsc --noEmit`

- [ ] **Step 4: Commit**
  ```bash
  git commit -m "docs(udp-dashboard): reframe CrowdStrike claims as demonstrative examples"
  ```

**Success criteria:**
- No copy asserts "CrowdStrike does X today" or "CrowdStrike's estate is X"
- Snowflake / AWS / Bedrock are framed as illustrative; extensibility framing remains intact

---

### Task 4: Schema dunder rename — SALES_GRANULAR → SALES__GRANULAR

**Model:** Sonnet (multi-file rename with care for cross-references)

**Note 1:** Use double underscores to separate domain from granularity (e.g., `SALES_GRANULAR` → `SALES__GRANULAR`). Makes the domain prefix unambiguous when granularity tokens contain underscores.

**Files (audit these — likely sites):**
- `src/components/eng/SchemaView.tsx` (primary — schema array)
- `src/components/eng/PolicyView.tsx` (RAP playground may reference schema names)
- `src/components/eng/EnforcementView.tsx` (lifecycle / hardening references)
- `src/components/eng/TaxonomyView.tsx` (tag application examples)
- `src/components/summary/summaryContent.tsx` (only if it references specific schema names)

**Renames:**
- `SALES_GRANULAR` → `SALES__GRANULAR`
- `SALES_BY_REGION` → `SALES__BY_REGION`
- `SALES_GLOBAL` → `SALES__GLOBAL`
- `HR_BY_DEPARTMENT` → `HR__BY_DEPARTMENT`
- `HR_INDIVIDUAL` → `HR__INDIVIDUAL`
- `FINANCE_GLOBAL` → `FINANCE__GLOBAL`
- Any other domain-prefixed schema name

**Rule:** the **first** underscore separating domain from granularity becomes a dunder. Existing dunders within granularity tokens (none currently, but watch for it) remain single underscores.

- [ ] **Step 1: Find all references**
  Run: `rtk grep -n -E '(SALES|HR|FINANCE|THREAT)_(GRANULAR|BY_|GLOBAL|INDIVIDUAL)' src/`

- [ ] **Step 2: Apply renames file by file**
  Use `Edit` with `replace_all` per file. Verify no false positives in non-schema strings.

- [ ] **Step 3: Verify**
  Run: `pnpm exec tsc --noEmit`

- [ ] **Step 4: Commit**
  ```bash
  git commit -m "refactor(udp-dashboard): use dunder convention for schema domain__granularity names"
  ```

**Success criteria:**
- Every schema name follows `<DOMAIN>__<GRANULARITY>` pattern
- No broken references; tsc green

---

### Task 5: Enumerate full sandbox/lab permissions in SandboxView

**Model:** Sonnet (content design + visual structure)

**Note 2:** Enumerate the full set of allowed and blocked actions for the private sandbox/lab. Current view has an abbreviated list; reviewers wanted it explicit.

**File:**
- Modify: `src/components/eng/SandboxView.tsx`

**Currently:**
- Allowed (lines ~52–58): CREATE TABLE, JOIN, ITERATE
- Blocked (lines ~60–66): GRANT USAGE, COPY INTO, EXTERNAL STAGE
- Shared Perimeter (lines ~92–97): ROW ACCESS POLICY, BI DASHBOARDS, GOVERNED

**Replace with full enumeration (organized by capability, not raw SQL):**

```tsx
const SANDBOX_ALLOWED = [
  { label: 'CREATE TABLE / VIEW',  detail: 'Materialize working tables and views inside the sandbox schema.' },
  { label: 'CREATE TEMP TABLE',    detail: 'Session-scoped scratch space; auto-dropped on disconnect.' },
  { label: 'INSERT / UPDATE / DELETE / MERGE', detail: 'Mutate sandbox-owned objects freely.' },
  { label: 'SELECT / JOIN',        detail: 'Read from any governed schema where the user has entitlements.' },
  { label: 'CREATE FUNCTION (UDF) / PROCEDURE', detail: 'Iterate on transforms, ML features, ELT logic.' },
  { label: 'CREATE STAGE (internal)', detail: 'Stage files for testing inside the account.' },
  { label: 'COPY INTO (sandbox-scoped)', detail: 'Load test data into sandbox tables.' },
  { label: 'TIME TRAVEL',          detail: 'Recover from mistakes within retention window.' },
];

const SANDBOX_BLOCKED = [
  { label: 'GRANT / REVOKE',          detail: 'Cannot share sandbox objects outward — DLP boundary.' },
  { label: 'CREATE EXTERNAL STAGE',   detail: 'No egress to outside cloud storage from the sandbox.' },
  { label: 'CREATE SHARE / REPLICATION', detail: 'No cross-account distribution.' },
  { label: 'ALTER ACCOUNT / WAREHOUSE / ROLE', detail: 'No platform-level configuration changes.' },
  { label: 'CREATE ROW ACCESS POLICY / MASKING POLICY', detail: 'Policy authorship is centralized; sandbox cannot self-grant exemptions.' },
  { label: 'MOUNT EXTERNAL OBJECT STORE', detail: 'No bridging to S3 / GCS / Azure outside the governed perimeter.' },
  { label: 'EXFIL VIA UDF (network egress)', detail: 'External access integrations are not enabled in sandbox.' },
];

const SANDBOX_PERIMETER_GUARANTEES = [
  { label: 'Row Access Policies remain enforced', detail: 'Reading governed schemas applies the same RAPs as production.' },
  { label: 'Masking Policies remain enforced',    detail: 'PII columns stay masked in sandbox queries.' },
  { label: 'Lineage is captured',                  detail: 'Snowflake ACCESS_HISTORY records every read; sandbox is fully audited.' },
  { label: '30-day auto-drop',                     detail: 'Idle sandbox schemas are auto-cleaned after 30 days.' },
  { label: 'Offboarding cascade',                  detail: 'When a user is offboarded in Okta, their sandbox is dropped within 24h.' },
];
```

Render as 3-column or stacked sections with the existing `SandboxView` styling (red/amber/emerald accent rails). Update the `SectionHeader` `badge` from "Sections 2 & 7" to "Section 2 · Developer Experience" since the old multi-section badge is now stale (overview deletion + Task 2 unification).

- [ ] **Step 1: Replace abbreviated lists with full enumerations**

- [ ] **Step 2: Update SectionHeader badge**

- [ ] **Step 3: Verify**
  Run: `pnpm exec tsc --noEmit`

- [ ] **Step 4: Commit**
  ```bash
  git commit -m "feat(udp-dashboard): enumerate full sandbox permission matrix"
  ```

**Success criteria:**
- 8 allowed, 7 blocked, 5 perimeter guarantees rendered
- Visual hierarchy preserved
- No TS errors

---

### Task 6: PII visibility + RBAC overlay callouts

**Model:** Opus (judgment about where PII/RBAC framing fits, ABAC vs RBAC contrast)

**Note 3:** Always denote PII capabilities. The current model is ABAC-driven via ENTITLEMENTS; if RBAC isn't explicit, highlight where it could overlay (e.g., role-based privileges like `UNMASK_PII` granted to a security analyst role).

**Files (per-view assessment — implementer chooses placement):**
- `src/components/eng/SchemaView.tsx` — add a column or row indicating PII presence per schema (HR_INDIVIDUAL has PII)
- `src/components/eng/TaxonomyView.tsx` — already has PII_POLICY tag; add a callout explaining where RBAC overlays ABAC
- `src/components/exec/ExecSecurityView.tsx` — add a PII-specific risk surface callout
- `src/components/summary/summaryContent.tsx` — Key Concepts grid: add ABAC/RBAC distinction (or update the existing entries to mark which model they belong to)

**Concrete adds:**

1. **SchemaView** — add a `PII?` column (badge: `Yes` red / `No` gray) and a footnote: "PII columns are masked column-level; row-level entitlements still apply."

2. **TaxonomyView** — new callout below `PII_POLICY` section:

```tsx
<CalloutBox title="ABAC + RBAC: layered access models" variant="amber">
  <p>
    The default model is <strong>ABAC</strong> — access derives from attributes (region, owner, domain) in
    <C>ENTITLEMENTS</C>. PII unmasking is the natural place for an <strong>RBAC overlay</strong>:
    grant <C>UNMASK_PII</C> to specific roles (e.g. <C>SECURITY_ANALYST</C>, <C>FRAUD_INVESTIGATOR</C>) so that
    column masking respects role membership in addition to row-level entitlements. Layering RBAC on ABAC keeps
    the data plane attribute-driven while exposing a clear, auditable surface for sensitive-data exemptions.
  </p>
</CalloutBox>
```

3. **ExecSecurityView** — add a 5th risk card "PII Exposure via Unmasked Joins" or similar, framed in exec language ("a developer joins to a PII column in a sandbox notebook → masking still applies because policies attach to columns, not queries").

4. **summaryContent Key Concepts** — extend definitions:
   - `PDP` definition: append "(ABAC source of truth)"
   - Add new entry `RBAC` (Role-Based Access Control) — definition: "Layered overlay used for sensitive-data exemptions like PII unmasking; complements ABAC."

- [ ] **Step 1: SchemaView — add PII column to data table**

- [ ] **Step 2: TaxonomyView — add ABAC+RBAC callout**

- [ ] **Step 3: ExecSecurityView — add PII risk card**

- [ ] **Step 4: summaryContent — extend Key Concepts (PDP description + new RBAC entry)**

- [ ] **Step 5: Verify**
  Run: `pnpm exec tsc --noEmit`

- [ ] **Step 6: Commit**
  ```bash
  git commit -m "feat(udp-dashboard): make PII capabilities explicit + introduce RBAC overlay narrative"
  ```

**Success criteria:**
- PII visible at-a-glance in SchemaView
- RBAC overlay clearly explained in TaxonomyView
- Exec audience sees PII as a discrete risk surface
- Key Concepts grid distinguishes ABAC (default) from RBAC (overlay)

---

### Task 7: Fix SDLC Lane B alignment + dark-mode contrast

**Model:** Sonnet (visual / SVG geometry — surgical)

**Note 8:** Lane B pulse misalignment as it reaches governed schema; two black components on governed lines invisible in dark mode.

**File:**
- Modify: `src/components/diagrams/SDLCDiagram.tsx`

**Issues:**
1. Lane B pulse path (`#sp-b`, line ~173) ends at `y=150` (bottom of GOVERNED rect); explicit edge (line ~211) ends at `y=135` (mid-rect). The pulse and the static edge don't share an endpoint.
2. Post-merge edges (lines ~214–215) `stroke="#f87171" strokeOpacity=".55"` may render too faint against dark backgrounds.
3. GOVERNED rect (line ~274) `fill="#1a0f0a"` is nearly black; LIVE rect (line ~282) `fill="#1a0a0a"` likewise. Reviewers reported components disappearing.

**Fixes:**
1. **Align Lane B endpoints** — choose a single anchor (e.g. y=140 — visible mid-edge), update both `#sp-b` `M` path and the corresponding explicit edge so the pulse animates onto the same point as the static line terminates.

2. **Bump post-merge edge contrast** — change `strokeOpacity` from `.55` → `.85` (or remove and rely on the base stroke). Verify color works against `#080808`.

3. **Lighten governed/live rect fills** — change `#1a0f0a` → `#2a1a14` (visible amber-tinted) and `#1a0a0a` → `#2a1414` (visible red-tinted). Keep stroke colors identical.

- [ ] **Step 1: Inspect current SDLCDiagram lane B paths and rect fills**

- [ ] **Step 2: Apply geometry fix to lane B endpoints**

- [ ] **Step 3: Bump edge contrast + lighten rect fills**

- [ ] **Step 4: Verify visually**
  Run dev server (`pnpm dev`), navigate to the page that renders SDLCDiagram, confirm:
  - Lane B pulse arrives precisely at the static edge endpoint (no jog)
  - Post-merge edges are clearly visible
  - GOVERNED and LIVE rect outlines + fills are legible against `#080808`

- [ ] **Step 5: Verify build**
  Run: `pnpm exec tsc --noEmit`

- [ ] **Step 6: Commit**
  ```bash
  git commit -m "fix(udp-dashboard): align SDLC Lane B endpoints + improve dark-mode contrast"
  ```

**Success criteria:**
- Pulse + edge share endpoint
- All edges visible
- Rects legible

---

### Task 8: Redesign ExtensibilityView with concrete engineering recipes

**Model:** Opus (architecture redesign)

**Note 9:** "Extensibility page is garbage; needs complete revisit." Current view has two parallel 3-step walkthroughs (newPepSteps + newPdpSteps), a 3-card key-properties grid, and a guarantee callout — all abstract. Reviewers want concrete recipes.

**File:**
- Modify (full replacement): `src/components/eng/ExtensibilityView.tsx`

**New structure:**

1. **Section header** — keep existing.

2. **Hub-and-spoke diagram** — keep `<HubSpokeDiagram mode="eng" />`.

3. **Concrete recipes section** — replace the abstract walkthroughs with two **named, real-platform recipes**:

   - **Recipe A: "Add AWS S3 (Lake Formation) as a PEP"**
     - Step 1: Mirror `ENTITLEMENTS` to S3 as Parquet via Snowflake `COPY INTO @s3_stage/entitlements/`. Schedule via Snowflake Task or Airflow DAG.
     - Step 2: Create an AWS Glue table `entitlements_mirror` over the Parquet location. Set Lake Formation permissions to `SELECT` for the IAM role used by readers.
     - Step 3: For each governed S3 dataset, attach a Lake Formation Row Filter that joins to `entitlements_mirror` on `caller_identity()` → `user_id`, filtering on `data_domain` and `region`.
     - Step 4: Test: a user with `region='West'` reading a governed S3 dataset gets only West rows. Verify by impersonation through `aws sts assume-role`.
     - Code blob: small AWS CLI / Lake Formation policy snippet showing the row-filter expression.

   - **Recipe B: "Add Bedrock Agent as a PEP"**
     - Step 1: Expose `ENTITLEMENTS` lookup as a Lambda function (REST). Cache 60 s.
     - Step 2: Bedrock agent action group: declare an `entitlements_lookup` tool that returns the caller's `data_domains`, `regions`, `unmask_pii` flag.
     - Step 3: System prompt: instruct the agent to call `entitlements_lookup` before any tool that fetches data, and constrain context to the returned domains.
     - Step 4: Bedrock guardrail: deny topic = `pii_topics` unless `unmask_pii=true` from the lookup.
     - Step 5: Test: a user without West region asking the agent about a West deal sees a refusal with cited entitlement gap.
     - Code blob: small JSON snippet of the action group + a guardrail config sketch.

4. **Add a third recipe: "Add a New PDP Source (e.g., Workday for HR ownership)"**
   - Step 1: Define identity mapping (Workday `worker_id` → existing `user_id` in `ENTITLEMENTS`).
   - Step 2: Write Workday → `ENTITLEMENTS_STAGING` ELT job; standard schema validation in promotion procedure.
   - Step 3: Register Workday as an authoritative source for `data_domain='HR'` rows in the staging table metadata.
   - Step 4: Run promotion → all PEPs (Snowflake / S3 / Bedrock) inherit the new HR ownership rows automatically.

5. **Replace 3-card key-properties grid** with a **comparison matrix** showing for each PEP what's reused vs platform-specific:

| Aspect | Snowflake (RAPs) | AWS S3 (Lake Formation) | Bedrock |
|--------|------------------|-------------------------|---------|
| Source of truth for access | `ENTITLEMENTS` table | `entitlements_mirror` (Glue) | Lambda over `ENTITLEMENTS` |
| Identity propagation | `current_user()` | `caller_identity()` | invoker session |
| Filter mechanism | Row Access Policy | Row Filter Expression | System prompt + guardrail |
| Update latency | Real-time | Refresh cadence (mirror) | TTL-bound (lookup cache) |
| New addition | None — already wired | Mirror + table + row filter | Lambda + action group |

6. **Architecture Guarantee callout** — keep, lightly edit per Task 3 (no definitive CrowdStrike claims).

- [ ] **Step 1: Draft three recipe data structures + comparison matrix data**

- [ ] **Step 2: Replace ExtensibilityView body** with the new content

- [ ] **Step 3: Verify**
  Run: `pnpm exec tsc --noEmit && pnpm build`

- [ ] **Step 4: Commit**
  ```bash
  git commit -m "refactor(udp-dashboard): replace abstract Extensibility walkthroughs with concrete recipes"
  ```

**Success criteria:**
- Three named recipes (S3 PEP, Bedrock PEP, Workday PDP) with concrete steps + code snippets
- Comparison matrix showing PEP-specific vs reused mechanics
- No abstract "Step 1: Mirror ENTITLEMENTS" without a platform binding

---

## Phase 3 — Code-Review Hygiene

### Task 9: Fix code-review important issues (jargon leaks)

**Model:** Haiku (mechanical, prescribed edits)

**Files & exact edits:**

1. **`src/components/exec/ExecRoadmapView.tsx`** — line ~180 inside the "Zero New Headcount" callout body:
   - Before: `the same people who already maintain the source systems that feed it. The central <C>ENTITLEMENTS</C> matrix is maintained by the same people who already maintain the source systems that feed it.`
   - After: `the same people who already maintain the source systems that feed it. The central <strong className="text-white">access matrix</strong> is maintained by the same people who already maintain the source systems that feed it.`
   - Rationale: `<C>ENTITLEMENTS</C>` is engineering jargon; in exec context use "access matrix".

2. **`src/components/diagrams/HubSpokeDiagram.tsx`** — line ~191:
   - Before: header `<h3>PDP / PEP Architecture — Hub and Spoke</h3>` always renders.
   - After: gate by `mode`:
     ```tsx
     {mode === 'eng' && (
       <h3>PDP / PEP Architecture — Hub and Spoke</h3>
     )}
     {mode === 'exec' && (
       <h3>Single Source of Truth — Hub and Spoke</h3>
     )}
     ```

3. **`src/components/diagrams/EntitlementsDiagram.tsx`** — lines ~429–430:
   - Before: header `<h3>Governance Automation Pipeline</h3><p>Sources → PDP → PEPs</p>` always renders.
   - After: gate the second line by `mode`:
     ```tsx
     <h3>Governance Automation Pipeline</h3>
     {mode === 'eng' && <p>Sources → PDP → PEPs</p>}
     {mode === 'exec' && <p>Identity sources → unified rule book → enforced everywhere</p>}
     ```

- [ ] **Step 1: Apply edit 1 (ExecRoadmapView)**

- [ ] **Step 2: Apply edit 2 (HubSpokeDiagram)**

- [ ] **Step 3: Apply edit 3 (EntitlementsDiagram)**

- [ ] **Step 4: Verify**
  Run: `pnpm exec tsc --noEmit`

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "fix(udp-dashboard): remove engineering jargon leaks in exec mode"
  ```

**Success criteria:**
- Three jargon leaks closed
- Tsc green

---

### Task 10: Cleanup nice-to-haves

**Model:** Haiku (mechanical refactors)

**Files & edits:**

1. **`src/components/diagrams/HubSpokeDiagram.tsx`** — remove local `type HubSpokeMode = 'exec' | 'eng'`. Import `Mode` from `../ModeToggle` (or re-export from there if not already). Use `Mode` everywhere `HubSpokeMode` was used.

2. **`src/App.tsx`** — line ~180 footer badge `SILVER LAYER & GOVERNANCE` is engineering jargon. Replace with mode-aware label:
   ```tsx
   <span>{mode === 'exec' ? 'GOVERNANCE OVERVIEW' : 'SILVER LAYER & GOVERNANCE'}</span>
   ```

3. **`src/hooks/useLocalStorage.ts`** — review the setter wrapper. If the wrapper does nothing beyond `setState`, drop it and return `setState` directly. If it has stable identity logic, leave it but add a one-line note.

- [ ] **Step 1: Dedupe HubSpokeMode → Mode**

- [ ] **Step 2: Footer mode-aware label**

- [ ] **Step 3: useLocalStorage setter cleanup**

- [ ] **Step 4: Verify**
  Run: `pnpm exec tsc --noEmit`

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "chore(udp-dashboard): nice-to-have cleanups (Mode dedup, footer, hook)"
  ```

**Success criteria:**
- No `HubSpokeMode` type leftover
- Footer reads mode-appropriately
- `useLocalStorage` is minimal

---

### Task 11: Cross-page redundancy + conflict sweep

**Model:** Opus (judgment + cross-file pattern detection)

**Note 4:** Scan across all pages for redundant or conflicting information.

**Method (controller hands the implementer a structured audit):**

The implementer subagent reads every view (`src/components/exec/*`, `src/components/eng/*`) and produces an audit table:

| Topic | Views asserting it | Conflict? | Canonical home |
|-------|-------------------|-----------|----------------|
| Sandbox hardening | SandboxView, EnforcementView | Possibly | EnforcementView (full); SandboxView links out |
| Phases (1 & 2) | ExecRoadmapView, OpsView | Check overlap | ExecRoadmapView (audience); OpsView (eng detail) |
| ENTITLEMENTS lifecycle | EnforcementView, summaryContent | Possibly | EnforcementView (full); summaryContent links |
| PEP list (Snowflake/S3/Bedrock) | summaryContent, ExtensibilityView, diagrams | Probably consistent | summaryContent intro; ExtensibilityView recipes |
| PII story | TaxonomyView, ExecSecurityView, SchemaView | Check after Task 6 | TaxonomyView (canonical) |
| Domain stewards | OpsView | Single home | OpsView |

For each conflict found:
- Decide canonical home
- In the redundant view, replace the duplicate with a one-line summary + cross-link (use existing `onNavigate` patterns where possible).

For each consistent overlap:
- Leave alone, but note in audit.

- [ ] **Step 1: Implementer reads all views, builds audit table**

- [ ] **Step 2: Resolve conflicts (decide canonical home, edit duplicate sites)**

- [ ] **Step 3: Verify**
  Run: `pnpm exec tsc --noEmit && pnpm build`

- [ ] **Step 4: Commit**
  ```bash
  git commit -m "refactor(udp-dashboard): de-duplicate cross-view content; canonicalize topic homes"
  ```

**Success criteria:**
- Audit table committed in commit message body
- No content asserts conflicting facts (e.g., different phase contents, different sandbox controls)
- Each topic has a single canonical home

---

### Task 12: Final code review + build verification

**Model:** Sonnet (review judgment + verification)

**Subagent:** dispatch `superpowers:code-reviewer` agent with the entire branch diff since the prior pass merge.

**Files:** N/A — review-only.

**Steps:**

- [ ] **Step 1: Capture branch diff**
  Run: `git log --oneline <last-pass-merge-base>..HEAD` and `git diff --stat <base>..HEAD`

- [ ] **Step 2: Dispatch code-reviewer subagent**
  Hand it the changed files + the spec at `docs/superpowers/specs/2026-04-28-exec-eng-mode-toggle-design.md` for context, plus this plan, plus the 10 improvement notes.

- [ ] **Step 3: Triage findings**
  Critical/Important → fix inline; Nice-to-have → spawn-task chips for follow-up.

- [ ] **Step 4: Final build + tsc**
  Run: `pnpm exec tsc --noEmit && pnpm build`

- [ ] **Step 5: Commit any fixes; if no fixes, mark this task complete**

**Success criteria:**
- Reviewer reports zero open Critical or Important issues
- Build green
- Plan checkpoint reflects all 12 tasks done

---

## Reminder for End-of-Pass

**Note 10 deferred:** SOW reconciliation — needs Google Workspace access. After Task 12 completes, surface this to the user as a follow-up: "When you grant access to the internal SOW for UDP, I can reconcile this dashboard against it for terminology / scope alignment."

---

## Resume Protocol

If a session ends mid-pass:
1. Read this file's latest commit on the working branch.
2. Find the first unchecked task — start there.
3. Don't re-do completed tasks (their changes are already on the branch).
4. After every task completion: edit this file to check off boxes; commit `docs(plan): check off task N`.

