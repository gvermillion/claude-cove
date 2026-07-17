# Elections & Campaign Finance — Civic Data Inventory

## Overview

This section inventories public data sources for elections, campaign finance, voter
registration, and turnout across the State of Oregon, Multnomah County, and the City of
Portland. Coverage spans four broad clusters: (1) Oregon's **ORESTAR** campaign finance
system and Secretary of State election-results/statistics pages, (2) **Multnomah County
Elections**' precinct-level results, ranked-choice-voting (RCV) cast-vote-record analysis,
and GIS layers, (3) the **City of Portland's Small Donor Elections** (formerly Open &
Accountable Elections) public matching-funds program, and (4) third-party/cross-jurisdiction
aggregators (MIT Election Lab, Redistricting Data Hub, Hack Oregon/Civic Software
Foundation) that harmonize Oregon precinct data for mapping and time-series work.

Restricted PII datasets (the statewide voter registration file, county "voter history"/
walking-list exports) are noted for completeness but flagged LOW/restricted — only their
public aggregate counterparts (registration counts, turnout statistics) are in scope for
visualization.

**32 sources** are documented below across four sections. All were identified via web
search on 2026-07-17; live HTTP verification of URLs was not possible this session (see
**Notes & Caveats**), so status should be treated as "identified via search snippet,"
not "confirmed live," until a follow-up fetch pass.

---

## State of Oregon

