# Governance & Legislative Data — Portland, Multnomah County, and Oregon

## Overview

This inventory covers legislative and governance records for three jurisdictions: the City of
Portland's City Council (agendas, minutes, votes, code/charter, lobbying, boards), Multnomah
County's Board of Commissioners, the Oregon Legislature (OLIS), and cross-cutting Oregon state
systems (Administrative Rules, Ethics Commission lobbying/SEI filings). Overall, this domain
skews **low-to-medium visualization readiness**: neither Portland nor Multnomah County exposes a
modern structured API for meeting records (both predate/avoid Legistar's Web API, which many
peer cities use); most legislative documents are PDF or HTML-rendered rather than tabular; and
the one genuine bulk/API layer in the entire domain is the Oregon Legislature's OData feed (plus
third-party aggregators LegiScan and Open States, which is why they are called out explicitly
below). Lobbying, SEI, and administrative-rules data exist but sit behind agency web portals with
no confirmed bulk export.

**A structural note that affects every Portland source below:** Portland's government form
changed fundamentally on January 1, 2025, per the charter reform voters approved in November 2022
(Measure 26-228). The city moved from a 5-member commission government (mayor + 4 commissioners,
each administering city bureaus) to a 12-member district council (4 geographic districts × 3
members, elected by ranked-choice voting) plus a citywide-elected mayor who does not sit on or
vote with council, with day-to-day bureau management now under an appointed City Administrator.
Pre-2025 and post-2025 "council vote" records are **not structurally comparable** — any
longitudinal visualization needs to treat January 2025 as a hard break, and the newly rich
13-body vote pattern (12 councilors + council president dynamics) only exists from that point
forward.

**Research method disclosure (important):** This session's WebSearch tool quota is shared across
a larger 12-topic multi-agent research effort for this project; it was exhausted after only 5 of
the planned queries for this specific topic. In addition, every WebFetch verification attempt (5
URLs tried) returned HTTP 403 from the organization's egress proxy — the proxy status endpoint
confirmed this is a blanket policy denial affecting essentially all external hosts this session
(it rejected `www.google.com` and `example.com` too, not just government domains), so **no URL in
this document was live-verified this session**. Sources below are marked either "confirmed via
2026 search" (appeared directly in live search-result snippets/summaries) or "unverified this
session" (drawn from trained knowledge current to ~January 2026 and known stable government URL
patterns, but not independently re-checked here). See **Notes & Caveats** for the full list and
recommended re-verification steps.

---

## 1. City of Portland — City Council

| # | Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity / Body | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Council Agenda Portal — City Council Clerk (Auditor's Office) | `https://www.portland.gov/council/agenda` (confirmed via 2026 search) | HTML | Published by 9:00am Friday before each meeting; current + near-term only | City Council (12 members + mayor) | Public, informational use; not official record of copy | None | MEDIUM | Agenda item #, meeting date |
| 2 | Past Council Agendas archive | `https://www.portland.gov/council/agenda/all` (confirmed via 2026 search) | HTML | Rolling archive; index shows 200+ historical agendas | City Council | Same as above | None | MEDIUM | Meeting date, item # |
| 3 | Efiles — City Records Database (City Auditor / City Recorder) | `https://efiles.portlandoregon.gov/Search` (confirmed via 2026 search) | HTML search UI + PDF documents; audio (MP3) attached to minutes since ~Aug 2022 | Continuously updated; resolutions from Aug 16, 2006–present; ordinances/agendas/minutes extend further back by classification code; not a bulk export, one record at a time | City Council (citywide) | "Provided for informational and convenience purposes only... not official copies" — official copies require Portland Archives & Records Center (PARC) | None (no API; classification-code browsing, e.g. 539=Council Agenda, 542=Council Resolutions, 543=Council Ordinance) | LOW–MEDIUM (searchable but document-locked, no structured export) | Ordinance/resolution number, record ID, classification code, date |
| 4 | Council Clerk — Meeting Calendar & Info | `https://www.portland.gov/auditor/council-clerk/meetings` (confirmed via 2026 search) | HTML | Regular meetings 1st/2nd/4th/5th Wed 9:30am, 3rd Wed 6:00pm; ongoing | City Council | Public | None | LOW (schedule/reference only) | Meeting date |
| 5 | Council Clerk — Find Council Meeting Records | `https://www.portland.gov/auditor/council-clerk/records` (confirmed via 2026 search) | HTML (index/how-to page) | Ongoing | City Council | Public | None | LOW | — |
| 6 | Portland City Archives / Portland Archives & Records Center (PARC) | `https://www.portland.gov/auditor/archives/city-archives` (confirmed via 2026 search) | Physical + digitized; PDF/image scans; records-request fulfillment for pre-digital material | Historical, decades deep; digitization ongoing | Citywide, all bureaus/council | Public records law applies; some items require in-person/records request | None | LOW | Record ID |
| 7 | Council video archive — Auditor's Office / Open Signal / YouTube | `https://www.portlandoregon.gov/video/player/?tab=meetings` and YouTube playlist "Portland City Council Sessions" (confirmed via 2026 search) | Streaming video; also cable (Xfinity Ch. 30/330) | Per-meeting, ongoing; historical depth varies by platform | City Council | Public viewing; standard YouTube ToS on the YouTube mirror | None (no captioned-transcript API confirmed) | LOW–MEDIUM (video only; closed-caption files exist per Efiles minutes packets but not separately exposed) | Meeting date |
| 8 | Portland City Code | `https://www.portland.gov/code` (unverified this session) | HTML, PDF chapters | Updated as ordinances amend code; current-version only online (no diff/redline API) | Citywide | Public | None | LOW–MEDIUM | Code chapter/section number |
| 9 | Portland City Charter | `https://www.portland.gov/charter` (unverified this session) | HTML, PDF | Updated per charter amendment (rare; last major rewrite effective Jan 2025) | Citywide | Public | None | LOW | Charter section |
| 10 | Portland Lobbyist Registration & Reports (Auditor's Office, per City Code lobbying-disclosure chapter) | `https://www.portland.gov/auditor/lobbying` (unverified this session — WebFetch blocked; page existence inferred from Auditor site structure) | Likely PDF/HTML list of registered lobbyists and periodic activity reports | Registration ongoing; reports typically quarterly/annual per city code | Citywide, City Council + bureau lobbying contacts | Public disclosure record | None known | LOW (name/entity lists typically PDF, not tabular) | Lobbyist name, registrant entity, reporting period |
| 11 | Portland Boards & Commissions directory | `https://www.portland.gov/boards-commissions` or `https://www.portland.gov/volunteer` (unverified this session) | HTML roster pages per board; some PDF bylaws | Updated as appointments change; no versioned history exposed | Citywide, dozens of individual advisory bodies | Public | None | LOW–MEDIUM (would need per-board scraping to assemble a structured roster) | Board/commission name, member name, appointment date |

**Notable gap:** Despite the research brief's expectation of a "Legistar or equivalent system,"
Portland does **not** appear to run Legistar. Its functional equivalent is the Auditor's in-house
Efiles platform plus the separate Council Clerk agenda-calendar pages — neither offers the
Legistar Web API (`webapi.legistar.com`) pattern that many other cities expose, which is a real
loss for machine-readable access compared to peer jurisdictions.

---

## 2. Multnomah County — Board of Commissioners

| # | Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity / Body | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| 12 | Board Meetings archive (agendas, minutes, video, audio) — Multnomah County Board Clerk, via Granicus | `https://multnomah.granicus.com/ViewPublisher.php?view_id=3` (confirmed via 2026 search) | HTML index + embedded video/audio + linked PDF agenda packets | Regular Board meetings Thursdays 9:30am, briefings Tuesdays 10am; recordings posted within 48 hours; historical archive depth several years | Multnomah County Board of Commissioners (Chair + district commissioners) | Public | None (Granicus platform; no public API confirmed for this instance) | LOW–MEDIUM (video/PDF, browsable not queryable) | Meeting date, agenda item # |
| 13 | Board Documents — Ordinances, Resolutions & Orders, Proclamations | `https://www.multco.us/board/documents-view` (confirmed via 2026 search) | HTML search UI + PDF documents | Continuously updated as Board acts | Multnomah County Board | Public | None | LOW–MEDIUM (searchable index, document-locked) | Ordinance/resolution/order number, date |
| 14 | About Board Meetings (schedule/process reference) | `https://multco.us/info/about-board-meetings` (confirmed via 2026 search) | HTML | Ongoing | Board of Commissioners | Public | None | LOW | — |
| 15 | Board of County Commissioners roster | `https://multco.us/elected/board-county-commissioners` (confirmed via 2026 search) | HTML | Updated on election/appointment | County board (Chair + district commissioners; district count/structure reflects the county's own charter-reform changes and should be reconfirmed at the URL before use) | Public | None | LOW | Commissioner name, district |
| 16 | Board Rules | `https://multco.us/info/board-rules` (confirmed via 2026 search) | HTML/PDF | Updated when rules amended | Board of Commissioners | Public | None | LOW | — |
| 17 | Board Clerk Retention Schedule | `https://multco.us/info/board-clerk-retention-schedule-c2` (confirmed via 2026 search) | HTML/PDF | Static reference, updated per state retention-schedule revisions | Board Clerk records | Public | None | LOW (records-management reference, not a data source) | — |
| 18 | Multnomah County Code | Likely hosted via Municode (`https://library.municode.com/or/multnomah_county`) or `multco.us/countycode` (unverified this session) | HTML/PDF | Updated per ordinance | Countywide | Public | None | LOW–MEDIUM | Code chapter/section |
| 19 | Multnomah County Boards, Commissions & Committees directory | `https://www.multco.us/leadership-policy` area or similar boards/commissions landing page (unverified this session — exact path not confirmed) | HTML rosters | Updated on appointment | Countywide advisory bodies | Public | None | LOW–MEDIUM | Committee name, member name |

Multnomah County, like Portland, uses **Granicus**, not Legistar, and offers no confirmed public
API for board records — video/PDF only.

---

## 3. Oregon Legislature (State)

| # | Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity / Body | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| 20 | Oregon Legislative Information System (OLIS) — Legislative Administration Committee | `https://olis.oregonlegislature.gov/` (confirmed via 2026 search) | HTML (bill text, status, committee schedules/agendas/minutes, member profiles, floor/committee votes) | Real-time during session; archive by biennium | Oregon Legislature (House + Senate, all committees) | Public | Yes — see row 22 (OData feed) | MEDIUM (rich HTML, but page-by-page not bulk without the API) | Bill number (e.g., HB 1234), legislator name/ID, committee name, session (e.g., 2026R1) |
| 21 | OLIS Session Publications (measure histories, journals) | `https://olis.oregonlegislature.gov/liz/2026R1/Publications/SessionPublications` (confirmed via 2026 search) | HTML/PDF | Per session | Statewide legislature | Public | None separate from row 22 | LOW–MEDIUM | Session ID, bill number |
| 22 | Citizen Engagement Data / OLIS Open Data API — Legislative Administration Committee | `https://www.oregonlegislature.gov/citizen_engagement/Pages/data.aspx` (confirmed via 2026 search) | **OData API** (member data confirmed; bill/vote/committee coverage not independently verified this session) | Refreshes with OLIS; historical coverage unconfirmed | Statewide legislature | Public; terms not independently reviewed this session | **Yes — OData**, the only confirmed true API among primary-source records in this entire domain | HIGH (if bill/vote data is included) to MEDIUM (if member-data only) — **verify actual entity coverage before building on it** | Legislator ID, bill number |
| 23 | Archived Bills (prior sessions) | `https://www.oregonlegislature.gov/bills_laws/Pages/archived-bills.aspx` (confirmed via 2026 search) | HTML/PDF | Per past session/biennium, deep historical archive | Statewide legislature | Public | None | LOW | Session, bill number |
| 24 | Oregon Revised Statutes (ORS) | `https://www.oregonlegislature.gov/bills_laws/Pages/ORS.aspx` (unverified this session) | HTML, PDF (by chapter/volume) | Republished each odd-numbered year following session; current-version emphasis | Statewide | Public | None confirmed (no bulk API) | LOW–MEDIUM | ORS chapter.section number |
| 25 | LegiScan (third-party aggregator, covers all 50 states incl. Oregon) | `https://legiscan.com/OR` | JSON/CSV via free registered API; bulk dataset downloads | Near-real-time during session; historical archive multi-year | Statewide legislature | Free tier with attribution requirement; rate-limited | **Yes — REST API**, well-documented | HIGH | Bill number, vote ID, sponsor name — mappable to OLIS bill numbers |
| 26 | Open States / Plural Policy (third-party aggregator, covers all 50 states incl. Oregon) | `https://openstates.org/or/` (API v3 via `https://v3.openstates.org`) | Structured JSON via API; bulk CSV/JSON exports | Ongoing; historical coverage from roughly 2009+ depending on state | Statewide legislature (bills, votes, sponsors, legislator/"people" records) | Free API key required; open data reuse permitted | **Yes — REST API v3**, actively maintained, strong documentation | **HIGH — standout source for this whole domain** | Bill ID (OpenStates format, mappable to OLIS bill number), legislator ID (mappable by name), committee name |

---

## 4. Oregon State Cross-Cutting Systems (Rules, Ethics, Lobbying, SEI)

| # | Name / Custodian | URL | Format(s) | Update Frequency / Historical Depth | Geographic Granularity | License / Restrictions | API | Viz Readiness | Join Keys |
|---|---|---|---|---|---|---|---|---|---|
| 27 | Oregon Administrative Rules (OAR) — Secretary of State Archives Division | `https://secure.sos.state.or.us/oard/` (unverified this session; long-standing, well-known URL) | HTML, PDF; searchable by chapter/division/agency | Updated as rules are filed (near real-time); historical rule-text versions retrievable | Statewide, organized by agency chapter | Public | None confirmed (no bulk API) | LOW–MEDIUM | OAR chapter-division-section number, adopting agency |
| 28 | Oregon Government Ethics Commission (OGEC) — main site | `https://www.oregon.gov/ogec/Pages/index.aspx` (unverified this session) | HTML | Ongoing | Statewide (all public officials/lobbyists) | Public | Unconfirmed | LOW (portal page; underlying filing systems below) | — |
| 29 | Lobbying registration & expenditure reports (via OGEC's online filing system) | Sub-page/portal of `oregon.gov/ogec` — exact filing-system URL not confirmed this session | Likely PDF/HTML filings, possibly a searchable e-filing database | Registration ongoing; expenditure reports filed periodically (quarterly is typical for OGEC lobbying rules) | Statewide — covers lobbying activity directed at the Legislature and state agencies | Public disclosure record | Unconfirmed — **flagged as a priority to verify**, since a clean lobbying-spend API would be a strong visualization source | LOW–MEDIUM (pending verification) | Lobbyist name, lobbyist-employer/client name, reporting period |
| 30 | Statements of Economic Interest (SEI) — filed with OGEC by public officials/candidates | Sub-page/portal of `oregon.gov/ogec`, commonly referenced as an "eSEI" e-filing system — exact URL not confirmed this session | Likely PDF filings, possibly searchable by filer name/year | Annual filing requirement | Statewide — covers state and many local elected officials/candidates (aggregate financial-interest categories only; no account numbers/PII) | Public disclosure record, aggregate categories only (by design — not raw financial account data) | Unconfirmed | LOW (PDF-form filings typically) | Filer name, office held, filing year |
| 31 | ORESTAR — Oregon campaign-finance e-filing (Secretary of State Elections Division) | `https://sos.oregon.gov` / `orestar.sos.state.or.us` (unverified this session) | Searchable database, CSV export commonly available | Ongoing, filed per election cycle | Statewide, all candidates/committees | Public | Search UI with export; not a REST API historically | MEDIUM | Committee ID, candidate name, filing date |

**Important scope distinction:** ORESTAR is Oregon's **campaign finance** disclosure system
(contributions/expenditures to candidates and committees), administered by the Secretary of
State's Elections Division — it is a different system, agency, and legal framework from
**lobbying disclosure** (rows 29–30), which OGEC administers. The two are easy to conflate in a
public-facing product; ORESTAR properly belongs to the sibling `elections-campaign-finance`
research topic, not this one, and is listed here only to prevent that confusion and to flag the
adjacency for a potential joined "money in politics" visualization.

---

## Standouts (candidate visualizations)

1. **Council vote-pattern matrix (Portland, post-Jan-2025 structure).** A 12-member-plus-mayor
   heatmap of votes per disposition-agenda item, sourced from Efiles minutes packets. Rich and
   novel because the new district-council structure (row 3) makes individual member voting
   visible in a way the old 5-member commission government never was. Requires scraping/OCR since
   Efiles has no structured export — a MEDIUM-effort, HIGH-payoff build.
2. **Bill-flow / status Sankey for the Oregon Legislature**, built on **Open States API v3** (row
   26) or **LegiScan** (row 25) rather than OLIS directly — introduced → committee → floor vote →
   signed/vetoed/died, filterable by session and sponsor. This is the strongest
   ready-to-build candidate in the whole domain because it's the only primary/near-primary
   legislative dataset with a real, documented API.
3. **Legislator vote-similarity network** (Oregon House/Senate), using Open States or LegiScan
   roll-call data to compute pairwise agreement scores — classic and compelling for a state
   legislature dataset with real API-accessible roll calls.
4. **Lobbying-spend time series, state + city combined** — pending verification of OGEC's
   lobbying-expenditure filing system (row 29) joined with Portland's Auditor lobbying reports
   (row 10). High public interest ("who's spending to influence City Hall and Salem") but
   currently LOW-confidence on machine-readability; likely needs a scraping project or a records
   request for a structured export. Flag as **worth a follow-up feasibility check** before
   committing design time.
5. **Legislative activity volume over time** — counts of ordinances/resolutions passed per year
   by Portland Council (Efiles classification 542/543) vs. Multnomah Board (row 13) vs. bills
   passed by the Legislature (Open States/LegiScan) as a simple comparative bar/line chart across
   all three jurisdictions — low-effort, decent narrative value, all three sources are at least
   browsable/scrapable.
6. **"Who funds/lobbies whom" cross-domain network** — joining SEI filings (row 30), lobbying
   registrations (row 29), and campaign contributions (ORESTAR, row 31 / sibling topic 3) by
   official name and reporting period. Ambitious: each individual source is only LOW–MEDIUM
   readiness and the join requires careful name-matching across three separate state systems, but
   the payoff (a genuine "money and influence" map) would be a flagship piece for the whole
   project.

---

## Notes & Caveats

- **WebSearch budget exhausted early.** This topic's research plan called for 10+ distinct
  searches; only 5 completed before the session-wide search quota (shared with 11 sibling
  research agents covering the other topics in this project) was exhausted. Searches actually
  performed: Portland Council/Legistar-equivalent, Portland Auditor Efiles, Portland Council video
  archive, Multnomah Board of Commissioners/Legistar-equivalent, and Oregon OLIS bill data/API.
  Rows built from these are marked "confirmed via 2026 search" above; everything else is marked
  "unverified this session."
- **WebFetch was completely blocked this session.** All 5 verification attempts (OAR, ORS, OGEC,
  Portland lobbying page, Portland boards/commissions page) returned HTTP 403. The proxy status
  endpoint (`$HTTPS_PROXY/__agentproxy/status`) confirmed a blanket organization egress-policy
  denial affecting nearly all outbound hosts this session — it rejected `www.google.com`,
  `example.com`, and `en.wikipedia.org` in addition to the target government domains, so this is
  an environment/session-level restriction, not evidence that any specific government site is
  down or has moved. Per the proxy's own guidance, policy denials should be reported rather than
  retried, so no further fetch attempts were made.
- **Priority re-verification list before this data goes into a public-facing product:**
  (1) exact URL and data coverage of the OGEC lobbying-expenditure e-filing system (row 29) —
  this is the single highest-value unknown in the domain; (2) exact URL of the OGEC SEI e-filing
  system (row 30); (3) whether the OLIS Citizen Engagement OData API (row 22) covers bills/votes
  or only legislator metadata — this determines whether Open States/LegiScan (rows 25–26) are
  supplements or the only real API path; (4) Portland's lobbying-registration and
  boards/commissions page URLs (rows 10–11); (5) Multnomah County Code hosting location (row 18)
  and its current boards/commissions directory URL (row 19); (6) current Multnomah County Board
  district structure/count at row 15's URL, since the county's own charter reform may have
  changed it and this document did not confirm the current figure.
- **No Legistar found in either Portland or Multnomah County**, despite the research brief citing
  it as an expected system. Portland uses its own Efiles platform; Multnomah County uses Granicus.
  Neither exposes a public Legistar-style Web API — this is a genuine gap relative to peer
  jurisdictions elsewhere in the U.S. that do run Legistar with its documented API.
- **Portland's charter reform (effective Jan 1, 2025)** is the single most important structural
  fact for this domain: 12-member district council + non-voting-on-council citywide mayor +
  appointed City Administrator, replacing the prior 5-member commission government. Any
  visualization spanning that transition date needs an explicit annotation/break, not a smoothed
  time series.
- **SEI data is aggregate-category disclosure by design** (ranges/categories of income sources and
  business interests, not exact dollar amounts or account numbers) — this is consistent with
  Oregon's public-records approach to financial disclosure and should be treated as the
  appropriate public version, not a limitation to work around.
- Third-party aggregators (Open States, LegiScan) are flagged as the strongest visualization-ready
  sources in this entire domain specifically because Oregon's own primary systems (OLIS, Efiles,
  Granicus) do not expose comparable bulk/API access. Any product design should credit the
  original source (Oregon Legislature / OLIS) even when pulling data through these aggregators.
