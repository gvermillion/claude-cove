# Budget & Finance Data Inventory — City of Portland, Multnomah County, State of Oregon

## Overview

This inventory catalogs public budget, financial reporting, spending, procurement, and grants
data sources for the three core jurisdictions in scope: the **City of Portland**, **Multnomah
County**, and the **State of Oregon**. It covers adopted/proposed budget documents, audited
Annual Comprehensive Financial Reports (ACFRs), checkbook-level vendor payment data, procurement
and contract portals, grants data, and the interactive dashboards each jurisdiction publishes on
top of this data. 32 distinct sources are documented across the three jurisdictions plus one
cross-jurisdiction federal source (USAspending.gov).

**A note on method for this session:** all 10+ required web searches were performed (20 distinct
queries), but this research session's outbound network egress was blocked at the proxy/policy
level for *all* external hosts — not just government domains. `WebFetch` and direct `curl`
attempts against `portland.gov`, `oregon.gov`, `multco.us`, and even control targets like
`en.wikipedia.org`, `example.com`, and `google.com` all failed with `403` "policy denial"
responses from the egress gateway itself (confirmed via the proxy status endpoint, not a
site-side block). This means **no URL below could be live HTTP-verified in this session**. URLs
are transcribed as returned by search engine results and cross-checked for consistency across
multiple independent queries where possible. See **Notes & Caveats** for the full list of
verification gaps and known risk points (renamed pages, superseded document years, legacy
portals of uncertain status).

---

## City of Portland

