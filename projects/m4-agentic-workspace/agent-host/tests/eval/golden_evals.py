"""Golden eval dataset for M4 agent signal extraction.

Each case was derived from real Granola meeting notes. The expected signals
represent ground-truth labels: reviewable, non-exhaustive, but specific enough
to measure recall without being so broad that any output passes.

Matching strategy:
- Entities: case-insensitive name substring match
- Risks / Opportunities / Tasks: keyword set overlap (>=2 of N keywords required)
- Severity / type / relationship: exact string match when scored

Usage:
    uv run python tests/eval/run_evals.py --url http://localhost:8003
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ExpectedEntity:
    name: str  # substring match, case-insensitive
    relationship: str  # client | colleague | stakeholder | vendor | unknown
    title: str | None = None  # partial match if provided


@dataclass
class ExpectedRisk:
    keywords: list[str]  # >=2 must appear in description (case-insensitive)
    severity: str  # high | medium | low


@dataclass
class ExpectedOpportunity:
    keywords: list[str]  # >=2 must appear in description
    type: str  # expansion | workflow | lateral


@dataclass
class ExpectedTask:
    keywords: list[str]  # >=2 must appear in description
    owner: str | None = None  # substring match if provided


@dataclass
class EvalCase:
    id: str
    title: str
    meeting_date: str
    transcript: str
    entities: list[ExpectedEntity] = field(default_factory=list)
    risks: list[ExpectedRisk] = field(default_factory=list)
    opportunities: list[ExpectedOpportunity] = field(default_factory=list)
    tasks: list[ExpectedTask] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Case 1: phData / CrowdStrike Polaris Project Sync  (Apr 17, 2026)
# Source: client-facing multi-party project sync, technical + operational content
# Signal richness: high tasks, medium risks (PTO/permissions), lateral opportunities
# ---------------------------------------------------------------------------
POLARIS_SYNC = EvalCase(
    id="polaris-sync-2026-04-17",
    title="phData_CrowdStrike Polaris Project Sync",
    meeting_date="2026-04-17",
    transcript="""
Gabriel deployed a new semantic model for the Cortex Analyst with S1 pipe metrics.
All metrics are included except S1 pipe expansion, which is not yet available in the
production dataset. Gabriel used weighted averages instead of sums for mathematical
accuracy. The model was deployed to the dev agent for testing.

Grant demonstrated the Agent Management Platform front-end evaluation and deployment
tool. It uses progressive disclosure: simple for end users, full functionality for
technical users. It manages multiple agents, runs evaluations, monitors performance,
and includes an interactive semantic model learning visualization with live coverage
maps. The full improvement pipeline includes feedback collection and judge calibration.
Architecture runs locally but connects to Snowflake; Snowpark Container Service is
preferred for SSO and user identity forwarding. All telemetry is stored in Snowflake
tables and is compatible with Prometheus and DataDog. The platform is also being
ported to AWS Agent Forge and could be embedded in Drive Nexus for complete system
visibility.

Chakra completed a 20 to 40 metrics expansion in minimal development time, adding
17 digital metrics definitions and demonstrating the before/after capability live
in Slack. The system includes a feedback mechanism and context reset functionality.

The team plans to run a side-by-side comparison between Cortex Analyst and Drive
Nexus agents using the same 40 questions and identical scoring methodology. The
framework creates temporary agent copies for testing with 15-dimensional scoring
using TruLens evaluation judges.

Access requirements: Chakra needs to grant ownership and permissions to the phData
developer role before going on PTO. Gabriel needs to validate end-to-end access
via a test query. The team needs a copy of the semantic model definitions as backup
and backend table access for telemetry data.

