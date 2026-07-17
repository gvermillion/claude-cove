# Environment Data Inventory — Portland / Multnomah County / Oregon

## Overview

This inventory covers publicly available environmental datasets spanning Oregon DEQ
(air quality, water quality, permitted discharges, cleanup sites, toxics, greenhouse
gas reporting), Portland urban forestry, Portland Bureau of Environmental Services
(BES) stormwater/sewer/watershed data, city/county/state climate and emissions
tracking, and federal/USGS resources scoped to the region (EPA EJScreen, EPA AQS,
EPA Superfund/Portland Harbor, USGS stream gauges, heat island mapping, and DOGAMI
natural-hazard layers). 28 distinct sources are documented across 6 agency groupings.

**Research method used:** 15 web searches were completed across all topic areas in
scope (see per-section notes). Attempted URL verification via the WebFetch tool was
blocked for the entire session — every host tested (state, city, county, federal,
and even a neutral non-government reference site) returned a proxy-level 403 policy
denial, not a site-specific error. This is documented in full in **Notes & Caveats**
below. As a result, URLs and details below are sourced from web-search result
snippets/titles and, where flagged, from general subject-matter knowledge that could
not be independently re-verified this session. All such items are marked
**[UNVERIFIED]** and should be spot-checked before publication.

---

## 1. Oregon DEQ — Air Quality

| Source | Custodian | URL | Format | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| OregonAir / Oregon AQI (near real-time index + map, "OregonAir" mobile app) | Oregon DEQ | https://oraqi.deq.state.or.us/ and https://aqi.oregon.gov/ (two live front ends found; reconcile before use) | HTML map/dashboard; underlying data feeds EPA AirNow | Near real-time (hourly); network covers 40+ sites statewide | Station-level (point) | Public, no stated restriction | Not a documented public DEQ API directly; station data also flows to EPA AirNow/AQS (see EPA section) which does have a documented API | HIGH (near-real-time, station-level, but best pulled via EPA AQS/AirNow API rather than scraping DEQ's map) | AQS Site ID; lat/long |
| Air Quality Monitoring Network overview / annual monitoring report | Oregon DEQ | https://www.oregon.gov/deq/aq/Pages/Air-Quality-Monitoring.aspx | HTML + PDF ("Air Quality Monitoring Annual Report") | Annual report; network described as 40+ sites | Statewide, station-level | Public | No | MEDIUM (PDF report; station list embedded in HTML/PDF, not a clean download) | Station ID |
| Portland Air Toxics Solutions (PATS) monitoring data / Air Toxics Summary reports | Oregon DEQ | https://www.oregon.gov/deq/aq/air-toxics/Pages/PATS.aspx | PDF summary reports (e.g., "Air Toxics Summary 2022") | Annual/periodic summary reports; program active since 2009–2012 study, ongoing monitoring | 11 statewide air toxics sites; 4 in Portland metro (Cully/Helensview, Tualatin, Hillsboro Hare Field, Portland NATTS/NE Portland) | Public | No | LOW–MEDIUM (PDF-locked summaries; station-level raw data not clearly downloadable from this page) | Station ID; neighborhood (Cully, etc.) |

**Notes:** Oregon DEQ air monitors report criteria pollutants (CO, NO2, O3, SO2, PM10,
PM2.5, Pb) to EPA's national systems, so the EPA AQS API (see §7) is likely the most
reliable machine-readable path to historical/hourly Oregon monitor data, with DEQ's
own web properties serving primarily as the human-facing "AQI today" layer.

---

## 2. Oregon DEQ — Water Quality & Permitted Discharges

