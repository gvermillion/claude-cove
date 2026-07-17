# Records Infrastructure: The Public Records Access Landscape (Portland / Multnomah County / Oregon)

## Overview

This file inventories the **access layer** that sits on top of every other topic in this
project: for any given dataset, is it proactively published, or does a member of the
public have to file a formal public records request under Oregon's public records law
(ORS Chapter 192) to get it? It covers the statutory framework, the three jurisdictions'
request portals and fee/appeal structures, the state's Public Records Advocate and
Advisory Council, records retention schedules (as a map of what data *exists* even when
it isn't published), and the presence/absence of published request logs.

**Research method actually used, and a material constraint the reader should know about
up front:** 5 distinct web searches were completed (topics: ORS 192 fee schedule, City
of Portland GovQA/Auditor portal, Multnomah County records portal, Oregon Public Records
Advocate/PRAC, DOJ manual & fee waivers). These returned ~28 distinct, real URLs with
search-engine-verified snippets, which form the backbone of this report. Partway through
research, the session's WebSearch quota was exhausted session-wide (shared across all
concurrently running research subagents on this project, not just this one), and
immediately afterward the outbound egress proxy began rejecting **all** HTTPS connections
— including to unrelated control targets like `example.com`, `www.google.com`, and
`www.anthropic.com` — with `403 gateway policy denial`, confirmed via
`/__agentproxy/status`. This is a session-wide infrastructure failure, not a
site-specific block, so I did not attempt to route around it. Practical effect: **no URL
in this report could be live-verified by direct fetch this session.** Every URL below is
either (a) a URL returned directly by a search-engine result (high confidence it
currently resolves) or (b) explicitly flagged as background/domain knowledge not
confirmed this session. See **Notes & Caveats** at the end for the full disclosure and a
recommended re-verification pass.

---

## 1. State of Oregon — Statutory Framework, Advocate, and State Agency Practice

Oregon's public records law is the ceiling and floor for all three jurisdictions:
Portland and Multnomah County operate their own portals and local administrative rules,
but the underlying rights, fee ceiling logic, and appeal mechanism all trace back to
ORS Chapter 192.

