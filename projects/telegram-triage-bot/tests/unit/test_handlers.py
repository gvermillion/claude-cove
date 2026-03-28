"""Unit tests for Telegram bot handlers.

Pure helper functions (_is_within_grace, _verify_totp, _owner_guard) are tested
directly. Async command and callback handlers are tested via mocked Telegram
Update and Context objects with the session store patched.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pyotp
import pytest
from telegram import Update

from telegram_triage_bot.config import Settings
from telegram_triage_bot.handlers import (
    _is_within_grace,
    _owner_guard,
    _verify_totp,
    button_callback,
    cancel_command,
    message_handler,
    status_command,
    triage_command,
)
from telegram_triage_bot.models import DraftState, SessionState, TriageItem

OWNER_ID = 99999
NON_OWNER_ID = 11111

# Fixed TOTP secret used for deterministic code generation in tests.
_TOTP_SECRET = pyotp.random_base32()


# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------


def _make_settings(
    owner_chat_id: int = OWNER_ID,
    grace_minutes: int = 20,
) -> Settings:
    """Build a Settings instance with test values."""
    return Settings(
        telegram_bot_token="fake_token",
        owner_chat_id=owner_chat_id,
        anthropic_api_key="sk-ant-fake",
        totp_secret=_TOTP_SECRET,
        totp_grace_minutes=grace_minutes,
    )  # type: ignore[call-arg]


def _make_item(**kwargs: Any) -> TriageItem:
    defaults: dict[str, Any] = {
        "account": "phdata",
        "sender": "alice@example.com",
        "subject": "Hello",
        "urgency": "normal",
        "action": "reply",
        "reasoning": "Needs a reply",
        "body_snippet": "Can we meet?",
        "is_sensitive": False,
        "thread_id": "thread_1",
        "message_id": "msg_1",
    }
    return TriageItem(**{**defaults, **kwargs})


def _make_session(**kwargs: Any) -> SessionState:
    defaults: dict[str, Any] = {"account": "phdata"}
    return SessionState(**{**defaults, **kwargs})


def _make_draft(item: TriageItem | None = None) -> DraftState:
    return DraftState(item=item or _make_item(), draft_body="Test draft body.")


def _make_update(
    chat_id: int = OWNER_ID,
    text: str = "",
) -> MagicMock:
    """Build a minimal Telegram Update mock for message/command handlers."""
    update = MagicMock(spec=Update)
    update.effective_chat = MagicMock()
    update.effective_chat.id = chat_id
    update.message = MagicMock()
    update.message.text = text
    update.message.reply_text = AsyncMock()
    update.callback_query = None
    return update


def _make_context(args: list[str] | None = None) -> MagicMock:
    """Build a minimal Telegram Context mock."""
    ctx = MagicMock()
    ctx.args = args or []
    ctx.bot = MagicMock()
    ctx.bot.send_message = AsyncMock()
    ctx.bot.edit_message_text = AsyncMock()
    ctx.bot.delete_message = AsyncMock()
    return ctx


def _make_callback_update(
    chat_id: int = OWNER_ID,
    data: str = "approve",
) -> MagicMock:
    """Build a Telegram Update mock for inline button callbacks."""
    update = MagicMock(spec=Update)
    update.effective_chat = MagicMock()
    update.effective_chat.id = chat_id
    update.message = None
    query = AsyncMock()
    query.data = data
    query.answer = AsyncMock()
    query.edit_message_text = AsyncMock()
    query.edit_message_reply_markup = AsyncMock()
    update.callback_query = query
    return update


# ---------------------------------------------------------------------------
# Tests: _is_within_grace
# ---------------------------------------------------------------------------


class TestIsWithinGrace:
    """Tests for the TOTP grace-period check."""

    def test_returns_false_when_never_verified(self) -> None:
        # Arrange
        session = _make_session()
        assert session.last_totp_verified_at is None

        # Act / Assert
        assert _is_within_grace(session, grace_minutes=20) is False

    def test_returns_true_when_verified_just_now(self) -> None:
        # Arrange
        session = _make_session()
        session.last_totp_verified_at = datetime.now(timezone.utc)

        # Act / Assert
        assert _is_within_grace(session, grace_minutes=20) is True

    def test_returns_true_when_verified_within_window(self) -> None:
        # Arrange — verified 10 minutes ago, grace is 20 minutes
        session = _make_session()
        session.last_totp_verified_at = datetime.now(timezone.utc) - timedelta(minutes=10)

        # Act / Assert
        assert _is_within_grace(session, grace_minutes=20) is True

    def test_returns_false_when_grace_period_expired(self) -> None:
        # Arrange — verified 25 minutes ago, grace is 20 minutes
        session = _make_session()
        session.last_totp_verified_at = datetime.now(timezone.utc) - timedelta(minutes=25)

        # Act / Assert
        assert _is_within_grace(session, grace_minutes=20) is False

    def test_respects_custom_grace_duration(self) -> None:
        # Arrange — verified 3 minutes ago, grace is 2 minutes
        session = _make_session()
        session.last_totp_verified_at = datetime.now(timezone.utc) - timedelta(minutes=3)

        # Act / Assert
        assert _is_within_grace(session, grace_minutes=2) is False
        assert _is_within_grace(session, grace_minutes=5) is True


# ---------------------------------------------------------------------------
# Tests: _verify_totp
# ---------------------------------------------------------------------------


class TestVerifyTotp:
    """Tests for TOTP code verification."""

    def test_valid_current_code_accepted(self) -> None:
        # Arrange — generate the current valid code
        totp = pyotp.TOTP(_TOTP_SECRET)
        current_code = totp.now()

        # Act / Assert
        assert _verify_totp(current_code, _TOTP_SECRET) is True

    def test_wrong_code_rejected(self) -> None:
        # Act / Assert
        assert _verify_totp("000000", _TOTP_SECRET) is False

    def test_strips_whitespace_before_verifying(self) -> None:
        # Arrange
        totp = pyotp.TOTP(_TOTP_SECRET)
        padded_code = f"  {totp.now()}  "

        # Act / Assert
        assert _verify_totp(padded_code, _TOTP_SECRET) is True

    def test_empty_string_rejected(self) -> None:
        # Act / Assert
        assert _verify_totp("", _TOTP_SECRET) is False

    def test_non_numeric_string_rejected(self) -> None:
        # Act / Assert
        assert _verify_totp("abcdef", _TOTP_SECRET) is False


# ---------------------------------------------------------------------------
# Tests: _owner_guard
# ---------------------------------------------------------------------------


class TestOwnerGuard:
    """Tests for the single-owner access control guard."""

    def test_returns_true_for_owner(self) -> None:
        # Arrange
        update = _make_update(chat_id=OWNER_ID)
        settings = _make_settings(owner_chat_id=OWNER_ID)

        # Act / Assert
        assert _owner_guard(update, settings) is True

    def test_returns_false_for_non_owner(self) -> None:
        # Arrange
        update = _make_update(chat_id=NON_OWNER_ID)
        settings = _make_settings(owner_chat_id=OWNER_ID)

        # Act / Assert
        assert _owner_guard(update, settings) is False

    def test_returns_false_when_no_effective_chat(self) -> None:
        # Arrange
        update = MagicMock(spec=Update)
        update.effective_chat = None
        settings = _make_settings()

        # Act / Assert
        assert _owner_guard(update, settings) is False


# ---------------------------------------------------------------------------
# Tests: triage_command
# ---------------------------------------------------------------------------


class TestTriageCommand:
    """Tests for the /triage command handler."""

    @pytest.mark.asyncio
    async def test_rejects_invalid_account(self) -> None:
        # Arrange
        update = _make_update(chat_id=OWNER_ID)
        context = _make_context(args=["notarealaccount"])
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = None

            # Act
            await triage_command(update, context, settings)

        # Assert — replied with usage hint, no triage started
        update.message.reply_text.assert_called_once()
        call_text: str = update.message.reply_text.call_args[0][0]
        assert "Usage" in call_text or "Valid accounts" in call_text

    @pytest.mark.asyncio
    async def test_rejects_concurrent_triage(self) -> None:
        # Arrange — session already has triage_in_progress
        existing_session = _make_session(triage_in_progress=True)
        update = _make_update(chat_id=OWNER_ID)
        context = _make_context(args=["phdata"])
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = existing_session

            # Act
            await triage_command(update, context, settings)

        # Assert
        update.message.reply_text.assert_called_once()
        call_text = update.message.reply_text.call_args[0][0]
        assert "in progress" in call_text.lower() or "cancel" in call_text.lower()

    @pytest.mark.asyncio
    async def test_drops_non_owner_message(self) -> None:
        # Arrange
        update = _make_update(chat_id=NON_OWNER_ID)
        context = _make_context(args=["phdata"])
        settings = _make_settings(owner_chat_id=OWNER_ID)

        # Act
        await triage_command(update, context, settings)

        # Assert — no reply sent to non-owner
        update.message.reply_text.assert_not_called()
        context.bot.send_message.assert_not_called()

    @pytest.mark.asyncio
    async def test_rejects_missing_account_argument(self) -> None:
        # Arrange — /triage with no argument
        update = _make_update(chat_id=OWNER_ID)
        context = _make_context(args=[])  # no args
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = None

            # Act
            await triage_command(update, context, settings)

        # Assert — usage hint shown
        update.message.reply_text.assert_called_once()


# ---------------------------------------------------------------------------
# Tests: status_command
# ---------------------------------------------------------------------------


class TestStatusCommand:
    """Tests for the /status command handler."""

    @pytest.mark.asyncio
    async def test_no_session_shows_prompt(self) -> None:
        # Arrange
        update = _make_update(chat_id=OWNER_ID)
        context = _make_context()
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = None

            # Act
            await status_command(update, context, settings)

        # Assert
        update.message.reply_text.assert_called_once()
        call_text = update.message.reply_text.call_args[0][0]
        assert "No active session" in call_text

    @pytest.mark.asyncio
    async def test_active_session_shows_account(self) -> None:
        # Arrange
        session = _make_session(account="pgmc")
        update = _make_update(chat_id=OWNER_ID)
        context = _make_context()
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = session

            # Act
            await status_command(update, context, settings)

        # Assert
        call_text = update.message.reply_text.call_args[0][0]
        assert "pgmc" in call_text

    @pytest.mark.asyncio
    async def test_shows_totp_grace_status_when_in_grace(self) -> None:
        # Arrange — recently verified
        session = _make_session()
        session.last_totp_verified_at = datetime.now(timezone.utc)
        update = _make_update(chat_id=OWNER_ID)
        context = _make_context()
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = session

            # Act
            await status_command(update, context, settings)

        call_text = update.message.reply_text.call_args[0][0]
        assert "grace" in call_text.lower()

    @pytest.mark.asyncio
    async def test_drops_non_owner(self) -> None:
        # Arrange
        update = _make_update(chat_id=NON_OWNER_ID)
        context = _make_context()
        settings = _make_settings()

        # Act
        await status_command(update, context, settings)

        # Assert
        update.message.reply_text.assert_not_called()


# ---------------------------------------------------------------------------
# Tests: cancel_command
# ---------------------------------------------------------------------------


class TestCancelCommand:
    """Tests for the /cancel command handler."""

    @pytest.mark.asyncio
    async def test_clears_session_and_confirms(self) -> None:
        # Arrange
        update = _make_update(chat_id=OWNER_ID)
        context = _make_context()
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            # Act
            await cancel_command(update, context, settings)

        # Assert
        mock_store.clear.assert_called_once_with(OWNER_ID)
        update.message.reply_text.assert_called_once()

    @pytest.mark.asyncio
    async def test_drops_non_owner(self) -> None:
        # Arrange
        update = _make_update(chat_id=NON_OWNER_ID)
        context = _make_context()
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            # Act
            await cancel_command(update, context, settings)

        # Assert
        mock_store.clear.assert_not_called()
        update.message.reply_text.assert_not_called()


# ---------------------------------------------------------------------------
# Tests: button_callback
# ---------------------------------------------------------------------------


class TestButtonCallback:
    """Tests for the inline keyboard callback handler."""

    @pytest.mark.asyncio
    async def test_stale_session_shows_expiry_message(self) -> None:
        # Arrange — no session exists
        update = _make_callback_update(chat_id=OWNER_ID, data="approve")
        context = _make_context()
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = None

            # Act
            await button_callback(update, context, settings)

        # Assert
        update.callback_query.edit_message_text.assert_called_once()

    @pytest.mark.asyncio
    async def test_session_with_no_current_draft_shows_expiry(self) -> None:
        # Arrange — session exists but no draft displayed
        session = _make_session()
        session.current_draft = None
        update = _make_callback_update(chat_id=OWNER_ID, data="approve")
        context = _make_context()
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = session

            # Act
            await button_callback(update, context, settings)

        update.callback_query.edit_message_text.assert_called_once()

    @pytest.mark.asyncio
    async def test_approve_within_grace_calls_execute_send(self) -> None:
        # Arrange — session with current draft, recently verified
        session = _make_session()
        session.current_draft = _make_draft()
        session.last_totp_verified_at = datetime.now(timezone.utc)
        update = _make_callback_update(chat_id=OWNER_ID, data="approve")
        context = _make_context()
        settings = _make_settings(grace_minutes=20)

        with (
            patch("telegram_triage_bot.handlers.store") as mock_store,
            patch("telegram_triage_bot.handlers._execute_send", new_callable=AsyncMock) as mock_send,
        ):
            mock_store.get.return_value = session

            # Act
            await button_callback(update, context, settings)

        # Assert — send was called directly without TOTP prompt
        mock_send.assert_called_once_with(OWNER_ID, context, settings)

    @pytest.mark.asyncio
    async def test_approve_outside_grace_prompts_for_totp(self) -> None:
        # Arrange — grace expired
        session = _make_session()
        session.current_draft = _make_draft()
        session.last_totp_verified_at = datetime.now(timezone.utc) - timedelta(hours=1)
        update = _make_callback_update(chat_id=OWNER_ID, data="approve")
        context = _make_context()
        settings = _make_settings(grace_minutes=20)

        with (
            patch("telegram_triage_bot.handlers.store") as mock_store,
            patch("telegram_triage_bot.handlers._execute_send", new_callable=AsyncMock) as mock_send,
        ):
            mock_store.get.return_value = session

            # Act
            await button_callback(update, context, settings)

        # Assert — send was NOT called; TOTP prompt was sent instead
        mock_send.assert_not_called()
        context.bot.send_message.assert_called_once()
        prompt_text: str = context.bot.send_message.call_args[1].get(
            "text", context.bot.send_message.call_args[0][0] if context.bot.send_message.call_args[0] else ""
        )
        assert "code" in prompt_text.lower() or "authenticator" in prompt_text.lower() or "🔐" in prompt_text

    @pytest.mark.asyncio
    async def test_approve_outside_grace_sets_awaiting_totp(self) -> None:
        # Arrange
        session = _make_session()
        session.current_draft = _make_draft()
        session.last_totp_verified_at = None  # never verified
        update = _make_callback_update(chat_id=OWNER_ID, data="approve")
        context = _make_context()
        settings = _make_settings()

        with (
            patch("telegram_triage_bot.handlers.store") as mock_store,
            patch("telegram_triage_bot.handlers._execute_send", new_callable=AsyncMock),
        ):
            mock_store.get.return_value = session

            # Act
            await button_callback(update, context, settings)

        # Assert — session saved with awaiting_totp = True
        saved_session: SessionState = mock_store.set.call_args[0][1]
        assert saved_session.awaiting_totp is True

    @pytest.mark.asyncio
    async def test_edit_sets_edit_pending_on_draft(self) -> None:
        # Arrange
        session = _make_session()
        session.current_draft = _make_draft()
        update = _make_callback_update(chat_id=OWNER_ID, data="edit")
        context = _make_context()
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = session

            # Act
            await button_callback(update, context, settings)

        # Assert — edit_pending set to True
        saved_session: SessionState = mock_store.set.call_args[0][1]
        assert saved_session.current_draft is not None
        assert saved_session.current_draft.edit_pending is True

    @pytest.mark.asyncio
    async def test_skip_clears_current_draft(self) -> None:
        # Arrange
        session = _make_session()
        session.current_draft = _make_draft()
        update = _make_callback_update(chat_id=OWNER_ID, data="skip")
        context = _make_context()
        settings = _make_settings()

        with (
            patch("telegram_triage_bot.handlers.store") as mock_store,
            patch("telegram_triage_bot.handlers._advance_to_next_draft", new_callable=AsyncMock),
        ):
            mock_store.get.return_value = session

            # Act
            await button_callback(update, context, settings)

        # Assert — current_draft cleared
        saved_session: SessionState = mock_store.set.call_args[0][1]
        assert saved_session.current_draft is None

    @pytest.mark.asyncio
    async def test_skip_advances_to_next_draft(self) -> None:
        # Arrange
        session = _make_session()
        session.current_draft = _make_draft()
        update = _make_callback_update(chat_id=OWNER_ID, data="skip")
        context = _make_context()
        settings = _make_settings()

        with (
            patch("telegram_triage_bot.handlers.store") as mock_store,
            patch("telegram_triage_bot.handlers._advance_to_next_draft", new_callable=AsyncMock) as mock_advance,
        ):
            mock_store.get.return_value = session

            # Act
            await button_callback(update, context, settings)

        mock_advance.assert_called_once_with(OWNER_ID, context, settings)

    @pytest.mark.asyncio
    async def test_drops_non_owner_callback(self) -> None:
        # Arrange
        update = _make_callback_update(chat_id=NON_OWNER_ID, data="approve")
        context = _make_context()
        settings = _make_settings(owner_chat_id=OWNER_ID)

        with patch("telegram_triage_bot.handlers._execute_send", new_callable=AsyncMock) as mock_send:
            # Act
            await button_callback(update, context, settings)

        mock_send.assert_not_called()


# ---------------------------------------------------------------------------
# Tests: message_handler
# ---------------------------------------------------------------------------


class TestMessageHandler:
    """Tests for the free-text message handler (TOTP and draft editing)."""

    @pytest.mark.asyncio
    async def test_no_session_prompts_to_start_triage(self) -> None:
        # Arrange
        update = _make_update(chat_id=OWNER_ID, text="hello")
        context = _make_context()
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = None

            # Act
            await message_handler(update, context, settings)

        update.message.reply_text.assert_called_once()
        call_text = update.message.reply_text.call_args[0][0]
        assert "No active session" in call_text

    @pytest.mark.asyncio
    async def test_valid_totp_triggers_execute_send(self) -> None:
        # Arrange
        session = _make_session()
        session.current_draft = _make_draft()
        session.awaiting_totp = True
        totp_code = pyotp.TOTP(_TOTP_SECRET).now()
        update = _make_update(chat_id=OWNER_ID, text=totp_code)
        context = _make_context()
        settings = _make_settings()

        with (
            patch("telegram_triage_bot.handlers.store") as mock_store,
            patch("telegram_triage_bot.handlers._execute_send", new_callable=AsyncMock) as mock_send,
        ):
            mock_store.get.return_value = session

            # Act
            await message_handler(update, context, settings)

        mock_send.assert_called_once_with(OWNER_ID, context, settings)

    @pytest.mark.asyncio
    async def test_valid_totp_updates_last_verified_at(self) -> None:
        # Arrange
        session = _make_session()
        session.current_draft = _make_draft()
        session.awaiting_totp = True
        session.last_totp_verified_at = None
        totp_code = pyotp.TOTP(_TOTP_SECRET).now()
        update = _make_update(chat_id=OWNER_ID, text=totp_code)
        context = _make_context()
        settings = _make_settings()

        with (
            patch("telegram_triage_bot.handlers.store") as mock_store,
            patch("telegram_triage_bot.handlers._execute_send", new_callable=AsyncMock),
        ):
            mock_store.get.return_value = session

            # Act
            await message_handler(update, context, settings)

        # Assert — last_totp_verified_at updated
        saved: SessionState = mock_store.set.call_args[0][1]
        assert saved.last_totp_verified_at is not None
        assert saved.awaiting_totp is False

    @pytest.mark.asyncio
    async def test_invalid_totp_shows_error_and_aborts_send(self) -> None:
        # Arrange
        session = _make_session()
        session.current_draft = _make_draft()
        session.awaiting_totp = True
        update = _make_update(chat_id=OWNER_ID, text="000000")  # wrong code
        context = _make_context()
        settings = _make_settings()

        with (
            patch("telegram_triage_bot.handlers.store") as mock_store,
            patch("telegram_triage_bot.handlers._execute_send", new_callable=AsyncMock) as mock_send,
        ):
            mock_store.get.return_value = session

            # Act
            await message_handler(update, context, settings)

        # Assert — send never called, error shown
        mock_send.assert_not_called()
        update.message.reply_text.assert_called_once()
        call_text = update.message.reply_text.call_args[0][0]
        assert "Invalid" in call_text or "❌" in call_text

    @pytest.mark.asyncio
    async def test_invalid_totp_clears_awaiting_flag(self) -> None:
        # Arrange
        session = _make_session()
        session.current_draft = _make_draft()
        session.awaiting_totp = True
        update = _make_update(chat_id=OWNER_ID, text="000000")
        context = _make_context()
        settings = _make_settings()

        with (
            patch("telegram_triage_bot.handlers.store") as mock_store,
            patch("telegram_triage_bot.handlers._execute_send", new_callable=AsyncMock),
        ):
            mock_store.get.return_value = session

            # Act
            await message_handler(update, context, settings)

        saved: SessionState = mock_store.set.call_args[0][1]
        assert saved.awaiting_totp is False

    @pytest.mark.asyncio
    async def test_edit_pending_updates_draft_body(self) -> None:
        # Arrange
        session = _make_session()
        draft = _make_draft()
        draft.edit_pending = True
        session.current_draft = draft
        new_text = "Here is my revised reply."
        update = _make_update(chat_id=OWNER_ID, text=new_text)
        context = _make_context()
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = session

            # Act
            await message_handler(update, context, settings)

        # Assert — draft body updated, edit_pending cleared
        saved: SessionState = mock_store.set.call_args[0][1]
        assert saved.current_draft is not None
        assert saved.current_draft.draft_body == new_text
        assert saved.current_draft.edit_pending is False

    @pytest.mark.asyncio
    async def test_edit_pending_redisplays_draft_with_keyboard(self) -> None:
        # Arrange
        session = _make_session()
        draft = _make_draft()
        draft.edit_pending = True
        session.current_draft = draft
        update = _make_update(chat_id=OWNER_ID, text="Updated draft text.")
        context = _make_context()
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = session

            # Act
            await message_handler(update, context, settings)

        # Assert — new message sent with reply_markup (the keyboard)
        context.bot.send_message.assert_called_once()
        call_kwargs = context.bot.send_message.call_args[1]
        assert call_kwargs.get("reply_markup") is not None

    @pytest.mark.asyncio
    async def test_unrecognized_message_shows_help(self) -> None:
        # Arrange — session exists but neither awaiting_totp nor edit_pending
        session = _make_session()
        session.awaiting_totp = False
        session.current_draft = None
        update = _make_update(chat_id=OWNER_ID, text="what do i do?")
        context = _make_context()
        settings = _make_settings()

        with patch("telegram_triage_bot.handlers.store") as mock_store:
            mock_store.get.return_value = session

            # Act
            await message_handler(update, context, settings)

        update.message.reply_text.assert_called_once()
        call_text = update.message.reply_text.call_args[0][0]
        assert "/triage" in call_text

    @pytest.mark.asyncio
    async def test_drops_non_owner_message(self) -> None:
        # Arrange
        update = _make_update(chat_id=NON_OWNER_ID, text="hello")
        context = _make_context()
        settings = _make_settings(owner_chat_id=OWNER_ID)

        # Act
        await message_handler(update, context, settings)

        # Assert — no reply sent
        update.message.reply_text.assert_not_called()
        context.bot.send_message.assert_not_called()
