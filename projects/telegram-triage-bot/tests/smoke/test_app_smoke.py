"""Smoke tests for app wiring, handler registration, and constant consistency.

These tests make no network calls and require no mocks. They verify that:
  - All modules import cleanly
  - build_application() wires up the expected number of handlers
  - Inline keyboards are structurally correct
  - Module-level constants are internally consistent
  - Pure functions in gmail_client behave correctly for valid/invalid inputs

Run with:  pytest tests/smoke -m smoke
Or as part of the full suite: pytest tests/
"""

from __future__ import annotations

from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

import pytest

from telegram_triage_bot.config import Settings
from telegram_triage_bot.gmail_client import (
    ACCOUNT_CREDENTIAL_DIRS,
    _build_server_params,
    mcp_tools_as_anthropic_defs,
)
from telegram_triage_bot.handlers import _draft_keyboard
from telegram_triage_bot.main import build_application
from telegram_triage_bot.models import VALID_ACCOUNTS
from telegram_triage_bot.prompts import ACCOUNT_PERSONAS, SYSTEM_PROMPT, TRIAGE_INSTRUCTION
from telegram_triage_bot.triage_agent import NEW_MESSAGES_SENTINEL


pytestmark = pytest.mark.smoke


# ---------------------------------------------------------------------------
# Import sanity
# ---------------------------------------------------------------------------


class TestImports:
    """Verify all public modules import without errors."""

    def test_config_importable(self) -> None:
        import telegram_triage_bot.config  # noqa: F401

    def test_models_importable(self) -> None:
        import telegram_triage_bot.models  # noqa: F401

    def test_session_importable(self) -> None:
        import telegram_triage_bot.session  # noqa: F401

    def test_formatting_importable(self) -> None:
        import telegram_triage_bot.formatting  # noqa: F401

    def test_gmail_client_importable(self) -> None:
        import telegram_triage_bot.gmail_client  # noqa: F401

    def test_prompts_importable(self) -> None:
        import telegram_triage_bot.prompts  # noqa: F401

    def test_triage_agent_importable(self) -> None:
        import telegram_triage_bot.triage_agent  # noqa: F401

    def test_handlers_importable(self) -> None:
        import telegram_triage_bot.handlers  # noqa: F401

    def test_main_importable(self) -> None:
        import telegram_triage_bot.main  # noqa: F401


# ---------------------------------------------------------------------------
# App wiring
# ---------------------------------------------------------------------------


class TestBuildApplication:
    """Verify build_application() registers all expected handlers."""

    def test_returns_application_instance(self, settings: Settings) -> None:
        from telegram.ext import Application

        # Act
        app = build_application(settings)

        # Assert
        assert isinstance(app, Application)

    def test_registers_five_handlers(self, settings: Settings) -> None:
        # Arrange: 3 commands + 1 callback query + 1 message handler
        app = build_application(settings)

        # Count handlers across all groups
        total = sum(len(group) for group in app.handlers.values())
        assert total == 5

    def test_triage_command_registered(self, settings: Settings) -> None:
        from telegram.ext import CommandHandler

        app = build_application(settings)
        all_handlers = [h for group in app.handlers.values() for h in group]
        command_handlers = [h for h in all_handlers if isinstance(h, CommandHandler)]
        command_names = {name for h in command_handlers for name in h.commands}

        assert "triage" in command_names

    def test_status_and_cancel_registered(self, settings: Settings) -> None:
        from telegram.ext import CommandHandler

        app = build_application(settings)
        all_handlers = [h for group in app.handlers.values() for h in group]
        command_handlers = [h for h in all_handlers if isinstance(h, CommandHandler)]
        command_names = {name for h in command_handlers for name in h.commands}

        assert "status" in command_names
        assert "cancel" in command_names

    def test_callback_query_handler_registered(self, settings: Settings) -> None:
        from telegram.ext import CallbackQueryHandler

        app = build_application(settings)
        all_handlers = [h for group in app.handlers.values() for h in group]
        assert any(isinstance(h, CallbackQueryHandler) for h in all_handlers)

    def test_message_handler_registered(self, settings: Settings) -> None:
        from telegram.ext import MessageHandler

        app = build_application(settings)
        all_handlers = [h for group in app.handlers.values() for h in group]
        assert any(isinstance(h, MessageHandler) for h in all_handlers)


# ---------------------------------------------------------------------------
# Inline keyboard structure
# ---------------------------------------------------------------------------


class TestDraftKeyboard:
    """Verify the Approve/Edit/Skip keyboard is correctly structured."""

    def test_returns_inline_keyboard_markup(self) -> None:
        from telegram import InlineKeyboardMarkup

        keyboard = _draft_keyboard()
        assert isinstance(keyboard, InlineKeyboardMarkup)

    def test_has_one_row(self) -> None:
        keyboard = _draft_keyboard()
        assert len(keyboard.inline_keyboard) == 1

    def test_row_has_three_buttons(self) -> None:
        keyboard = _draft_keyboard()
        row = keyboard.inline_keyboard[0]
        assert len(row) == 3

    def test_button_callback_data_values(self) -> None:
        keyboard = _draft_keyboard()
        row = keyboard.inline_keyboard[0]
        data_values = {btn.callback_data for btn in row}
        assert data_values == {"approve", "edit", "skip"}


# ---------------------------------------------------------------------------
# Constant consistency
# ---------------------------------------------------------------------------