Next steps:
- Chakra to grant permissions to phData team before PTO
- Gabriel to validate end-to-end access via test query
- Complete Drive Nexus vs Cortex Analyst evaluation next week
- Schedule deep-dive session on evaluation methodology when Chakra returns
- Deploy Gabriel's updates to dev Slack channel for testing
- Abby to run comparisons between new logo vs expansion metrics
""",
    entities=[
        ExpectedEntity("Saichakravarthy Annam", "stakeholder", "CrowdStrike"),
        ExpectedEntity("Abby Liu", "stakeholder", "CrowdStrike"),
        ExpectedEntity("Gabriel Viana", "colleague"),
        ExpectedEntity("Maria Schumacher", "colleague"),
        ExpectedEntity("Stephanie Ortgies", "colleague"),
    ],
    risks=[
        ExpectedRisk(["chakra", "pto", "permissions"], "high"),
        ExpectedRisk(["s1", "pipe", "expansion", "production"], "medium"),
        ExpectedRisk(["access", "permissions", "phdata", "developer"], "medium"),
    ],
    opportunities=[
        ExpectedOpportunity(["agent", "management", "platform", "drive nexus", "embed"], "expansion"),
        ExpectedOpportunity(["prometheus", "datadog", "telemetry", "observability"], "lateral"),
        ExpectedOpportunity(["aws", "agent forge", "port"], "lateral"),
    ],
    tasks=[
        ExpectedTask(["chakra", "permissions", "phdata", "pto"], "Chakra"),
        ExpectedTask(["gabriel", "validate", "access", "test"], "Gabriel"),
        ExpectedTask(["drive nexus", "cortex analyst", "evaluation", "comparison"]),
        ExpectedTask(["gabriel", "updates", "dev", "slack", "deploy"], "Gabriel"),
        ExpectedTask(["abby", "new logo", "expansion", "metrics"], "Abby"),
        ExpectedTask(["deep-dive", "evaluation", "methodology", "chakra"]),
    ],
)


# ---------------------------------------------------------------------------
# Case 2: Trimble x phData Introduction  (Apr 8, 2026)
# Source: new prospect first meeting, discovery-heavy, many named stakeholders
# Signal richness: high entities (new contacts), high opportunities (discovery work),
#                  risks (internal friction, funding), clear next steps / tasks
# ---------------------------------------------------------------------------
TRIMBLE_INTRO = EvalCase(
    id="trimble-intro-2026-04-08",
    title="Trimble x phData Introduction",
    meeting_date="2026-04-08",
    transcript="""
Trimble is a 49-year-old company with a heavy acquisition strategy. A new CEO
(5 years ago) shifted strategy from letting acquisitions operate independently
to connecting them to scale. They are currently consolidating from 32 ERPs to 1
and from 30 CRMs to 1.

Trimble has three divisions: Transportation and Logistics (15%), Field Systems
(40%), and AECO construction software (45%), which is the growth vehicle. Average
employee tenure is 12 years with some at 36+ years. They have a strong AWS and
Snowflake partnership with embedded teams 3 to 4 times per week.

Sergio Valenzuela is 7 months at Trimble, previously at Salesforce and Adidas.
He reports to Chris Buckler, Head of Platform, under new CIO Chris B. Sergio
leads enterprise data management strategy covering metadata management, master data
quality, data engineering, and architecture. His Data Enabling Decision Group meets
bi-weekly and includes the CIO, CISO, Head of Legal, Chief of Staff, and Finance
Transformation. This group is fully empowered to make funding decisions.

Joe Mastroianni is the data counterpart on the Trimble side and should be included
in future discussions. Victor Solano and Sian Riebe also attended from Trimble.

Current challenges: Shadow data departments across the organization are using every
tool available. Field Systems does not know where data is created, who owns it, or
how it is consumed. Previous data governance attempts failed due to lack of funding.
They are currently using Purview, which is inadequate for a non-Microsoft shop.

Trimble has two separate AI teams: Internal AI (Avia T. Ion) focusing on code
analysis and process improvement, and Agentic AI (Tyler Miller, based in Netherlands)
building customer-facing products for an AI Studio marketplace. There is pressure to
ship by the Dimensions conference in Las Vegas this summer. They are switching from
Azure to AWS for new AI products. There is no governance or security process for AI
product evaluation yet.