| # | Name / Custodian | URL | Format | Covers | Update Frequency | Viz Readiness | Notes |
|---|---|---|---|---|---|---|---|
| 1 | ORS Chapter 192 — Records; Public Reports and Meetings (Oregon Legislature, official) | https://www.oregonlegislature.gov/bills_laws/ors/ors192.html | HTML | Full statutory chapter — definitions, disclosure duties, exemptions, procedure | Updated each odd-year legislative session codification | LOW | Legal text, not a dataset; authoritative citation source |
| 2 | ORS 192.324 — Copies/inspection of public records; response; fees; procedure (annotated) | https://oregon.public.law/statutes/ors_192.324 | HTML | Core request-response statute: written notice, fee threshold, timelines | Continuous (third-party codifier, oregon.public.law) | LOW | Search snippet confirms: public body may **not** charge a fee greater than **$25** without first sending written notice of the estimated fee and getting requester confirmation to proceed |
| 3 | OAR 250-001-0020 — Fees for Public Records (Oregon Administrative Rule) | https://oregon.public.law/rules/oar_250-001-0020 | HTML | State-level fee-setting rule (applies to DOJ/AG records specifically; other agencies adopt their own fee rules under the same ORS 192.324 authority) | Rulemaking-driven | LOW | Not fetched/verified this session — flagged |
| 4 | Oregon DOJ — Public Records and Meetings Law hub | https://www.doj.state.or.us/oregon-department-of-justice/public-records/public-records-and-meetings-law/ | HTML | Landing page for DOJ's public records program, links to manual, exemptions list, petition process | Periodic | LOW | Central navigation point for the appeal/petition process below |
| 5 | Attorney General's Public Records and Meetings Manual (Oregon DOJ) | https://www.doj.state.or.us/wp-content/uploads/2019/07/public_records_and_meetings_manual.pdf | PDF | Comprehensive interpretive guidance for every public body in the state: exemptions, fee waiver standard, response duties | Periodically revised (this copy dated 2019; DOJ states it is "periodically updated") | LOW | The authoritative interpretive document custodians and requesters both cite |
| 6 | Oregon Public Records Exemptions database (DOJ) | https://justice.oregon.gov/PublicRecordsExemptions/ | HTML/searchable | Searchable catalog of statutory exemptions to disclosure, with citations | Maintained by DOJ | MEDIUM | Structured/searchable — closest thing to a "dataset" in the legal-framework tier; could be scraped into an exemption-category reference table |
| 7 | Petition for Public Records Order (Oregon DOJ) | https://www.doj.state.or.us/oregon-department-of-justice/public-records/petition-for-public-records-order/ | HTML | The formal appeal mechanism: petition to the Attorney General (state agency denials) | Static/policy page | LOW | This is the "AG review" appeal path referenced project-wide |
| 8 | Oregon Public Records Advocate — home | https://www.oregon.gov/pra/pages/default.aspx | HTML | Ombuds-style office (created 2017, HB 2101): informal dispute resolution, training, guidance publications | Ongoing | LOW | Does **not** operate a request-submission portal; mediates disputes and publishes guidance only |
| 9 | Public Records Advisory Council (PRAC) page | https://www.oregon.gov/pra/pages/advisory-council.aspx | HTML | Statutory council (ORS 192.461–483): state/local government, media, and public representatives | Ongoing | LOW | Reports to Governor & Legislature by Dec 1 of even years |
| 10 | PRAC Biennial Report, November 2020 | https://www.oregon.gov/pra/Documents/Biennial-PRAC-Report-November-2020.pdf | PDF | Council findings/recommendations covering Dec 2018 onward | Biennial | MEDIUM | Narrative PDF but contains summarized compliance findings — hand-extractable stats |
| 11 | Public Records Advocate Annual Report 2023 | https://www.oregonlegislature.gov/cis/GovToGovReports/Annual%20Report%20(Public%20Records%20Advocate)%202023.pdf | PDF | Annual statutory report (per ORS 182.166) on office activity | Annual | MEDIUM | Likely contains case-volume / dispute-resolution statistics |
| 12 | Final Report of Ginger McCall, Public Records Advocate (Oct 2019) | https://www.oregon.gov/pra/Documents/Final-Report-of-Ginger-McCall-Public-Records-Advocate.pdf | PDF | First Public Records Advocate's exit report; documents independence/funding concerns that shaped later reforms | One-time (historical) | LOW | Notable: the office's first appointee resigned citing lack of independence from the Governor's office — relevant context for evaluating how much to trust "self-reported" compliance framing |
| 13 | "Oregon Public Records 101" (PRA quick guide) | https://www.oregon.gov/pra/Documents/Oregon-Public-Records-101.pdf | PDF | Plain-language explainer of rights/process for the public | Periodic | LOW | Good primary citation for a public-facing explainer panel in the viz project |
| 14 | Public Records Fees and Waivers Background Brief (Legislative Policy & Research Office, June 2022) | https://www.oregonlegislature.gov/lpro/Publications/Public-Records-Fees-and-Waivers-Background-Brief.pdf | PDF | Legislative staff brief summarizing fee/waiver law and policy debate | One-time (2022), may be superseded | MEDIUM | Good secondary source for the comparative fee table below |
| 15 | Oregon Judicial Department — Fee Deferral and Waiver forms | https://www.courts.oregon.gov/forms/Pages/fee-waiver.aspx | HTML/PDF forms | Court **filing-fee** waivers (distinct from public-records fee waivers — different program, easy to confuse) | Ongoing | LOW | Flagged specifically so downstream researchers don't conflate court fee waivers with records fee waivers |
| 16 | Oregon State Archives (Secretary of State) — records retention schedule program | https://sos.oregon.gov/archives (general entry point; specific retention-schedule sub-page not verified this session) | HTML/PDF schedules | Statewide General Records Retention Schedules for state agencies **and** a separate schedule set for local governments (cities, counties, special districts) | Periodically revised by rule | MEDIUM | **This is the "map of what exists" artifact** — retention schedules list every records series (e.g., "police incident reports — retain 75 years") a body is required to keep, independent of whether it's published. High value for the GAPS analysis even though each schedule itself is a PDF/table, not open data. URL confirmed only as a domain prefix (`sos.oregon.gov/archives/Pages/...` appeared in a search snippet for the PRAC-history page); exact retention-schedule slug needs a follow-up fetch. |
| 17 | Reporters Committee for Freedom of the Press — Open Government Guide: Oregon | https://www.rcfp.org/open-government-guide/oregon/ | HTML | Independent (non-governmental) legal summary of Oregon public records/open meetings law, state-by-state comparable format | Periodically updated by RCFP | LOW | Useful as a plain-English secondary cross-check, and because RCFP's guide format is directly comparable across all 50 states if the viz project ever wants a "how does Oregon rank" panel |

