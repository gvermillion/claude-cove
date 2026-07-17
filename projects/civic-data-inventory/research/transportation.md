# Transportation Data Inventory — Portland / Multnomah County / Oregon

## Overview

This inventory covers publicly available transportation datasets, dashboards, and APIs across
three primary custodians — the **Portland Bureau of Transportation (PBOT)**, **TriMet**, and the
**Oregon Department of Transportation (ODOT)** — plus adjacent agencies whose data is relevant to
a regional transportation visualization: **Multnomah County** (bridges), the **Port of Portland**
(PDX airport), the **Portland Aerial Tram**, **BIKETOWN** (Portland's bike share system, operated
by Lyft under contract to PBOT), and passenger rail (**Amtrak Cascades**, reported via ODOT Rail
& Public Transit Division). Federal crash data (NHTSA FARS) is included where it provides a
statewide/national comparison layer.

35 distinct web searches were performed to compile this inventory (well above the 10-search
minimum) before the session's shared web-search budget was exhausted. **Live URL verification via
WebFetch/curl was not possible in this session** — the environment's egress proxy returned HTTP
403 on every destination tested, including a neutral control (`example.com`), which per the
proxy's own diagnostic guidance indicates a session-wide organizational policy block rather than a
site-specific failure. All URLs below are therefore verified only via search-engine indexing and
snippet content (titles, descriptions, and cited sub-pages returned by the search results), not by
direct fetch. See **Notes & Caveats** for the full list of unverified URLs and recommended
follow-up.

Ratings key for **Visualization Readiness**:
- **HIGH** — machine-readable (CSV/GeoJSON/API/GTFS), granular, actively updated
- **MEDIUM** — accessible but needs cleaning, scraping, dashboard-export, or is a mixed bag (some layers strong, others PDF-only)
- **LOW** — PDF-locked, static report, or effectively records-request-only

---

