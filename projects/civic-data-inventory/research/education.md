# Education Data Inventory — Portland / Multnomah County / Oregon

*Research conducted: 2026-07-17. Scope: Oregon Department of Education (ODE), Portland Public Schools
and other Multnomah County school districts, Multnomah Education Service District (MESD), Oregon
early learning data, Oregon higher-education data (HECC, PSU, PCC), and federal NCES data scoped to
these geographies.*

## Overview

Oregon's K-12 education data ecosystem is centered on the **Oregon Department of Education (ODE)**,
which publishes an annual **At-A-Glance School and District Profile / Report Card** system plus a
family of topical downloadable files (assessment, graduation, enrollment, class size, attendance,
discipline, educator workforce). Most bulk downloads are CSV/XLSX files organized by school year and
delivered through either the modern `oregon.gov/ode` CMS or a legacy `ode.state.or.us` data-delivery
subsystem that is still the actual file-serving mechanism behind several "download" buttons — both
domains should be treated as in-scope. District-level detail below the ODE report-card layer is
thinnest for the smaller Multnomah County districts (Parkrose, Reynolds, Centennial, Gresham-Barlow,
Riverdale, Corbett), which mostly rely on ODE's statewide system rather than maintaining their own
open-data portals; Portland Public Schools (PPS) and the Multnomah Education Service District (MESD)
are the exceptions with their own reporting pages. Higher-education data for PSU and PCC is best
accessed through the state's **Higher Education Coordinating Commission (HECC)** dashboards and
federal **IPEDS/NCES** rather than through the institutions' own sites. Federal **NCES Common Core of
Data (CCD)** and the **EDGE geographic program** provide the cross-jurisdiction join layer (district
boundaries, LEAID/NCES school IDs) needed to map every district against Census/ACS geography.

**Coverage note on verification:** normal practice for this inventory is to WebFetch every candidate
URL to confirm it resolves. In this session, the outbound web proxy rejected all HTTPS CONNECT
requests during the verification pass — not just to `oregon.gov`/`pps.net`/`nces.ed.gov`, but to
unrelated control domains (`google.com`, `en.wikipedia.org`) tested as a sanity check, indicating an
environment-level network restriction rather than a problem specific to these sites. URLs below are
therefore sourced from WebSearch result snippets (which quote live page titles/content) and known ODE/
NCES/HECC site conventions, **not** from a live HTTP 200 check. See **Notes & Caveats** for the full
list of what could not be confirmed and how to re-verify.

---

## A. State Level — Oregon Department of Education (ODE)