**Oregon state agency request practice (no unified portal):** Unlike Portland and
Multnomah County, the State of Oregon does **not** appear to operate one centralized
public records request portal. Based on the pattern across all search results (no
`records.oregon.gov`-style unified system surfaced in any query) plus general domain
knowledge, Oregon's ~150+ state agencies each designate their own public records officer
and accept requests independently — by web form, email, or mail — with the technology
varying agency to agency (some, like DOJ, run their own request intake; others may use
commercial platforms such as NextRequest or GovQA on their own subdomains). **This
specific claim (no unified statewide intake system) was not independently re-confirmed
via a targeted search this session** because the WebSearch budget was exhausted before
that query could run — flagged for a follow-up pass. The Public Records Advocate's
office (row 8) is explicitly a mediation/guidance body, not a submission portal, which is
itself a data point: Oregon's statewide "system" is closer to 150 independent intake
points loosely governed by one statute, one manual, and one ombuds office.

**Fees:** ORS 192.324 sets a $25 no-notice threshold — any fee estimated above $25
requires written notice and requester confirmation before the public body proceeds.
Allowable costs are actual costs (supplies, research, compilation, postage, staff time);
attorney time spent determining whether an exemption applies is **not** billable to the
requester.

**Fee waivers:** The controlling standard (ORS 192.324/192.440) is that the record
custodian may waive or reduce fees when doing so is "in the public interest" because
disclosure primarily benefits the general public rather than the individual requester.
Indigence may be considered but is not itself the controlling test — public interest is.

**Timelines:** Multnomah County's own published guidance (see Section 3) states the
statutory baseline as **no later than 15 business days** to complete a response after
receipt. (Background/general knowledge, not independently re-verified this session: this
15-business-day structure, plus a shorter acknowledgment-of-receipt requirement, dates to
the 2017 reform bill HB 2101, the same act that created the Public Records Advocate
position — flagged for confirmation.)

**Appeals:** A requester denied a record, or denied a fee waiver, may petition for
review. For **state agencies**, the petition goes to the **Attorney General** (DOJ "row
7" above). For **local public bodies** (cities, counties, special districts — i.e.,
Portland and Multnomah County), the petition goes to the **District Attorney of the
county in which the public body is located** — for both Portland and Multnomah County
that is the **Multnomah County DA**. If the DA/AG petition is denied, the requester's
remaining recourse is circuit court.

---

## 2. City of Portland