## 1. PBOT — Portland Bureau of Transportation

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| PBOT Data hub (index of all PBOT data sources) | https://www.portland.gov/transportation/data | HTML index page | Continuously maintained index | Citywide | Public, City of Portland terms | No (index only) | MEDIUM | — |
| Traffic Volume Counts (24-hr vehicle counts by location) | https://gis-pdx.opendata.arcgis.com/datasets/traffic-volume-counts (also indexed under item ID `0064041a68ae40adae798bfbd9aaaeeb`) | CSV, GeoJSON, KML, Shapefile, REST API (Esri) | Rolling; counts collected on a multi-year cycle per location, historical points retained | Point/segment (intersection or block) | Open Data Portal terms (attribution requested) | Yes — Esri REST/GeoServices, WMS/WFS | HIGH | Street segment ID, lat/long |
| How PBOT gathers traffic counts (methodology) | https://www.portland.gov/transportation/traffic-operations/how-we-gather-traffic-counts | HTML | Static reference | Citywide | Public | No | LOW | — |
| Bicycle Counts (annual volunteer count program, 30+ years running) | https://www.portland.gov/transportation/walking-biking-transit-safety/bicycle-counts | HTML + downloadable PDF/XLS reports by year | Annual (summer count season); historical archive back to ~1990s per site references, digitized reports at least to 2011 | ~300+ fixed count locations citywide | Public | No (report downloads, not an API) | MEDIUM | Location ID, street segment |
| Vision Zero Dashboard | https://www.portland.gov/transportation/vision-zero/vision-zero-dashboard (embeds a Tableau Public viz: https://public.tableau.com/app/profile/portland.bureau.of.transportation/viz/VisionZeroDashboard_16179023789280/VisionZeroDashboard) | Interactive Tableau dashboard; underlying data partially downloadable via Tableau's built-in export | Preliminary fatal-crash data updated monthly; other layers quarterly/annually | Citywide, by mode and location | Public | No formal API (Tableau embed, CSV export from viz possible) | MEDIUM | Crash ID, location |
| Vision Zero data (supporting data page) | https://www.portland.gov/transportation/vision-zero/vision-zero-data | HTML, linked reports | Updated alongside dashboard | Citywide | Public | No | MEDIUM | Crash ID |
| High Crash Network — streets & intersections | https://www.portland.gov/transportation/vision-zero/high-crash-network-streets-and-intersections | HTML list/map; underlying layer likely available on Open Data Portal | Reviewed periodically (network last defined using 2020–2024 crash data per PBOT reporting) | Corridor / intersection (30 streets + 30 intersections) | Public | Unclear — check Open Data Portal for a matching GIS layer | MEDIUM | Street segment ID, intersection ID |
| SmartPark Garages | https://www.portland.gov/transportation/parking/smartpark | HTML | Static/occasional updates | 5 downtown garages (site-level) | Public | No | LOW | Garage ID |
| Area Parking Permit Zones | https://gis-pdx.opendata.arcgis.com/datasets/area-parking-permit-zones/about | CSV, GeoJSON, Shapefile, REST API | Updated as zones change | Neighborhood/zone polygons | Open Data Portal terms | Yes — Esri REST | HIGH | Zone ID, address |
| PBOT_Parking map service (meters, event parking, permit zones) | https://www.portlandmaps.com/arcgis/rest/services/Public/PBOT_Parking/MapServer | Esri MapServer (multiple layers), GeoJSON via REST query | Ongoing | Point (meter) / polygon (zone) | PortlandMaps terms of use | Yes — Esri REST | HIGH | Meter ID, zone ID |
| E-Scooter Trips Dashboard | https://www.portland.gov/transportation/regulatory/escooterpdx/trips-dashboard | Interactive dashboard (Ride Report platform), CSV export | Near-real-time to daily; covers program start (2018 pilot) through present | Street-segment aggregated (individual trip start/end points, privacy-generalized) | Public; Mobility Data Specification (MDS) feed from operators (Lime, Lyft) — raw MDS not public, only aggregated | Yes — dashboard has data export; underlying MDS API is operator-to-city only, not public | HIGH | Street segment, date |
| E-Scooter Street Use Dashboard | https://www.portland.gov/transportation/regulatory/escooterpdx/street-use-dashboard | Interactive dashboard | Updated periodically | Citywide, by area | Public | Dashboard export only | MEDIUM | — |
| City of Portland Micromobility Dashboard (Ride Report — BIKETOWN + e-scooter combined) | https://public.ridereport.com/pdx | Interactive web dashboard, CSV download of aggregated trip counts | Updated regularly since Dec. 2021 launch | Street segment (quarterly aggregation to protect privacy) | Public; no individual ride data (privacy-protected) | No public REST API confirmed; dashboard-driven export | HIGH | Street segment, quarter |
| Portland Geospatial Open Data Portal (COP_OpenData) | https://gis-pdx.opendata.arcgis.com/ | CSV, GeoJSON, Shapefile, KML, GeoTIFF, REST/WMS/WFS | Varies by layer, portal itself continuously maintained | Varies (parcel to citywide) | ArcGIS Open Data terms, generally public domain / attribution | Yes — Esri GeoServices REST, WMS, WFS | HIGH | Varies (parcel ID, segment ID, address) |
| COP_OpenData MapServer (underlying service for portal layers) | https://www.portlandmaps.com/arcgis/rest/services/Public/COP_OpenData/MapServer | Esri MapServer/REST | Same as above | Varies | PortlandMaps terms | Yes | HIGH | Varies |
| Curb Ramps dataset (ADA compliance, ownership, detectable warning device) | https://gis-pdx.opendata.arcgis.com/datasets/PDX::curb-ramps/about | CSV, GeoJSON, Shapefile, REST API | Updated as ramps are built/inspected | Point (corner/median/mid-block) | Open Data Portal terms | Yes — Esri REST | HIGH | Location ID, street segment |
| PortlandMaps (general property/infrastructure map, incl. permits, potholes, speed limits, ROW permits) | https://www.portlandmaps.com | Interactive map + underlying Esri REST layers | Continuous | Address/parcel to citywide | PortlandMaps terms of use | Yes — Esri REST | MEDIUM–HIGH | Address, parcel ID |

**Note on Vision Zero / crash join:** PBOT's Vision Zero crash reporting draws from ODOT's
statewide Crash Data System (see Section 3), so PBOT-published crash figures and ODOT's raw crash
extract should reconcile via **Crash ID** and **location (street segment / intersection ID)** —
useful as a cross-agency join key.

---

