# Demographics — Civic Data Inventory (Portland / Multnomah County / Oregon)

## Overview

This section inventories publicly available demographic data sources covering the City of
Portland, Multnomah County, and the State of Oregon. Demographics is the **join backbone**
for the whole civic-data-inventory project: nearly every other domain (housing, transportation,
health, public safety, economy) ultimately normalizes to a Census geography (state/county/place/
tract/block group/block FIPS code) or to a Public Use Microdata Area (PUMA). This file documents
25 sources across four tiers — federal (Census Bureau + IPUMS + LEHD + IRS), state (Oregon), regional
(Metro), and city/county — with format, update cadence, granularity, licensing, API availability,
visualization readiness, and join keys for each.

**Research method note:** 12 web searches were completed across Census Bureau products, PSU PRC,
OED QualityInfo, OEA, Metro, IPUMS, LEHD/LODES, IRS SOI, and city/county dashboards before the
session's web-search budget was exhausted (200/200, apparently a shared budget across parallel
research agents working this same project). Subsequent attempts to verify URLs directly via
WebFetch/curl were blocked at the network layer — see **Notes & Caveats** for details. URLs below
that were not directly confirmed in this session are drawn from the search snippets obtained and
from well-established, stable federal/state URL patterns; a handful of city/county dashboard URLs
are flagged explicitly as unconfirmed and need a manual follow-up pass.

---

## Federal — U.S. Census Bureau (core statistical products)