| # | Source & Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| A1 | At-A-Glance School & District Profiles — ODE | https://www.oregon.gov/ode/schools-and-districts/reportcards/reportcards/pages/default.aspx (bulk files served from legacy https://www.ode.state.or.us/data/ReportCard/Media) | CSV (bulk, by county/district/state), PDF (individual profile) | Annual, published each fall; profiles archived back several years via "Report Card Resource Archives" | School, district, county, state | Public domain / state government data — no known restrictions | No REST API found; CSV bulk-file endpoints only (e.g. `DownloadFile?schlYr=25&fldr=stateData&flNm=AAGmediaSchoolsAggregate`) | **HIGH** | ODE Institution ID (school/district) |
| A2 | Oregon Online Report Card (interactive app) — ODE | https://www.ode.state.or.us/apps/OregonReportCard/ | HTML/interactive dashboard | Annual refresh | School, district, state | Public | No | MEDIUM (dashboard only, no direct export seen) | ODE Institution ID |
| A3 | Statewide Assessment Results (ELA/Math/Science) — ODE Student Assessment | https://www.oregon.gov/ode/educator-resources/assessment/pages/assessment-results.aspx | XLSX (multi-year, % proficient by grade/subject) | Annual; files cover 2014-15 through most recent completed year | School, district, county, state | Public; small-cell suppression applied (see Notes) | No public API | **HIGH** | ODE Institution ID |
| A4 | Assessment Group Reports (ELA/Math/Science + SEED Survey extracts) — ODE | https://www.oregon.gov/ode/educator-resources/assessment/pages/assessment-group-reports.aspx | XLSX | Annual | District, state (group-level breakdowns) | Public; suppressed for small n | No | MEDIUM–HIGH | ODE Institution ID |
| A5 | Accountability Warehouse Extract (AWE) — ODE | Accessed via secure ODE application (District Security Administrator-controlled) | Record-level extract | Continuous/as-collected | Student-level (restricted) | **Restricted** — district-authorized access only, not public | Internal application, not a public API | **LOW** (not public) | Student/State ID (restricted) |
| A6 | Cohort Graduation Rate — ODE Students/Reports & Data | https://www.oregon.gov/ode/reports-and-data/students/pages/cohort-graduation-rate.aspx | CSV (by county/district/state), PDF media file, cross-tab files by race/ethnicity, gender, EL, SWD, homeless, econ. disadvantaged | Annual (most recent: Class of 2025 data posted ~Jan 2026) | School, district, county, state | Public; suppressed for small n | No | **HIGH** | ODE Institution ID |
| A7 | Graduation Cohort / Dropout Rates — ODE Reports & Data | https://www.oregon.gov/ode/reports-and-data/pages/graduation-cohort-dropout-rates.aspx | CSV/XLSX, PDF | Annual | District, state | Public | No | HIGH | ODE Institution ID |
| A8 | Cohort Graduation Rate Policy & Technical Manual — ODE | https://www.oregon.gov/ode/reports-and-data/students/Documents/cohort-graduation-rate-policy-manual_201718.pdf | PDF (methodology, not data) | Updated periodically | N/A (documentation) | Public | No | LOW (reference doc) | N/A |
| A9 | Attendance / Chronic Absenteeism — ODE Attendance, Belonging & Engagement | https://www.oregon.gov/ode/students-and-family/attendance/pages/default.aspx and https://www.oregon.gov/ode/reports-and-data/students/pages/attendance-and-absenteeism.aspx | CSV/XLSX + PDF research briefs | Annual; regular-attender / chronic-absenteeism rates trended multi-year (state rate 2023-24: 67.9%, 2024-25: 67.6%, 2025-26: 70.6% "regular attender" rate per search snippet) | School, district, state (student-group breakdowns) | Public; suppressed for small n | No | **HIGH** | ODE Institution ID |
| A10 | Student Enrollment Reports (Fall Membership) — ODE Reports & Data | https://www.oregon.gov/ode/reports-and-data/students/Pages/Student-Enrollment-Reports.aspx | CSV/XLSX | Annual snapshot (first school day of October); reports from 2009-10 to present | School, district, county, state | Public | No | **HIGH** | ODE Institution ID |
| A11 | Oregon Student Membership Manual — ODE | https://www.oregon.gov/ode/reports-and-data/students/Documents/studentmembershipmanual2024-25.pdf | PDF (methodology) | Annual | N/A | Public | No | LOW (reference doc) | N/A |
| A12 | Class Size Report — ODE Reports & Data | https://www.oregon.gov/ode/reports-and-data/Pages/Class-Size-Report.aspx (e.g., `class_size_report_20242025.pdf`) | **PDF only** (tables embedded in PDF, no separate CSV found) | Annual (fall report on prior school year); series back to at least 2014-15 | District, state (school-level tables inside PDF) | Public | No | **MEDIUM** (PDF-locked, needs extraction) | ODE Institution ID |
| A13 | Discipline, Restraint & Seclusion Collections — ODE Health, Safety & Wellness | https://www.oregon.gov/ode/students-and-family/healthsafety/pages/disciplinerestraintseclusioncollections.aspx | Collection portal; public aggregate figures appear embedded in Statewide Report Card / At-A-Glance rather than as a standalone open file | Annual collection; feeds federal EDFacts and ESSA Unsafe School Choice Option reporting | District, state (school-level in report card) | Public aggregate; incident-level data restricted | No | **LOW–MEDIUM** (no clear standalone bulk file located; likely folded into A1) | ODE Institution ID |
| A14 | Educator Equity Report — ODE Reports & Data | https://www.oregon.gov/ode/reports-and-data/Pages/Educator-Equity-Report-.aspx | PDF / XLSX | Annual | District, state | Public | No | MEDIUM | ODE Institution ID |
| A15 | Oregon Educator Public Employment (OEPE) Report — ODE (reported to Legislature) | https://olis.oregonlegislature.gov/liz/2023I1/Downloads/CommitteeMeetingDocument/277525 (legislative copy) | PDF | Annual | District, state | Public | No | LOW–MEDIUM (PDF tables) | ODE Institution ID |
| A16 | ODE Data Resources / Compact Reports — ODE Reports & Data | https://www.oregon.gov/ode/reports-and-data/dataresources/Pages/default.aspx | Mixed (PDF compact reports per school, plus links to other data sets) | Annual | School | Public | No | MEDIUM | ODE Institution ID |
| A17 | ODE Research and Data Briefs — ODE Reports & Data | https://www.oregon.gov/ode/reports-and-data/pages/ode-research-and-data-briefs.aspx | PDF research briefs | Periodic/as published | State (topical analyses, e.g. attendance, discipline) | Public | No | LOW (narrative PDFs) | N/A |
| A18 | Oregon Statewide Report Card (annual narrative + data PDF) — ODE | https://www.oregon.gov/ode/schools-and-districts/reportcards/Documents/rptcd2025.pdf | PDF | Annual (2024-25 edition referenced) | State (with district roll-ups) | Public | No | LOW–MEDIUM (PDF tables) | ODE Institution ID |
| A19 | Student Educational Equity Development (SEED) Survey State Report — ODE Assessment | https://www.oregon.gov/ode/educator-resources/assessment/Documents/SEED_Survey_State_Report.pdf | PDF (state report); underlying group files via A4 | Annual; 2024-25 cycle had ~180,076 respondents (47% of eligible students) | State, some district/group breakdowns | Public; suppressed for small n | No | MEDIUM | ODE Institution ID |
| A20 | Schools & Districts Receiving Report Cards (master list) — ODE | https://www.ode.state.or.us/data/ReportCard/Reports/InstList | HTML list | Annual | School, district | Public | No | MEDIUM (useful as an ID crosswalk/index) | ODE Institution ID |
| A21 | TSPC Public Educator Search — Teacher Standards & Practices Commission | https://apps.oregon.gov/TSPC/eLicense/Search/PublicSearch | HTML lookup (individual license records) | Real-time | Individual educator (not aggregable) | Public per-record lookup; not a bulk dataset | No | **LOW** (record lookup, not analysis-ready) | Educator license number |
| A22 | "Oregon Educator Data Dashboard" (oregonedd.com) | https://www.oregonedd.com/ | Interactive dashboard (apparent) | Unknown/unverified | District/state (apparent) | **Custodian unclear** — could not confirm if ODE-run or third-party; verify before citing as authoritative | Unknown | Unverified — flag for follow-up | Unknown |