## 2. TriMet

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| TriMet Developer Resources (hub) | https://developer.trimet.org/ | HTML index | Continuously maintained | Regional (TriMet service district) | Free registration; requires an AppID token for web-service calls; TriMet's developer terms of use apply (non-commercial/attribution norms typical of transit agencies — confirm exact terms on-site) | N/A (index) | HIGH | — |
| GTFS static schedule feed | https://developer.trimet.org/GTFS.shtml (download: http://developer.trimet.org/schedule/gtfs.zip) | GTFS (zipped CSV) | Updated with each service change (multiple times/year) | Stop/route/trip level, regional | Free, standard GTFS open license per TriMet terms | No key required for static GTFS download | HIGH | `stop_id`, `route_id`, `trip_id` |
| GTFS-Realtime feeds: TripUpdate, VehiclePositions, Alerts | http://developer.trimet.org/ws/V1/TripUpdate/, http://developer.trimet.org/ws/V1/VehiclePositions, http://developer.trimet.org/ws/V1/FeedSpecAlerts/ | GTFS-RT (protobuf) | Real-time (seconds-level) | Vehicle/trip level | Requires AppID | Yes — REST, GTFS-RT spec | HIGH | `trip_id`, `vehicle_id`, `route_id` |
| TriMet Web Services (TransitTracker, trip planner APIs) | https://developer.trimet.org/ws_docs/ | XML/JSON REST API | Real-time | Stop/route level | Requires AppID | Yes | HIGH | `stop_id`, `route_id` |
| TriMet GIS / Geospatial Data (routes, stops, shapefiles/KML) | https://developer.trimet.org/gis/ (e.g., https://developer.trimet.org/gis/data/tm_route_stops.kml) | Shapefile, KML | Updated with service changes | Stop/route level, regional | Free | No (static file download) | HIGH | `stop_id`, `route_id` |
| TriMet Bus System routes/stops (mirrored via Oregon Metro RLIS Discovery) | https://rlisdiscovery.oregonmetro.gov/datasets/drcMetro::trimet-bus-system-routes ; https://rlisdiscovery.oregonmetro.gov/datasets/drcMetro::trimet-bus-system-stops/about | Shapefile, GeoJSON, REST API (Esri) | Synced with TriMet updates | Regional | Metro RLIS open data terms | Yes — Esri REST | HIGH | `stop_id`, `route_id` |
| Performance Dashboard | https://trimet.org/about/dashboard/index.htm | Interactive web dashboard | Monthly | Systemwide, mode-level (bus/rail) | Public | No (dashboard only) | MEDIUM | Month, mode |
| Ridership and Performance Statistics (audited ridership summary) | https://trimet.org/about/performance.htm ; PDF: https://trimet.org/about/pdf/trimetridership.pdf | HTML + PDF | Periodic (audited figures updated on a lag, e.g. Oct. 2025 release) | Systemwide | Public | No | LOW–MEDIUM | Fiscal year |
| Monthly Performance Reports (MPR) | e.g. https://trimet.org/about/pdf/2025/Jun%202025%20MPR.pdf | PDF | Monthly | Systemwide, by mode/line | Public | No | LOW | Month |

**Note on TriMet API access:** All real-time and structured web-service endpoints require a free
**AppID** (developer registration key). Static GTFS and GIS shapefile/KML downloads do not.

---