| # | Name / Custodian | URL | Format | Covers | Update Frequency | Viz Readiness | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Portland Public Records Center (GovQA portal) | https://portlandor.govqa.us/WEBAPP/_rs/supporthome.aspx | Web portal (GovQA, vendor: Granicus) | Primary intake for records requests across City bureaus; account login lets requesters track status, pay fees, and download completed records | Live/transactional | LOW (transactional system, not a dataset) | Portal splits intake into "Submit a Records Request" (general), "Public Records Request," and a separate "Agency Police and BOEC Requests" path for government-agency requesters of unredacted police/911 records |
| 2 | Portland.gov — Records Requests (landing page) | https://www.portland.gov/public-records | HTML | Entry point directing requesters to the GovQA portal and explaining scope | Maintained | LOW | Notes the City handles "tens of thousands" of records requests/year, majority via the online portal |
| 3 | Portland.gov — Records Request Portal Guide | https://www.portland.gov/public-records/portal-guide | HTML | Step-by-step how-to for using GovQA | Maintained | LOW | Practical UX documentation |
| 4 | Portland Auditor's Office — Public Records Request page | https://www.portland.gov/auditor/archives/public-records | HTML | Auditor/Archives-specific framing of the citywide public records process | Maintained | LOW | Auditor's Office (an independently elected office, not under the Mayor/City Administrator) owns citywide records policy via its Archives & Records Management Division |
| 5 | ARA-8.03 — Public Records Requests (Adopted Rule, Auditor's Office) | https://www.portland.gov/policies/adopted-rules-auditors-office/archives-records-management/ara-803-public-records-requests | HTML (adopted administrative rule) | Portland's own administrative rule implementing ORS 192 locally — fee schedule authority, procedure | Amendable by Auditor's Office rulemaking | LOW | **This is the authoritative source for Portland's exact fee schedule figures** (per-page copy costs, staff-time billing rate, etc.) — specific dollar figures could not be extracted this session (fetch blocked); follow-up required |
| 6 | Portland Archives & Records Center (PARC) — Request Assistance / Find Records | https://www.portland.gov/auditor/archives/find-records | HTML | PARC holds the City's historical/permanent-retention records (Council minutes, ordinances, resolutions, historical photos, etc.) and provides research assistance | Maintained | MEDIUM | PARC is the closest Portland analog to a "records-as-archive" function; some finding aids may be browsable without a formal records request — worth a follow-up check on whether PARC has a searchable digital finding-aid/eFiles system distinct from the GovQA request portal (not confirmed this session — flagged) |
| 7 | City Attorney's Office — Request a Public Record | https://www.portland.gov/attorney/request-public-record | HTML | Separate request pathway specifically through the City Attorney's Office | Maintained | LOW | Suggests certain record types (e.g., litigation-related, claims) are routed through Attorney's Office rather than the general GovQA queue |
| 8 | Permitting & Development (BDS) — Find public records | https://www.portland.gov/ppd/public-records | HTML | Bureau-specific records pathway for permits/plans/inspection records | Maintained | LOW | Many permit records are also proactively available via PortlandMaps (see `open-data-portals` topic file) — this page is the fallback for records not on that platform |
| 9 | Legacy Information Request Form (older domain) | https://www.portlandoregon.gov/archives/39969 | HTML/form | Older `portlandoregon.gov` domain form, likely superseded by the GovQA portal and portland.gov migration | Unclear — may be stale | LOW | Flagged as possibly stale; the City completed a domain migration from portlandoregon.gov to portland.gov in recent years, so legacy URLs like this should be spot-checked for redirect/404 status in a follow-up pass |

**Fees, timelines, appeals (Portland):** Portland's specific per-page/per-hour fee
figures live in ARA-8.03 (row 5) and could not be extracted this session due to the
fetch outage — this is a priority follow-up item since exact fee figures are one of the
required capture fields. The City operates under the same statewide ORS 192 timeline
(15-business-day completion baseline) and public-interest fee-waiver standard described
in Section 1. Because Portland is a local public body located in Multnomah County,
appeals of denials or fee-waiver refusals route to the **Multnomah County District
Attorney**, not the Attorney General.

---

## 3. Multnomah County

| # | Name / Custodian | URL | Format | Covers | Update Frequency | Viz Readiness | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Multnomah County — Public Records Requests (landing page) | https://multco.us/services/public-records-requests | HTML | County-wide overview: process, fees, waiver eligibility, timeline | Maintained | LOW | Search snippet explicitly states the 15-business-day statutory baseline and that a fee waiver can be requested "if your request is in the public interest" |
| 2 | Multnomah County Public Records Center (GovQA portal) | https://multco.govqa.us/ (base domain; specific landing path returned a session-scoped URL in search results) | Web portal (GovQA) | Primary online intake; select department, then submit/track/pay | Live/transactional | LOW | Same GovQA vendor platform as the City of Portland, but a **separate instance/account system** — a Portland GovQA account does not carry over to the County portal |
| 3 | GovQA "How-To Guide for Request Portal" (User Help PDF) | https://multco.us/file/how-to_guide_for_request_portal/download | PDF | Step-by-step portal walkthrough: account creation, submitting, paying, downloading | Maintained | LOW | Useful UX/process documentation |
| 4 | Multnomah County Sheriff's Office — Public Records Requests | https://www.mcso.us/how-do-i/public-records-requests | HTML | MCSO-specific request pathway (jail/booking records, incident reports, etc.) | Maintained | LOW | Relevant cross-reference to `public-safety` topic file — jail/booking data is largely records-request-only |
| 5 | Multnomah County District Attorney — Public Records Requests | https://www.mcda.us/index.php/resources/public-records-request | HTML | DA's Office-specific intake (case files, discovery-adjacent records where not otherwise restricted) | Maintained | LOW | DA records intersect heavily with court-record confidentiality rules — likely a records-request-only category |
| 6 | Multnomah County Court — Public Records | https://multnomahcountycourt.org/public-records/ | HTML | Court records access page | Maintained | LOW | **Important nuance:** Oregon's circuit courts (including Multnomah County Circuit Court) are administered by the **state** Oregon Judicial Department, not by county government, despite the county-branded domain name — court records generally follow OJD/state rules and the separate Oregon eCourt Case Information (OECI) system rather than the county's ORS 192 GovQA process. Flagged for the `public-safety` topic to cross-check. |
| 7 | Multnomah County Purchasing — Public Records Request Instructions | https://multco.us/info/instructions-public-records-requests-multnomah-county-purchasing | HTML | Procurement/contract-record-specific request instructions | Maintained | LOW | Relevant cross-reference to `budget-finance` topic file — contract records may not be in the open checkbook data and require a request |

**Fees, timelines, appeals (Multnomah County):** Same statewide ORS 192 framework as
Portland — 15-business-day completion baseline, public-interest fee waiver standard,
fees notified in advance with payment required before release. As a local public body in
Multnomah County, appeals of County denials also route to the **Multnomah County
District Attorney** — notably the **same appellate authority that reviews the County's
own denials**, since the DA's office is itself part of county government. (This is a
structural quirk worth flagging for the project: the DA both runs its own records
program, row 5, and adjudicates appeals against fellow county departments — not a
independence concern unique to this research, just worth noting for context.)