---

## B. State Level — Early Learning (Oregon Department of Early Learning and Care / former Early Learning Division)

| # | Source & Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| B1 | DELC Data and Research Homepage — Oregon Dept. of Early Learning and Care (DELC; successor to the Early Learning Division) | https://www.oregon.gov/delc/data/pages/default.aspx | Mixed: PDF reports, some CSV/XLSX, dashboards referenced | Varies by product | State, some county/regional | Public | No | MEDIUM | County FIPS / region for regional data |
| B2 | Child Care Market Price Survey (MPS) — DELC | Linked from B1 | PDF report + underlying tables (2022 cycle referenced) | Biennial | State, regional | Public | No | MEDIUM (PDF-heavy) | Region/county |
| B3 | Oregon Early Learners Facts & Findings — Oregon Child Care Research Partnership, Oregon State University College of Health (state-funded research partner, not ODE/DELC itself) | https://health.oregonstate.edu/early-learners/about and https://health.oregonstate.edu/early-learners/county | Interactive county profiles + downloadable indicators | Periodic updates | **County-level** (all 36 OR counties, incl. Multnomah), state | Public (academic/state-funded) | No | **HIGH** for county-level early-childhood indicators | County FIPS |

*Note:* ODE also publishes **Early Learning and Kindergarten Guidelines** and a Kindergarten
Assessment (readiness) data collection referenced in search results; a 2017-18 ODE/Early Learning
Division kindergarten-to-3rd-grade cohort study was located, but a current standalone downloadable
kindergarten-readiness dataset page was not confirmed this session — treat as a follow-up item.