| Source | Custodian | URL | Format | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| Ambient Water Quality Monitoring System (AWQMS) — successor to LASAR | Oregon DEQ | https://www.oregon.gov/deq/wq/pages/wqdata.aspx (portal landing page; also referenced at https://www.oregonwaterdata.org/datasets/ambient-water-quality-monitoring-system-awqms) | Query/chart/graph tool with CSV export | Continuous; DEQ + partner (watershed council) data; historical LASAR data migrated in | Station-level (rivers, streams, lakes, estuaries, beaches, groundwater) statewide | Public | Exchanges via EPA's Water Quality Exchange (WQX) network — a standardized federal data-exchange format, not a simple REST API | MEDIUM–HIGH (queryable, chartable, exportable, but requires navigating a legacy-style web query tool) | Station ID; HUC (watershed) via WQX schema |
| NPDES / WPCF Wastewater Permits Database | Oregon DEQ | https://www.oregon.gov/deq/wq/wqpermits/pages/wastewater-permits-database.aspx | HTML search tool returning PDF permit documents | Permits renewed every 5 years; 310 active individual municipal/industrial NPDES permits statewide as of Dec 2025 | Facility/address-level | Public | No (document search only); discharge monitoring reports (DMRs) submitted via EPA's NetDMR | LOW–MEDIUM (PDF-locked permit documents; use EPA ECHO for structured DMR data instead, see §7) | Permit number; facility name/address |
| EPA Oregon NPDES permits landing page | EPA (Region 10) | https://www.epa.gov/npdes-permits/oregon-npdes-permits | HTML, links to DEQ database | Static reference page | Statewide | Public | No | LOW | Permit number |

---

## 3. Oregon DEQ — Cleanup Sites & Toxics

| Source | Custodian | URL | Format | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| Your DEQ Online (YDO) Public Records Portal — successor to ECSI (Environmental Cleanup Site Information) | Oregon DEQ | https://www.oregon.gov/deq/permits/pages/ydo-public-records.aspx (landing page); portal itself appears to be hosted at https://ordeq-edms-public.govonlinesaas.com/pub/pub-rcd | HTML search/map tool; per-site detail reports | **Important:** ECSI (the 1989–2024 legacy database) was formally retired April 16, 2024 and migrated into Your DEQ Online. The old `deq.state.or.us/lq/ECSI/...` URLs are now stale/deprecated — do not use for new work. | Site/address-level statewide, incl. Portland-area cleanup and leaking underground storage tank (LUST) / heating oil tank sites | Public | No documented bulk API; search by project number, name, street, Site ID, Environmental Interest, Submittal Type, or Region, with a map view option | MEDIUM (structured search + map, but no clean bulk CSV/API found for programmatic pulls) | Site ID / ECSI Sequence Number (legacy); address; tax lot (likely, unconfirmed) |
| Oregon DEQ GHG Reporting Program (facility-level mandatory reporter data) | Oregon DEQ | https://www.oregon.gov/deq/ghgp/pages/ghg-emissions.aspx | Likely downloadable facility-level tables (format not independently confirmed this session) | Annual, since ~2010 reporting year | Facility-level (point), statewide | Public | Unconfirmed | MEDIUM–HIGH (facility-level, most granular GHG source, comparable to EPA's GHGRP/FLIGHT) | Facility ID; NAICS code; address |

---

## 4. Climate & Greenhouse Gas Inventories (State / County / City)

| Source | Custodian | URL | Format | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| Oregon Greenhouse Gas Sector-Based Inventory | Oregon DEQ | https://www.oregon.gov/deq/ghgp/pages/ghg-inventory.aspx | HTML + downloadable data tables (format not independently confirmed) | Annual; covers 1990–2023 (as of latest search); 2023 statewide emissions 5% above 1990 levels | Statewide, sector-level (no sub-state granularity) | Public | Unconfirmed | MEDIUM–HIGH (long time series, sector breakdown, but state-level only) | Sector code; year |
| Portland / Multnomah County Climate and Energy Dashboard | City of Portland Bureau of Planning & Sustainability (BPS) | https://www.portland.gov/bps/climate-action/progress-toward-carbon-reductions (dashboard); underlying data download at https://www.portland.gov/bps/climate-action/documents/download-dashboard-data/download | Interactive dashboard (relaunched Nov 2024) with downloadable CSV/data files per chart | Annual; time series since 1990; current through calendar year 2023 at last update, updates annually | County-wide (Multnomah County), with sector and some neighborhood-level detail (e.g., solar installations by neighborhood) | Public | No formal API found; per-chart CSV download | HIGH (machine-readable download, 30+ year time series, sector breakdown, actively maintained, was covered by OPB/Axios/KOIN news coverage in Dec 2024) | Sector; year; (neighborhood for solar data) |
| Multnomah County Carbon Emissions and Trends — annual PDF reports | City of Portland BPS / Multnomah County (joint inventory, 30+ year history) | e.g., https://www.portland.gov/bps/climate-action/documents/multnomah-county-2021-carbon-emissions-and-trends/download ; 2023 report at https://www.portland.gov/sites/default/files/council-documents/2026/Emissions_Inventory_2023_CRLU_3_12_26.pdf | PDF | Annual report series; historical archive predates the 2024 interactive dashboard | County-wide | Public | No | LOW (PDF-locked; superseded for viz purposes by the dashboard above, but useful for pre-2024 methodology detail) | Year; sector |
| Oregon Climate Action Commission (formerly Oregon Global Warming Commission) — Reports | State of Oregon (statutory commission) | https://climate.oregon.gov/reports | PDF reports | Periodic/biennial statutory reports | Statewide | Public | No | LOW (PDF-only) | N/A |
| ODOE Land-Based Net Carbon Inventory | Oregon Department of Energy (ODOE) | https://www.oregon.gov/energy/energy-oregon/Documents/2025-Land-Based-Net-Carbon-Inventory-Report.pdf | PDF report to legislature | Periodic (submitted per legislative mandate) | Statewide (natural & working lands) | Public | No | LOW (PDF-only) | N/A |
| Oregon's Comprehensive Climate Action Plan (CCAP) | Oregon Department of Energy (ODOE) | https://www.oregon.gov/energy/energy-oregon/Documents/CCAP-2026.pdf | PDF | Periodic strategic plan document | Statewide | Public | No | LOW (PDF-only; policy narrative, not a structured dataset) | N/A |