class TestConstantConsistency:
    """Verify module-level constants are internally consistent."""

    def test_valid_accounts_matches_credential_dirs(self) -> None:
        # VALID_ACCOUNTS (models.py) and ACCOUNT_CREDENTIAL_DIRS (gmail_client.py)
        # must reference the same account set.
        assert set(VALID_ACCOUNTS) == set(ACCOUNT_CREDENTIAL_DIRS.keys())

    def test_account_personas_covers_all_valid_accounts(self) -> None:
        # Every account must have a persona mapping so draft instructions can
        # always resolve a persona name.
        for account in VALID_ACCOUNTS:
            assert account in ACCOUNT_PERSONAS, f"Missing persona for account: {account}"

    def test_new_messages_sentinel_has_no_double_pipe(self) -> None:
        # The sentinel is split on "||" to extract the summary; the sentinel
        # itself must not contain that separator or parsing breaks.
        assert "||" not in NEW_MESSAGES_SENTINEL

    def test_system_prompt_is_nonempty(self) -> None:
        assert len(SYSTEM_PROMPT.strip()) > 100

    def test_triage_instruction_contains_account_placeholder(self) -> None:
        # Must be formattable with {account}; if the placeholder is missing the
        # instruction silently omits the account name.
        assert "{account}" in TRIAGE_INSTRUCTION


# ---------------------------------------------------------------------------
# _build_server_params (pure function)
# ---------------------------------------------------------------------------


class TestBuildServerParams:
    """Tests for the MCP subprocess parameter builder."""

    def test_valid_account_returns_params(self) -> None:
        params = _build_server_params("phdata", "~/.gmail-mcp")

        assert params.command == "npx"

    def test_args_include_mcp_package(self) -> None:
        params = _build_server_params("phdata", "~/.gmail-mcp")

        assert "@gongrzhe/server-gmail-autoauth-mcp" in params.args

    def test_credentials_path_set_in_env(self) -> None:
        params = _build_server_params("phdata", "~/.gmail-mcp")

        assert "GMAIL_CREDENTIALS_PATH" in (params.env or {})

    def test_credentials_path_has_trailing_slash(self) -> None:
        params = _build_server_params("phdata", "~/.gmail-mcp")

        cred_path: str = (params.env or {})["GMAIL_CREDENTIALS_PATH"]
        assert cred_path.endswith("/")

    def test_credentials_path_contains_account_subdir(self) -> None:
        params = _build_server_params("pgmc", "~/.gmail-mcp")

        cred_path: str = (params.env or {})["GMAIL_CREDENTIALS_PATH"]
        assert "pgmc" in cred_path

    def test_credentials_base_expanded(self) -> None:
        # ~ should be expanded to the actual home directory
        params = _build_server_params("phdata", "~/.gmail-mcp")

        cred_path: str = (params.env or {})["GMAIL_CREDENTIALS_PATH"]
        assert "~" not in cred_path

    def test_unknown_account_raises_value_error(self) -> None:
        with pytest.raises(ValueError, match="Unknown account"):
            _build_server_params("notanaccount", "~/.gmail-mcp")

    def test_all_valid_accounts_accepted(self) -> None:
        for account in VALID_ACCOUNTS:
            # Should not raise
            params = _build_server_params(account, "~/.gmail-mcp")
            assert params.command == "npx"


# ---------------------------------------------------------------------------
# mcp_tools_as_anthropic_defs (pure function)
# ---------------------------------------------------------------------------


def _mock_mcp_tool(
    name: str,
    description: str,
    input_schema: dict[str, Any],
) -> MagicMock:
    """Build a minimal mock McpTool."""
    tool = MagicMock()
    tool.name = name
    tool.description = description
    tool.inputSchema = input_schema
    return tool


class TestMcpToolsAsAnthropicDefs:
    """Tests for the MCP-to-Anthropic tool definition converter."""

    def test_empty_list_returns_empty(self) -> None:
        result = mcp_tools_as_anthropic_defs([])
        assert result == []

    def test_single_tool_converted(self) -> None:
        tool = _mock_mcp_tool(
            name="list_emails",
            description="List emails in inbox",
            input_schema={"type": "object", "properties": {}},
        )

        result = mcp_tools_as_anthropic_defs([tool])

        assert len(result) == 1
        assert result[0]["name"] == "list_emails"
        assert result[0]["description"] == "List emails in inbox"
        assert result[0]["input_schema"] == {"type": "object", "properties": {}}

    def test_none_description_becomes_empty_string(self) -> None:
        tool = _mock_mcp_tool(
            name="list_emails",
            description=None,  # type: ignore[arg-type]
            input_schema={"type": "object"},
        )

        result = mcp_tools_as_anthropic_defs([tool])

        assert result[0]["description"] == ""

    def test_multiple_tools_all_converted(self) -> None:
        tools = [
            _mock_mcp_tool("list_emails", "List", {"type": "object"}),
            _mock_mcp_tool("send_email", "Send", {"type": "object"}),
            _mock_mcp_tool("search_emails", "Search", {"type": "object"}),
        ]

        result = mcp_tools_as_anthropic_defs(tools)

        assert len(result) == 3
        names = [r["name"] for r in result]
        assert names == ["list_emails", "send_email", "search_emails"]

    def test_result_has_required_anthropic_keys(self) -> None:
        tool = _mock_mcp_tool("list_emails", "List", {"type": "object"})

        result = mcp_tools_as_anthropic_defs([tool])

        assert set(result[0].keys()) == {"name", "description", "input_schema"}