## 3. ODOT — Oregon Department of Transportation

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| Crash Statistics & Reports hub | https://www.oregon.gov/odot/data/pages/crash.aspx | HTML index | Continuously maintained; 10 years of crash data maintained at all times per ODOT policy | Statewide (city street, county road, state highway) | Public; Oregon self-reporting statute (ANSI D16-2017 criteria for inclusion) | N/A (index) | MEDIUM | — |
| Crash Data Viewer (CDV) | https://www.oregon.gov/odot/data/pages/crash-data-viewer.aspx | Interactive web map/query tool (in active development per ODOT) | Latest 10 years of published crash data | Statewide down to point-level crash location | Public; usage disclaimers apply (see Crash Data Disclaimers PDF: https://www.oregon.gov/odot/Data/documents/Crash_Data_Disclaimers.pdf) | Query/export tool, not a formal public REST API | MEDIUM–HIGH | Crash ID, route/milepoint |
| TDS (Transportation Data System) Crash Reports Portal | https://tvc.odot.state.or.us/tvc/ | Downloadable data extracts (formats incl. XML/DOCX/PDF per portal help docs), queryable by roadway/jurisdiction | Historical archive (multi-year) | Roadway/segment, jurisdiction-level query | Public, per ODOT crash data terms | Query/download portal, not REST API | MEDIUM | Route ID, milepoint, Crash ID |
| TransGIS (statewide transportation GIS/asset viewer, incl. 5-year crash layer) | https://gis.odot.state.or.us/transgis/ | Interactive web map; asset/STIP/crash layers; likely supports data export per layer | Crash layer: most recent 5 years; asset layers: current | Statewide, corridor/segment/point | Public | Some underlying layers may expose Esri REST endpoints (not confirmed this session) | MEDIUM–HIGH | Route ID, milepoint |
| Traffic Counting Program (ATR — Automatic Traffic Recorder stations, AADT/AWD) | https://www.oregon.gov/odot/data/pages/traffic-counting.aspx | PDF publications (Traffic Volume Tables/TVT), tabular data; public OTMS portal | Annual publication; historical AADT per station going back multiple years (10-year trend tables per station) | Point (ATR station) / statewide highway network | Public | Public consultant access via OTMS at ordot.public.ms2soft.com (limited to fully-accepted data, no login) | MEDIUM | Station ID, highway/milepoint |
| Transportation Data Portal (general ODOT data & maps hub) | https://www.oregon.gov/odot/Data/Pages/TransData-Portal.aspx | HTML index, links to sub-datasets | Continuously maintained | Statewide | Public | N/A (index) | MEDIUM | — |
| TripCheck (road/weather conditions consumer site) | https://tripcheck.com/ | Interactive map, cameras, alerts | Real-time | Statewide, camera/segment level | Public | Underlying data available via TripCheck API (see below) | HIGH (via API) | Camera ID, route/milepoint |
| TripCheck Data API | https://tripcheck.com/Pages/API ; product page: https://apiportal.odot.state.or.us/product/tripcheck-data-api | XML, JSON via REST | Real-time (incidents, cameras, DMS, RWIS weather stations, road conditions) | Statewide, point/segment (camera, sign, weather station) | Free; requires subscription key via ODOT API Developer Portal | Yes — REST API, key-based | HIGH | Camera ID, DMS ID, route/milepoint |
| Passenger Rail Program (Amtrak Cascades — Oregon portion) | https://www.oregon.gov/ODOT/RPTD/Pages/Passenger-Rail.aspx | HTML + PDF annual reports (e.g., 2025 Annual Performance Report, ridership year-end charts) | Annual reports; monthly ridership charts in PDF | Statewide corridor (Eugene–Portland segment), station-level ridership in reports | Public | No API — PDF/report only | LOW | Station name, service date |

**Note on ODOT crash/FARS cross-reference:** Oregon's fatal crashes also feed into the federal
**Fatality Analysis Reporting System (FARS)** maintained by NHTSA:
- FARS overview: https://www.nhtsa.gov/research-data/fatality-analysis-reporting-system-fars
- FARS bulk data (CSV/SAS, national, Oregon subset filterable): https://data.transportation.gov/Automobiles/Fatality-Analysis-Reporting-System-FARS-/mzrg-xkip
- FARS GIS layer (BTS/geodata, point-level fatal crash locations, annual snapshots e.g. 2022): https://geodata.bts.gov/datasets/usdot::fatality-analysis-reporting-system-fars-2022-accidents/about
- Query tool "FIRST" (Fatality and Injury Reporting System Tool), data back to 2004, raw data back to 1975.
This is federal/statewide (not Portland-specific) but valuable as a fatal-crash cross-check
against ODOT's and PBOT's local numbers, and as a national-comparison layer. Format: HIGH viz
readiness (CSV/SAS + GIS layer + query tool).

---

## 4. Multnomah County — Bridges

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| Multnomah County Bridges program (6 Willamette River bridges + 20+ smaller bridges) | https://multco.us/programs/bridges | HTML | Static/occasional updates | County-level, per-bridge | Public | No | LOW | Bridge name/ID |
| About County Bridges | https://multco.us/info/about-county-bridges | HTML | Static | Per-bridge | Public | No | LOW | Bridge name/ID |
| Bridge Lift Public API (drawbridge lift schedule/events — scheduled & actual) | Docs: https://api.multco.us/bridges/docs ; access request form: https://multco.us/it/webform/request-access-bridges-public-api | JSON REST API | Real-time / event-driven (lift events) | Per-bridge (Willamette River lift bridges: Hawthorne, Morrison, Broadway, Burnside) | Requires a free access key (request via webform) | Yes — REST, key-based | HIGH | Bridge ID/name, timestamp |
| National Bridge Inventory (NBI) — federal, Multnomah County bridges subset | https://www.fhwa.dot.gov/bridge/mtguide.cfm (via FHWA); third-party mirror https://bridgereports.com/or/multnomah/ | CSV/structured (via FHWA NBI download), HTML (BridgeReports.com mirror) | Annual (federal NBI cycle) | Per-bridge, statewide/nationwide dataset filterable to Multnomah County | Public domain (federal data) | No direct API from FHWA (bulk file download); BridgeReports.com is a scraped mirror, not authoritative | MEDIUM | NBI structure number |