---

## 5. Portland Urban Forestry

| Source | Custodian | URL | Format | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| Street Tree Inventory — Active Records | City of Portland Urban Forestry (Parks & Recreation) | https://gis-pdx.opendata.arcgis.com/datasets/PDX::street-tree-inventory-active-records/about | CSV, Shapefile, GeoJSON, and REST API (standard ArcGIS Open Data export options) | "Street Tree Inventory 2.0" covers 2022–2024 collection; ~252,180 trees inventoried citywide | Individual tree / address-level (point features) | Open data (ArcGIS Open Data portal, typically CC-BY or public-domain-equivalent; confirm exact license on page) | Yes — ArcGIS REST FeatureServer/MapServer endpoints standard for this portal | HIGH (granular, point-level, multi-format, machine-readable) | Address; species code; neighborhood; likely tax lot proximity |
| TreePlotter Inventory / "Explore Portland's Canopy" interactive map | City of Portland Urban Forestry | https://www.portland.gov/trees/get-involved/tree-inventory | Interactive web map (search by address/species/neighborhood), dashboard | Continuously updated as inventory data is collected | Individual tree / neighborhood | Public | Unconfirmed for this specific tool (distinct from the Open Data CSV/API above) | MEDIUM (great for exploration, but the Open Data dataset above is the better machine-readable source) | Address; species; neighborhood |
| Tree Canopy Explorer PDX | City of Portland Urban Forestry (BES/Parks, built on 2019 Metro LiDAR + imagery) | https://experience.arcgis.com/experience/7556b8b1017949cdb56145ec33aef814 | Interactive ArcGIS Experience Builder map | Baseline 2019 LiDAR/imagery-derived canopy, with % change since 2014 shown per neighborhood; citywide canopy ~29.8% (goal 33.3%); eastside ~26%, westside ~56% | Neighborhood-level canopy %, citywide summary | Public | Unconfirmed (Experience Builder app; underlying feature layer may be separately queryable via ArcGIS REST) | HIGH (neighborhood-granularity canopy %, visual + likely underlying feature service) | Neighborhood ID |
| Canopy 2019 (regional layer) | Metro (Portland regional government) — RLIS Discovery | https://rlisdiscovery.oregonmetro.gov/datasets/b6da4ea243df4ba492d47860964cf2b5 | GIS (shapefile/geodatabase via RLIS Discovery) | 2019 snapshot | Regional (multi-county: Multnomah, Washington, Clackamas) | Metro's standard open-data license (typically public/attribution) | Likely REST via ArcGIS-based RLIS Discovery portal | HIGH (best source for **cross-jurisdiction** canopy comparison beyond city limits) | Tax lot / jurisdiction boundary |
| Tree Canopy and Potential in Portland, Oregon (2018) / Tree Canopy Monitoring 2000–2020 | City of Portland Urban Forestry, in partnership with US Forest Service ("My City's Trees" tool) | https://www.portland.gov/sites/default/files/2022/tree-canopy-monitoring-2020.pdf ; https://www.portland.gov/sites/default/files/2020-08/tree-canopy-and-potential-2018.pdf | PDF report | Point-in-time studies (2018, 2000–2020 trend report) | Citywide, with land-use breakdown | Public | No | LOW (PDF-only; use for historical trend narrative, not for live viz) | N/A |