Snowflake was recently announced as the enterprise data cloud partner, which caused
waves internally. They are evaluating metadata catalogs: Atlan (completing POC),
Kolibra, DataHub, Select Star, and Informatica. They want to move from Tableau to
conversational analytics.

There is potential friction between the Agentic AI team and external consultants due
to loyalty to internal teams. Funding for the Field Systems discovery work will be
challenging and may require creative partnership with AWS and Snowflake.

James in New Zealand was identified as a key stakeholder for Field Systems work.

Next steps:
- MSA/NDA execution to open deeper conversations
- Sergio to share RFP for Field Systems discovery work
- Include Joe Mastroianni in future discussions
- Share meeting recording with James and Joe
- Potential guest speaker opportunity: Vincent from phData AI strategy
""",
    entities=[
        ExpectedEntity("Sergio Valenzuela", "stakeholder", "Trimble"),
        ExpectedEntity("Joe Mastroianni", "stakeholder", "Trimble"),
        ExpectedEntity("Victor Solano", "stakeholder", "Trimble"),
        ExpectedEntity("Melissa Bielagus", "colleague"),
        ExpectedEntity("Eric Schoch", "colleague"),
        ExpectedEntity("Jordan Birdsell", "colleague"),
    ],
    risks=[
        ExpectedRisk(["friction", "agentic", "internal", "consultants", "loyalty"], "medium"),
        ExpectedRisk(["funding", "field systems", "discovery", "challenge"], "medium"),
        ExpectedRisk(["dimensions", "conference", "pressure", "ship", "deadline"], "high"),
        ExpectedRisk(["governance", "security", "ai", "evaluation", "missing"], "medium"),
    ],
    opportunities=[
        ExpectedOpportunity(["field systems", "data", "landscape", "assessment", "snowflake"], "expansion"),
        ExpectedOpportunity(["data products", "snowflake", "marketplace", "monetize"], "expansion"),
        ExpectedOpportunity(["ai governance", "security", "process", "ai product"], "workflow"),
        ExpectedOpportunity(["conversational analytics", "tableau", "replace"], "expansion"),
    ],
    tasks=[
        ExpectedTask(["msa", "nda", "execute"]),
        ExpectedTask(["sergio", "rfp", "field systems"], "Sergio"),
        ExpectedTask(["joe mastroianni", "future", "include"], ),
        ExpectedTask(["recording", "james", "joe", "share"]),
        ExpectedTask(["vincent", "guest speaker", "ai strategy"]),
    ],
)


# ---------------------------------------------------------------------------
# Case 3: Jordy / Grant 1:1  (Apr 16, 2026)
# Source: peer engineering 1:1, technical + project updates, personal rapport
# Signal richness: medium tasks, medium risks (timeline + technical), rapport notes
# ---------------------------------------------------------------------------
JORDY_GRANT_1ON1 = EvalCase(
    id="jordy-grant-1on1-2026-04-16",
    title="Jordy / Grant",
    meeting_date="2026-04-16",
    transcript="""
Jordy gave an update on the Brazil employment transition. phData is converting
Brazil contractors to CLT employees, resulting in about a 30% decrease in monthly
take-home pay, partially offset by FGTS fund contributions and benefits. Jordy is
not concerned about the transition and is grateful for employment stability given
industry layoffs. He sees long-term value in worker protections and is positive
about potential Brazil leadership opportunities. Some team members have strong
complaints about reduced take-home pay, taxes, and health insurance coverage in
certain regions.

MetroTech Phase 2 has 1.5 weeks remaining to deliver all features. After three
meetings with the client, the team completed an SOW review using AI to generate
a detailed spreadsheet mapping all requirements to user stories. Most items are
covered except for problematic ingestions from Phase 1. Brandon is discussing
ingestion scope with Tyler. Jordy hit his Claude quota but has a MetroTech
subscription for parallel work.