**Note:** The Bridge Lift API is the standout machine-readable asset here — real-time drawbridge
event data is unusual for a county-level agency to expose and could support a "bridge lift
frequency" time-series or a live-status map tile.

---

## 5. Port of Portland — PDX Airport

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| Port of Portland — Finance & Statistics hub | https://www.portofportland.com/FinanceAndStatistics | HTML, linked PDF/XLS statistical reports | Monthly/annual statistical releases | Airport-level (PDX, plus Hillsboro & Troutdale general aviation fields) | Public | No | LOW–MEDIUM | Month/year |
| Aviation statistics (passenger, cargo, operations) | https://www2.portofportland.com/inside/aviationstatistics | HTML/PDF (e.g., "June 2022 Statistics Fiscal Year to Date" PDF) | Monthly, fiscal-year-to-date cumulative tables | Airport-level, by carrier/type in detailed tables | Public | No | LOW–MEDIUM | Month, fiscal year |
| Port of Portland — Public Records / Open Data | https://www.portofportland.com/PublicRecords/OpenData | HTML/varies | Varies | Varies | Public records request process for anything beyond posted files | Unconfirmed — no dedicated open-data API surfaced in search results | LOW | — |

**Assessment:** Port of Portland aviation data is the weakest link in this inventory for
visualization purposes — it is published almost entirely as monthly/periodic PDF or spreadsheet
statistical bulletins rather than as a queryable dataset or API. A time-series (e.g., monthly
passenger counts 2015–present) would need to be manually built by scraping/transcribing the PDF
series.

---

## 6. Portland Aerial Tram

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| Portland Aerial Tram overview (City of Portland / PBOT-operated, OHSU-funded) | https://www.portland.gov/transportation/portland-aerial-tram | HTML | Static/occasional updates | Single facility (2 stations: South Waterfront ↔ Marquam Hill) | Public | No | LOW | — |
| Ridership milestone news releases (e.g., "10 million riders") | https://www.portlandoregon.gov/transportation/article/477299 | HTML press release | Ad hoc (milestone-driven, not periodic) | Single facility | Public | No | LOW | — |

**Assessment:** No structured/downloadable ridership dataset was found for the Aerial Tram —
figures (e.g., ~9,000 weekday riders, 85% OHSU-affiliated) appear only in prose press releases and
news coverage, not as a time series. This is a records-request candidate if granular data is
needed; otherwise treat as a single annotated data point/annual estimate.

---

## 7. BIKETOWN (Portland bike share — operated by Lyft/Motivate under PBOT contract)

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| BIKETOWN System Data page | https://biketownpdx.com/system-data | Downloadable trip-history files (per PBOT's 2018 "Half a million rides" release, trip data has been published since program launch), dashboard | Historical trip data published periodically since 2018; current dashboard ongoing | Station-level and street-segment (trip start/end); station network citywide | PBOT/Lyft open data terms — check page for specific license (historically CC-style with privacy scrubbing) | No dedicated REST API for historical trips (file download); real-time via GBFS (below) | HIGH | Station ID, trip ID |
| GBFS real-time feed (station status, bike/dock availability) | https://gbfs.lyft.com/gbfs/1.1/pdx/gbfs.json | JSON, GBFS 1.1 spec | Real-time (seconds-to-minutes refresh) | Station-level, citywide | Free, standard GBFS open feed | Yes — GBFS REST | HIGH | Station ID |
| BIKETOWN / e-scooter combined Micromobility Dashboard (Ride Report, launched Dec. 2021 w/ PBOT) | https://public.ridereport.com/pdx (duplicate of PBOT Section 1 entry — cross-listed here for BIKETOWN) | Interactive dashboard, CSV export | Regular updates since Dec. 2021 | Street segment (quarterly aggregation) | Public, privacy-protected (no individual ride data) | Dashboard export | HIGH | Street segment, quarter |
| Annual BIKETOWN Snapshot reports (e.g., 2023, 2024 Snapshot) | https://www.portland.gov/transportation/bike-share/2024-biketown-snapshot | HTML/PDF summary report | Annual | Citywide, equity-zone breakdowns | Public | No | LOW–MEDIUM | Year |