---

## 6. Portland BES — Stormwater, Sewer, Watershed Health, Willamette River

| Source | Custodian | URL | Format | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| Collection System Lines / Collection System Points (sewer & stormwater pipe network) | City of Portland BES | https://gis-pdx.opendata.arcgis.com/datasets/collection-system-lines ; https://gis-pdx.opendata.arcgis.com/datasets/collection-system-points | CSV/Shapefile/GeoJSON + ArcGIS REST API | Maintained/updated infrastructure dataset; system includes 2,500+ miles of pipe, ~100 pump stations, 2 treatment plants (roughly 1/3 of pipes 80+ years old) | Pipe segment / node level (highly granular) | Open data | Yes (ArcGIS REST) | HIGH | Asset ID; address; watershed |
| Utilities_Sewer / Stormwater_System_Plan map services | City of Portland BES (via PortlandMaps) | https://www.portlandmaps.com/arcgis/rest/services/Public/Utilities_Sewer/MapServer ; https://www.portlandmaps.com/arcgis/rest/services/Public/Stormwater_System_Plan/MapServer | ArcGIS REST MapServer | Maintained | Address / parcel-level (via PortlandMaps property lookup) | Public (PortlandMaps terms apply) | Yes (ArcGIS REST/MapServer) | HIGH | Address; tax lot |
| Portland Watershed Health Index / Watershed Report Cards | City of Portland BES | https://www.portland.gov/bes/protecting-rivers-streams/portlands-watershed-report-cards | PDF report cards per watershed; scored index (0–10 scale, ≥8 = "properly functioning") | Updated every ~4 years; first issued 2015, most recent set reflects 2023 data | Watershed-level: Willamette River Mainstem, Willamette Tributaries, Fanno Creek, Tryon Creek, Columbia Slough, Johnson Creek | Public | No | LOW–MEDIUM (index scores are structured but delivered as PDF report cards, not a queryable dataset) | Watershed name/HUC |
| Portland Area Watershed Monitoring and Assessment Program (PAWMAP) — underlying monitoring data feeding the Health Index | City of Portland BES | https://www.portlandoregon.gov/bes/65155 | Underlying monitoring program; data format not independently confirmed | Ongoing monitoring program feeding the 4-year report card cycle | Station-level within each watershed | Public (program page); raw data access unconfirmed | Unconfirmed | MEDIUM (program exists but a clean public data download was not confirmed this session) | Station ID; watershed/HUC |
| Big Pipe Tracker (near-real-time CSO monitoring) | City of Portland BES | https://www.portland.gov/bes/big-pipe-tracker | Interactive web tool, near-real-time | Real-time during storm events; program context: CSOs reduced 94% to Willamette, 99% to Columbia Slough since Big Pipe completion (2011); overflow frequency dropped from ~50/year to ~4/year on average (a full CSO-free year was recorded in Jan 2025) | System-wide / outfall-level | Public | Unconfirmed | MEDIUM–HIGH (near-real-time and highly visual, ideal for an event-driven map/ticker, but API access not confirmed) | Outfall ID |
| Check the Rec (Willamette River recreational water quality testing) | City of Portland BES | https://www.portland.gov/bes/check-rec | Weekly seasonal testing results (E. coli), HTML | Weekly during summer recreation season; 100% "good" results reported for 2024 season per search results | Testing-site level along the Willamette | Public | Unconfirmed | MEDIUM (structured weekly results, format/download not confirmed) | Test site location |
| CSO Advisory news releases | City of Portland BES | e.g., https://www.portland.gov/bes/news/2025/12/9/cso-advisory-atmospheric-river-leads-combined-sewer-overflow-willamette-river | HTML news posts | Event-driven, published per overflow event | Outfall/event-level | Public | No | LOW (narrative news posts; useful as an event log but not structured data) | Event date; outfall |

---

## 7. EPA — Region-Scoped National Datasets

