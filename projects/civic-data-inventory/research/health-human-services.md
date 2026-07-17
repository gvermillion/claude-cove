# Health & Human Services Data Inventory — Portland / Multnomah County / Oregon

## Overview

Oregon's public-health governance is organized around a **state–county partnership**: the Oregon Health
Authority (OHA) sets statewide policy, runs statewide surveillance systems (vital records, communicable
disease, immunization registry, Medicaid), and publishes most epidemiological dashboards; the
**Multnomah County Health Department** is the local public health authority and delivers direct services
(restaurant/food safety inspection, communicable disease investigation, the SUN service system, aging &
disability services), often re-packaging OHA data at the county level. The **City of Portland** has no
independent health department — health and human-services data touching the city is delivered through
Multnomah County or joint city-county bodies (e.g., the Joint Office of Homeless Services, SUN Community
Schools' partnership with Portland Parks & Recreation). Oregon DHS (ODHS) runs SNAP/TANF and Aging &
Disability Services at the state level, with county-level breakouts.

This inventory documents **31 distinct public sources** across state, county, and cross-jurisdictional
(federal/nonprofit) levels. Health data in this domain is frequently **suppressed at small geographies**
(county/tract/ZIP-level counts below a threshold are masked in official tables) — see Notes & Caveats.

**Verification note:** Live URL re-fetching (WebFetch) was blocked for this entire research session by the
sandbox's outbound egress policy (every attempted fetch — including to unrelated control domains like
example.com — returned a proxy-level 403). All URLs below were instead confirmed through independent web
search result snippets (title + URL + description returned directly by the indexing service), which is a
weaker guarantee than a live fetch. Treat URLs as "search-confirmed, not live-fetch-confirmed" and spot
check before building automated pipelines against them. See Notes & Caveats for the full list of anything
that looked uncertain.

---

