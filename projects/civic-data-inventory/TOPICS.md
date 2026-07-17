# Civic Data Inventory — Research Topics

Reference list of the 12 research topics for the Portland / Multnomah County / Oregon
civic data inventory. Each topic has a corresponding findings file in `research/`.

| # | Topic Slug | Scope |
|---|-----------|-------|
| 1 | `open-data-portals` | PortlandMaps Open Data, Multnomah County open data, data.oregon.gov; enumerate major dataset categories in each |
| 2 | `budget-finance` | Adopted budgets, ACFRs, checkbook-level spending, contracts, grants for all three jurisdictions |
| 3 | `elections-campaign-finance` | ORESTAR, Multnomah County election results, voter registration stats, Portland small donor program data |
| 4 | `public-safety` | Portland Police open data (dispatch, stops, use of force), fire/EMS, MCSO jail data, OJCIN/OECI court records |
| 5 | `land-use-housing` | Permits, assessor/tax lot data, zoning, housing production dashboards, HUD PIT counts, Joint Office of Homeless Services data |
| 6 | `transportation` | PBOT counts, TriMet GTFS + performance data, ODOT crash data |
| 7 | `health-human-services` | Multnomah County health data, OHA datasets, overdose/mortality statistics |
| 8 | `environment` | DEQ air/water quality, urban forestry, city/state climate metrics |
| 9 | `education` | ODE report cards, PPS and other district-level data |
| 10 | `demographics` | Census/ACS products for these geographies, PSU Population Research Center estimates |
| 11 | `governance-legislative` | Portland council agendas/minutes/votes, county commission records, OLIS bill data, lobbying registrations |
| 12 | `records-infrastructure` | What's proactively published vs. requires a public records request in each jurisdiction; fee structures and portals |

## Per-Source Capture Fields

For each dataset/source, research files capture:

- Name and custodian agency
- Direct URL
- Format(s): CSV, API, GIS/shapefile, PDF-only, HTML, etc.
- Update frequency and historical depth
- Geographic granularity (statewide / county / city / tract / address-level)
- License or usage restrictions
- API availability and type
- Visualization readiness: HIGH (machine-readable, granular, updated), MEDIUM (needs cleaning/scraping), LOW (PDF-locked or records-request-only)
- Join keys to other datasets (census geography, tax lot ID, precinct, case number, etc.)

## Deliverables (in `output/`)

1. `INVENTORY.md` — full merged inventory grouped by topic, summary table per jurisdiction
2. `TOP20.md` — 20 highest-value datasets for public visualization, ranked, with rationale and suggested visual form
3. `JOIN-MAP.md` — Mermaid diagram + notes showing joinable datasets and keys
4. `GAPS.md` — notable data that is NOT publicly available or is PDF-locked; records-request/advocacy candidates