| Source | Custodian | URL | Format | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| EPA EJScreen (Environmental Justice Screening & Mapping Tool) **[UNVERIFIED]** | US EPA | Historically https://www.epa.gov/ejscreen and https://ejscreen.epa.gov/mapper/ | Interactive map + bulk downloadable census-block-group indicator data (historically CSV/geodatabase) | Historically annual refreshes | Census block group (very fine-grained) | Public domain (historically) | Historically yes (API + bulk download) | **Status uncertain** — general subject-matter knowledge (not verified this session) suggests EJScreen was taken offline / removed from active EPA hosting in a 2025 policy change; a Wayback Machine archive or a third-party mirror (e.g., from the Public Environmental Data Partners coalition) may be the only current access path. **Verify current URL/availability before relying on this for the visualization.** | Census block group (joins to Census/ACS geography used elsewhere in this inventory) |
| EPA Air Quality System (AQS) / AirData | US EPA (Office of Air Quality Planning & Standards) | https://www.epa.gov/outdoor-air-quality-data (AirData UI); pre-generated files at https://aqs.epa.gov/aqsweb/airdata/download_files.html; API docs at https://aqs.epa.gov/aqsweb/documents/data_api.html **[core URLs UNVERIFIED this session, based on general knowledge — highly likely stable/correct]** | CSV bulk downloads (hourly/daily/annual by state/county/site) + REST API (free key registration required) | Hourly/daily granularity; multi-decade historical depth for many criteria pollutants | Monitor/site-level | Public | Yes — well-documented REST API | HIGH (this is likely the best programmatic path to granular Portland-area air quality time series, feeding into DEQ's own AQI displays) | AQS Site ID (joins to Oregon DEQ monitoring station identifiers) |
| EPA Superfund Portland Harbor Site profile **[UNVERIFIED]** | US EPA Region 10 | Likely https://cumulis.epa.gov/supercpad/cursites/csitinfo.cfm?id=1000229 (EPA ID ORD980984091) or a newer https://www.epa.gov/superfund/portland-harbor -style URL — **exact current URL not verified this session** | HTML site profile; ROD (Record of Decision, issued 2017) and related documents as PDF | Periodic updates as cleanup phases progress | Single large river-segment site (Willamette River, Portland Harbor) with sub-area/parcel-level responsible-party detail | Public | No bulk API for the site itself; general Superfund data available via EPA's SEMS/ACRES systems | LOW–MEDIUM (rich narrative/PDF content; not natively a clean dataset, but high public interest for mapping the harbor cleanup boundary) | Site ID (ORD980984091); parcel/PRP (potentially responsible party) |
| EPA ECHO (Enforcement & Compliance History Online) | US EPA | https://echo.epa.gov ; web services at https://echo.epa.gov/tools/web-services **[UNVERIFIED this session, high confidence from general knowledge]** | Interactive facility search + bulk CSV + REST API | Continuously updated; DMR (discharge monitoring report) data, air emissions, inspection/enforcement history | Facility-level, nationwide (filterable to Oregon/Portland) | Public | Yes — documented REST API | HIGH (best structured source for NPDES discharge monitoring data referenced in §2, and for air/water/waste compliance history at named facilities) | EPA Registry ID / NPDES permit number (joins to Oregon DEQ permit database) |

---

## 8. USGS — Stream Gauges

| Source | Custodian | URL | Format | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| USGS National Water Information System (NWIS) / Water Data for the Nation **[UNVERIFIED this session, high confidence]** | US Geological Survey | https://waterdata.usgs.gov/ (portal); real-time services at https://waterservices.usgs.gov/ | Interactive dashboards + REST/web services (instantaneous values, daily values) returning JSON/RDB/WaterML | Real-time (typically 15-minute to hourly intervals) plus multi-decade historical daily records for long-running gauges | Individual gauge/station-level, e.g., Willamette River at Portland (USGS site 14211720) | Public domain (US Government work) | Yes — well-documented, stable REST API, no key required | HIGH (this is a gold-standard federal source: real-time + deep historical time series, clean API, ideal for a river-conditions panel alongside BES's Big Pipe/Check the Rec data) | USGS site number (8-digit); lat/long |

---

## 9. Heat Island Mapping

| Source | Custodian | URL | Format | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| Portland/Multnomah County Urban Heat Island mapping campaign (community-science heat mapping, ~2021, post-2021 heat dome) **[UNVERIFIED]** | NOAA / CAPA Strategies (campaign partner), in coordination with Multnomah County / City of Portland | Likely archived via CAPA Strategies' Heat Watch program and/or NOAA's heat.gov / NIHHIS portal — **exact current URL not confirmed this session**; also check Multnomah County Health Department heat-vulnerability publications | Point-level sensor traverse data, typically published as GIS layers (heat index by time of day) | One-time (or periodic) mapping campaign, not continuously updated | Very fine-grained (sub-block, traverse-route point density) within the mapped area | Public (NOAA campaigns are typically public domain) | Unconfirmed | MEDIUM (excellent granularity if the underlying GIS layer can be located, but this is a point-in-time campaign, not a live feed, and the current hosting URL needs to be tracked down) | Lat/long; census tract (for overlay with vulnerability indices) |