## State of Oregon — Oregon Health Authority (OHA)

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| Vital Statistics birth/death dashboards — OHA Center for Health Statistics | https://www.oregon.gov/oha/ph/birthdeathcertificates/vitalstatistics/pages/index.aspx | Interactive dashboard (Tableau-style), data tables | Annual; dashboard covers 2010–2024, final data published fall of year+1 | Statewide + county | Public; small-number suppression applied | No public API found (dashboard export only) | MEDIUM | County FIPS |
| Oregon Vital Statistics Annual Report archive (Vol. 1 births/abortions/teen pregnancy, Vol. 2 deaths/perinatal deaths) — OHA | https://www.oregon.gov/oha/ph/birthdeathcertificates/vitalstatistics/annualreports/pages/index.aspx | PDF | Discontinued after 2017; archive covers 1995–2017 | Statewide + county | Public, PDF-locked | No | LOW | County FIPS |
| County Data Book (vital statistics by county) — OHA | https://www.oregon.gov/oha/PH/BirthDeathCertificates/VitalStatistics/Pages/data-maps.aspx | PDF / data tables | Annual compilation, 1993–2014 (discontinued) | County | Public | No | LOW | County FIPS |
| Opioid Overdose Updates Dashboard (prescribing & overdose data) — OHA Injury & Violence Prevention Program | https://www.oregon.gov/oha/ph/preventionwellness/substanceuse/opioids/pages/data.aspx and interactive dashboard at https://oregoninjurydata.shinyapps.io/overdose/ | Shiny interactive dashboard, downloadable tables | Monthly preliminary updates; dashboard refreshed quarterly; final data lags up to ~1 year | Statewide + county + demographic breakouts | Public | No formal API (Shiny app) | MEDIUM–HIGH | County FIPS |
| Annual Opioid Overdose Report (PDF, e.g. "2025 Oregon Opioid Overdose Report") — OHA | https://www.oregon.gov/oha/PH/PREVENTIONWELLNESS/SUBSTANCEUSE/OPIOIDS/SiteAssets/Pages/publications/2025%20Oregon%20Opioid%20Overdose%20Report.pdf | PDF | Annual | Statewide + county | Public, PDF-locked | No | LOW | County FIPS |
| Behavioral Health Reports and Data hub (incl. PDMP dashboard, Behavioral Health Housing & Licensed Capacity dashboard, Children's System of Care dashboard) — OHA Behavioral Health Division | https://www.oregon.gov/OHA/HSD/AMH/Pages/Data.aspx | Mixed: interactive dashboards + PDF | Varies by sub-dashboard; PDMP is state/county level prescribing data | Statewide + county | Public | No | MEDIUM | County FIPS |
| Hospital Reporting Program / Hospital Payment Report (from APAC) — OHA Office of Health Analytics | https://www.oregon.gov/oha/HPA/ANALYTICS/Pages/Hospital-Reporting.aspx (dashboard: https://visual-data.dhsoha.state.or.us/t/OHA/views/OregonHospitalPaymentReport2021/Home) | Tableau public dashboard | Annual | Facility (58 hospitals) | Public | No | MEDIUM | Facility ID |
| All Payer All Claims (APAC) database — OHA Office of Health Analytics | https://www.oregon.gov/oha/hpa/analytics/pages/all-payer-all-claims.aspx | Restricted microdata (data-use-agreement required); public dashboards derived from it | Data from CY2011 onward; a full calendar year becomes available ~13 months after year-end | Statewide, county, facility (in derived dashboards); raw APAC is record-level | Restricted — requires formal data request/DUA for microdata; public dashboards free | No public API; data request process for extracts | LOW (raw) / MEDIUM (published dashboards) | County FIPS, facility ID |
| Hospital and Emergency Department Discharge Data Dashboard — OHA Office of Health Analytics | https://www.oregon.gov/oha/hpa/analytics/pages/discharge-data-dashboard.aspx | Interactive dashboard | Annual, derived from APAC | Statewide + county | Public (dashboard); restricted (record-level) | No | MEDIUM | County FIPS |
| OHP (Medicaid) Enrollment Report — OHA Office of Health Analytics | https://www.oregon.gov/oha/hpa/analytics/pages/medicaid-enrollment.aspx | Interactive dashboard (Power BI) | Monthly (updated ~10th of month), trailing ~5 years | Statewide + county + eligibility group | Public | No | HIGH | County FIPS, CCO ID |
| OHP Demographic Report — OHA Office of Health Analytics | https://www.oregon.gov/oha/hpa/analytics/pages/medicaid-demographics.aspx | Interactive dashboard (Power BI) | Monthly | Statewide + county + demographic breakouts | Public | No | HIGH | County FIPS |
| Health Analytics Data Profiles (metadata catalog describing APAC, MMIS/Medicaid, Hospital Discharge, and other OHA data sources) — OHA | https://www.oregon.gov/oha/hpa/analytics/pages/data.aspx | PDF data-profile sheets | Updated periodically (individual profiles dated, e.g. March 2026 for MMIS) | Varies by source | Public | No | LOW (meta-documentation only) | N/A |
| ALERT Immunization Information System (IIS) — OHA | https://www.oregon.gov/oha/ph/preventionwellness/vaccinesimmunization/alert/pages/index.aspx | Registry (provider/school access); aggregate public reports | Continuous registry; ~89% of all-ages providers, 95% of childhood providers report in | Individual-level registry (not public); public aggregate reports by county/school | Restricted (registry is not public microdata); aggregate reports public | Provider-facing API/HL7 interface (not public open-data API) | LOW (public aggregate only) | County FIPS, school ID |
| Oregon School Immunization Rates dashboard — OHA | https://www.oregon.gov/oha/PH/PREVENTIONWELLNESS/VACCINESIMMUNIZATION/SCHOOL/Pages/ImmunizationRates.aspx (Tableau: https://public.tableau.com/app/profile/oregon.immunization.program/viz/SchoolLawTableau/Kimmunizations) | Tableau public dashboard | Biannual (reported twice/year); published for sites with ≥10 enrolled children | School / child-care facility, aggregated to county | Public; small-site (<10 children) suppressed | No | MEDIUM–HIGH | County FIPS, school ID |
| Oregon EPHT (Environmental Public Health Tracking) Data Explorer — OHA, part of CDC National Tracking Network | https://www.oregon.gov/oha/ph/healthyenvironments/trackingassessment/environmentalpublichealthtracking/pages/data-explorer.aspx | Interactive maps/graphs/download portal | Varies by indicator (air quality, asthma, extreme heat, lead, etc.); many indicators updated annually | Statewide, county, and some tract-level indicators | Public | No formal API found; data explorer download | MEDIUM–HIGH | County FIPS, census tract |
| Oregon Communicable Disease Surveillance Data (incl. RSV, respiratory illness, reportable disease summaries) — OHA Public Health Division | https://www.oregon.gov/oha/ph/diseasesconditions/communicabledisease/diseasesurveillancedata/pages/index.aspx | Mixed: dashboards, PDF weekly/seasonal reports | Weekly during active seasons (e.g., respiratory illness season); annual reportable-disease summaries | Statewide + county | Public | No | MEDIUM | County FIPS |
| Oregon Capacity System (OCS) — real-time hospital bed/ventilator capacity (successor to HOSCAP, retired 3/31/2023) — OHA | https://www.oregon.gov/oha/ph/preparedness/partners/healthalertnetwork/pages/updates.aspx (historical COVID capacity Tableau: https://public.tableau.com/app/profile/oregon.health.authority.covid.19/viz/OregonCOVID-19HospitalCapacity/BedAvailabilitybyRegion) | Near-real-time system feed (EMR-integrated); public dashboard historically published during COVID emergency | Refreshed every 5 minutes internally; public-facing dashboard cadence varies / largely wound down post-emergency | Facility, region | Restricted internal system; historical public dashboard | No public API | LOW (current public access unclear / likely discontinued) | Facility ID, region |
| Oregon's Open Data Portal — OHA datasets | https://data.oregon.gov/ (OHA agency page: https://data.oregon.gov/dataset/Oregon-Health-Authority/sexj-7ddf) | CSV, JSON, Socrata API | Varies by dataset | Varies (statewide to county) | Public (Socrata open-data license) | Yes — Socrata Open Data API (SODA) | HIGH | Varies |

## State of Oregon — Oregon Department of Human Services (ODHS)

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| ODHS Data and Research hub | https://www.oregon.gov/odhs/data/pages/default.aspx | Mixed: PDF reports, dashboards, data tables | Varies by program | Statewide + county | Public | No general API found | MEDIUM | County FIPS |
| DHS County Quick Facts (SNAP/TANF/child welfare/aging snapshot by county) | https://www.oregon.gov/odhs/data/agencydata/odhs-county-quick-facts-2016.pdf (most recent edition found dated 2016; a 2013 edition also indexed — currency should be re-verified) | PDF | Irregular; most recent located edition is 2016 | County | Public, PDF-locked | No | LOW | County FIPS |
| SNAP / TANF Caseload Forecasts (ODHS/OHA Office of Forecasting, Research & Analysis) | https://www.oregon.gov/odhs/data/ofra/2024-03-statewide-forecast.pdf | PDF | Published each forecast cycle (~quarterly/biennial) | Statewide (biennial totals); some county detail in related reports | Public, PDF-locked | No | LOW | County FIPS |
| Self-Sufficiency Programs Data (SNAP, TANF/Oregon Works Program, OSIP, ERDC) | https://www.oregon.gov/dhs/assistance/CASH/Pages/data-reports.aspx | PDF / data tables | Varies | Statewide + some county detail | Public | No | LOW–MEDIUM | County FIPS |
| ODHS Aging and Disability Services program & data pages | https://www.oregon.gov/odhs/aging-disability-services/pages/default.aspx | Mixed: PDF, program pages | Varies | Statewide + county (via local Area Agencies on Aging / ADRC) | Public | No | LOW–MEDIUM | County FIPS |
| Statewide Aging & Disability Resource Connection (ADRC) directory | https://www.oregon.gov/odhs/providers-partners/community-services-supports/pages/adrc.aspx | Directory / referral database, not open data | Continuous | Statewide, localized by AAA region | Public (service directory, not a dataset per se) | No | LOW (not a data source, a service locator) | County FIPS |

## Multnomah County Health Department & County Human Services

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| Health Data & Reports hub — Multnomah County Health Department | https://www.multco.us/health/about-health-department/data-reports | Mixed: links to dashboards, PDFs, county-specific overdose/health data pages | Varies by linked resource | County | Public | No | MEDIUM (entry point, not itself structured data) | N/A |
| Community Health Assessment / Community Health Needs Assessment (CHNA) — Multnomah County + Healthy Columbia Willamette Collaborative (4 local public health agencies, 15 hospitals, 2 CCOs) | https://multco.us/file/multnomah_county_community_health_assessment/download (2022 regional CHNA hosted on OHA site: https://www.oregon.gov/oha/HPA/ANALYTICS/HospitalDocuments/2022%20CHNA%20Healthy%20Columbia%20Willamette%20Collaborative%20(HCWC)%20Adventist%20Health%20Portland.pdf) | PDF | Every ~3 years (regulatory CHNA cycle); most recent located edition 2022 (prior: 2016, 2019) | County / regional (4-county Portland metro) | Public, PDF-locked | No | LOW | County FIPS |
| Multnomah County Open Data (ArcGIS Hub) | https://gis-multco.opendata.arcgis.com/ | CSV, KML, Shapefile, GeoJSON, GeoTIFF, PNG | Varies by layer | Mostly county / sub-county (address, parcel, facility points) | Public (open data license per ArcGIS Hub terms) | Yes — Esri GeoServices REST, WMS, WFS | HIGH | Address, parcel ID, facility ID |
| Restaurant / Food, Pool & Lodging Inspection Scores — Multnomah County Environmental Health (statewide portal via OHA) | https://multco.us/services/look-current-restaurant-scores and https://inspections.myhealthdepartment.com/multco-eh (statewide OHA portal: https://www.oregon.gov/oha/erd/pages/newwebportalfeaturesfoodpoollodginginspectionreports.aspx) | Searchable HTML database; underlying MyHealthDepartment platform | Continuous — each licensed facility inspected ~2x/year; searchable window ~1 year of history | Facility (point-level), county | Public | No public bulk API observed (HTML search interface only) | MEDIUM (scrape-able, not bulk-downloadable) | Facility ID, address |
| Multnomah County Overdose Dashboard + Fentanyl Deaths Map | https://multco.us/info/fentanyl-state-emergency (dashboard referenced via county fentanyl emergency pages) | Interactive map/dashboard | Updated as part of ongoing fentanyl emergency response; underlying mortality data lags for finalization | County, sub-county (neighborhood-level hotspots e.g. Old Town/Pearl District cited) | Public | No | MEDIUM–HIGH | County FIPS |
| Death Data page (Multnomah County) | https://multco.us/info/death-data | Data tables / linked reports | Varies | County | Public; small-number suppression likely applied | No | LOW–MEDIUM | County FIPS |
| Fentanyl / Overdose Mortality Report (2018–2023) — Multnomah County Health Department | https://multco.us/news/multnomah-county-releases-fentanyl-overdose-mortality-report | PDF report | One-time/periodic report | County | Public, PDF-locked | No | LOW | County FIPS |
| Communicable Disease Services report + Clinician Alerts — Multnomah County Health Officer | https://multco.us/health/news/new-report-communicable-disease-services-0 and https://www.multco.us/health-officer/clinician-alerts | PDF report + HTML alert postings | Periodic report; alerts issued as-needed | County | Public | No | LOW | County FIPS |
| SUN Service System / SUN Community Schools — Multnomah County (in partnership with Portland Parks & Recreation and 6 school districts) | https://multco.us/programs/sun-service-system and https://multco.us/programs/sun-community-schools | Internal case-management database (not public bulk data); public reporting via county reports; Equity Index used to rank school vulnerability (poverty/racial disparity quartiles) | Ongoing program; 94 schools across 6 districts as of latest count | School site, county | Internal database not public; program-level public reporting only | No | LOW (public aggregate reporting only; underlying data is internal) | School ID, district |
| Domestic Violence Unit Monthly Report & Data Dashboards — Multnomah County District Attorney | https://www.multco.us/dcj/domestic-violence-unit-monthly-report and https://www.mcda.us/index.php/data-dashboards | PDF monthly report; DA "data dashboards" page (format unconfirmed — likely Tableau/embedded) | Monthly | County | Public | No | LOW–MEDIUM | County FIPS |
| Domestic Violence Fact Sheet — Multnomah County | https://multco.us/file/special_brief:_domestic_violence_in_multnomah_county/download | PDF | Periodic | County | Public, PDF-locked | No | LOW | County FIPS |
| Aging, Disability & Veterans Services Division (ADVSD) / ADRC Helpline — Multnomah County | https://multco.us/departments/aging-disability-veterans-services and https://multco.us/info/aging-and-disability-resource-connection-helpline | Program/service pages; not a bulk dataset | Continuous | County (6 branch offices) | Public (service directory) | No | LOW (not a dataset) | County FIPS |
| Regional Climate & Health Dashboard — Multnomah, Clackamas, and Washington Counties (joint) | https://multco.us/news/news-release-multnomah-clackamas-and-washington-counties-release-new-regional-climate-and | Interactive dashboard | Tracks 11 indicators (ED visits for extreme weather, respiratory illness/allergy ED visits tied to air quality, vector-borne illness counts, warm-weather communicable disease rates) | 3-county Portland metro region | Public | No | MEDIUM–HIGH | County FIPS |
| Diversity & Equity Data page — Multnomah County | https://www.multco.us/diversity-equity/data | Mixed indicators/reports, cross-cutting with health equity | Varies | County | Public | No | LOW–MEDIUM | County FIPS |

## City of Portland

Portland does not operate its own health department; public-health authority sits with Multnomah County
and OHA. City-level touchpoints for this domain are limited to joint programs and city-operated services
adjacent to human services:

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| SUN Community Schools — Portland Parks & Recreation (co-operator with Multnomah County) | https://www.portland.gov/parks/recreation/sun | Program pages; same underlying data as county SUN system | Ongoing | School site (within city limits) | Public program info; underlying data internal | No | LOW | School ID |
| Regional Climate & Health Dashboard — joint with City-adjacent county programs (see Multnomah entry above); Portland's Bureau of Planning & Sustainability / Bureau of Environmental Services contribute environmental-hazard layers that feed county/OHA EPHT-style indicators | See Multnomah "Regional Climate & Health Dashboard" above | Interactive dashboard | Same as above | City neighborhoods within 3-county region | Public | No | MEDIUM | Neighborhood, county FIPS |

*(Note: Joint Office of Homeless Services (JOHS) — the city-county body covering homelessness/houselessness
data — is more properly a "housing/homelessness" domain topic; flagging here for cross-reference but not
inventoried in depth since it falls outside this section's assigned scope.)*

## Cross-Jurisdiction / Federal & Third-Party Aggregators

| Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|
| CDC PLACES: Local Data for Better Health — CDC | Portal: https://places.cdc.gov/ ; County dataset: https://data.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-County-Data-20/swc5-untb ; Place dataset: https://data.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-Place-Data-202/eav7-hnsx ; Census Tract dataset: https://data.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-Census-Tract-D/cwsq-ngmh | CSV, Socrata API, GIS-friendly format | Annual releases (2025 release cited); model-based estimates from BRFSS 2022/2023 + ACS 2018–2023 | County, place (incl. Portland city), census tract, and ZCTA — all 4 levels nationwide | Public domain (CDC/US government data) | Yes — Socrata Open Data API (SODA) on data.cdc.gov | HIGH | County FIPS, Place FIPS, census tract GEOID, ZCTA |
| County Health Rankings & Roadmaps — Robert Wood Johnson Foundation / Univ. of Wisconsin Population Health Institute | https://www.countyhealthrankings.org/health-data/oregon/multnomah | CSV downloads, interactive site | Annual | County (national, ranked within state) | Public; cite RWJF/UWPHI per their terms | Downloadable CSV, no live API observed | HIGH | County FIPS |
| Big Cities Health Coalition / Big Cities Health Inventory — Portland (Multnomah County) member profile | https://www.bigcitieshealth.org/healthy-city-members-portland-multnomah-county/ | Interactive data platform, 120+ metrics | Varies by metric; multi-year trends | Big-city / county (comparative across ~35 major US cities) | Public (BCHC data use terms) | Data platform export (bulk API not confirmed) | MEDIUM–HIGH | City/county name (no standard FIPS join documented) |
| SAMHSA Behavioral Health Barometer: Oregon | https://www.samhsa.gov/data/report/oregon-or (PDF: https://www.samhsa.gov/data/sites/default/files/Oregon_BHBarometer_Volume_4.pdf) | PDF | Periodic volumes | Statewide (NSDUH-derived state estimates) | Public, PDF-locked | No | LOW | State FIPS |
| APCD Council — Oregon APAC state profile | https://www.apcdcouncil.org/state/oregon | Reference page describing Oregon's APAC program | Static reference | Statewide | Public | No | LOW (reference, not data) | N/A |

---

## Standouts

- **CDC PLACES** is the strongest candidate for city/county/tract cross-jurisdiction mapping in this whole
  domain: it is the only source here delivering model-based health-outcome and risk-behavior estimates
  simultaneously at **county, place (Portland city proper), census tract, and ZCTA** levels, in a
  Socrata-API-accessible, annually refreshed CSV. It directly enables choropleth maps at multiple zoom
  levels and Portland-vs-other-big-cities comparisons via Big Cities Health Coalition cross-referencing.
- **OHP (Medicaid) Enrollment & Demographic Report dashboards** (Power BI, monthly, 5-year trailing window,
  county + eligibility-group breakouts) are the best time-series candidate for a recurring "safety net
  enrollment" chart — high update frequency and clean county granularity make this near-turnkey for
  visualization without scraping.
- **Opioid Overdose Updates Dashboard** (state, Shiny app, monthly preliminary + quarterly refresh,
  county-level) paired with the **Multnomah County Overdose Dashboard / Fentanyl Deaths Map**
  (sub-county neighborhood hotspots) together support a strong drill-down narrative: statewide trend →
  county trend → neighborhood hotspot map. This is likely the single most newsworthy/compelling
  time-series + map combination in the domain given the ongoing fentanyl crisis framing in Multnomah
  County's own communications.
- **Oregon's Open Data Portal (data.oregon.gov)** and **Multnomah County's ArcGIS Open Data Hub** are the
  only two sources in this domain offering genuine bulk APIs (Socrata SODA and Esri GeoServices/WMS/WFS,
  respectively) — prioritize pulling any OHA/county dataset through these portals over scraping HTML pages
  when a dataset appears in both places.
- **County Health Rankings & Roadmaps** offers the cleanest single-file annual CSV for county-level
  comparison across all of Oregon's 36 counties simultaneously — useful as a fast baseline layer beneath
  more granular Multnomah-specific dashboards.
- Conversely, **restaurant/food/pool/lodging inspections**, **SUN Service System** case data, and **school
  immunization site-level data** are all locked behind HTML search interfaces or internal case-management
  systems with no bulk export — these would require scraping (restaurant inspections, MyHealthDepartment
  platform) or a records request (SUN, ALERT IIS microdata) to visualize below the aggregate level.

---

## Notes & Caveats

- **WebFetch verification blocked for this entire session.** Every attempted live URL fetch — including
  to a neutral control domain (example.com) — was rejected with an HTTP 403 at the sandbox's outbound
  proxy layer (`gateway answered 403 to CONNECT (policy denial or upstream failure)`), confirmed via the
  proxy status endpoint. This is a session-wide egress policy restriction, not a per-site block by any of
  the government domains themselves. As a result, **no URL in this document was confirmed via direct
  fetch** — all were confirmed only via web-search snippets (which include title, URL, and a short
  description pulled from a live index). Before wiring any of these URLs into a production pipeline,
  do a manual browser check or a fresh WebFetch pass in an unrestricted session.
- **Web search budget exhausted mid-research.** This session hit a 200-search cap (shared across
  concurrent research happening in the broader session) after 20 of my own queries. I was unable to run
  a handful of planned follow-up searches (e.g., dedicated queries for the PDMP dashboard URL, the
  Children's System of Care dashboard URL, and County Health Rankings/Big Cities Health methodology
  detail) — those sources are still documented above from information surfaced incidentally in earlier
  searches, but their entries may be less precise than others.
- **Small-number suppression is real but thresholds were not independently confirmed.** Multiple OHA and
  Multnomah County sources (vital statistics, death data, overdose/fentanyl mortality, school immunization
  rates) explicitly mention suppressing small counts — e.g., school immunization rates are only published
  for sites with **10 or more enrolled children**. Exact suppression thresholds for vital statistics and
  overdose county/tract tables were referenced generically ("small-number suppression applied") in search
  results but a specific numeric threshold (e.g., "<10" vs "<5") was not confirmed for every dashboard;
  check each dashboard's own methodology footnote before publishing small-geography counts.
- **DHS County Quick Facts PDF appears stale.** The most recent edition surfaced was dated 2016 (an older
  2013 edition also indexed); it's possible a newer edition exists that simply didn't surface in search —
  worth a direct check of `oregon.gov/odhs/data` before citing county-level SNAP/TANF/child-welfare
  snapshots from that specific document.
- **Oregon Capacity System (OCS) public-facing status is unclear.** OCS replaced HOSCAP as Oregon's
  real-time hospital bed/ventilator tracking system on 3/31/2023, but it was described in search results
  as an internal EMR-fed system for participating organizations; the public Tableau dashboard found
  (`OregonCOVID-19HospitalCapacity`) appears to be a legacy COVID-era artifact rather than a live feed of
  OCS data. Confirm whether any current public-facing hospital-capacity view still exists.
- **Multnomah DA "data dashboards" page format was not confirmed** (https://www.mcda.us/index.php/data-dashboards)
  — search results describe it as part of a data/tech-driven criminal-justice reform effort with a note
  that "viewers should use a desktop or laptop computer for the best viewing experience," implying an
  embedded interactive dashboard (likely Tableau or Power BI), but the exact tool was not identified.
- **Joint Office of Homeless Services (JOHS)** and other housing/homelessness-adjacent human-services data
  were noted in passing (SUN Community Schools, ADRC) but intentionally not inventoried in depth — that
  material more properly belongs to a housing/homelessness-focused inventory section, not this
  health-human-services section.
- **APAC (All Payer All Claims) record-level microdata is restricted** (formal data-use-agreement /
  request process required) even though several public dashboards are derived from it — the raw claims
  database itself is not an open dataset and should not be listed as such in downstream materials.