**Assessment:** BIKETOWN is one of the strongest sources in this inventory — it combines a
standards-based real-time feed (GBFS), a historical trip-data download precedent, and an
interactive shared dashboard with e-scooters. Good candidate for a live "bikes available near you"
map tile plus a multi-year ridership time series.

---

## 8. Amtrak Cascades (Oregon segment — reported via ODOT)

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| ODOT Passenger Rail — Amtrak Cascades Oregon Annual Performance Reports | https://www.oregon.gov/odot/RPTD/RPTD%20Document%20Library/2025%20Passenger%20Rail%20Annual%20Report.pdf (and prior-year equivalents, e.g. 2024) | PDF | Annual | Corridor segment (Eugene–Portland), by station | Public | No | LOW | Station, service year |
| ODOT Ridership Year-End Chart and Data | https://www.oregon.gov/odot/RPTD/RPTD%20Document%20Library/2024%20Ridership%20Year%20End%20Chart%20and%20Data.pdf | PDF (chart + tabular data embedded) | Annual | Corridor/station | Public | No | LOW | Station, service year |
| WSDOT Multimodal Mobility Dashboard — Amtrak Cascades ridership & capacity utilization (covers full corridor incl. Oregon segment) | https://wsdot.wa.gov/about/data/multimodal-mobility-dashboard/dashboard/rail/utilization-ridership.htm | Interactive dashboard (Washington DOT-hosted, but covers whole Cascades corridor incl. Eugene–Portland–Seattle–Vancouver BC) | Regularly updated (monthly/quarterly cadence implied) | Corridor segment-level | Public | Dashboard, export capability likely (not confirmed) | MEDIUM–HIGH | Route segment, month |

**Assessment:** Amtrak Cascades ridership data for the Oregon portion is published only as annual
PDF reports by ODOT, but Washington State DOT's Multimodal Mobility Dashboard covers the entire
Cascades corridor (including the Eugene–Portland segment) in an interactive format — this is the
better candidate for a visualization pull if cross-state comparability is acceptable.

---

## Standouts

**Best for real-time / live maps:**
- **BIKETOWN GBFS feed** (`https://gbfs.lyft.com/gbfs/1.1/pdx/gbfs.json`) — standards-based, no key required, station-level live availability.
- **TriMet GTFS-RT** (TripUpdate, VehiclePositions, Alerts) — industry-standard real-time transit feed, key-gated but free; ideal for a live "where's my bus/train" layer.
- **ODOT TripCheck API** — real-time incidents, cameras, DMS signs, and road-weather stations statewide; strong candidate for a live "road conditions" map layer.
- **Multnomah County Bridge Lift API** — a genuinely unusual real-time civic data asset (live/scheduled drawbridge events); would make a distinctive live-status widget or event-based time series most other cities can't offer.

**Best for time-series / trend visualization:**
- **PBOT annual Bicycle Counts** (30+ year running program, one of the longest in the US) — strong multi-decade trend line, especially paired with the e-bike-share-of-riders metric now tracked since 2023.
- **PBOT/Ride Report Micromobility Dashboard** — quarterly street-segment trip aggregates for BIKETOWN + e-scooters since Dec. 2021; good for mode-share and adoption trend visuals.
- **TriMet Monthly Performance Reports / Performance Dashboard** — consistent monthly cadence on ridership, on-time performance, and cost-per-boarding; easy to build a long multi-year time series (data is in PDF form though — needs a light scraping/transcription layer).
- **ODOT ATR traffic volume stations** — decade-plus AADT trend tables per station; classic "traffic growth over time" visualization.
- **Vision Zero / High Crash Network** — combining PBOT's dashboard framing with ODOT's underlying Crash Data System gives both a city narrative layer and a raw statewide data layer for the same crashes.

**Best for cross-jurisdiction comparison:**
- **NHTSA FARS** — the only dataset in this inventory that lets Portland/Multnomah/Oregon fatal-crash rates be benchmarked against national or other-state figures on a consistent methodology.
- **Amtrak Cascades via WSDOT's Multimodal Mobility Dashboard** — enables an Oregon-vs-Washington segment comparison along one continuous rail corridor.
- **Port of Portland aviation stats** vs. other West Coast airports — possible but would require manual assembly since PDX data itself is only in PDF bulletins.

