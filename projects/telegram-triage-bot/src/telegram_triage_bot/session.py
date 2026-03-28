"""In-memory session store for the Telegram triage bot.

Single-owner design: at most one active session at any time, keyed by chat_id.
State is lost on bot restart — callers must handle the None case and prompt
the user to run /triage again.

Pattern: Repository (wraps a plain dict, exposes get/set/clear).
"""

from __future__ import annotations

import structlog

from .models import SessionState

log = structlog.get_logger(__name__)


class SessionStore:
    """In-memory store for per-chat SessionState objects.

    Thread-safety: python-telegram-bot v21 runs handlers on a single asyncio
    event loop (no concurrent handler execution for the same update), so no
    locking is needed for the single-owner use case.
    """

    def __init__(self) -> None:
        """Initialize an empty session store."""
        self._sessions: dict[int, SessionState] = {}

    def get(self, chat_id: int) -> SessionState | None:
        """Return the active session for a chat, or None if no session exists.

        Args:
            chat_id: Telegram chat ID.

        Returns:
            Active SessionState, or None.
        """
        return self._sessions.get(chat_id)

    def set(self, chat_id: int, state: SessionState) -> None:
        """Store or replace the session for a chat.

        Args:
            chat_id: Telegram chat ID.
            state: SessionState to store.
        """
        self._sessions[chat_id] = state
        log.debug("session_updated", chat_id=chat_id, account=state.account)

    def clear(self, chat_id: int) -> None:
        """Remove the session for a chat. No-op if no session exists.

        Args:
            chat_id: Telegram chat ID.
        """
        removed = self._sessions.pop(chat_id, None)
        if removed:
            log.info("session_cleared", chat_id=chat_id, account=removed.account)

    def has_active_session(self, chat_id: int) -> bool:
        """Return True if an active session exists for this chat.

        Args:
            chat_id: Telegram chat ID.

        Returns:
            True if a session is stored.
        """
        return chat_id in self._sessions


# Module-level singleton — imported directly by handlers and triage_agent.
store = SessionStore()
