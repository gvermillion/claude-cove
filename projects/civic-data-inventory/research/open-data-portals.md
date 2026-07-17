# Open Data Portals — Portland, Multnomah County, and Oregon

## Overview

This section inventories the three flagship open-data platforms that anchor the civic
data ecosystem for Portland/Multnomah County/Oregon, plus the bureau- and department-level
data hubs, dashboards, and adjacent catalogs that sit alongside them:

- **City of Portland** — PortlandMaps Open Data (ArcGIS Hub), the PortlandMaps.com
  property/permit API, the Smart City PDX open data policy program, and the bureau-level
  dashboards it indexes (Police, Transportation, Environmental Services, Urban Forestry,
  Budget).
- **Multnomah County** — the county's ArcGIS Hub open data site, GIS services program,
  and department data/report hubs (Health, Homeless Services/Joint Office, Elections,
  Assessment & Taxation).
- **State of Oregon** — data.oregon.gov (Socrata, now Tyler Data & Insights), plus the
  state's parallel ArcGIS-based GIS catalog (Oregon GEOHub) and agency-specific data
  systems (ODOT TransGIS, Oregon Health Authority).

25 distinct sources/entries are documented below (exceeding the 15+ target). Three portal
technologies dominate: **ArcGIS Hub / ArcGIS Online** (Portland, Multnomah County, and
Oregon GEOHub — all Esri "opendata.arcgis.com" or "hub.arcgis.com" instances), **Socrata**
(data.oregon.gov, now operated by Tyler Technologies' Data & Insights division), and
**Tableau Public** (used heavily by Portland Police Bureau and Multnomah County's equity
office for dashboard-style publication rather than raw bulk download). No CKAN instances
were identified in scope — CivicApps.org, an older CKAN-style community catalog for the
Portland region, appeared in search results only as a historical/legacy reference and its
current operational status could not be confirmed this session (see Caveats).

**A methodological note on this research pass:** All 15 WebSearch queries executed
successfully. However, live verification via WebFetch was not possible — every WebFetch
and direct `curl` attempt in this session, including to unrelated control URLs like
`en.wikipedia.org` and `www.google.com`, was rejected at the outbound proxy layer with
`gateway answered 403 to CONNECT (policy denial or upstream failure)`. This indicates a
session-wide egress restriction rather than a problem with any individual civic-data host,
so no URL in this document should be read as "fetch-verified" — all entries are built from
WebSearch result snippets and titles only. See **Notes & Caveats** for the full list of
hosts that were attempted and blocked, and recommended next steps for a follow-up pass
with WebFetch access.

---

## City of Portland / Smart City PDX

| # | Name (custodian) | URL | Format(s) | Update frequency / historical depth | Geographic granularity | License | API | Viz readiness |
|---|---|---|---|---|---|---|---|---|
| 1 | **PortlandMaps Open Data** (Bureau of Technology Services / Corporate GIS) | https://gis-pdx.opendata.arcgis.com/ | CSV, KML, Shapefile (Zip), GeoJSON, GeoTIFF, PNG | Varies per layer; portal itself is continuously maintained | City-wide; parcel/address-level for many layers; some address data extends to full Portland Metro region | City of Portland Terms of Use for Open Data (custom ToS; see `portlandmaps.com/bps/arpa/tos.pdf` — not a standard CC/PDDL license as far as verified) | ArcGIS REST ("GeoServices"), WMS, WFS | **HIGH** |
| 2 | **PortlandMaps.com API & ArcGIS REST Services** (Corporate GIS / `maps@portlandoregon.gov`) | https://www.portlandmaps.com/development/ ; https://www.portlandmaps.com/arcgis/rest/services | JSON/XML via bespoke API endpoints (`suggest`, `detail`, `assessor`, `permit`, `landuse`, `sewer`, `bookmark`, `report`, `auth`, `agol`, `geometry`, `intersects`); ArcGIS MapServers (`COP_OpenData`, `BDS_Layers`, `Transit`, basemaps, `Address_Geocoding_PDX`) | Continuously updated (property/permit records) | Address / parcel-level | City ToS; some endpoints may require registration/rate limits (not confirmed) | Custom REST JSON API + ArcGIS REST/SOAP | **HIGH** (for developers); MEDIUM for casual users (requires API integration work) |
| 3 | **Smart City PDX — Open Data Program** (Bureau of Planning & Sustainability) | https://www.portland.gov/bps/com-tech/smart-city-pdx/open-data-program (mirrored at smartcitypdx.com/open-data-program) | HTML policy pages; PDF handbook (`2020 Open Data Handbook`, efiles.portlandoregon.gov) | Program dates to 2009 Open Data Resolution; formal Open Data Policy ordinance passed May 2017 | Citywide (policy scope, not a dataset itself) | Public Records / open-data ordinance | N/A — policy/program page, not a data endpoint | N/A (governance layer, not a dataset) |
| 4 | **Open Data Sources index** (Portland.gov / Public Records office) | https://www.portland.gov/public-records/open-data | HTML directory of links to bureau dashboards/datasets (non-comprehensive, curated) | Described as "regularly updated" | Citywide, spans all granularities of linked sources | Varies per linked source | N/A (index page) | **MEDIUM** (navigation aid, not machine-readable itself) |
| 5 | **Portland Police Bureau Open Data** (PPB) | https://www.portland.gov/police/open-data ; sub-pages: `/reported-crime-data`, `/crime-statistics`, `/reported-bias-crime-statistics`, `/arrest-statistics`, `/business-districts-crime-summary` | Tableau Public interactive dashboards with a "Download Data" tab (CSV export after filtering) | Monthly Reported Crime Statistics updated ~30 days after month end; NIBRS-based since April 2015 (pre-2015 data uses incompatible UCR/SRS system and is not comparable) | Address/neighborhood/council-district level for crime; citywide summaries | Public Records / PPB Police Data Initiative member | No direct REST/SODA API found — Tableau embed only | **MEDIUM** (granular but locked behind Tableau UI; requires manual filter+export, not bulk API) |
| 6 | **PBOT Data / Vision Zero Dashboard** (Portland Bureau of Transportation) | https://www.portland.gov/transportation/data ; https://www.portland.gov/transportation/vision-zero/vision-zero-dashboard | Interactive maps/dashboards (active construction & ROW permits, curb ramps, speed limits, pothole reports/repairs), likely Tableau/ArcGIS-based | Vision Zero crash summaries updated periodically (cadence not confirmed) | Address/segment-level | Public Records | Not confirmed — likely feeds from `gis-pdx.opendata.arcgis.com` transportation category | **MEDIUM–HIGH** depending on layer |
| 7 | **Bureau of Environmental Services data** (BES) | https://www.portland.gov/bes ; hydrology data via https://aquarius.portlandoregon.gov/ | GIS layers (sewer, stormwater, watershed restoration projects); real-time/near-real-time "Big Pipe" water-level data via Aquarius system | Big Pipe levels appear near-real-time (CSO monitoring); project layers updated periodically | Watershed/pipe-segment/parcel level | Public Records / City ToS | Aquarius system likely has its own API (not confirmed); GIS layers likely also on `gis-pdx.opendata.arcgis.com` | **MEDIUM** |
| 8 | **Urban Forestry — Tree Canopy Explorer & Street Tree Inventory** (Portland Parks & Recreation) | https://www.portland.gov/trees/tree-canopy-forest-management ; https://www.portland.gov/trees/get-involved/explore-portlands-canopy | ArcGIS Experience web app (Tree Canopy Explorer); downloadable Shapefile/CSV for Street Tree Inventory 2.0 (2022–2024); also distributed as the **`pdxTrees` R data package** on CRAN | Canopy cover estimated roughly every 5 years (29.8% in 2020, down from 30.7% in 2015); Street Tree Inventory 2.0 covers 2022–2024 | Neighborhood/tree-point level | Public Records / City ToS; `pdxTrees` R package uses a standard CRAN open-source license | ArcGIS REST for map layers; no dedicated tabular API found beyond bulk download | **HIGH** (unusually well-packaged — CSV, Shapefile, and an R package all exist for the same underlying data) |
| 9 | **Portland City Budget / OpenBook (Questica)** (City Budget Office) | https://www.portland.gov/city-budget ; https://portland.openbook.questica.com/ | Interactive budget-explorer web app (Questica OpenBook platform); Tableau profile also maintained by City Budget Office | Annual (adopted/proposed/revised budget cycles) | Bureau/fund/program level, not parcel/address level | Public Records | Not confirmed as a bulk API; likely UI-only export | **MEDIUM** (structured but likely requires scraping/UI export, not a clean bulk API) |
| 10 | **Portland Civic Lab** (third-party nonprofit, not a City program) | https://www.portlandciviclab.org/ | Source-linked public dashboards (housing, homelessness, public safety, budget, city performance, government accountability) | Ongoing | Citywide, various granularities depending on underlying source | Third-party; presumably built from public sources but redistribution terms not confirmed | Unknown — likely a presentation layer over official sources, not a primary API | **MEDIUM** (valuable as a curation layer / methodology reference, not a primary source) |

---

## Multnomah County

| # | Name (custodian) | URL | Format(s) | Update frequency / historical depth | Geographic granularity | License | API | Viz readiness |
|---|---|---|---|---|---|---|---|---|
| 11 | **Multnomah County Open Data** (County GIS / Department of Assessment, Recording & Taxation for some layers) | https://gis-multco.opendata.arcgis.com/ | CSV, KML, Shapefile (Zip), GeoJSON, GeoTIFF, PNG | Varies per layer (e.g., Taxlot Parcels appears continuously maintained; Commissioner Districts fixed to 2010 redistricting cycle; Voter Precincts last GIS update noted Feb 2016/2022 depending on source) | County-wide; parcel/precinct level for key layers | ArcGIS Hub default terms (specific license not confirmed — verify per dataset) | ArcGIS REST ("GeoServices"), WMS, WFS; also has its own Hub Search API (`/api/search/definition/`) | **HIGH** |
| 12 | **Multnomah County GIS Services (for developers)** (County IT/GIS) | https://multco.us/services/gis-services-developers-and-arcgis-software-users ; https://multco.us/info/geographic-information-system-gis | ArcGIS REST endpoints, desktop GIS connection info | Ongoing | County-wide | Public Records | ArcGIS REST/SOAP | **HIGH** (for GIS-literate consumers) |
| 13 | **Property Search Tools and Maps — MultCoPropTax / MultCoRecords** (Department of Assessment, Recording & Taxation) | https://www.multco.us/assessment-taxation/property-search-tools-and-maps | Web lookup tools (not clearly bulk-downloadable); underlying Taxlot Parcels layer is on the ArcGIS Hub (#11) | Ongoing / real-time for current assessment | Parcel/address level | Public Records; property records subject to standard PII redactions | Lookup-only; no confirmed bulk API distinct from #11 | **LOW–MEDIUM** (individual lookup, not bulk export; use Taxlot Parcels layer instead for bulk) |
| 14 | **Health Data & Reports** (Multnomah County Health Department) | https://www.multco.us/health/about-health-department/data-reports | Mix of PDF reports (fentanyl overdose deaths, mental health analysis, environmental justice, traffic deaths) and Tableau dashboards | Mixed cadence — some annual reports, some ongoing dashboards | County-wide, some sub-county breakdowns | Public Records | Not confirmed | **LOW–MEDIUM** (heavily PDF/report-based) |
| 15 | **Homeless Services Department / Joint Office reports (incl. Point-in-Time Count)** (Multnomah County HSD, formerly Joint Office of Homeless Services) | https://hsd.multco.us/reports/ | PDF reports (e.g., `2025-Tri-County-PITC-Report`); a new monthly "by-name list" count dashboard launched ~2024–2025 | Point-in-Time Count is an annual one-night census (tri-county: Multnomah, Washington, Clackamas, led with PSU); by-name list is now monthly | County-wide / tri-county regional for PITC | Public Records | None confirmed — PDF/report distribution, no API | **LOW** for PITC (PDF-locked); **MEDIUM** for the newer monthly by-name-list dashboard if it proves to have structured export |
| 16 | **Elections Maps and Data — precinct boundaries** (Multnomah County Elections Division) | https://multco.us/info/maps-and-data-multnomah-county-elections ; https://multco.us/info/precincts-and-districts-multnomah-county | GIS download (precinct boundaries); interactive ArcGIS Experience viewer for current voter precincts | Boundaries updated per redistricting cycle (2016, 2022 vintages referenced) | Precinct level | Public Records | Precinct layer likely also indexed on the county ArcGIS Hub (#11, tagged "Elections") | **MEDIUM–HIGH** |
| 17 | **Data / Diversity, Equity & Inclusion dashboards** (Office of Diversity & Equity) | https://www.multco.us/diversity-equity/data | Tableau Software dashboards | Not confirmed | County-wide, some demographic breakdowns | Public Records | Tableau embed, no confirmed API | **MEDIUM** (dashboard-locked) |

---

## State of Oregon

| # | Name (custodian) | URL | Format(s) | Update frequency / historical depth | Geographic granularity | License | API | Viz readiness |
|---|---|---|---|---|---|---|---|---|
| 18 | **data.oregon.gov** (Oregon Enterprise Information Services / statewide Socrata platform, now Tyler Data & Insights) | https://data.oregon.gov/ | CSV, JSON, XML, and up to 8 export formats per dataset (Socrata standard); interactive charts/graphs/maps in-browser | Varies per dataset/agency; ~463 datasets indexed under the state-of-oregon publisher on catalog.data.gov | Statewide, with many datasets at county/tract/ZIP granularity depending on contributing agency | Socrata-standard per-dataset licensing (not uniformly confirmed — verify per dataset) | **Socrata Open Data API (SODA)** — every dataset has an API endpoint; SoQL query support | **HIGH** |
| 19 | **data.oregon.gov Developer Portal** (same platform) | https://data.oregon.gov/developers | API documentation, SODA reference | Ongoing | N/A (developer docs) | N/A | SODA / dev.socrata.com foundry docs per dataset | **HIGH** (docs layer) |
| 20 | **ORMAP — The Oregon Property Tax Map** (Dept. of Revenue / county assessors consortium, hosted on data.oregon.gov) | https://data.oregon.gov/Administrative/ORMAP-The-Oregon-Property-Tax-Map/4wpq-zwd9 | Socrata dataset (map/table); also mirrored on catalog.data.gov | Ongoing, tied to county assessor cycles | Statewide, parcel/tax-lot level | Socrata default | SODA | **HIGH** — key statewide join layer for tax lot ID |
| 21 | **Oregon Health Authority — Data and Statistics / Vital Statistics (Center for Health Statistics)** | https://www.oregon.gov/oha/ph/datastatistics/pages/index.aspx ; https://www.oregon.gov/oha/ph/birthdeathcertificates/vitalstatistics/pages/index.aspx | Quarterly web tables, annual PDF reports, interactive data maps (birth/death/teen pregnancy by county and sub-county — tract/ZIP level in the data-maps tool) | Quarterly (web tables), annual (reports) | County-wide standard; census-tract/ZIP-level available via the Data Maps tool | State Public Records; custom data requests billed at $65/hour per OAR 333-011-0325 | No confirmed open bulk API — primarily dashboards/PDF; granular data requires a paid custom request | **LOW–MEDIUM** (aggregate dashboards are viz-ready; record-level data is records-request/fee-gated) |
| 22 | **ODOT TransGIS** (Oregon Dept. of Transportation, GIS Unit) | https://gis.odot.state.or.us/transgis/ | Interactive web map; REST Service Directory backing it for use in desktop GIS (ArcMap/Pro) or web mapping | Ongoing (state highway assets, safety, freight, intermodal, environmental layers) | Statewide, road-segment level | State Public Records; contact odot.maps@odot.state.or.us | ArcGIS REST | **HIGH** |
| 23 | **Oregon GEOHub** (State of Oregon enterprise GIS / DAS, Esri ArcGIS Hub instance parallel to data.oregon.gov) | https://geohub.oregon.gov/ (e.g., https://geohub.oregon.gov/datasets/odot-transgis) | CSV, Shapefile, GeoJSON, ArcGIS REST layers (same Esri Hub pattern as Portland/Multnomah portals) | Varies per layer | Statewide | ArcGIS Hub default terms (not confirmed) | ArcGIS REST | **HIGH** |
| 24 | **Oregon Transportation Safety Data Explorer (OTSDE)** (ODOT) | https://www.arcgis.com/apps/webappviewer/index.html?id=df0b3cdb2f1149d3bd43436bc1dd4eac | ArcGIS Web AppBuilder interactive crash-data viewer | Not confirmed | Statewide, crash/segment level | State Public Records | Backed by ArcGIS REST services (not directly confirmed) | **MEDIUM–HIGH** (viewer is polished; bulk export path not confirmed this pass) |
| 25 | **catalog.data.gov — State of Oregon organization page** (federal harvest/mirror of state.data.oregon.gov and other state GIS catalogs) | https://catalog.data.gov/organization/state-of-oregon | Harvested metadata records linking back to Socrata/ArcGIS originals | Continuously harvested | Statewide (aggregates all harvested sources) | Federal data.gov terms (generally public domain unless noted) | data.gov CKAN-style API (this is the one CKAN-technology touchpoint in scope, though it's a federal harvest layer, not an Oregon-run CKAN instance) | **HIGH** (best single discovery layer across all Oregon state sources, ~463 datasets indexed) |

---

## Standouts

- **ORMAP (data.oregon.gov, #20)** and **Multnomah County Taxlot Parcels (#11)** together
  form the backbone join layer for any property/land-use visualization — both key on
  **tax lot / parcel ID**, and ORMAP extends that same key statewide, meaning a
  Portland-parcel visualization could in principle scale to a full-Oregon parcel map
  without changing its join logic.
- **`pdxTrees` R package (#8)** is a genuinely unusual find: the same Street Tree
  Inventory dataset is published simultaneously as ArcGIS layers, flat CSV/Shapefile,
  *and* a versioned CRAN package — the most "developer-ready" civic dataset identified
  in this pass and a strong candidate for a polished map + time-series (canopy 2015 →
  2020 → planned resurvey).
- **Portland Police Bureau Monthly Reported Crime Statistics (#5)** is the strongest
  time-series candidate for public safety visualization: monthly cadence, ~30-day lag,
  clean NIBRS methodology from April 2015 forward, and neighborhood/council-district
  granularity — but it is Tableau-locked (manual filter + CSV export), not a live API, so
  a scraping/export step would need to be built and re-run.
- **catalog.data.gov's State of Oregon organization page (#25)** is the best single
  cross-jurisdiction discovery mechanism found: it harvests both Socrata (data.oregon.gov)
  and ArcGIS-based state catalogs into one metadata index, useful as a "master list" to
  crawl programmatically rather than working portal-by-portal.
- **Cross-jurisdiction ArcGIS Hub consistency** is itself a standout: Portland
  (gis-pdx.opendata.arcgis.com), Multnomah County (gis-multco.opendata.arcgis.com), and
  the State (geohub.oregon.gov) all run the *same* Esri ArcGIS Hub product. That means a
  single ingestion adapter (Esri Hub Search API + GeoServices REST) can likely pull from
  all three without three bespoke scrapers — a strong architectural lead for the eventual
  data pipeline.
- **Multnomah County's new monthly homelessness "by-name list" count (#15)**, launched
  2024–2025, is worth flagging as an emerging time-series: it replaces the older
  once-a-year Point-in-Time Count with (reportedly) monthly cadence, which — if it turns
  out to have a structured export — would be a significant upgrade over the PDF-only PITC
  reports for a homelessness dashboard.
- **Weak spot to flag for the `records-infrastructure` topic (#12 in TOPICS.md):** Oregon
  Health Authority vital statistics (#21) is a clear example of aggregate dashboards being
  public/free while record-level data sits behind a $65/hour records-request fee — a good
  concrete example for that topic's "proactive vs. records-request" comparison.

---

## Notes & Caveats

**WebFetch / direct network verification was unavailable for this entire research pass.**
Every WebFetch call attempted — against civic-data hosts and against unrelated control
domains — failed identically at the outbound proxy with `connect_rejected` /
`gateway answered 403 to CONNECT (policy denial or upstream failure)`. This was confirmed
to be a session-wide egress restriction (not a site-specific 403) by checking
`$HTTPS_PROXY/__agentproxy/status`, which logged rejections for, among others:

- `en.wikipedia.org:443`
- `www.google.com:443`
- `example.com:443` / `www.example.com:443`
- `gis-pdx.opendata.arcgis.com:443`
- `data.oregon.gov:443` (attempted twice)
- `www.portland.gov:443`
- `www.multco.us:443` / `multco.us:443`
- `www.oregon.gov:443`
- `sos.oregon.gov:443`
- `rcvresults.multco.us:443`
- `openelectionsportland.org:443`

Per the proxy troubleshooting guidance (`/root/.ccr/README.md`), a 403 at this layer means
"the destination host is not allowed by your organization's egress policy for this
session" and should be reported rather than retried or routed around — so no further
WebFetch attempts were made once the pattern was confirmed against control URLs.

**Practical consequence:** every URL, dataset category list, format list, and license
note in this document is derived from WebSearch result titles/snippets only (15 distinct
WebSearch queries were run — the session's full search budget was exhausted partway
through a planned 20th query, capping further lookups). None of the URLs above were
fetched and rendered directly, so:

- URLs should be treated as **likely-current but not fetch-verified**. All were returned
  by live web search in July 2026, which is a reasonable freshness signal, but page
  structure, exact category taxonomies, and dataset counts could have shifted since the
  underlying pages were indexed.
- Several fields marked "not confirmed" above (exact license text, some update cadences,
  whether certain dashboards expose an underlying API) genuinely could not be determined
  without fetching the pages, and are flagged inline rather than guessed.
- The status of **CivicApps.org**, an older Portland-region open data catalog referenced
  in search results as a "Data Portals" listing entry, could not be confirmed as
  currently active vs. deprecated — it is omitted from the numbered inventory above for
  that reason and should be checked directly (or via a fresh session with working
  WebFetch) before being cited as a live source.
- `aquarius.portlandoregon.gov` (Bureau of Environmental Services hydrology/Big Pipe data)
  and the exact API surface behind PBOT's Vision Zero dashboard and the Questica OpenBook
  budget tool are the highest-value items to re-verify first in a follow-up pass, since
  they were inferred from adjacent search snippets rather than a direct page view.

**Recommended follow-up:** re-run WebFetch against the 25 URLs above (and specifically the
DCAT/JSON catalog endpoints — `gis-pdx.opendata.arcgis.com/api/feed/dcat-us/1.1.json` and
`data.oregon.gov/api/catalog/v1` were attempted and blocked by the same proxy issue, but
if reachable they would give exact, complete category/dataset-count enumerations rather
than the search-snippet-derived lists used here) once the egress policy for this session
is adjusted or in a session with unrestricted WebFetch access.