Grant shared token optimization techniques for Claude: a Rust-based bash command
interceptor to reduce unnecessary output and pre/post tool hooks to prevent redundant
file reads. Users are reporting millions of tokens saved monthly.

Jordy is experimenting with DSPy for prompt optimization. He built a LiteLLM proxy
server to handle Snowflake rate limits with cooldown and retry logic. Optimization
runs take 8 or more hours due to sequential processing. He is missing intermediate
step logging in DSPy and cannot show the full optimization progression to the client.

Grant's evaluation framework is nearly ready. The backend is functional with 13
judges analyzing agent performance. The frontend demo mode is broken and needs fixes.
The system breaks prompts into modules mapped to failure modes and produces
optimization reports showing before-and-after changes.

Grant mentioned planning an agentic plan cache layer with a RAG component to cache
complex query reasoning and reduce token usage on repeated complex questions.
""",
    entities=[
        ExpectedEntity("Jordy Antunes", "colleague"),
        ExpectedEntity("Brandon", "colleague"),
    ],
    risks=[
        ExpectedRisk(["metrotech", "phase 2", "1.5 weeks", "deliver", "deadline"], "high"),
        ExpectedRisk(["ingestion", "phase 1", "problematic", "unresolved"], "medium"),
        ExpectedRisk(["brazil", "clt", "transition", "complaints", "team"], "medium"),
        ExpectedRisk(["dspy", "sequential", "8 hours", "optimization", "slow"], "low"),
    ],
    opportunities=[
        ExpectedOpportunity(["token optimization", "claude", "rust", "interceptor", "hooks"], "workflow"),
        ExpectedOpportunity(["plan cache", "rag", "agentic", "token", "reduce"], "workflow"),
    ],
    tasks=[
        ExpectedTask(["brandon", "ingestion", "scope", "tyler"], "Brandon"),
        ExpectedTask(["frontend", "demo", "broken", "fix", "evaluation"], "Grant"),
        ExpectedTask(["plan cache", "rag", "agentic", "implement"], "Grant"),
    ],
)


# ---------------------------------------------------------------------------
# Case 4: ML Practice Strategy Meeting  (Apr 14, 2026)
# Source: large internal practice meeting, pipeline/staffing/tech strategy
# Signal richness: very high opportunities (pipeline), high risks (pipeline, utilization),
#                  medium tasks (cross-functional), many entities
# ---------------------------------------------------------------------------
ML_PRACTICE_STRATEGY = EvalCase(
    id="ml-practice-strategy-2026-04-14",
    title="ML Practice Strategy Meeting",
    meeting_date="2026-04-14",
    transcript="""
Brian Cohn Welke joined as Principal ML Solutions Architect. He has a PhD in
computer science, 10+ years of ML and data science experience, and specializes
in healthcare, life sciences, and energy sectors. He has a background in autonomous
vehicles, surgical innovations, and medical imaging. He is located in Colorado.
Eric Carpenter won the Milwaukee meatball competition over the weekend.

Current utilization is trending around 70 to 75% and dropping off in coming weeks.
Three new MLEs are on the bench: Latium, Lucas, Bruno, and David. Bruno is
interviewing at Chick-fil-A for a restaurant operations opportunity. Nikke is leaving
the organization and needs to be backfilled at Chick-fil-A. Upcoming opportunities
include Leonard, InterNova, and Precisely. George is likely going to Leonard, kicking
off next week. A Latium MLE needs to be identified for Precisely starting next week.
CrowdStrike legal is still in progress but showing a positive tone shift and is within
one to two weeks of closing.

Pipeline analysis showed $12M in pipeline vanished from Q1, $9M appeared in Q3.
Current pipeline is around $18M and the team needs to close two-thirds to hit the
$12.5M target. Q-IT dropped from $5M to $1.25M with no clear explanation. Stride
remains the largest opportunity and could take $5M immediately. Norwegian Cruise Lines
is a $700K opportunity that was pitched successfully yesterday. Andrew is seeking
volunteers to shadow pipeline analysis work.