---

## 4. Comparative Table: Portland vs. Multnomah County vs. Oregon State

| Dimension | City of Portland | Multnomah County | Oregon State (agencies generally) |
|---|---|---|---|
| **Request portal technology** | GovQA (`portlandor.govqa.us`), branded "Portland Public Records Center"; separate intake track for police/BOEC agency requests | GovQA (`multco.govqa.us`), branded "Multnomah County Public Records Center"; department-level sub-routing (Sheriff, DA, Courts, Purchasing each have their own page even if some route back to GovQA) | No unified statewide portal identified; each of ~150+ agencies runs its own intake (web form/email/agency-specific system). DOJ's own program is the closest thing to a "model" agency process. *(Absence-of-portal claim not independently re-confirmed this session — flagged.)* |
| **Governing local rule** | ARA-8.03 (Auditor's Office adopted rule) sits on top of ORS 192 | County administrative policy (specific rule number not identified this session) sits on top of ORS 192 | ORS 192 + OAR 250-001-0020 (DOJ's own fee rule) + AG's Public Records and Meetings Manual as interpretive guidance for all agencies |
| **Standard/base fees** | Set by ARA-8.03; exact figures not extracted this session (fetch blocked) — flagged follow-up | "Notified in advance of any estimated fees and costs"; no first-N-pages-free figure confirmed this session | Statutory ceiling logic: no fee >$25 without written notice + requester confirmation (ORS 192.324); actual-cost recovery only (supplies, research, compilation, postage, staff time); attorney review time excluded |
| **Fee waiver criteria** | Public-interest standard per ORS 192 (no Portland-specific deviation surfaced) | Explicitly "public interest" — requestable via the portal | Public-interest standard controls (ORS 192.324/192.440); indigence is a factor but not dispositive |
| **Typical timeline** | Statewide 15-business-day completion baseline applies | Statewide 15-business-day completion baseline applies (explicitly stated in County's own guidance) | 15-business-day completion baseline (with a shorter initial acknowledgment step per general knowledge of the 2017 reform — not re-verified this session) |
| **Appeal route on denial/fee dispute** | Petition to the **Multnomah County District Attorney** (Portland is a local public body within Multnomah County) | Petition to the **Multnomah County District Attorney** (same authority reviews the County's own denials) | Petition to the **Oregon Attorney General** (state agencies); DOJ's "Petition for Public Records Order" process; further appeal to circuit court if denied |
| **Statewide oversight/mediation body** | Subject to, but not administered by, the Public Records Advocate/PRAC | Subject to, but not administered by, the Public Records Advocate/PRAC | Public Records Advocate (informal mediation) + Public Records Advisory Council (biennial reports to Governor/Legislature, ORS 192.461–483) |

---

## 5. Records-Request-Only Data Categories (for GAPS analysis)

Based on this research, the following categories of civic data commonly **exist** (per
retention-schedule logic — see Section 1, row 16) but are **not** proactively published
as open data in Portland, Multnomah County, or Oregon state systems, and would require a
formal ORS 192 request through the relevant GovQA portal or agency to obtain:

- **Unredacted police incident/dispatch narratives and body-worn-camera footage** — the
  Portland GovQA portal explicitly carves out a separate "Agency Police and BOEC
  Requests" track, implying general public access to raw records (vs. published
  summary/open-data extracts) is request-gated and often restricted to authorized
  agencies. Cross-reference `public-safety` topic file.
- **Jail booking and custody records beyond published roster snapshots** (MCSO) —
  historical/detailed booking records likely request-only.
- **District Attorney case files and prosecutorial records** — DA's Office maintains its
  own request pathway distinct from the general county portal, typically because of
  grand jury secrecy and victim/witness confidentiality rules layered on top of ORS 192
  exemptions.
- **Procurement/contract records not included in checkbook-level open data** — Multnomah
  County Purchasing has a distinct records-request instruction page, suggesting the
  open-data "checkbook" (see `budget-finance` topic file) does not include full contract
  documents, bid protests, or vendor communications.
- **Litigation, claims, and legal-risk records held by the City Attorney's Office** — a
  dedicated request pathway separate from the general Auditor/GovQA process.
- **Internal agency emails, correspondence, and calendars** — nowhere in this research
  did any jurisdiction indicate proactive publication of official correspondence; this
  remains a classic records-request-only category everywhere in Oregon.
- **Detailed, address-level historical Archives holdings not yet digitized** — Portland
  Archives & Records Center's "Find Records" / research-assistance framing implies a
  meaningful share of historical municipal records (pre-digital Council packets,
  historical permits, etc.) require in-person or mediated request access rather than
  self-service download.
- **Court case records requiring OECI/e-court access** — technically state (OJD)
  administered rather than county, and access to full case files (vs. docket summaries)
  is a separate, often fee-bearing, process from both the county's ORS 192 portal and
  standard open-data channels.
- **Agency internal investigation / personnel disciplinary records** — standard
  ORS 192 exemption category, universally request-gated (and frequently exempted
  outright) across all three jurisdictions; no evidence of proactive publication found.
- **A structured, queryable log of records requests themselves** — see immediately
  below; this is itself a gap.

**On published request logs specifically:** The mandate for this research topic asked
whether any jurisdiction publishes its records-request log as open data (a practice some
other U.S. cities/states do, e.g., as a CSV or API of request subject/status/date). **No
evidence of such a published log was found for Portland, Multnomah County, or the State
of Oregon** in the searches completed. This is a meaningful negative finding for the
GAPS analysis: the GovQA portals used by both Portland and Multnomah County are
transactional systems for the requester's own account, not public logs, and nothing in
the PRA/PRAC materials indicated a statewide aggregated request-log dataset either. A
targeted follow-up search specifically for "[jurisdiction] public records request log
open data" was planned but could not be executed this session (WebSearch budget
exhausted before reaching it) — recommended as the top follow-up item if this finding
needs stronger confirmation before being asserted as a hard gap in `GAPS.md`.