---

## C. State Level — Higher Education (Higher Education Coordinating Commission, HECC)

| # | Source & Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| C1 | Statewide Higher Education Snapshots (+ Archive) — HECC Strategy, Research & Data | https://www.oregon.gov/highered/strategy-research/pages/snapshots.aspx / archive: https://www.oregon.gov/highered/strategy-research/pages/snapshots-archive.aspx | PDF/data-visualization report | Annual (most recent: June 2026 release, based on 2024-25 data) | State (Oregon residents overall) | Public | No | MEDIUM (PDF visuals, not raw export) | N/A |
| C2 | Public University Data Dashboard — HECC | https://www.oregon.gov/highered/strategy-research/pages/dashboard-public-universities.aspx | Interactive dashboard (Enrollment, Affordability, Completion, Employment/Earnings tabs) | Updated with each data cycle | Institution (7 public universities, incl. PSU) | Public | Unknown (no API confirmed; likely Tableau/PowerBI embed) | **HIGH** (if underlying export exists) / MEDIUM otherwise | IPEDS UnitID (implied) |
| C3 | Community College Data Dashboard — HECC | https://www.oregon.gov/highered/strategy-research/pages/dashboard-community-colleges.aspx | Interactive dashboard (same 4 tabs) | Updated with each data cycle | Institution (17 community colleges, incl. PCC); Fall 2025 CC enrollment +3.7% per search snippet | Public | Unknown | **HIGH**/MEDIUM | IPEDS UnitID (implied) |
| C4 | Interactive Data Dashboards on Students and Outcomes — HECC | https://www.oregon.gov/highered/strategy-research/pages/dashboard.aspx | Dashboard hub (links to C2/C3 and workforce program dashboards) | Ongoing | Institution, program | Public | Unknown | MEDIUM | IPEDS UnitID |
| C5 | Equity Reporting and Progress — HECC | https://www.oregon.gov/highered/strategy-research/pages/equity-reporting.aspx | PDF / dashboard | Annual | State, institution | Public | No | MEDIUM | IPEDS UnitID |
| C6 | Oregon's Teacher Workforce (Oregon Longitudinal Data Collaborative / HECC) | https://www.oregon.gov/highered/strategy-research/Documents/OLDC/OLDC-Oregon-Teacher%20Study.pdf | PDF research report (links K-12 educator + higher-ed prep pipeline data) | One-time/periodic study | State | Public | No | LOW (narrative PDF) | ODE Institution ID + IPEDS UnitID (cross-referenced) |
| C7 | PCC Data Mart — Portland Community College Institutional Effectiveness | https://www.pcc.edu/institutional-effectiveness/beyond-pcc/student-data-mart-disclaimer/ | Interactive data mart (disclaimer page gates access) | Unknown cadence | Institution (PCC only) | Public but gated behind disclaimer acknowledgment | Unknown | MEDIUM | IPEDS UnitID |
| C8 | Portland State University Institutional Research / Fact Book — PSU Office of Institutional Research & Planning | Not independently verified this session (WebSearch budget exhausted before this query could run); expected under pdx.edu institutional-research pages | Expected PDF fact book + possibly dashboards | Expected annual | Institution (PSU only) | Public (typical for such offices) | Unknown | **UNVERIFIED — follow-up needed** | IPEDS UnitID |

---

## D. District Level — Portland Public Schools, Multnomah County Districts, and MESD