---

## 10. DOGAMI & FEMA — Natural Hazards

| Source | Custodian | URL | Format | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| HazVu (Oregon statewide natural hazard explorer) and SLIDO (Statewide Landslide Information Database for Oregon) **[UNVERIFIED this session]** | Oregon Department of Geology and Mineral Industries (DOGAMI) | Likely https://www.oregongeology.org/ (main site) and https://gis.dogami.oregon.gov/maps/hazvu/ (viewer) — **not independently verified this session; confirm before use** | Interactive web viewer + downloadable GIS layers (shapefile/geodatabase) for landslide susceptibility, seismic/liquefaction hazard, and tsunami inundation | Layers updated periodically as new hazard studies are completed; historical landslide inventory spans decades | Statewide, parcel/site-level susceptibility mapping | Public | Unconfirmed (likely ArcGIS REST endpoints given typical DOGAMI viewer architecture) | HIGH if GIS layers are confirmed downloadable (parcel-level hazard overlays are a strong map candidate) | Tax lot; lat/long |
| FEMA National Flood Hazard Layer (NFHL) / Oregon floodplain data **[UNVERIFIED this session]** | FEMA, with local implementation via Portland BES / Oregon Explorer | https://www.fema.gov/flood-maps/national-flood-hazard-layer (national); locally enforced via Portland's zoning/floodplain overlay maps on PortlandMaps | GIS (shapefile/geodatabase), interactive map viewer (https://msc.fema.gov/portal typically) | Periodic remapping by FEMA Flood Insurance Study cycle | Parcel/address-level flood zone determination | Public | Yes (FEMA NFHL has documented REST/ArcGIS services) | HIGH (parcel-level, well-documented federal API, strong candidate for a floodplain overlay map) | Tax lot; address; flood zone code |

---

## Standouts

Candidates most worth prioritizing for the visualization build:

1. **EPA AQS / AirData + Oregon DEQ monitoring network (§1, §7)** — Best cross-source
   time-series candidate: station-level, hourly, multi-decade, with a documented free
   API. Pairs Oregon DEQ's Portland-area monitors (including the 4 Portland-metro air
   toxics sites: Cully, Tualatin, Hillsboro, NE Portland/NATTS) with EPA's standardized
   national schema, enabling clean city-vs-national or city-vs-county comparisons.

2. **USGS NWIS stream gauges (§8) + Portland BES Big Pipe Tracker / Check the Rec
   (§6)** — A natural "Willamette River conditions" combo panel: USGS gives
   continuous, decades-deep discharge/gauge-height time series via a rock-solid free
   API (no key needed); BES's Big Pipe Tracker adds near-real-time sewer-overflow
   context; Check the Rec adds weekly recreational water-quality testing. Together
   these could drive a compelling "is it safe/high/normal today" river dashboard.

3. **Portland Climate and Energy Dashboard (§4)** — Standout time-series source: 30+
   year sector-based emissions history (1990–2023), relaunched Nov 2024 with
   per-chart CSV downloads and active annual updates — rare combination of depth,
   granularity, and genuine machine-readability among the climate sources reviewed.

4. **Street Tree Inventory + Tree Canopy Explorer PDX + Metro regional canopy layer
   (§5)** — Strong map-layering trio: parcel/tree-level inventory (252,180 trees,
   multi-format ArcGIS Open Data export), neighborhood-level canopy % with a
   2014-vs-2019 change view, and a Metro regional layer that extends canopy
   comparison beyond city limits into Washington and Clackamas counties — a genuine
   cross-jurisdiction opportunity.

5. **Portland Watershed Health Index (§6)** — A ready-made 0–10 composite score per
   named watershed (Willamette Mainstem, Willamette Tributaries, Fanno Creek, Tryon
   Creek, Columbia Slough, Johnson Creek), updated on a predictable 4-year cycle —
   good for a simple "scorecard" visual even though the underlying delivery is
   PDF-based and would need manual re-entry per cycle.