**Best for geospatial/mapping (GIS-native):**
- **Portland Geospatial Open Data Portal** (`gis-pdx.opendata.arcgis.com`) — the backbone dataset source for nearly every PBOT layer (traffic volumes, parking zones, curb ramps), all Esri REST-enabled.
- **ODOT TransGIS** — statewide asset/crash/STIP layers, complements the city-level portal for anything crossing city limits (e.g., regional commute corridors, state highways through Portland).
- **TriMet GIS / Metro RLIS** — authoritative stop/route geometries that join cleanly to GTFS `stop_id`/`route_id`, useful for any transit-accessibility overlay (e.g., "% of population within ¼ mile of frequent transit").

---

## Notes & Caveats

1. **WebFetch/curl verification was not possible this session.** Every attempted fetch — including
   a neutral control (`https://www.example.com`) via both the WebFetch tool and direct `curl`
   through the configured egress proxy — returned HTTP 403. The proxy's own diagnostic endpoint
   (`$HTTPS_PROXY/__agentproxy/status`) showed no relayed failures and the proxy itself reporting
   healthy, and its README explicitly states that a 403 at this layer indicates "the destination
   host is not allowed by your organization's egress policy for this session" and instructs not to
   retry. As a result, **no URL in this document has been live-verified by direct fetch** — all are
   sourced from web-search result titles, URLs, and snippets only. Before this inventory is used
   in production, every URL should be spot-checked by a session with working egress (or manually
   by a human).
2. **Web search budget was exhausted mid-task.** This session shares a 200-search budget across
   all concurrently running research agents; this agent's 35 queries were part of that shared pool,
   and the remaining planned confirmatory searches (e.g., PBOT street centerline GIS layer, TriMet
   API terms of use detail, ODOT SEDC program specifics, Metro RLIS portal overview, BIKETOWN
   historical CSV archive location, e-scooter parking corral data, ODOT crash-data license terms,
   Multnomah bridge API docs detail, Vision Zero CSV export mechanics, and a dedicated Port of
   Portland open-data-portal search) could not be run. The inventory above is based on the 35
   searches that did complete, which were sufficient to identify 15+ source families across all
   required agencies, but a few entries (marked "unconfirmed" or "not surfaced this session" above)
   would benefit from one more verification pass.
3. **PBOT High Crash Network as a downloadable GIS layer** — the program page was found, but no
   direct link to a matching shapefile/GeoJSON layer on the Open Data Portal was confirmed in this
   session's searches. Likely exists (PBOT publishes most spatial layers there) but needs a direct
   portal search to confirm the exact dataset name/URL.
4. **PBOT E-Scooter/BIKETOWN raw MDS (Mobility Data Specification) feed is not public** — cities
   receive raw trip-level MDS data from scooter/bike operators under permit, but only privacy-
   aggregated (street-segment, quarterly) data is exposed publicly via the Ride Report dashboard.
   Do not expect point-level or user-level trip data to be available for visualization; this is by
   design (privacy).
5. **Port of Portland lacks a modern open-data API** — aviation statistics are published as
   monthly/FY-to-date PDF and spreadsheet bulletins on `portofportland.com`, not as a structured
   dataset. A "Public Records / Open Data" page exists at
   `https://www.portofportland.com/PublicRecords/OpenData` but its contents/format were not
   confirmed this session — worth a direct visit.
6. **Portland Aerial Tram has no public dataset** — ridership figures exist only in prose/press-
   release form; would require a records request to Portland Streetcar Inc./PBOT for a true time
   series.
7. **ODOT's Crash Data Viewer (CDV) was described as "in development"** in ODOT's own materials —
   its final feature set, export formats, and public API status may still be in flux; recheck
   closer to the visualization build date.
8. **Terms of use / licensing were often described in search snippets rather than confirmed on the
   primary source page** (a consequence of the fetch restriction above). Treat license notes in
   this document as best-effort characterizations, not verified legal text — before republishing
   any dataset, the authoritative terms-of-use page for each source should be read directly.
9. **FARS/NHTSA data is federal, not Portland/Multnomah/Oregon-specific** — it is included because
   it is the only apples-to-apples fatal-crash benchmark across jurisdictions, but the primary
   local crash narrative should be built from PBOT Vision Zero + ODOT Crash Data System, not FARS
   alone (FARS only captures fatalities, not the full crash severity spectrum PBOT/ODOT track).