---

## Notes & Caveats

**Tooling constraints encountered (read this before trusting any URL below at face
value):**

1. **WebSearch budget exhaustion.** Only 5 of the intended 10+ distinct searches were
   completed before the session-wide WebSearch quota (200 calls, shared across all
   concurrently running research subagents in this multi-topic project) was exhausted.
   The 5 completed searches were high-yield (covering ORS 192/fees, Portland's GovQA
   portal, Multnomah County's portal, the Public Records Advocate/PRAC, and DOJ's fee
   waiver guidance) and surfaced ~28 real, distinct URLs, which is why source coverage
   is still strong despite the shortfall against the "10 searches" instruction. Planned
   but **not executed**: dedicated searches for (a) Oregon state records retention
   schedule specifics, (b) Portland Archives/eFiles system details, (c) published
   records-request-log datasets, (d) appeal-process case examples, (e) the 2017 HB 2101
   reform timeline specifics.

2. **WebFetch/proxy outage.** Every WebFetch call attempted this session — against
   `portland.gov`, `multco.us`, `oregon.gov`, `doj.state.or.us`, and even **unrelated
   control URLs like `example.com`, `www.google.com`, and `www.anthropic.com`** —
   returned `403 Forbidden`. Direct `curl` through the configured `HTTPS_PROXY` confirmed
   this is a **gateway-level policy denial affecting essentially all outbound HTTPS
   traffic this session**, not a block on government domains specifically (visible via
   `curl -sS "$HTTPS_PROXY/__agentproxy/status"`, which logged `connect_rejected` /
   `gateway answered 403 to CONNECT` for dozens of unrelated hosts being hit by sibling
   research subagents at the same time). Per the environment's own guidance, policy
   denials of this kind should be reported rather than retried or routed around, so
   **no URL in this document was live-verified by direct fetch.**