| # | Source / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **ORESTAR** (Oregon Elections System for Tracking and Reporting) — public transaction search — Oregon Secretary of State (SOS) Elections Division | https://sos.oregon.gov/elections/Pages/orestar.aspx and search UI at https://secure.sos.state.or.us/orestar/gotoPublicTransactionSearch.do | HTML search UI; results exportable to Excel/CSV per-query | Real-time filings; full electronic record back to Jan 1, 2007 | Statewide — filer/committee/transaction level, includes candidates for county & city office where filed through ORESTAR | Public record; no known reuse restriction | No public bulk/REST API — query-and-export only | MEDIUM (structured records, but no bulk API; requires scripted/manual export per committee or date range) | Filer ID, Committee ID, transaction ID, election date |
| 2 | **Search for Campaign Finance Information** landing page — SOS | https://sos.oregon.gov/elections/Pages/campaignfinance.aspx and https://sos.oregon.gov/elections/campaign-finance/pages/search-campaign-finance.aspx | HTML | Continuously updated | Statewide | Public | None | MEDIUM | Filer/Committee ID |
| 3 | **Historic Campaign Finance Reports** (pre-2007 filings) — SOS Elections Division | https://sos.oregon.gov/elections/Pages/financereports.aspx | PDF summary reports | Static archive; covers filings before electronic ORESTAR record (pre-2007) | Statewide | Public | None | LOW (PDF-locked, pre-digital era) | Candidate/committee name, election year |
| 4 | **Campaign Finance Transactions** — proposed open dataset (nomination page) — data.oregon.gov | https://data.oregon.gov/nominate/5568 | N/A — this is a dataset *request/suggestion*, not a live dataset | Not yet published as of research date | Statewide (proposed) | N/A | N/A | LOW (does not exist yet — gap to flag) | N/A |
| 5 | **Election Results & History** (statewide and county results by race) — SOS | https://results.oregonvotes.gov/ | HTML results pages, per-county and per-race breakdowns; some downloadable summary files | Election-night live updates, then certified; historical results archived by election | Statewide, drillable to county | Public | No documented public API found | MEDIUM (structured HTML tables, scrapeable; not a clean bulk file) | County code, race/measure ID, election date |
| 6 | **Voter Turnout Details** — SOS (via results.oregonvotes.gov) | https://results.oregonvotes.gov/VoterTurnoutDetails.aspx | HTML | Per-election, election-night through certification | Statewide, by county | Public | None | MEDIUM | County code, election date |
| 7 | **Election Statistics** hub (calendar, ballot-return data, misc. datasets — 7 datasets found in various formats) — SOS Elections Division | https://sos.oregon.gov/elections/Pages/electionsstatistics.aspx | Mixed: election calendar available in **CSV, RDF, JSON, and XML**; daily ballot-return counts in **CSV** during the 2 weeks before an election | Election calendar: ongoing; ballot returns: daily during active elections; multi-cycle historical archive | Statewide, some county breakdowns | Public | Calendar feeds resemble a lightweight structured/RDF feed (not a full REST API) | HIGH for calendar/ballot-return CSV feeds; MEDIUM for the rest | County code, election date |
| 8 | **Voter Turnout History for General Elections** (statewide time series, 1960s–present) — SOS | https://sos.oregon.gov/elections/Documents/Voter_Turnout_History_General_Election.pdf | PDF | Static, updated after each general election; historical depth spans decades (86.48% high in 2004, 59.02% low in 1998) | Statewide | Public | None | LOW (PDF table, needs manual transcription) | Election year |
| 9 | **Voter Registration Data** — data.oregon.gov (Oregon's Open Data Portal) | https://data.oregon.gov/Administrative/Voter-Registration-Data/8h6y-5uec | Socrata-platform dataset — CSV, JSON, and typically an OData/SODA API endpoint on data.oregon.gov datasets | Periodic (raw data + charts); historical depth not confirmed this session | Statewide, by county | Public | Socrata SODA API expected (data.oregon.gov is Socrata-hosted) — not independently confirmed this session | HIGH if API confirmed; MEDIUM otherwise | County code, registration date |
| 10 | **Monthly county-level voter registration statistical report** (new requirement under HB 2435, effective July 1, 2026) — SOS | Expected under https://sos.oregon.gov/elections/Pages/voter-registration-reporting.aspx | Not yet observed directly — legislatively mandated monthly report | Monthly, by county, starting mid-2026 (i.e., effective as of this research date) | Statewide, county-level | Public (statutory) | Unknown — brand new requirement | MEDIUM (too new to confirm format) | County code, month |
| 11 | **Voting Districts by Precinct** — data.oregon.gov | https://data.oregon.gov/Administrative/Voting-Districts-by-Precinct/r7vb-b9k4 | Socrata dataset; supports OData v2 (usable in Excel/Tableau) | Updated periodically (seen updated June 5, 2026) | Statewide, precinct-level | Public | OData/SODA API | HIGH | Precinct ID/number, county code |
| 12 | **Statewide and Less-Than-Statewide Voter List** (the actual voter file — restricted) — SOS Elections Division | https://sos.oregon.gov/elections/Pages/request-for-voter-list.aspx and spec sheet https://sos.oregon.gov/elections/Documents/voter-list-specifications.pdf | Fixed-width/CSV extract, provided on request | On request | Statewide or sub-statewide (by county/district) | **RESTRICTED** — statutory public-records process under ORS 247.940/247.945 and OAR 165-002-0020; $500 flat fee statewide, tiered fee for partial lists, restricted to permitted uses (not a general open dataset) | None (manual request) | LOW / not applicable for general visualization use — noted for completeness only; use aggregate registration stats (source #9) instead | Voter ID (restricted) |
| 13 | **Oregon Election Historical Results and Data** — SOS | https://sos.oregon.gov/elections/Pages/electionhistory-stats.aspx (also https://sos.oregon.gov/elections/pages/historical-data.aspx) | HTML, linked PDFs | Static archive, multi-decade | Statewide | Public | None | LOW–MEDIUM | Election year |

---

## Multnomah County

| # | Source / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| 14 | **Multnomah County Official Precinct Results** (per-election abstracts) — Multnomah County Elections Division / Portland City Auditor | https://www.portland.gov/auditor/elections/documents/multnomah-county-precinct-results-report/download and per-election files e.g. https://multco.us/file/2024-11_or_ag.pdf/download | PDF abstracts; some elections also post CSV/Excel precinct data | Per-election, released after certification (weeks after election day); historical archive by election | Precinct-level (113 precincts, 255 within-precinct splits as of 2022 redistricting) | Public | None | MEDIUM (PDF for many elections; CSV when available — inconsistent format across cycles) | Precinct number, election date, race ID |
| 15 | **Per-election results pages** (e.g., "May 2026 Primary," "November 2025 Special," "November 2024 General") — Multnomah County | e.g. https://multco.us/info/precinct-results-may-2026-primary-election, https://multco.us/info/november-4-2025-election-results-multnomah-county | HTML landing pages linking to PDF/CSV precinct results and summary reports | Per election cycle | Precinct and county-wide | Public | None | MEDIUM | Election date, precinct number |
| 16 | **Maps and Data — Multnomah County Elections** (ballot-return-by-day, voter-history extracts, walking lists, turnout dashboards) — Multnomah County Elections | https://multco.us/info/maps-and-data-multnomah-county-elections (mirror: https://web.multco.us/elections/election-maps) | Mixed: daily ballot-return counts (public aggregate), a "visualization dashboard pilot" for daily returns/turnout by precinct & district, plus **restricted** voter-history/walking-list exports (name+address+party+vote-history — PII) | Daily during active elections; per-cycle otherwise | Precinct, district, county | Ballot-return aggregates public; voter-history/walking-list exports **restricted** (public-records request only) | Dashboard appears to be a BI tool (Tableau-style), not an open API | HIGH for the aggregate turnout dashboard; LOW/restricted for voter-history exports | Precinct number, district ID |
| 17 | **Turnout and Statistics — November 2024 General Election** — Multnomah County | https://multco.us/info/turnout-and-statistics-november-2024-general-election | HTML/PDF | Per-election | County-wide, some precinct/district breakdown | Public | None | MEDIUM | Election date |
| 18 | **Historical Turnout and Registration Statistics** — Multnomah County | https://multco.us/info/historical-turnout-and-registration-statistics | HTML tables / PDF | Multi-cycle historical archive | County-wide | Public | None | MEDIUM | Election year |
| 19 | **Precincts and Districts in Multnomah County** (precinct list/boundaries reference, incl. downloadable list) — Multnomah County | https://multco.us/info/precincts-and-districts-multnomah-county and direct list download https://multco.us/file/precincts_in_multnomah_county-0/download | HTML + downloadable list (format TBD — likely CSV/PDF); GIS shapefiles referenced as updated March 2022 post-redistricting | Updated after redistricting (last known: March 2022) | Precinct-level | Public | None | MEDIUM–HIGH (shapefile component) | Precinct number/ID |
| 20 | **Multnomah County Voter Precincts** (interactive map) — Multnomah County GIS, ArcGIS Experience Builder | https://experience.arcgis.com/experience/9be34438fc404b2494a48f7a668914f2 | Interactive web map (ArcGIS); underlying feature service likely queryable via Esri REST API | Updated per redistricting cycle | Precinct-level | Public | Esri REST feature service (typical for ArcGIS Experience apps — endpoint not independently confirmed this session) | HIGH if the underlying feature service is confirmed open | Precinct number |
| 21 | **Multnomah County Open Data** (general GIS hub — parcels, boundaries, and likely elections layers) — Multnomah County GIS | https://gis-multco.opendata.arcgis.com/ | CSV, KML, Shapefile (ZIP), GeoJSON, GeoTIFF, PNG | Rolling/ArcGIS Hub updates | Varies by layer; county-wide down to parcel | Public (ArcGIS Open Data terms) | ArcGIS REST API + Hub search API (standard for opendata.arcgis.com sites) | HIGH for whichever elections-relevant layers exist on this hub (precinct boundaries, council districts) | Precinct/parcel/geography ID |
| 22 | **Ranked Choice Voting (RCV) Results & Cast Vote Record analysis** — Multnomah County Elections | https://rcvresults.multco.us/ and news release https://multco.us/news/news-release-multnomah-county-elections-releases-data-detailing-how-portland-voters-filled-out | Dedicated results site derived from the certified cast vote record (CVR) for the Nov. 5, 2024 election (Portland's first RCV election — Mayor, Auditor, 4 Council districts) | One-time detailed release after Dec. 2, 2024 certification; expected to recur each RCV election (next city general expected 2028) | City-wide and by the 4 Portland City Council districts | Public | Not confirmed as a raw CVR file download this session — appears to be a curated results/report site rather than a raw `.csv` CVR dump | HIGH as a curated resource; verify separately whether the **raw** Dominion/precinct-level CVR file is separately downloadable (common in other RCV jurisdictions) | Council district ID, contest ID, election date |
| 23 | **Ranked Choice Voting (RCV) info hub** — Multnomah County | https://multco.us/info/ranked-choice-voting-rcv | HTML explainer + links to results | Static + linked to results releases | City of Portland (4 districts + citywide) | Public | None | MEDIUM | Council district ID |
| 24 | **Campaign Finance (Multnomah County candidates — county-level, separate from City of Portland program)** — Multnomah County Elections / MultnomahVotes.gov | https://multco.us/info/campaign-finance and https://www.multco.us/elections/multnomah-county-campaign-contribution-limits-and-disclosure-definitions | HTML program pages; underlying filings likely routed through ORESTAR (state system) since county candidates also file there | Continuous; program adopted via 2016 charter amendment ($603 contribution limit cited for current cycle) | County-wide (County Chair, County Commission races) | Public | Filings accessible via ORESTAR (see source #1) | MEDIUM (piggybacks on ORESTAR) | Filer ID (ORESTAR), candidate name |
| 25 | **Public Records Requests — Multnomah County Elections Division** (process for voter history, walking lists, other restricted extracts) — Multnomah County | https://multco.us/info/public-records-requests-multnomah-county-elections-division | Request process (no direct download) | On request | Varies | **RESTRICTED** — public-records request, may carry fees | None | LOW / restricted — noted for completeness only | N/A |
| 26 | **Multnomah County Election Results — Update PDFs** (numbered incremental results updates during canvass, e.g., "Update #12 – Final") — Multnomah County | e.g. https://multco.us/file/2024-11_report_12.pdf/download | PDF | Multiple releases per election during the canvass period | County-wide, precinct detail in later updates | Public | None | LOW (PDF-locked) | Election date, update sequence number |

---

## City of Portland

| # | Source / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| 27 | **Small Donor Elections program** (public matching-funds program for Mayor, Auditor, City Council) — Portland City Auditor / Elections Commission | https://www.portland.gov/smalldonorelections | HTML program pages; contribution data periodically released ("name and street address of matchable donors, dates and amounts... periodically released on the program website") | Rolling during election cycles (e.g., 2026 cycle data referenced as of research date); program launched with 2020/2022 charter reform, first full use 2024 | City-wide and by the 4 City Council districts | Public record by design (matched donations are public); a 2024 incident led to a temporary "pause" on matching contributions donated *between* candidates | Not confirmed as a structured/bulk API — appears to be periodic HTML/report releases | MEDIUM (public but likely released as periodic reports/HTML rather than a live feed) | Candidate/committee ID, district, contribution date |
| 28 | **OpenElectionsPortland.org** — the software platform built for the program (originally "Open & Accountable Elections," now Small Donor Elections), developed by Hack Oregon / Civic Software Foundation, integrates with state ORESTAR filings | https://openelectionsportland.org/ | Web application; supports bulk upload of contributions by campaigns; front-end for viewing contributions | Continuous during filing periods | City-wide, by candidate/committee | Public | Underlying system integrates with ORESTAR (see Orestar Integration wiki: https://github.com/hackoregon/openelections/wiki/Orestar-Integration) — no confirmed public REST API for external consumers | MEDIUM (data is public-facing but access pattern is a web UI, not a documented open API) | Filer/Committee ID (shared with ORESTAR) |
| 29 | **Open & Accountable Elections / Small Donor Elections source code** — Hack Oregon / Civic Software Foundation (GitHub) | https://github.com/hackoregon/openelections | Source code repo (not a data source per se, but documents the ORESTAR integration and data model used by #28) | Actively maintained open-source project | N/A (software, not data) | Open source | N/A | N/A — reference/technical resource, not a dataset | N/A |
| 30 | **Portland Elections Commission — 2024 Small Donor Elections performance report** — Portland City Auditor | https://www.portland.gov/smalldonorelections/news/2025/7/8/portland-elections-commission-releases-report-analyzing-small (see also OPB coverage: https://www.opb.org/article/2025/07/08/report-portland-campaign-finance-program-met-expectations-2024-election/) | PDF/HTML report with analysis (e.g., zip-code contribution-equity ratio: ~900:1 in 2016 narrowed to ~21:1 by 2024) | One-time per election cycle (post-2024 general) | City-wide, with zip-code-level equity analysis | Public | None | LOW–MEDIUM (narrative report; underlying data not necessarily bundled) | Election year, zip code |
| 31 | **Historical Portland elections information** (candidates, results, measures/petitions by cycle) — Portland City Auditor Elections Division | https://www.portland.gov/auditor/elections/historical-election-information | HTML, linked PDFs | Static archive, multi-decade | City-wide | Public | None | LOW–MEDIUM | Election year |
| 32 | **Portland election maps and data** — Portland City Auditor Elections Division | https://www.portland.gov/auditor/elections/maps-and-data-city-portland | HTML, likely links out to Multnomah County / GIS resources (council district maps) | Updated per redistricting/election cycle | City-wide, 4 Council districts | Public | None | MEDIUM | Council district ID |

---

## Cross-Jurisdiction & Third-Party Aggregators

These are not primary-custodian sources but are high-value for mapping and multi-cycle
time-series work because they pre-harmonize Oregon precinct geography and results.

| # | Source | URL | Format(s) | Coverage | Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| 33 | **MIT Election Data and Science Lab (MEDSL)** — precinct-level returns | https://electionlab.mit.edu/data (code/tools: https://github.com/MEDSL) | CSV via Harvard Dataverse | Precinct-level federal/state/local returns, 2016–2024 cycles, incl. Oregon | Open (cite MEDSL) | No live API; static versioned file releases | HIGH | Precinct ID (MEDSL-normalized), county FIPS |
| 34 | **mggg-states/OR-shapefiles** (Metric Geometry and Gerrymandering Group) | https://github.com/mggg-states/OR-shapefiles | Shapefile (precinct boundaries) joined with 2016 & 2018 election results | 2016–2018 Oregon precincts | Open (GitHub, academic use) | None (static repo) | HIGH for those specific cycles; stale for 2020+ | Precinct ID |
| 35 | **Redistricting Data Hub — Oregon** | https://redistrictingdatahub.org/state/oregon/ (background: https://redistrictingdatahub.org/data/about-our-data/precinct-boundaries-and-election-results/) | Shapefiles with joined election results, 2016/2018/2020 (2022+ in progress per RDH) | Precinct-level, statewide | Free registration required; academic/nonprofit-friendly license | None (bulk download after registration) | HIGH | Precinct ID, county FIPS |
| 36 | **election-geodata** (nvkelso) — precinct shapes + results, multi-cycle, multi-state | https://github.com/nvkelso/election-geodata | GeoJSON/Shapefile | Varies by state/year; Oregon coverage not independently confirmed this session | Open source | None (static repo) | MEDIUM (verify Oregon-specific coverage before relying on it) | Precinct ID |
| 37 | **OpenSecrets — Oregon** (federal candidates/committees with OR nexus; limited state-level depth) | https://www.opensecrets.org/states/OR | HTML, some bulk data via OpenSecrets' broader bulk-data program | Federal races primarily; Oregon state/local campaign finance not OpenSecrets' focus (use ORESTAR instead) | Public; OpenSecrets bulk data has its own terms | Documented OpenSecrets bulk-data downloads exist (not Oregon-state-specific) | LOW for Oregon state/local use case | Candidate/committee FEC ID (federal only) |
| 38 | **Independent Voter Project — Oregon voter registration stats** | https://independentvoterproject.org/voter-stats/or | HTML summary | Periodic snapshot | Statewide | Public (secondary aggregator of SOS data) | None | LOW (derivative; prefer primary SOS source #9) | County |

---

## Standouts

- **Ranked-choice-voting cast-vote-record analysis (Multnomah County, `rcvresults.multco.us`, source #22)** —
  the single most novel dataset in this inventory: Portland's Nov. 2024 election was the
  city's first using RCV for Mayor, Auditor, and four multi-seat Council districts. The
  county's derived report (ranking rates, "voters who saw a candidate of choice elected"
  by district, ballot-exhaustion patterns) is essentially pre-built for a "how did
  Portlanders rank their ballots" interactive. Worth a direct follow-up check on whether
  the underlying raw CVR file (not just the summary report) is separately posted, which
  would allow a from-scratch Sankey/flow visualization of vote transfers.

- **Small Donor Elections equity story (Portland, source #27/#30)** — the Elections
  Commission's own report already frames a striking time series: the ratio between the
  wealthiest and least-affluent Portland zip code's campaign contributions fell from
  ~900:1 in 2016 to ~21:1 in 2024 after the matching-funds program matured. Paired with
  candidate-level matching-funds totals (e.g., per-district dollars unlocked), this is a
  strong candidate for a before/after choropleth or bump chart by zip code / district.

- **Layered campaign-finance geography (State → County → City)** — Oregon state candidates
  and Multnomah County candidates both file through **ORESTAR** (source #1), while City of
  Portland Small Donor Elections candidates use **OpenElectionsPortland.org** (source #28)
  which itself feeds back into ORESTAR. A cross-jurisdiction dashboard comparing
  contribution-limit regimes (no state limit vs. county's $603 cap vs. city's small-donor
  match) at the same point in time would be a distinctive, Portland-specific angle no
  national tracker currently offers.

- **Precinct-boundary + results joins for mapping (sources #19–21, #33–35)** — Multnomah
  County's own precinct list/shapefiles, layered with MEDSL and Redistricting Data Hub's
  pre-joined precinct-results shapefiles for 2016–2020, give a ready-made path to
  choropleth maps of turnout, party registration, or vote share without doing the
  boundary-to-results join from scratch. Post-2022-redistricting cycles will need a fresh
  join since RDH's 2022+ coverage is still catching up per their own site.

- **Multi-decade statewide turnout time series (source #8, `Voter_Turnout_History_General_Election.pdf`)** —
  spans roughly 1960s–2024 in one document (86.48% high in 2004 vs. 59.02% low in 1998),
  making it an efficient single-source basis for a long-run Oregon turnout trend line once
  transcribed out of the PDF.

- **New monthly county voter-registration reporting (HB 2435, source #10)** — takes effect
  the same month as this research (July 2026). If it lands in a clean tabular format, it
  would upgrade Oregon's registration reporting from periodic snapshots to a genuine
  monthly time series across all 36 counties — worth monitoring for a near-term format
  check.

---

## Notes & Caveats

- **Network verification was not possible this session.** All `WebFetch` calls (and even
  direct `curl` calls to unrelated control domains — `google.com`, `example.com`,
  `wikipedia.org`) returned HTTP 403 from the outbound agent proxy. The proxy's own status
  endpoint (`$HTTPS_PROXY/__agentproxy/status`) logged these as `connect_rejected` /
  "gateway answered 403 to CONNECT (policy denial or upstream failure)" for **every** host
  attempted, including non-government sites — indicating a session-wide egress policy
  block rather than a problem with any specific government URL. Per the environment's own
  troubleshooting guidance, this class of failure should be reported rather than retried
  or routed around. **Practical effect: every URL in this document is sourced from
  WebSearch result snippets/titles (which reflect current search-index content), not from
  a live fetch-and-render check.** A follow-up pass with working HTTP access is recommended
  before treating any URL here as guaranteed-live, particularly the deep-linked file
  downloads (`multco.us/file/...`, PDF documents) which are the most likely to have moved.

- **`data.oregon.gov`'s Campaign Finance Transactions dataset does not yet exist** — the
  only hit found was a "dataset suggestion/nomination" page
  (https://data.oregon.gov/nominate/5568), implying someone has requested the state
  publish ORESTAR data as an open dataset but it has not happened yet. **ORESTAR itself
  remains the only public access point for Oregon campaign finance data**, and it is a
  search-and-export interface, not a bulk API — a real gap for anyone wanting to build an
  automated/refreshing campaign-finance visualization.

- **PII-restricted sources were deliberately excluded from visualization-readiness scoring**
  but are listed for completeness and legal-access-process documentation:
  - Oregon's statewide/less-than-statewide **voter list** (source #12) — $500 flat fee
    statewide under OAR 165-002-0020 / ORS 247.940 / 247.945, restricted to permitted
    uses, requested directly from the SOS Elections Division.
  - Multnomah County's **voter-history and walking-list** exports (part of source #16,
    formal process at source #25) — contain name, address, party registration, and
    per-election vote history; available only through a public-records request, not bulk
    download.
  - Use the public aggregate counterparts instead: statewide/county **Voter Registration
    Data** (source #9) and the forthcoming **HB 2435 monthly county reports** (source #10)
    for registration; county **turnout/ballot-return** pages (sources #16–18) for
    participation.

- **Format inconsistency across Multnomah County election cycles** — some elections post
  precinct results as clean CSV/Excel, others as PDF-only abstracts; this was true even
  across recent cycles in the search results (e.g., 2024 general vs. 2025/2026 specials),
  so any ETL pipeline should expect to handle both PDF-table-extraction and CSV parsing
  paths depending on year.

- **Unconfirmed API surfaces flagged for follow-up verification once network access is
  restored:**
  - Whether `data.oregon.gov`'s Socrata-hosted datasets (Voter Registration Data,
    Voting Districts by Precinct — sources #9, #11) expose the standard SODA REST API at
    a `resource/{id}.json` endpoint (very likely, given the Socrata platform, but not
    independently confirmed this session).
  - Whether the ArcGIS-hosted Multnomah County precinct map (source #20) and the general
    Multnomah County GIS Open Data hub (source #21) expose queryable Esri REST feature
    services for precincts/council districts specifically (the platform supports it; the
    specific layer's public availability was not confirmed).
  - Whether `rcvresults.multco.us` (source #22) hosts a raw, precinct-level cast-vote-record
    file for download, versus only the curated summary report described in search results.
  - The exact release cadence/format of Portland's Small Donor Elections contribution data
    (source #27) — described in search snippets as "periodically released" without a
    confirmed schedule or file format.

- **Out of scope / not found:** No evidence emerged of a formal Portland or Multnomah
  County open-data API specifically for election results (as distinct from general GIS
  portals); no evidence of a state-run Oregon election-results REST API (results.oregonvotes.gov
  appears to be HTML-only); no confirmed Oregon-specific coverage in the `nvkelso/election-geodata`
  repo (source #36) — flagged MEDIUM pending verification rather than excluded outright.
