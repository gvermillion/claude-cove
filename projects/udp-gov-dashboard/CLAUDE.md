# UDP Governance Dashboard

Static presentation dashboard for CrowdStrike's Unified Data Platform (UDP) Snowflake
governance architecture. Read-only reference app — no data layer, no API calls, no auth.
All content is hardcoded. Think "interactive slide deck" rather than data-driven dashboard.

## Architecture

**Single-file monolith:** Everything lives in `src/App.tsx` (~1,100 lines).

```
src/App.tsx
├── Shared UI primitives (SidebarItem, SectionHeader, InfoCard, CalloutBox, DataTable)
├── 9 view components (OverviewView, SandboxView, EnforcementView, TaxonomyView,
│   PolicyView, SchemaView, AiDevExView, ExtensibilityView, OpsView)
└── App shell (collapsible sidebar + tab routing via useState<TabId>)
```

- **Navigation:** Tab-based via `useState<TabId>`. No URL router — refresh resets to overview.
- **Styling:** Dark theme, CrowdStrike-inspired. Hardcoded hex colors (`#080808`, `#111`,
  `#0f0f0f`) rather than Tailwind theme tokens. Red-600 accent for active states/brand.
- **Content:** Governance documentation — RLS policies, masking, Silver/Gold layer patterns,
  tag taxonomy, Terraform enforcement, roadmaps.

### Tech Stack

| Layer       | Choice                          |
|-------------|-------------------------------- |
| Framework   | React 18.3                      |
| Build       | Vite 5.4                        |
| Language    | TypeScript 5.5 (strict: true)   |
| Styling     | Tailwind CSS 3.4 + tw-animate   |
| Icons       | lucide-react 0.441              |
| Package mgr | pnpm                            |

Zero runtime deps beyond React + Lucide. No router, no state library, no data fetching.

## How to Run

```bash
pnpm install
pnpm dev          # Vite dev server (localhost:5173)
pnpm build        # production build → dist/
pnpm preview      # serve production build locally
```

## Environment Variables

None. Fully static — no secrets, no API keys, no server-side config.

## Key Decisions & Constraints

1. **Intentionally static** — Content is governance documentation rendered as a web app,
   not a live data dashboard. No backend needed.
2. **Single-file by design** — Fast prototype. All views in `App.tsx`. Extracting into
   separate component files is the obvious next refactor.
3. **No routing library** — `useState` tab switching. Deep linking would require adding
   `react-router` or URL hash state.
4. **Hardcoded design tokens** — Colors bypass Tailwind's theme system (`bg-[#080808]`
   instead of `bg-background`). Migrating to `tailwind.config.js` theme tokens would
   improve consistency.
5. **CrowdStrike branding** — Footer references "CROWDSTRIKE UDP", content covers their
   specific Snowflake governance patterns.

## Known Gaps

- No tests, no test dependencies
- No linting/formatting config (no eslint, no prettier)
- No pre-commit hooks
- No CI/CD workflows
- No README.md
- Tailwind theme is uncustomized — all custom colors are inline arbitrary values
- Never been committed to the repo (entire directory is untracked)

## CI / CD

Not yet configured. When added, should follow workspace-standard GitHub Actions pipeline.

## Observability

N/A — static client-side app with no server component.

## Standards Overrides

- **Single-file architecture** — Deviates from recommended project layout. Acceptable for
  current scope (presentation prototype) but should be decomposed if the app grows.
- **No tests** — Deviates from testing standards. Acceptable for static content display
  with no business logic. Add tests if interactive features are introduced.
- **No linting** — Should add ruff/eslint config before first commit to `develop`.