| # | Name & Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License | API | Viz Readiness |
|---|---|---|---|---|---|---|---|---|
| 1 | **Decennial Census** (2020 Redistricting P.L. 94-171, Demographic & Housing Characteristics/DHC, Demographic Profile) — U.S. Census Bureau | https://www.census.gov/programs-surveys/decennial-census.html | CSV, API, data.census.gov tables, PDF summaries | Every 10 years; 2020 is current, next is 2030. Redistricting file released Aug 2021, DHC May 2023. Historical depth back to 1790 (varies by table) | State, county, place (city), tract, block group, **block** (finest available; only decennial goes to block level) | Public domain, no restriction | Yes — Census Data API (decennial endpoints) | HIGH |
| 2 | **American Community Survey (ACS) 1-Year Estimates** — U.S. Census Bureau | https://www.census.gov/programs-surveys/acs | CSV, API, data.census.gov | Annual, released ~September. Only available for geographies with population ≥65,000 — **State of Oregon, Multnomah County, and City of Portland all qualify**; smaller cities/tracts do not. Data back to 2005 (with gaps) | State, county, place (65k+ pop only), metro area, PUMA | Public domain | Yes — Census Data API | HIGH |
| 3 | **American Community Survey 5-Year Estimates** — U.S. Census Bureau | https://www.census.gov/programs-surveys/acs | CSV, API, data.census.gov | Annual (rolling 5-yr window), released ~December. Current vintage is 2020–2024 (released Dec 2025). Available since 2005–2009 vintage | **All geographies down to tract and block group**, including small cities and neighborhoods | Public domain | Yes — Census Data API | HIGH |
| 4 | **ACS Public Use Microdata Sample (PUMS)** — U.S. Census Bureau | https://www.census.gov/programs-surveys/acs/microdata.html | CSV, SAS, API (microdata endpoint) | Annual (1-yr and 5-yr PUMS releases alongside table estimates) | State and **PUMA** only (no tract/county identifiers in public files, for confidentiality) | Public domain | Yes | MEDIUM (raw microdata needs tabulation/weighting work before viz) |
| 5 | **Census Data API** (unified access point for decennial, ACS, PEP, and more) — U.S. Census Bureau | https://api.census.gov/data.html and https://www.census.gov/data/developers.html | JSON via REST API | Continuously maintained; new dataset endpoints added as products release | Varies by dataset (see rows above) | Public domain; requires free API key for >500 calls/day | Yes — this **is** the API | HIGH |
| 6 | **Population Estimates Program (PEP) — Vintage Annual Estimates** — U.S. Census Bureau | https://www.census.gov/programs-surveys/popest.html | CSV, API | Annual (July 1 reference date), released in following spring. Historical vintages back to 1900s at state level, 1970s+ at county/place | State, county, **place (city)**, metro area | Public domain | Yes — Census Data API (`/pep/` endpoints) | HIGH — this is the federal counterpart to (and sometimes diverges from) PSU's official Oregon estimates |
| 7 | **TIGER/Line Shapefiles** — U.S. Census Bureau Geography Division | https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html | Shapefile (.shp), Geodatabase | Annual vintage releases; historical vintages archived back to 2007+ | State, county, place, county subdivision, tract, block group, **block**, PUMA, ZCTA, congressional/legislative districts | Public domain | No direct API for downloads, but **TIGERweb REST map service** exists (https://tigerweb.geo.census.gov) | HIGH for GIS use — exact boundaries include water features, needs generalization for small-scale maps |
| 8 | **Cartographic Boundary Files** — U.S. Census Bureau Geography Division | https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html | Shapefile, KML, GeoJSON (via third-party mirrors) | Annual, generalized to match ACS/Decennial vintage | Same levels as TIGER/Line but simplified (multiple resolutions: 1:500k, 1:5m, 1:20m) | Public domain | No | HIGH — purpose-built for thematic mapping/dashboards (smaller file size than TIGER/Line) |
| 9 | **Census Geocoder / TIGERweb REST Services** — U.S. Census Bureau | https://geocoding.geo.census.gov/geocoder/ ; https://tigerweb.geo.census.gov | REST API (JSON/XML), batch CSV upload | Continuously updated alongside TIGER | Address-level geocoding to block/tract/place/county | Public domain | Yes — free REST API, no key required, batch limit 10,000 addresses | HIGH — critical join tool: converts any Portland/Multnomah address to GEOID |

---

## Federal — Third-Party Access Tools & Related Federal Data

| # | Name & Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License | API | Viz Readiness |
|---|---|---|---|---|---|---|---|---|
| 10 | **Census Reporter** (nonprofit/independent project built on ACS data) | https://censusreporter.org — Portland profile: https://censusreporter.org/profiles/16000US4159000-portland-or/ | HTML profile pages, downloadable CSV/JSON per table, embeddable charts | Refreshed each ACS release cycle | Tract through nation (mirrors ACS availability) | Open source (site code on GitHub); underlying data is public domain Census data | Yes — has its own JSON API layer on top of Census API | HIGH — purpose-built for fast profile lookups and journalist/public use; good for prototyping before building custom viz |
| 11 | **IPUMS USA** — Minnesota Population Center, University of Minnesota (federal data, academic steward) | https://usa.ipums.org/usa/ | Fixed-width/CSV extracts via extract-builder tool, SPSS/SAS/Stata syntax files | Continuously maintained; harmonizes decennial 1790–2020 and ACS 2000–present into consistent variable coding across years | State and **PUMA** (same constraint as raw PUMS, but IPUMS adds harmonized variables and consistent PUMA boundary crosswalks across census vintages) | Free, but **requires user registration** and citation in any publication; no redistribution of extracts | Data extract API available for registered users (ipumsr R package, Python api) | MEDIUM — best tool for **longitudinal/historical microdata comparisons**, but requires registration + extract wait time, not live-queryable like the raw API |
| 12 | **LEHD Origin-Destination Employment Statistics (LODES) / OnTheMap** — U.S. Census Bureau Center for Economic Studies | https://onthemap.ces.census.gov/ (interactive tool); https://lehd.ces.census.gov/data/ (raw files) | Interactive web app (map/reports), raw CSV downloads by state | Annual, data available for most states 2002–2023 (2+ year lag typical for latest vintage) | **Census block** level (finest commuting-flow data available anywhere), aggregable to tract/place/county | Public domain | No REST API for OnTheMap itself, but raw LODES CSVs are directly downloadable/scriptable by URL pattern | HIGH for commute-flow / jobs-housing balance maps — this is the best public source for **where Portland/Multnomah residents work and where regional workers live** |
| 13 | **IRS SOI Tax Stats — Migration Data** — Internal Revenue Service, Statistics of Income Division | https://www.irs.gov/statistics/soi-tax-stats-migration-data ; Oregon-specific: https://www.irs.gov/statistics/soi-tax-stats-migration-data-oregon | CSV, XLS (annual files); pre-2011 in XLS only | Annual (filing-year pairs, e.g. 2022–2023), continuous series 1991–present at state level, 2011–present includes AGI/age breakdowns | **County-to-county** and state-to-state flows (returns filed = household proxy, exemptions claimed = individual proxy) | Public domain | No API — flat file downloads only | MEDIUM — great for net-migration flow maps (who's moving into/out of Multnomah County and from where) but requires manual file wrangling; no sub-county geography |

---

## State — Oregon

| # | Name & Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License | API | Viz Readiness |
|---|---|---|---|---|---|---|---|---|
| 14 | **PSU Population Research Center — Annual Population Estimates** (the *official* state population estimates under ORS 190.510–190.620) — Portland State University | https://www.pdx.edu/population-research/ ; reports archive: https://pdxscholar.library.pdx.edu/populationreports/ | PDF reports, Excel/CSV tables | Annual: preliminary estimates by Nov 15, **certified estimates by Dec 15**, full Annual Population Report published following spring. Continuous series back to the 1980s in the PDXScholar archive | **Every incorporated city and county in Oregon** (no tract-level breakdown — this is a city/county aggregate product) | Public, state-mandated product; free to use with attribution | No API — download-only (PDF/Excel) | MEDIUM-HIGH — authoritative and complete for city/county totals but not machine-API-accessible; someone has to scrape/re-key the tables each year |
| 15 | **PSU Population Research Center — Coordinated Population Forecasts** (long-range county-level forecasts used for land-use planning under Oregon's coordinated population forecast program) — Portland State University | https://www.pdx.edu/population-research/ (forecast program section) | PDF reports, Excel tables | Periodic, tied to each county's periodic review cycle (roughly every 6–10 years per county, e.g. Multnomah County forecast) | County-level, 20+ year horizon, sometimes sub-county allocation | Public | No | MEDIUM — important for long-range planning storylines but low update frequency and PDF-heavy |
| 16 | **Oregon Employment Department — QualityInfo** — Oregon Employment Department (OED) | https://www.qualityinfo.org/ (data hub: https://www.qualityinfo.org/data) | HTML dashboards, downloadable CSV/Excel tables, some interactive tools | Monthly (labor force/unemployment via LAUS/CES), annual (workforce diversity reports using ACS 5-yr as source) | Statewide, **workforce region, county, and some MSA-level**; demographic breakdowns (race/ethnicity, age) mostly derived from ACS so inherit ACS's tract/geography limits | Public domain (Oregon state government) | Limited — mostly download/report access, not a formal REST API | MEDIUM — good curated analysis (e.g., "Race and Ethnic Diversity in Oregon's Workforce") but is a secondary/derivative source layering commentary on BLS/ACS data rather than a raw feed |
| 17 | **Oregon Office of Economic Analysis (OEA) — Demographic Forecast** — Oregon Dept. of Administrative Services | https://www.oregon.gov/das/oea/Pages/forecastdemographic.aspx (program home: https://www.oregon.gov/das/oea/Pages/index.aspx) | PDF reports, some Excel data tables | Quarterly demographic forecast updates (Mar 1, ~May 15/Jun 1, Sep 1, Dec 1) | Statewide primarily, with county detail in supporting tables; forecasts build on PSU PRC's certified estimates as the base | Public | No | LOW-MEDIUM — narrative PDF forecast documents (population by age/sex, fertility/mortality/migration assumptions); numbers are extractable but not offered as clean bulk downloads |

---

## Regional — Metro (Portland's regional government)

| # | Name & Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License | API | Viz Readiness |
|---|---|---|---|---|---|---|---|---|
| 18 | **Metro Population and Employment Forecasts / Urban Growth Report** — Metro (Oregon regional government) | https://www.oregonmetro.gov/population-and-employment-forecasts ; latest UGR: https://www.oregonmetro.gov/sites/default/files/2025-11/2024-ugr-summary-final.pdf | PDF reports, downloadable data sets ("regional forecast allocation data sets") | Full Urban Growth Report every 6 years (legally mandated); forecast updates more frequently in between | **Metro region, county, city, and Metro-defined subareas / Traffic Analysis Zones (TAZ)** — finer than state-level products | Public (Metro is a directly-elected regional government) | No formal API; data sets are downloadable files | MEDIUM — richest sub-regional 20-year forecast detail available for the Portland metro, but distributed as reports/spreadsheets rather than an API |
| 19 | **Metro RLIS (Regional Land Information System) Discovery — GIS Open Data** — Metro | https://rlisdiscovery.oregonmetro.gov/ | Shapefile, GeoJSON, File Geodatabase, some REST map/feature services (ArcGIS Online) | Rolling updates (varies by layer) | Parcel, neighborhood, UGB, TAZ, jurisdiction boundaries — includes demographic overlay layers | Public, Metro open data terms | Yes — ArcGIS REST feature services for many layers | HIGH for GIS/mapping work — the best regional boundary source for overlaying Census geography onto local jurisdictions (UGB, Metro subareas, TAZs) |

---

## City / County Dashboards

| # | Name & Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License | API | Viz Readiness |
|---|---|---|---|---|---|---|---|---|
| 20 | **Portland.gov — Neighborhood Demographic Profiles / "My Neighborhood" Data Map Tool** — City of Portland (Bureau of Planning & Sustainability, built with PSU PRC) | https://www.portland.gov/civic/data-map-tool ; https://www.portland.gov/civic/myneighborhood/neighborhood-profile-maps | Interactive web map, downloadable profile PDFs per neighborhood | Refreshed periodically as new ACS/Census data lands (mixes 2020 Census, ACS, Feeding America, CDC SVI, life expectancy data) | **Portland's ~94 official neighborhoods** (city-specific geography, not a Census geography — requires a neighborhood-to-tract crosswalk to join) | City of Portland public data | No API found — web tool + static PDFs | MEDIUM — good public-facing visualization but neighborhood boundaries are non-standard; would need spatial join (tract/block-group centroid-in-polygon) to connect to ACS |
| 21 | **"Portland Neighborhoods: 2020 Census Profiles"** (PSU PRC-produced report for the City) — Portland State University Population Research Center | https://www.pdx.edu/population-research/sites/populationresearch.web.wdt.pdx.edu/files/2022-08/Combined%20Portland%20Report%20All%20Profiles.pdf | PDF only (combined report, all 94 neighborhoods) | One-time for 2020 Census cycle; likely to recur after 2030 Census | Neighborhood (aggregated from Census blocks/tracts) | Public | No | LOW — PDF-locked, would require manual re-extraction of tables; this is the closest match found to a "Portland in Focus"-style neighborhood demographic digest (no product by that exact name was located — see Caveats) |
| 22 | **City of Portland Population/Demographics Summary documents** — City of Portland | https://www.portland.gov/civic/documents/portland-population-demographics-summary-1/download ; https://www.portland.gov/civic/documents/city-portland-profile-2023/download | PDF | Periodic (updated as new ACS/Decennial data is released) | Citywide | Public | No | LOW — static PDF summary documents, useful for narrative/context but not for a live dashboard |
| 23 | **PortlandMaps / PortlandMaps Open Data** — City of Portland (Bureau of Technology Services / BPS) | https://www.portlandmaps.com/ ; open data: https://gis-pdx.opendata.arcgis.com/ | Interactive map, ArcGIS REST feature services, Shapefile/CSV/GeoJSON exports | Rolling | Parcel, address, neighborhood, tract/block-group overlays available as GIS layers | City of Portland open data terms | Yes — ArcGIS REST API | HIGH for GIS join work — best source for **Portland-specific administrative boundaries** (neighborhoods, zoning, council districts) to overlay on Census geography |
| 24 | **Multnomah County GIS Open Data** — Multnomah County | https://gis-multco.opendata.arcgis.com/ | Shapefile, GeoJSON, ArcGIS REST feature services | Rolling | County subdivisions, commissioner districts, service-area boundaries | Multnomah County open data terms | Yes — ArcGIS REST API | HIGH for GIS/boundary joins |
| 25 | **Multnomah County demographic/community profile reporting** (Public Health / Department of County Human Services) — Multnomah County | https://www.multco.us/ (specific community-profile/dashboard page **not confirmed this session** — see Caveats) | Likely PDF reports + possibly Tableau/Power BI embeds (unconfirmed) | Unknown — needs verification | County / district / possibly community-area level | Public (Multnomah County) | Unknown | UNCONFIRMED — flagged for follow-up; the county's GIS open data portal (row 24) is confirmed live, but a dedicated "community profiles" demographic dashboard could not be located or verified in this session |

---

## Standouts

**Best for maps:**
- **TIGER/Line + Cartographic Boundary Files (rows 7–8)** paired with **ACS 5-Year table data (row 3)** joined on GEOID is the single most reliable combination for choropleth maps at tract/block-group resolution across Portland, Multnomah County, and Oregon.
- **PortlandMaps Open Data / Metro RLIS (rows 18, 23, 24)** for anything requiring *local* administrative boundaries (neighborhoods, UGB, council/commissioner districts) that don't correspond to Census geography — these need a spatial join rather than a GEOID join.
- **LEHD LODES/OnTheMap (row 12)** for jobs-housing/commute-flow maps — uniquely granular (block-level) public commuting data.

**Best for time-series:**
- **PSU PRC Annual Population Estimates (row 14)** — the single authoritative, continuous, city+county population series for Oregon back to the 1980s; this should be the backbone series for any "population over time" chart for Portland/Multnomah/Oregon, since it's the legally official number (not the Census Bureau's PEP estimates, which sometimes diverge — PSU revised its 2024 estimates downward to align more closely with 2020 Census counts per reporting from Willamette Week).
- **ACS 1-Year Estimates (row 2)** for annual trend lines at state/county/city level (Portland and Multnomah both clear the 65,000-population threshold).
- **IRS SOI Migration Data (row 13)** for a 30+ year net-migration time series by county.

**Best for cross-jurisdiction comparison:**
- **Census QuickFacts** (e.g., https://www.census.gov/quickfacts/fact/table/portlandcityoregon,multnomahcountyoregon,US) — purpose-built side-by-side City of Portland / Multnomah County / U.S. comparison tool, HTML only but good for spot-checking numbers before building custom comparison charts.
- **Census Reporter (row 10)** profiles for fast Portland vs. Multnomah vs. Oregon vs. peer-city comparisons without writing API code.

### Geographic identifiers & join-key cheat sheet

Because demographics is the join backbone of this project, here is how each tier of geography connects:

| Geography level | Carried by | Join key |
|---|---|---|
| State | All Census products, OEA, PSU PRC | 2-digit state FIPS (Oregon = 41) |
| County | Census (ACS/Decennial/PEP), PSU PRC, OEA, IRS SOI, QualityInfo | 5-digit county FIPS (Multnomah Co. = 41051) |
| Place (incorporated city) | ACS (65k+ only for 1-yr), Decennial, PEP, PSU PRC, Census Reporter | Place FIPS (Portland = 4159000); Census Reporter uses summary-level prefix `16000US` + place FIPS |
| Census tract | ACS 5-yr, Decennial, TIGER/cartographic boundary | 11-digit tract GEOID (state+county+tract) |
| Block group | ACS 5-yr, Decennial, TIGER | 12-digit GEOID |
| Block | Decennial only, LODES/OnTheMap | 15-digit GEOID |
| PUMA | ACS PUMS, IPUMS | 7-digit PUMA code (state + PUMA); **PUMAs (~100k population each) do not nest cleanly inside city or neighborhood boundaries** — a known friction point for city-level microdata analysis |
| Non-Census local geography | Portland neighborhoods, Metro TAZs, county commissioner districts | No shared FIPS code — requires a **spatial join** (point-in-polygon or area-weighted crosswalk) against TIGER tract/block-group boundaries |

---

## Notes & Caveats

1. **Web search budget exhausted mid-task.** This session shares a 200-search budget across
   multiple parallel research agents working the broader civic-data-inventory project. 12 targeted
   searches were completed here (covering ACS, Census API, TIGER/cartographic boundary files,
   Census Reporter, PSU PRC, QualityInfo, OEA, Metro forecasts, IPUMS, LEHD/LODES, IRS SOI, and
   Portland dashboards) before the budget hit zero. Searches planned but not run: Multnomah County
   community-profile dashboards specifically, PSU coordinated-forecast methodology detail, 2030
   Census planning timeline, and Census geography relationship-file specifics. Row 25 in particular
   is flagged unconfirmed as a result.

2. **Direct URL verification (WebFetch/curl) was blocked at the network/proxy layer for this
   entire session**, not just for government domains. Every attempted WebFetch call — including to
   non-government domains like censusreporter.org and usa.ipums.org — returned HTTP 403. Checking
   the agent proxy status (`$HTTPS_PROXY/__agentproxy/status`) showed `connect_rejected` /
   "policy denial" errors for essentially all external hosts being hit by this and sibling
   sessions (census.gov, oregon.gov, pdx.edu, portland.gov, multco.us, oregonmetro.gov,
   portlandmaps.com, arcgis.com open-data subdomains, and even a control domain like example.com).
   Per the proxy's own guidance, 403 responses from the proxy represent an organizational egress
   policy denial that should be reported, not retried or routed around. **As a result, no URL in
   this document was independently fetched and confirmed live in this session** — URLs are drawn
   from WebSearch result snippets (which do include working hyperlinks returned by the search
   backend) or from stable, well-known canonical federal/state URL patterns. A follow-up pass with
   working WebFetch access is recommended before publishing this inventory externally.

3. **No source called "Portland in Focus" was located.** The task brief named this as an example
   city dashboard; searches for it turned up nothing under that exact name. The closest analogs
   identified are the City's Neighborhood Demographic Profiles / Data Map Tool (row 20) and the
   PSU-produced "Portland Neighborhoods: 2020 Census Profiles" report (row 21). If "Portland in
   Focus" is a real, differently-named product, it needs a follow-up search once budget resets.

4. **Multnomah County's demographic/community-profile dashboard (row 25) is unconfirmed.** The
   county's GIS open-data portal (row 24, gis-multco.opendata.arcgis.com) was confirmed to exist
   via reference in proxy logs from sibling research sessions, but a specific "community profiles"
   demographic dashboard/report page could not be located or verified here.

5. **PSU PRC estimates vs. Census Bureau PEP estimates can diverge**, sometimes by tens of
   thousands of people at the state level — reporting (Willamette Week, Nov 2024) noted PSU revised
   its Oregon estimates downward to move closer to 2020 Census-anchored figures. Any dashboard
   comparing "official" Oregon population over time should clearly label which series (PSU
   certified estimate vs. Census PEP vintage estimate) is being shown, since they are not
   interchangeable and can disagree.

6. **ACS 1-year availability is population-gated (65,000+).** The State of Oregon, Multnomah
   County, and the City of Portland all clear this threshold and get annual 1-year estimates, but
   smaller incorporated Oregon cities (most of them) do not — for those, only the ACS 5-year product
   is available, and 1-year vs. 5-year figures should never be casually mixed in the same trend line.

7. **IPUMS requires free registration** and citation of IPUMS in any resulting publication;
   extracts are not instantly downloadable (a processing queue applies), which matters for any
   pipeline design that assumes live/on-demand data pulls.

8. **PUMA boundaries do not align with city or neighborhood boundaries.** This is the most
   important caveat for anyone trying to build Portland-neighborhood-level analysis from
   microdata (PUMS/IPUMS) — the finest public geography in microdata is the PUMA (~100k
   population), which will typically span multiple Portland neighborhoods or, conversely, split
   a single large PUMA across neighborhood lines. Tract/block-group-level analysis must instead
   use published aggregate tables (ACS 5-year, Decennial), not microdata.
