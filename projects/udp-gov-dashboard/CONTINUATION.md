# CONTINUATION — UDP Governance Dashboard

> Session handoff document. Read this first before resuming work on the
> Governance Implementation page.

**Last session:** 2026-04-30
**Branch:** `claude/udp-gov-dashboard-exec-eng-mode-toggle`
**Last commit:** `aac6b7b feat(udp-dashboard): governance implementation page + 5-chapter narrative redesign`

---

## TL;DR

The Governance Implementation page (engineering-mode tab) was rebuilt end to
end across ~7 phases and then redesigned as a **5-chapter guided narrative**
to fix UX chaos from the flat 7-tab layout. Build is green, types are clean,
all prior phase artifacts are committed. The next natural beats are
*observational* (walk the live app, capture rough edges) rather than more
construction.

---

## Current state

### Shell (`src/components/eng/GovernanceImplView.tsx`, 599 lines)

5-chapter stepper replaces the previous 7-tab bar:

```
1. The Claim         — scale strip + Enforces/Detects/Roadmap grid (first paint)
2. The Architecture  — 3-lane pipeline diagram + Principal model (inlined IdentityTab)
3. The Controls      — sub-nav over Tags / Schemas / Policy / WritePath
                       with ONE global Happy | Failure lens
4. The Evidence      — AuditTab (compliance map + evidence drawer)
5. The Operations    — OperatingModelTab (change mgmt, SLOs, break-glass, risk)
```

- `chapter` state: `ChapterId = 'claim'|'arch'|'controls'|'evidence'|'ops'`
- `control` state (Ch 3 only): `ControlId = 'tags'|'schemas'|'policy'|'writePath'`
- `lens` state: hoisted; toggle only renders while in Ch 3
- `principal` state: hoisted; switcher only renders inline in Ch 3
- `showBoundaries`: toggle now inline next to the pipeline diagram in Ch 2

### Primitives (`src/components/primitives.tsx`, 1223 lines)

15 governance primitives total. New in the redesign:
- `Chapter<Id>` type
- `ChapterNav<Id>` — numbered pills stepper (past/active/future states)
- `ChapterFooter<Id>` — prev · takeaway · next row

### Tab files (`src/components/eng/governance/tabs/`)

- `TagTaxonomyTab`, `SchemaDesignTab`, `PolicyLogicTab`, `WritePathTab` —
  all now accept `lens: Lens` prop; local `useState<Lens>` + toggle pills
  deleted. Each still owns its own per-playground state (selected scenario,
  user, role, etc.)
- `IdentityTab` — still has a default export, but the three named exports
  (`PrincipalGallery`, `PrincipalControlsMatrix`, `IdentityFailureModes`)
  are what Ch 2 actually consumes. The default `IdentityTab` component is
  effectively dead code now and can be deleted if a cleanup is desired.
- `AuditTab`, `OperatingModelTab` — got "Chapter 4" / "Chapter 5" labels on
  their intro cards to match the visual rhythm. No structural changes.

### Data modules (`src/components/eng/governance/data/`)

Untouched in this session. Files: `principals.ts`, `tags.ts`,
`schemas.tsx` (note: `.tsx` because it emits JSX), `policy.ts`,
`writePath.ts`, `entitlements.ts`, `compliance.ts`.

---

## How to resume

```bash
cd /Users/gvermillion/personal/claude-cove/projects/udp-gov-dashboard

# Install + run
pnpm install
pnpm dev                      # http://localhost:5173

# Verify green build
pnpm exec tsc --noEmit        # expect no output, exit 0
pnpm build                    # expect ~484 kB / 122 kB gzip

# Grep sanity checks
grep -c "chapter === "        src/components/eng/GovernanceImplView.tsx      # >= 5
grep -rc "setLens\|useState<Lens>" src/components/eng/governance/tabs/       # all 0
grep -c "ChapterNav\|ChapterFooter" src/components/primitives.tsx            # >= 3
```

Branch is `claude/udp-gov-dashboard-exec-eng-mode-toggle`. Two commits landed
this session:
- `a7e6c88` chore(udp-dashboard): Docker + nginx deployment config
- `aac6b7b` feat(udp-dashboard): governance implementation page + 5-chapter narrative redesign

---

## Open follow-ups (prioritized)

### 1. Live walkthrough pass — HIGHEST PRIORITY

The redesign hasn't been eyeball-tested end to end. Walk all 5 chapters,
toggle the lens, swap principals, click every link in the pipeline diagram.
Expected rough edges:

- **Sticky toolbar behavior**: currently uses `-mx-4 px-4` to break out of
  the section container; may look off on narrow viewports or if the parent
  wrapper changes padding. Verify at 1440 / 1280 / 1024 widths.
