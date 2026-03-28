"""Telegram bot for mobile review of AI-triaged email correspondence.

This package provides a Telegram bot interface to the correspondence agent,
enabling mobile access during the v0 proof-of-value period. The bot triages
Gmail inboxes via MCP servers, presents drafts for review, and sends approved
replies after TOTP verification.

Architecture:
    - config: pydantic-settings configuration
    - models: TriageItem, DraftState, SessionState data models
    - session: in-memory session store (single-user, no persistence)
    - prompts: system prompt constants (correspondence agent CLAUDE.md)
    - gmail_client: async context manager wrapping Gmail MCP subprocess
    - triage_agent: Anthropic API calls for triage, drafting, and send
    - formatting: Telegram MarkdownV2 formatting helpers
    - handlers: python-telegram-bot command and callback handlers
    - main: application entrypoint
"""