| # | Source & Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| D1 | Enrollment Reports & School Profiles — Portland Public Schools (PPS), Research, Assessment & Accountability | https://www.pps.net/departments/research-assessment-and-accountability/data-and-reports/enrollment-reports-and-school-profiles | PDF school profiles; enrollment tables by school/grade/race-ethnicity | Annual; historical reports for multiple years | School, district | Public | No | MEDIUM–HIGH | ODE Institution ID / NCES School ID |
| D2 | PPS Data Explorer — Portland Public Schools | https://ppsdata.info/ | Interactive web app/dashboard (enrollment, building utilization, and related indicators) | Launched ~March 2026 alongside the district's school-closure/consolidation planning process; presumably updated as planning continues | School, building, district | Public | Unknown (likely no export API; worth checking for underlying JSON) | **HIGH** (purpose-built, current, granular) | Building/school ID |
| D3 | PPS Data and Reports (main hub) — PPS | https://www.pps.net/Page/1841 | Mixed (links to sub-reports) | Ongoing | School, district | Public | No | MEDIUM | ODE Institution ID |
| D4 | PPS Research, Assessment & Accountability — Data Management | https://www.pps.net/Page/2876 | Mixed (data warehouse-fed reports/dashboards) | Ongoing | School, district | Public | No | MEDIUM | ODE Institution ID |
| D5 | PPS Other Reports — Research, Assessment & Accountability | https://www.pps.net/Page/2076 | PDF/XLSX reports covering budget, class size, ADM/attendance, discipline, teacher experience, substitute usage, assessment | Annual/periodic | School, district | Public | No | MEDIUM | ODE Institution ID |
| D6 | PPS Fast Facts — Portland Public Schools | https://www.portlandschools.org/about/fast-facts | HTML summary stats | Updated periodically | District | Public | No | LOW (summary only, not a data file) | N/A |
| D7 | School and District Report Cards — David Douglas School District | https://www.ddouglas.k12.or.us/departments/assessment/school-and-district-report-cards/ | Links through to ODE At-A-Glance PDFs/CSVs (A1) rather than a distinct district data system | Annual (mirrors ODE cycle) | School, district | Public | No | MEDIUM (pass-through to ODE) | ODE Institution ID |
| D8 | Parkrose, Reynolds, Centennial, Gresham-Barlow, Riverdale, Corbett School Districts | No distinct open-data portals identified for these six districts; all confirmed to receive standard ODE At-A-Glance / Report Card treatment (A1, A20 list confirms all are in ODE's report-card institution list) | CSV/PDF via ODE A1 | Annual (ODE cycle) | School, district | Public (via ODE) | No | MEDIUM (only as granular as ODE's statewide file) | ODE Institution ID |
| D9 | Multnomah Education Service District (MESD) — Reports (Annual Reports, Annual Financial Reports, District Service Plan, Budget Documents, Program Report Cards) | https://www.multnomahesd.org/about-us/what-we-do/reports | PDF | Annual | MESD region (serves Centennial, Corbett, David Douglas, Gresham-Barlow, Parkrose, Portland, Reynolds, Riverdale as component districts); combined component ADMw ≈ 103,271 students per search snippet | Public | No | LOW–MEDIUM (PDF financial/service reports) | ODE Institution ID (MESD has its own ESD-level ID) |

---

## E. Federal Level — NCES (Common Core of Data & EDGE Geographies)