- **Chapter 1 first paint**: scale strip is a `flex-wrap` — on very narrow
  widths the chips wrap awkwardly. Consider grouping into `grid-cols-*` or
  a horizontal scroll.
- **Chapter 2 pipeline diagram**: three lanes × 5 grid cells is wide.
  Horizontal overflow at < 1280 might clip the "validates" / "resolves"
  arrow labels.
- **Chapter 3 sub-nav + principal switcher**: crowded at narrow widths.
  `flex-wrap` is in place but test it.
- **ChapterFooter**: on mobile grid collapses to a single column —
  verify visual ordering (prev / takeaway / next should stack cleanly).

### 2. Dead code cleanup (low priority)

- `IdentityTab` default export is no longer called anywhere (Ch 2 uses the
  three named exports). Safe to delete the default wrapper component and
  rename the file to `identityComponents.tsx` or similar.
- `PrevNextNav` primitive (primitives.tsx:~570) — was used by earlier
  phases. Verify with `grep PrevNextNav src/` and delete if unused now.

### 3. Deep linking / URL state (nice-to-have)

Chapter state is local; reload returns to Ch 1. If live demos want to
bookmark a specific chapter + lens + principal, a small hash-router would
do: `#/controls/policy?lens=failure&principal=service`. This was flagged in
the redesign plan as an acceptable trade-off for now.

### 4. Self-serve "Guided tour" affordance (deferred from plan)

Plan phase mentioned an optional "Start tour" card on Ch 1 for self-serve
users. Not built. If viewers consistently miss the Next button at the
bottom of Ch 1, add a prominent "Start the walkthrough →" CTA next to
the scale strip.

### 5. Deployment (if requested)

`Dockerfile` + `nginx.conf` + `.dockerignore` are committed. The previous
session had this running in SPCS under:
- Connection: `spcs`
- Image repo: `SANDBOX.SEMANTIC_GEOMETRY.MY_REPO`
- Service: `SANDBOX.SEMANTIC_GEOMETRY.PROJECT_DASH_SVC`
- Endpoint: `https://blbmasa5-phdatapartner-aws.snowflakecomputing.app`

To rebuild/redeploy, use the `deploy-to-spcs` skill. Build tag via
`SPCS_BUILD_TAG=$(date +%Y%m%d_%H%M%S)` convention.

---

## Key design decisions worth preserving

1. **Lens is global, not per-tab.** Hoisting it made the 4 control sub-beats
   comparable at a glance. Don't regress this.
2. **Principal switcher only appears in Ch 3.** It was noise everywhere
   else. Principals ARE shown in Ch 2 via the `PrincipalGallery` which
   acts as both illustration and selector.
3. **Bottom Line surfaces in Ch 1, not at shell root.** The previous "Bottom
   Line below all tabs" layout meant viewers never reached it.
4. **Trust-boundary toggle is inline, not sticky.** It only affects one
   diagram; keeping it contextual reduces toolbar clutter.
5. **Chapter count is 5 by design.** Identity was demoted from top-level
   tab to Ch 2 sub-section specifically to keep the stepper cognitively
   small. Don't re-promote without discussion.

---

## Known caveats / technical debt

- **Two `Principal` types exist**: `primitives.tsx` has a loose `Principal`
  union (label may be absent); `governance/data/principals.ts` has the
  strict one with required `label`. Current workaround in the shell is a
  small `as Principal` cast on the PrincipalSwitcher `onChange` handler.
  The right fix is to collapse to a single source of truth in the data
  module and have primitives import from there.
- **`RiskRegisterRow` impact type** only supports `'low' | 'med' | 'high'`.
  Phase 5 plan called for a `'critical'` value; the agent used `'high'` as
  the highest available. Extending the type is a ~5-line change in
  primitives if wanted.
- **`AuditTab`/`OperatingModelTab` don't respect the global lens.** They
  render the same content in both modes. Intentional for now (their
  content is already failure-aware) but flag if a future chapter wants
  consistent behavior.
- **Chapter 3's principal-change doesn't scroll back to top.** Changing
  the sub-control may leave the viewport mid-page. Consider a
  `useEffect` on `control` that scrolls to the top of the control body.

---

## Files to read first next session

1. `src/components/eng/GovernanceImplView.tsx` — the shell, 5 chapter
   render branches, sticky toolbar
2. `src/components/primitives.tsx` — lines 371-504 for `ChapterNav` /
   `ChapterFooter` definitions
3. `plans/plan_2026-04-30_0433.md` — the redesign plan this session
   executed against
4. The 4 mechanical tab files (all accept `lens: Lens` now)

---

## Commands I ran most this session

```bash
pnpm exec tsc --noEmit        # strict typecheck (vite build skips this)
pnpm build                    # final green gate
grep -rn "pattern" src/       # verification after refactors
```

Dev server runs on :5173 via `pnpm dev` — usually left running in the
background between sessions.