A "wait and see" objection is emerging from clients blocking deals. Precisely is
debating MCP integration versus waiting for Snowflake releases. Solutions discussed:
connect with Laura Martinelli, the Snowflake partner solutions engineer; access the
product roadmap through partner channels; emphasize preserving optionality. Garrett
was designated as the ML practice point person for the Snowflake product roadmap.

Murray Webb is flying to Minneapolis Monday for a big AWS review with Brian. Recent
wins include a Workday demo with the data services accelerator that got a resounding
yes, Cook Unity that kicked off with potential downstream engagements, and Digital
Lock requesting direct engagement training. A Delta meeting is planned for May with
Todd in Atlanta. CrowdStrike was identified as an AWS and Snowflake opportunity.

Omar's skills-based agentic delivery framework targets reducing talk-to-data projects
from 6 to 8 weeks down to 4 weeks, enabling fixed-bid pricing, and cutting costs from
roughly $100K to $40K per engagement. A marketing strategy meeting needs to be
scheduled with Grant, Omar, and Gary.
""",
    entities=[
        ExpectedEntity("Brian Cohn Welke", "colleague", "Principal ML Solutions Architect"),
        ExpectedEntity("Murray Webb", "colleague"),
        ExpectedEntity("Brandon Veber", "colleague"),
        ExpectedEntity("Andrew Evans", "colleague"),
        ExpectedEntity("Dominick Rocco", "colleague"),
        ExpectedEntity("Garrett Springer", "colleague"),
        ExpectedEntity("Eric Carpenter", "colleague"),
        ExpectedEntity("Elizabeth Dinevski", "colleague"),
    ],
    risks=[
        ExpectedRisk(["pipeline", "$12M", "vanished", "q1"], "high"),
        ExpectedRisk(["q-it", "dropped", "$5M", "$1.25M", "unexplained"], "high"),
        ExpectedRisk(["utilization", "70", "75%", "dropping"], "medium"),
        ExpectedRisk(["crowdstrike", "legal", "closing", "progress"], "high"),
        ExpectedRisk(["wait and see", "objection", "clients", "blocking"], "medium"),
        ExpectedRisk(["nikke", "leaving", "backfill"], "medium"),
    ],
    opportunities=[
        ExpectedOpportunity(["norwegian cruise lines", "$700K", "pitched"], "expansion"),
        ExpectedOpportunity(["stride", "$5M", "largest", "opportunity"], "expansion"),
        ExpectedOpportunity(["cook unity", "downstream", "engagements"], "expansion"),
        ExpectedOpportunity(["digital lock", "training", "engagement"], "expansion"),
        ExpectedOpportunity(["delta", "may", "atlanta"], "expansion"),
        ExpectedOpportunity(["agentic", "framework", "4 weeks", "fixed-bid", "cost"], "workflow"),
    ],
    tasks=[
        ExpectedTask(["murray", "minneapolis", "monday", "aws", "review"], "Murray"),
        ExpectedTask(["garrett", "snowflake", "product roadmap", "point person"], "Garrett"),
        ExpectedTask(["marketing", "strategy", "grant", "omar", "gary"]),
        ExpectedTask(["laura martinelli", "snowflake", "connect"]),
        ExpectedTask(["george", "leonard", "kicks off", "next week"], "George"),
        ExpectedTask(["latium", "precisely", "identify", "mle"]),
        ExpectedTask(["andrew", "pipeline", "analysis", "volunteers"], "Andrew"),
    ],
)


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------
ALL_CASES: list[EvalCase] = [
    POLARIS_SYNC,
    TRIMBLE_INTRO,
    JORDY_GRANT_1ON1,
    ML_PRACTICE_STRATEGY,
]