| # | Source & Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| E1 | CCD District Search / District Detail — NCES | e.g., PPS: https://nces.ed.gov/ccd/districtsearch/district_detail.asp?ID2=2309930 ; MESD: https://nces.ed.gov/ccd/districtsearch/district_detail.asp?ID2=4180180 | HTML detail pages; underlying CCD bulk files available elsewhere on nces.ed.gov | Annual CCD collection cycle; multi-decade historical depth | District (LEA) | Public domain (federal) | NCES has a broader Urban Institute "Education Data Explorer" API (`educationdata.urban.org`) built on CCD, not confirmed this session | HIGH (as an index); pair with bulk CCD files for real analysis | **LEAID** (7-digit NCES district ID) |
| E2 | EDGE School District Boundaries (Composite + TIGER Elementary/Secondary/Unified) — NCES/Census Bureau | https://nces.ed.gov/programs/edge/Geographic/DistrictBoundaries | Shapefile/GeoJSON (GIS boundary files) | Annual vintage releases (e.g., SY schema like TL17_SY1516) | District polygon boundaries, nationwide (filterable to OR) | Public domain | Also served via ArcGIS REST MapServer: https://nces.ed.gov/opengis/rest/services/School_District_Boundaries/EDGE_SCHOOLDISTRICT_TL17_SY1516/MapServer | **HIGH** (essential for mapping) | LEAID |
| E3 | EDGE School District Geographic Relationship Files (GRFs) — NCES/Census | https://nces.ed.gov/programs/edge/geographic/relationshipfiles | CSV crosswalk files | Per Census vintage | District ↔ county/CBSA/CSA/ZCTA/urban area/congressional district/place/tract/block group | Public domain | No | **HIGH** (join layer for cross-geography analysis, e.g. district ↔ Multnomah County ↔ Census tract) | LEAID + Census GEOIDs |
| E4 | EDGE School Geocodes & Geoassignments — NCES | https://nces.ed.gov/programs/edge/geographic/schoollocations | CSV/point shapefile (lat/long per school) | Annual | School (point-level) | Public domain | No | **HIGH** (needed for school-level mapping) | NCES School ID (12-digit NCESSCH) |
| E5 | EDGE Locale Classifications — NCES | https://nces.ed.gov/programs/edge/Geographic/LocaleBoundaries | CSV/shapefile (urban-centric locale codes 11-43) | Periodic | School/district | Public domain | No | MEDIUM–HIGH | LEAID / NCESSCH |
| E6 | Digest of Education Statistics — State Dashboard: Oregon — NCES | https://nces.ed.gov/programs/digest-dashboard/state/oregon | HTML dashboard with state-level tables | Annual | State (Oregon) | Public domain | No | MEDIUM | N/A (state aggregate) |
| E7 | data.ed.gov Open Data Portal — school district boundaries dataset listing — U.S. Dept. of Education | https://data.ed.gov/dataset?tags=school-district-boundaries | Dataset catalog page (links to E2-family files) | Ongoing | District | Public domain | Open data portal search/API (CKAN-based, typical of data.ed.gov) | MEDIUM (as a discovery index) | LEAID |

---

## Standouts

- **PPS Data Explorer (`ppsdata.info`)** — A newly built (circa March 2026) interactive tool created
  specifically to visualize enrollment trends and building utilization amid PPS's school-closure/
  consolidation planning. This is the single most current, purpose-built visualization asset in the
  inventory and a strong candidate to embed or link directly, or to scrape for underlying JSON if an
  API is exposed.
- **NCES EDGE Composite School District Boundaries + Geographic Relationship Files (E2/E3)** — The
  backbone for any map view: gives polygon boundaries for every Multnomah County district (PPS,
  David Douglas, Parkrose, Reynolds, Centennial, Gresham-Barlow, Riverdale, Corbett) and crosswalks
  each to Census tracts/ZCTAs/CBSA, enabling a unified choropleth across ODE outcome metrics and
  Census demographic layers using LEAID as the join key.
- **ODE At-A-Glance Media bulk CSV system (A1)** — The closest thing to a unified, multi-year,
  machine-readable backbone across assessment, graduation, attendance, and enrollment metrics at
  school/district/county/state granularity; best source for a time-series or small-multiples view
  comparing PPS against David Douglas, Parkrose, Reynolds, Centennial, Gresham-Barlow, Riverdale, and
  Corbett on the same metrics.
- **HECC Public University / Community College Data Dashboards (C2/C3)** — Pre-built interactive views
  already covering Enrollment, Affordability, Completion, and Employment/Earnings for PSU and PCC;
  good for a higher-ed cross-jurisdiction comparison panel if raw export data can be confirmed/scraped.
- **Oregon Early Learners Facts & Findings, county-level pages (B3)** — One of the few sources in this
  inventory offering true **county-level** (not just district-level) early-childhood indicators,
  useful for a Multnomah County-scoped early-learning map layer that ODE/DELC's own pages don't cleanly
  provide.