6. **DOGAMI HazVu/SLIDO + FEMA NFHL (§10)** — If GIS layer access is confirmed, these
   are the two clearest "hazard overlay map" candidates (landslide/seismic
   susceptibility and flood zone, both potentially parcel-level), letting the
   visualization tie environmental risk directly to addresses/tax lots alongside
   cleanup sites (Your DEQ Online, §3) and toxics data.

7. **Cross-jurisdiction join opportunity:** EPA EJScreen (§7, if its live status is
   confirmed) uses census block groups, which is also the typical geography for
   demographic overlays elsewhere in a civic dashboard — this would be the natural
   layer for pairing environmental burden with equity/demographic panels from other
   inventory sections, if the tool's current availability can be confirmed.

---

## Notes & Caveats

**Systemic tool failure — WebFetch verification could not be performed this
session.** Every WebFetch call attempted returned an HTTP 403 from the outbound
proxy layer, not from the destination sites themselves. This was confirmed to be a
proxy-level policy denial (via `curl $HTTPS_PROXY/__agentproxy/status`), which logged
`connect_rejected` / "gateway answered 403 to CONNECT (policy denial or upstream
failure)" for every host attempted, including a neutral non-government control
(`en.wikipedia.org`). Hosts attempted and blocked in this session specifically:

- `www.oregon.gov` (Oregon DEQ pages — attempted twice)
- `gis-pdx.opendata.arcgis.com` (Portland Open Data / Street Tree Inventory)
- `www.epa.gov` (Superfund Portland Harbor)
- `waterdata.usgs.gov` (USGS gauge data)
- `www.oregongeology.org` (DOGAMI)
- `en.wikipedia.org` (control test — confirms the block is proxy-wide, not
  government-domain-specific)

The proxy status log additionally showed contemporaneous denials for
`www.portland.gov`, `www.multco.us`, `data.oregon.gov`, `census.gov`,
`huduser.gov`, `www.pdx.edu`, `rlisdiscovery.oregonmetro.gov`, and others —
consistent with this being an environment-wide egress restriction affecting the
whole research session (likely shared across parallel research agents working on
this same civic data inventory), not a problem specific to any source in this file.

**Practical implication:** every URL and figure in this document that is not backed
by a WebSearch result snippet is marked **[UNVERIFIED]** inline. Before this
inventory is used to drive actual data pulls, someone with working web access should:

1. Confirm the two competing Oregon AQI front ends (`oraqi.deq.state.or.us` vs.
   `aqi.oregon.gov`) and determine which is current/canonical.
2. Confirm the exact AWQMS portal URL (the page found only linked toward it rather
   than exposing a direct portal URL).
3. Confirm the Your DEQ Online public-records portal URL
   (`ordeq-edms-public.govonlinesaas.com/pub/pub-rcd`) is the correct live entry
   point, since ECSI's legacy `deq.state.or.us/lq/ECSI/...` URLs are confirmed
   retired (April 16, 2024) and must not be used going forward.
4. **Confirm current EPA EJScreen availability.** General background knowledge
   (not verified this session) suggests EJScreen may have been removed from active
   EPA hosting in 2025 amid a broader federal policy shift away from environmental
   justice mapping tools; if so, a Wayback Machine snapshot or a third-party mirror
   (e.g., from the Public Environmental Data Partners coalition, which mirrored
   several EPA EJ datasets after similar 2025 takedowns) would be needed as a
   substitute, and this should be footnoted clearly in the final product given the
   topic's sensitivity.
5. Verify the EPA AQS/AirData, EPA ECHO, USGS NWIS, DOGAMI HazVu/SLIDO, and FEMA
   NFHL URLs listed in §7–§10, all flagged UNVERIFIED — these are long-standing,
   well-known federal/state systems and are very likely correct as listed, but were
   not re-confirmed via a live fetch this session.
6. Locate the current hosting location for the Portland/Multnomah 2021 Urban Heat
   Island community-science mapping data (§9) — this was the least confidently
   sourced entry in the inventory, since it relies entirely on general knowledge
   rather than either a search result or a fetch this session.

**Search budget note:** This session's shared WebSearch allowance (200 calls) was
exhausted partway through research — likely shared across multiple parallel research
agents working different sections of the same civic data inventory. 15 searches were
completed here before the budget was hit, covering all major topic clusters except
EPA/USGS/DOGAMI/heat-island, which were filled from general subject-matter knowledge
and flagged accordingly above.
