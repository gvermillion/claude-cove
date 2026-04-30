# Omar / Grant: Skill-First Sync

**Date:** 2026-04-10
**Participants:** Grant Vermillion (phData), Omar Abid (phData)

### Agent Evaluation Platform Development Update

- Grant demonstrated comprehensive agent evaluation platform ("Rook")
  - Self-optimization loop with gradient descent algorithm
  - Runs until convergence or max steps reached
  - Targets worst-performing metrics for optimization
  - Includes overfitting/drift checks before deployment
- Front-end features progressive disclosure design
  - Demo mode with mock data available
  - Low-code/no-code interface for non-developers
  - Multi-agent management dashboard
  - Chat interface with monitoring agents
- Backend deployment to 311 agent nearly complete
  - Planning CrowdStrike deployment next week
  - Uses git submodules for integration
  - Requires 50-75 queries in golden evaluation set

### Market Readiness Discussion

- Dominic liked skills-first workflow from Omar's blog post
  - Wants to make it market-ready for broader team
  - Potential to pitch as fixed-bid offering with cost reduction
  - Could leverage well-defined process for Snowflake Cortex agents
- Grant's timeline for internal marketing
  - Goal: front-end/back-end connected to 311 agent by end of day
  - Demo ready for next week
  - Will use 311 agent as first internal deployment example
- Platform positioning as enterprise agent management solution

### Workflow Alignment & Next Steps

- Omar identified overlap between current workflows
  - Need to reorganize some skills to minimize duplication
  - Grant's setup skill assumes existing agent vs Omar's create agent skill
- Grant spent $15 in personal Claude credits over 6 days development
- Omar will review platform in detail and create PR after Grant's merges
- Grant acknowledged need for better delegation vs "hero ball" approach