| Source | Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| Adopted/Proposed Budget (multi-volume: City Summaries, Bureau Budgets, CIP) | City Budget Office | https://www.portland.gov/city-budget ; https://www.portland.gov/budget/2025-2026-budget/development/adopted | PDF (volumes), some HTML summary pages | Annual, published each spring/summer; prior-year budgets archived back roughly a decade | Citywide, by bureau/fund | Public domain / open government record | None (static documents) | LOW (PDF-locked; tabular budget data embedded in PDF requires extraction) | Fiscal year, bureau code, fund code, program/CIP number |
| Budget Dashboards (Adopted, Proposed, Revenue, Mayor's Priority) | City Budget Office (Tableau Public) | https://public.tableau.com/app/profile/portland.city.budget.office | Interactive Tableau viz; "download data" per-view export (CSV/crosstab) | Refreshed each budget cycle (annual); several years of past-cycle dashboards retained on the profile | Citywide, by bureau/fund/program | Public; Tableau Public terms apply to redistribution of embedded viz | No formal API; manual per-view CSV export only | MEDIUM (visual and filterable, but bulk programmatic access is not offered) | Fiscal year, bureau name, fund name |
| Annual Comprehensive Financial Report (ACFR) / Annual Financial Reporting | Office of the Chief Financial Officer, Accounting Division | https://www.portland.gov/accounting/finance-reports | PDF | Annual, audited by outside CPA firm; current archive goes back multiple years (2022 report also found directly at portland.gov/omf/brfs/accounting/documents/2022-annual-comprehensive-financial-report) | Citywide (with component units: Prosper Portland etc.) | Public / GFOA Certificate of Achievement report | None | LOW (PDF; statistical section has 10-year trend tables but not machine-readable) | Fiscal year, fund code |
| Financial Audits (Auditor's Office) | City Auditor, Audit Services | https://www.portland.gov/auditor/audit-services/about-us/financial-audits | PDF | Annual, tied to ACFR audit cycle | Citywide | Public | None | LOW | Fiscal year |
| Budget and Performance Measures | City Auditor | https://www.portland.gov/auditor/budget-and-performance-measures | HTML, PDF, some dashboard links | Annual/ongoing | Citywide, by bureau | Public | None | MEDIUM | Bureau code, fiscal year |
| Vendor Payment Checkbook | Revenue Division (OMF) | https://www.portland.gov/revenue/vendor-payment-checkbook | Searchable web database; export via search results (per FAQ/how-to guide at portland.gov/revenue/documents/vendor-payment-checkbook-how-guide) | Updated **monthly** (prior month's data added); historical depth spans several fiscal years | Citywide, transaction-level (vendor, bureau, fund) — no address-level geocoding | Public; excludes payroll, reimbursements, petty cash, one-time refunds, p-card | No public API identified; web search UI only | HIGH for content granularity, MEDIUM for machine access (no bulk API, but structured search/export) | Vendor name, bureau name, fund name, GL account number, invoice number, payment date |
| Procurement Data Dashboards (OCDS) | Procurement Services | https://www.portland.gov/business-opportunities/ocds/procurement-ocds-dashboards | Interactive dashboards; OCDS = Open Contracting Data Standard suggests structured export potential | Ongoing/rolling | Citywide, contract-level | Public | Possible OCDS-structured export (unconfirmed without live verification) | MEDIUM-HIGH (if OCDS export confirmed, this would be HIGH) | Contract ID, vendor name, bureau code |
| BuySpeed Vendor/Contract Portal | Procurement Services | https://procure.portlandoregon.gov/bso/ | HTML portal (bid/contract lookup); login required for supplier actions, public browse for open bids/active contracts | Continuous/real-time postings | Citywide, contract-level | Public browse; vendor registration required for bidding | None public | MEDIUM (browsable but not bulk-exportable) | Contract/bid number, vendor name |
| Open Data Sources (catalog) | Citywide (multiple bureaus) | https://www.portland.gov/public-records/open-data | Index page linking to datasets/dashboards across topics incl. budget | N/A (index) | Varies by linked dataset | Public | N/A | N/A (navigation hub) | — |
| Grants and Funding / WebGrants | Grants Management | https://www.portland.gov/grants/grants-and-funding ; application portal at cityofportlandgrants.net | HTML listings; WebGrants system (login for applicants) | Ongoing, by grant cycle | Citywide, program-level; recipient detail not confirmed as bulk-downloadable | Public (opportunity listings); awarded-grant recipient detail depth unconfirmed | None public identified | LOW-MEDIUM (opportunity data is public; awarded/disbursed grant ledger not clearly published as open data) | Grant program name, fiscal year |
| Portland's Federal Grants page | City Budget Office / Federal team | https://www.portland.gov/federal/federal-grants | HTML narrative + figures (e.g., "$98M in federal grants in 2025") | Periodic updates | Citywide | Public | None | LOW (narrative/summary, not a dataset) | Fiscal year |
| Prosper Portland Budget & TIF financials | Prosper Portland (urban renewal agency; ACFR component unit of the City) | https://prosperportland.us/our-budget/ | PDF (Proposed/Adopted Budget by fiscal year) | Annual | Portland urban renewal districts (sub-city, TIF-district level) | Public | None | LOW (PDF) | Fiscal year, TIF district name, fund code |
| CivicApps.org (legacy regional open data catalog) | Legacy multi-agency initiative (City of Portland, Metro, TriMet, State) | http://civicapps.org/datasets | HTML catalog; PDX API described as REST-like query access to datasets | Unclear — catalog dates to ~2010; current maintenance status **unconfirmed** in this session | Regional (Portland metro) | Public (historic open data policy) | "PDX API" referenced in search results but not verified live | LOW-UNKNOWN (likely stale; flag for manual confirmation) | Varies by dataset |

---

## Multnomah County

| Source | Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| FY Adopted/Proposed Budget documents | Budget Office | https://multco.us/info/fy-2026-budget ; https://multco.us/info/fy-2027-budget | PDF (budget book, forms, economic forecast) | Annual | Countywide, by department/fund/program offer | Public | None | LOW (PDF) | Fiscal year, department code, fund code, program offer number |
| Budget Dashboards (Adopted/Proposed Budget Dashboard) | Budget Office (Tableau Public) | https://public.tableau.com/app/profile/multnomah.county.budget ; e.g. FY2026AdoptedBudgetDashboard, FY2027ProposedBudgetDashboard | Interactive Tableau viz, sortable by department/fund/program offer; per-view data export | Annual per budget cycle; several prior-year dashboards retained | Countywide, by department/fund/program offer | Public; Tableau Public terms apply | No formal API; manual export only | MEDIUM-HIGH (well-structured, filterable, but not bulk API) | Fiscal year, department, fund, program offer number |
| Budget Office Dashboards & Reports (incl. Budget Monitoring Dashboard) | Budget Office | https://multco.us/info/budget-office-dashboards-reports | Mixed: dashboard links + PDF reports | Budget Monitoring Dashboard introduced FY2025, tracks spending by fund/department over time (implies more frequent, e.g., monthly/quarterly, updates within a fiscal year) | Countywide, by fund/department | Public | Unconfirmed | MEDIUM-HIGH | Fiscal year, fund, department |
| Financial Condition Report | Finance / Budget Office | https://multco.us/info/financial-condition-report-2026 | PDF/HTML narrative with visualizations of revenue vs. expenditure trends | Annual | Countywide | Public | None | LOW-MEDIUM (visualization-rich but likely PDF-bound) | Fiscal year |
| Financial Reports (ACFR + Component Unit Financial Reports + SEFA) | Department of County Management / Finance | https://www.multco.us/finance/financial-reports | PDF; separate files per section (Introductory/Financial/Statistical) and per component unit (e.g., Dunthorpe-Riverdale Service District, Mid-Multnomah County Street Lighting District) | Annual, audited; ~10 years of reports retained on-site, older years in Digital Archives | Countywide + special districts (component units) | Public / GFOA-certified | None | LOW (PDF) | Fiscal year, fund code, component unit name |
| Multnomah County Digital Archives — historical ACFR/CAFR | County Archives (Preservica) | https://multco.access.preservica.com/?name=SO_1eabf163-481c-4c80-ba24-daed8f11eede | PDF (scanned/archival) | Historical (older years not on live finance site) | Countywide | Public archival record | None | LOW | Fiscal year |
| Multnomah County Open Data (GIS Hub) | County GIS/IT | https://gis-multco.opendata.arcgis.com/ | CSV, KML, Shapefile/Zip, GeoJSON, GeoTIFF, PNG | Varies by layer; ArcGIS Hub platform supports scheduled refresh | County to parcel/tract level depending on layer (primarily spatial/GIS layers; not primarily a finance dataset host, but relevant for mapping budget/service data) | Public; ArcGIS open data terms | ArcGIS REST API (standard for Hub-hosted layers) | HIGH for GIS layers generally; finance-specific layers not confirmed present | Parcel ID, district code, department code (varies by layer) |
| Purchasing / Multco Marketplace (MMP) Supplier Network | Purchasing (Dept. of County Management) | https://bids.sciquest.com/apps/Router/PublicEvent?CustomerOrg=Multnomah | HTML portal (SciQuest/Jaggaer platform) — bid/proposal opportunities, results, award info | Continuous/real-time postings | Countywide, contract-level | Public browse; MMP account needed to bid | None public | MEDIUM (browsable, not bulk-exportable) | Solicitation/contract number, vendor name |
| How To Do Business With the County (procurement overview + thresholds) | Purchasing | https://multco.us/info/how-do-business-county | HTML | Static/periodic | Countywide | Public | None | LOW (informational, not a dataset) | — |

---

## State of Oregon

| Source | Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| Oregon Transparency Website (hub: Expenditures, Revenue, Budget, Contracts, Checkbook) | Dept. of Administrative Services (DAS), Enterprise Information Services / Data Governance & Transparency Program | https://www.oregon.gov/transparency/pages/index.aspx (subpages: /pages/expenditures.aspx, /pages/revenue.aspx, /pages/budget.aspx, /pages/contracts.aspx) | Mix of HTML dashboards, downloadable "machine readable composite datasets" with data dictionaries, PDF reports | Statutorily mandated (HB 2500, 2009); site redesigned 2023 for better navigation/interactivity; multi-year composite datasets | Statewide, by agency | Public / open government record | Some datasets flow through data.oregon.gov Socrata API (see below) | MEDIUM-HIGH (mixed: composite datasets are machine-readable; some dashboard content is not) | Fiscal year, agency code |
| Oregon Checkbook | DAS Transparency Program | https://www.oregon.gov/transparency/Pages/Checkbook.aspx | Searchable web database (by agency, vendor, expenditure category) | Updated per Transparency Program cycle (typically periodic, e.g. monthly/quarterly per state transparency practice) | Statewide, transaction-level (agency/vendor) | Public | Unconfirmed public API for Checkbook specifically (composite datasets on data.oregon.gov may overlap) | HIGH for content, MEDIUM for machine access without confirmed bulk API | Vendor name, agency code, object code, fiscal year |
| Oregon Transparency: State Contracts | DAS Transparency Program | https://www.oregon.gov/transparency/pages/contracts.aspx | HTML + links to ORPIN/OregonBuys contract search | Ongoing | Statewide, contract-level | Public | Links out to OregonBuys | LOW-MEDIUM (portal/index page) | Contract number, agency code, vendor name |
| data.oregon.gov (Oregon Open Data Portal — Socrata) | DAS | https://data.oregon.gov/ | CSV, JSON, XML, API (Socrata SODA) | Varies by dataset; "Agency Expenditures – Multi-Year Report" listed as last updated December 2025; historical expenditure listing covers FY2014–2018 in one dataset | Statewide, by agency | Public; Socrata open data terms | **Yes — Socrata SODA REST API** (confirmed pattern, e.g. dev.socrata.com/foundry/data.oregon.gov/... dataset endpoints) | HIGH (best-in-class machine readability among Oregon sources found) | Agency code, fiscal year, vendor name |
| OregonBuys Purchases and Contracts — Multi-Year Report | DAS Procurement Services (published via data.oregon.gov, mirrored on catalog.data.gov) | https://catalog.data.gov/dataset/oregonbuys-purchases-and-contracts-multi-year-report | CSV/API (Socrata-backed) | Multi-year rolling report; per search results, records cover roughly FY2022–2025; statewide price agreements reported separately | Statewide, contract/PO-level | Public | Socrata SODA API (via data.oregon.gov) | HIGH | Contract/PO number, vendor name, agency code, fiscal year |
| OregonBuys eProcurement System | DAS Procurement Services | https://oregonbuys.gov/bso/ | HTML portal; login for suppliers, public search for solicitations/statewide price agreements without login | Continuous/real-time | Statewide, contract-level | Public browse; supplier account needed to transact | Underlying data feeds the data.gov/data.oregon.gov multi-year report above | MEDIUM (portal itself), HIGH (via its data.oregon.gov extract) | Contract number, vendor name, agency code |
| Procurement Equity Dashboard | DAS Procurement Services | https://www.oregon.gov/das/procurement/pages/equity-procurement-dashboard.aspx | Interactive dashboard | Periodic | Statewide, by agency/vendor demographic category | Public | Unconfirmed | MEDIUM | Agency code, vendor category, fiscal year |
| Legislative Fiscal Office (LFO) Budget Documents | Oregon Legislative Fiscal Office | https://www.oregonlegislature.gov/lfo (docs e.g. .../lfo/Documents/2025-27%20Budget%20Highlights.pdf, .../2025-2%20LAB%20Summary%202025-27.pdf) | PDF | Published each biennium (Legislatively Adopted Budget summaries, Budget Highlights); archive extends back to at least 2016–17 biennium in search results | Statewide, by agency/program, General Fund & Lottery Funds breakdowns | Public | None | LOW (PDF; narrative + tables, not machine-readable) | Biennium, agency code, fund type (General Fund/Lottery Fund) |
| Oregon Statewide Annual Comprehensive Financial Report (ACFR) | DAS Statewide Accounting & Reporting Services (SARS) | https://www.oregon.gov/das/Financial/Acctng/Documents/2025.ACFR.pdf (prior years e.g. 2024_ACFR.pdf, 2022%20ACFR.pdf) | PDF | Annual, audited; GFOA Certificate of Achievement for 33 consecutive years per search result (through FY2024 report); archive extends back to at least 2010 | Statewide (primary government + component units) | Public | None | LOW (PDF; statistical section has multi-year trend tables) | Fiscal year, fund code |
| Statewide Accounting & Reporting Services — Publications | DAS SARS | https://www.oregon.gov/das/financial/acctng/pages/pub.aspx | PDF/HTML index | Ongoing | Statewide | Public | None | LOW (index/navigation) | — |
| Oregon PERS — ACFR Archive | Oregon PERS | https://www.oregon.gov/pers/pages/financials/acfr-previous-years.aspx | PDF | Annual, multi-year archive | Statewide (covers all PERS-participating employers: state, county, city, school districts) | Public | None | LOW (PDF) | Fiscal year, employer code |
| Oregon PERS — Employer Contribution Rates | Oregon PERS | https://www.oregon.gov/pers/emp/pages/contribution-rates.aspx ; https://www.oregon.gov/pers/emp/pages/employer-rate-summary.aspx | PDF tables | Biennial (rates set per biennium, e.g. 2023-25, 2025-27) | Per-employer (all PERS employers incl. City of Portland, Multnomah County, State agencies) | Public | None | MEDIUM (tabular PDF; a standout **cross-jurisdiction join** — every PERS employer, including Portland and Multnomah County, appears in the same rate table) | Employer name/code, biennium |
| Oregon Blue Book — Government Finance: State Government | Secretary of State | https://sos.oregon.gov/blue-book/Pages/facts/finance-state.aspx | HTML narrative + summary tables | Biennial almanac update | Statewide | Public | None | LOW | Fiscal year |

---

## Cross-Jurisdiction / Federal

| Source | Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| USAspending.gov — federal awards (grants & contracts) to Oregon/Portland/Multnomah County recipients | U.S. Treasury / OMB (federal, not a Portland/Multco/Oregon-custodied source, but the only source with sub-state geographic + recipient detail for federal money flowing into all three jurisdictions) | https://www.usaspending.gov | HTML search UI, CSV bulk download, **REST API** | Updated regularly (near real-time per federal award reporting cycle); historical depth to FY2001+ for many award types | Address/place-of-performance level, congressional district, county, city — finer-grained than most state/local sources | Public domain (U.S. government work) | Yes — full REST API, well-documented | HIGH | Recipient/vendor name, Federal Award ID, CFDA/Assistance Listing Number, fiscal year, place of performance (county/city) |

---

## Standouts

- **Best for vendor-level spend maps/time-series:** Portland's **Vendor Payment Checkbook**,
  Oregon's **Checkbook**/Expenditures data, and **OregonBuys** (via its `data.oregon.gov`
  multi-year extract) form a natural three-way comparison of "who gets paid, how much, how
  often" across city and state government. Multnomah County's procurement portal (MMP/SciQuest)
  is the weakest link here — it appears to lack an equivalent bulk vendor-payment ledger, only a
  bid/award browse interface. A county-level checkbook (if one exists beyond what surfaced in
  search) should be a priority follow-up lookup.
- **Best true API / machine-readable base:** `data.oregon.gov` (Socrata) is the strongest
  single source found — it has a documented SODA REST API, supports CSV/JSON/XML export, and
  hosts both the Agency Expenditures Multi-Year Report and the OregonBuys Purchases and
  Contracts Multi-Year Report. This should be the backbone for any state-level spending
  visualization, with `USAspending.gov`'s API as the federal-money overlay.
  **USAspending.gov** is the standout for any true geographic (map-level) visualization, since
  it is the only source in this inventory offering sub-county place-of-performance detail for
  money flowing into Portland and Multnomah County specifically.
- **Best time-series backbone:** The three ACFRs (Portland, Multnomah County, Oregon state)
  each contain a "Statistical Section" with 10-year trend tables (revenues, expenditures, debt,
  fund balances) prepared to a common GASB-driven format. Though PDF-locked, these are
  structurally similar enough across jurisdictions that a one-time manual/LLM-assisted extraction
  into a structured table would enable a genuinely novel 10-year, three-jurisdiction financial
  trends comparison — something no dashboard currently offers pre-built.
- **Best budget-structure visualization hook:** Multnomah County's budget is organized by
  **"program offers"** (its Budget for Results / outcomes-based budgeting model), a structure
  Portland and the State do not share. This makes County program-offer-level spending a strong
  candidate for an outcomes/performance-linked visualization distinct from the more traditional
  line-item views available for Portland and Oregon.
- **Best pre-built interactive dashboards to link out to (not scrape):** Both Portland's City
  Budget Office and Multnomah County's Budget Office publish parallel **Tableau Public**
  dashboard suites (Adopted/Proposed Budget Dashboards, Revenue Dashboard). These are well
  designed and could be embedded/linked directly rather than rebuilt, though neither offers a
  documented bulk API — only per-view manual export.
- **Cross-jurisdiction join opportunity via PERS:** Oregon PERS's employer contribution rate
  tables list **every PERS-participating employer** — state agencies, Multnomah County, and the
  City of Portland — in one biennial rate schedule. This is an easy, ready-made join key for a
  "cost of public pensions" comparison across all three jurisdictions without needing to
  reconcile three different chart-of-accounts structures.
- **Weakest area found:** Awarded-grant (disbursement-level, not just opportunity-listing) data
  is thin for both Portland and Multnomah County — searches surfaced grant *opportunity* pages
  (WebGrants application portals) but no clear open dataset of grants actually awarded/paid with
  amounts and recipients. `USAspending.gov` partially fills this gap for federally sourced
  grants; state- and locally-sourced grant disbursements likely require a records request or
  deeper site-specific search not completed in this session.

---

## Notes & Caveats

**Network/verification limitation (session-wide):** This research session's `WebFetch` tool and
direct `curl` calls (through the environment's configured egress proxy) were blocked with `403`
responses for every external host attempted — including non-government control targets
(`en.wikipedia.org`, `example.com`, `www.google.com`). The proxy's own status endpoint
(`$HTTPS_PROXY/__agentproxy/status`) confirmed these were `connect_rejected` / "policy denial"
responses from the egress gateway itself, not failures on the destination servers' side. Per this
environment's guidance, policy denials of this kind should be reported rather than retried or
routed around. **Practical effect: no URL in this document was live HTTP-verified.** All URLs
were transcribed from web search result titles/snippets (20 distinct search queries run) and
cross-checked for internal consistency where the same URL recurred across multiple independent
searches. A follow-up pass with working network access is recommended before these URLs are
published or wired into a live pipeline. Specific known risk points:

- **Portland ACFR link vintage:** A directly-indexed URL for the *2022* ACFR
  (`portland.gov/omf/brfs/accounting/documents/2022-annual-comprehensive-financial-report/download`)
  surfaced in search; the current/canonical listing page is
  `portland.gov/accounting/finance-reports`, which should be treated as the stable entry point
  rather than any single year's direct PDF link.
- **Oregon Transparency site redesign:** Search results note a 2023 redesign of
  `transparency.oregon.gov`/`oregon.gov/transparency` "to include updated content, more
  user-friendly navigation, and a new design." Subpage paths and exact casing (e.g.,
  `/Pages/Checkbook.aspx`) may have changed since; treat `oregon.gov/transparency/pages/index.aspx`
  as the stable entry point and re-derive subpage links from it.
- **CivicApps.org status is uncertain.** This is a ~2010-era regional open data catalog
  (City of Portland, Metro, TriMet, State of Oregon) referenced in older web content. Its current
  maintenance status could not be confirmed in this session — it may be stale, redirected, or
  fully superseded by `portland.gov/public-records/open-data`. Flag for manual confirmation
  before relying on it.
- **Multnomah County procurement platform branding:** The county's solicitation portal resolves
  through a SciQuest/Jaggaer-hosted URL (`bids.sciquest.com/...CustomerOrg=Multnomah`) referred to
  in county materials as "Multco Marketplace (MMP)." Procurement platforms are commonly migrated
  by government IT departments; confirm this is still the live system rather than a legacy
  redirect.
- **OCDS claim on Portland's Procurement Data Dashboards is unconfirmed.** The URL path segment
  `/ocds/` suggests possible Open Contracting Data Standard compliance, which would be a strong
  machine-readability signal, but this could not be verified against the live page in this
  session.
- **Grant disbursement-level data gap:** As noted in Standouts, no clear open dataset of
  *awarded/paid* grants (as opposed to open grant *opportunities*) was found for Portland or
  Multnomah County. This may exist but require deeper, more targeted searching (e.g., specific
  bureau/department grant ledgers) than this session's query budget allowed — the session's
  overall web search allowance was exhausted (200/200) partway through a planned final round of
  queries covering PortlandMaps property tax data, the Governor's Recommended Budget process, and
  Multnomah County WebGrants specifically, so these threads are incomplete.
- **data.oregon.gov dataset currency:** The "Agency Expenditures – Multi-Year Report" was
  reported in search snippets as last updated December 2025, and a separately-referenced
  historical dataset covers only FY2014–2018 — suggesting the portal has at least two
  non-contiguous expenditure datasets rather than one continuously updated series. Confirm
  coverage gaps before building a continuous time series on this source alone.
