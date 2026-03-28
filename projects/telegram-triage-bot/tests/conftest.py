"""Shared pytest fixtures and marker registration for the full test suite.

Fixtures defined here are available to all test modules without explicit import.
The conftest also registers custom markers so pytest does not warn about unknown
marker names.
"""

from __future__ import annotations

import pyotp
import pytest

from telegram_triage_bot.config import Settings
from telegram_triage_bot.models import DraftState, SessionState, TriageItem


# ---------------------------------------------------------------------------
# Shared settings factory
# ---------------------------------------------------------------------------

OWNER_CHAT_ID = 99999
_TOTP_SECRET = pyotp.random_base32()


@pytest.fixture
def settings() -> Settings:
    """A Settings instance with fake but structurally valid values."""
    return Settings(
        telegram_bot_token="fake_bot_token",
        owner_chat_id=OWNER_CHAT_ID,
        anthropic_api_key="sk-ant-fake",
        totp_secret=_TOTP_SECRET,
        totp_grace_minutes=20,
    )  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# Shared model factories
# ---------------------------------------------------------------------------


@pytest.fixture
def sample_item() -> TriageItem:
    """A TriageItem with sensible defaults for use in higher-level tests."""
    return TriageItem(
        account="phdata",
        sender="alice@example.com",
        subject="Meeting tomorrow",
        urgency="normal",
        action="reply",
        reasoning="Sender expects a response.",
        body_snippet="Can we meet at 2pm?",
        is_sensitive=False,
        thread_id="thread_abc123",
        message_id="msg_xyz456",
    )


@pytest.fixture
def sample_draft(sample_item: TriageItem) -> DraftState:
    """A DraftState wrapping sample_item with a placeholder body."""
    return DraftState(item=sample_item, draft_body="Thanks for reaching out.")


@pytest.fixture
def active_session(sample_item: TriageItem, sample_draft: DraftState) -> SessionState:
    """A SessionState with one pending draft and no TOTP pending."""
    session = SessionState(account="phdata")
    session.triage_items = [sample_item]
    session.current_draft = sample_draft
    return session