3. **Confidence levels, explicitly:**
   - URLs that appeared directly in a WebSearch result (the large majority of the ~28
     URLs in this file) are **high-confidence** — they were returned by a live search
     index, meaning the pages existed and were indexed at query time.
   - Claims drawn from WebSearch **result snippets** (e.g., the $25 fee-notice
     threshold, the 15-business-day baseline, the "public interest" fee-waiver standard,
     the petition-to-AG/DA appeal structure) are **search-corroborated** — text actually
     returned by the search tool, attributed to the cited page.
   - Claims marked "background/general knowledge, not independently verified this
     session" (e.g., the specific 5-business-day acknowledgment step, HB 2101 as the
     origin of the 2017 reform, the exact Oregon State Archives retention-schedule URL
     slug, whether Oregon truly lacks any unified state portal) should be treated as
     **plausible but unconfirmed** and re-checked in a follow-up pass before being cited
     in the final `INVENTORY.md` or `GAPS.md` without a live fetch.

4. **Recommended follow-up actions for whoever merges this into the final inventory:**
   - Fetch `portland.gov/policies/adopted-rules-auditors-office/archives-records-management/ara-803-public-records-requests`
     directly to pull Portland's exact fee-schedule dollar figures.
   - Confirm whether `portlandoregon.gov/archives/39969` (legacy domain) still resolves
     or has been superseded/redirected post-migration to `portland.gov`.
   - Run the specifically-planned-but-not-executed search for published records-request
     logs as open data, to firm up the negative finding in Section 5.
   - Locate the exact Oregon State Archives retention-schedule sub-URL under
     `sos.oregon.gov/archives` (only the domain prefix was confirmed this session).
   - Verify the live Multnomah County GovQA portal URL (the search result returned a
     session-token-bearing URL, `multco.govqa.us/WEBAPP/_rs/(S(...))/supporthome.aspx`,
     which is not a stable link — the clean base domain `multco.govqa.us` is used in this
     report instead).
