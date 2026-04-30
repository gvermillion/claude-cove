# phData / CrowdStrike Polaris Project Sync

**Date:** 2026-04-17
**Participants:** Grant Vermillion, Maria Schumacher, Gabriel Viana, Stephanie Ortgies (phData); Saichakravarthy Annam, Abby Liu (CrowdStrike)

### Cortex Analyst Updates
- Gabriel deployed new semantic model with S1 pipe metrics (all except S1 pipe expansion — not in prod dataset yet)
- Uses weighted averages instead of sums for mathematical accuracy; deployed to dev agent for testing
- Next steps: add S1 pipe expansion once in prod, deploy to dev Slack, Abby to compare new logo vs expansion metrics

### Agent Management Platform Demo
- Grant showcased front-end evaluation/deployment tool with progressive disclosure design
- Manages multiple agents, runs evaluations, monitors performance with live coverage maps
- Architecture: runs locally, connects to Snowflake; Snowpark Container Service preferred for SSO
- Telemetry stored in Snowflake (Prometheus/DataDog compatible); being ported to AWS Agent Forge; embeddable in Drive Nexus

### Drive Nexus Agent Expansion
- Chakra completed 20→40 metrics expansion, adding 17 digital metrics definitions; demonstrated live in Slack
- Includes feedback mechanism and context reset functionality; no plotting (interface limitations)

### Evaluation Framework Setup
- Side-by-side comparison: Cortex Analyst vs Drive Nexus agents, same 40 questions, 15-dimensional TruLens scoring
- Access requirements: Chakra grant permissions to phData developer role; Gabriel validate access via test query; get semantic model copy + backend table access

### Next Steps
- Chakra to grant permissions to phData team before PTO
- Gabriel to validate end-to-end access via test query
- Complete Drive Nexus vs Cortex Analyst evaluation next week
- Schedule deep-dive on evaluation methodology when Chakra returns
- Deploy Gabriel's updates to dev Slack for testing
- Abby to run comparisons between new logo vs expansion metrics