- **Cross-jurisdiction graduation/attendance time series (A6, A9)** — Both offer multi-year,
  student-group-disaggregated files at school/district/state granularity, making them strong
  candidates for small-multiples or animated time-series charts contrasting Portland-area districts.

---

## Notes & Caveats

- **Live URL verification was not possible this session.** The environment's outbound web proxy
  rejected essentially all HTTPS CONNECT attempts during the verification pass — confirmed via
  `$HTTPS_PROXY/__agentproxy/status`, which showed `connect_rejected` / "gateway answered 403 to
  CONNECT (policy denial or upstream failure)" for a wide, unrelated set of domains including
  `www.oregon.gov`, `nces.ed.gov` (implied by repeated WebFetch 403s), `www.google.com`, and
  `en.wikipedia.org` — i.e., not a block specific to Oregon government sites. All WebFetch attempts in
  this session (7 distinct URLs tried, including a Wikipedia control) returned HTTP 403 at the proxy
  layer. **Recommend re-running WebFetch verification on this file's URL list in a follow-up session**
  once network access is confirmed working.
- **WebSearch budget was shared across the whole multi-agent research session** (200/200 total calls
  exhausted after this agent's 15th query), which cut off several planned searches: Portland State
  University's own institutional-research/fact-book page, Portland Community College's fact book
  beyond the Data Mart disclaimer page, an ODE public API / Oregon Statewide Longitudinal Data System
  check, and a dedicated ODE Archived Reports deep-dive. These are flagged as follow-up items (see C8
  and the general note on PCC above).
- **Suppression rules**: ODE applies small-cell suppression to student-group breakdowns across
  At-A-Glance, assessment, graduation, attendance, and discipline reporting to protect student privacy
  (consistent with federal EDFacts/FERPA-driven minimum-n rules). The exact threshold is documented in
  ODE's Cohort Graduation Rate Policy and Technical Manual (A8) and related technical appendices;
  thresholds have varied by collection historically (commonly n<6 or n<10 depending on the report), so
  confirm the specific threshold per file rather than assuming a single statewide rule.
- **Domain migration in progress**: ODE is mid-migration from the legacy `ode.state.or.us` domain to
  the modern `oregon.gov/ode` CMS. Several actual data-delivery endpoints (bulk CSV downloads behind
  At-A-Glance, the Oregon Online Report Card interactive app, the Staff Search tool) still live on
  `ode.state.or.us` even though the descriptive/landing pages have moved to `oregon.gov`. Both domains
  should be treated as in-scope and periodically re-checked for further migration.
- **Discipline data (A13)**: a dedicated, standalone bulk-downloadable discipline/suspension/expulsion
  dataset page was not clearly located; public aggregate discipline figures appear to be folded into
  the Statewide Report Card / At-A-Glance system (A1/A18) rather than published separately. This should
  be re-checked directly against `oregon.gov/ode/students-and-family/healthsafety` once network access
  is restored.
- **"Oregon Educator Data Dashboard" (`oregonedd.com`, A22)**: surfaced in search results by name and
  URL only, with no confirmation of custodian (ODE-run vs. third-party/nonprofit) or currency. Treat as
  unverified until fetched directly.
- **Restricted/PII sources intentionally excluded or flagged low-priority**: ODE's Accountability
  Warehouse Extract (A5, student-level, district-security-controlled) and TSPC's individual educator
  license lookup (A21, single-record, not bulk) are documented for completeness but are not suitable
  as bulk public data sources for this visualization project — only their public aggregate counterparts
  (At-A-Glance, Educator Equity Report) should be used.
- **Oregon Journalism Project attendance reporting** (`oregonjournalismproject.org/chronic-absenteeism`
  and its companion "Oregon Attendance Tracker" piece, also republished by Willamette Week) surfaced
  during research as an independent journalistic effort to obtain and analyze Oregon attendance data
  that ODE does not always publish in an easy statewide CSV; worth a follow-up check on whether the
  underlying dataset was released publicly, as it could supplement A9.
