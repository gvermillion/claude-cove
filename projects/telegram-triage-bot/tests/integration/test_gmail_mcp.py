"""Integration tests for the Gmail MCP client.

These tests require:
  - npm and npx available on PATH
  - ~/.gmail-mcp/{account}/ directories with valid OAuth credentials
  - The @gongrzhe/server-gmail-autoauth-mcp package installed globally

Skip automatically when credentials are absent. Run explicitly with:
    pytest tests/integration -m integration

IMPORTANT: These tests open real MCP subprocesses and make live Gmail API calls.
Do NOT run against production accounts in a shared CI environment.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from telegram_triage_bot.gmail_client import call_tool, gmail_session, list_tools


pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _credentials_exist(account: str) -> bool:
    """Return True if OAuth credentials for the account are present."""
    cred_dir = Path("~/.gmail-mcp").expanduser() / account
    return (cred_dir / "credentials.json").exists() or (cred_dir / "token.json").exists()


@pytest.fixture
def credentials_base() -> str:
    return str(Path("~/.gmail-mcp").expanduser())


@pytest.fixture
def phdata_account(credentials_base: str) -> str:
    if not _credentials_exist("phdata"):
        pytest.skip("Gmail credentials not found for account 'phdata'")
    return "phdata"


# ---------------------------------------------------------------------------
# Tests: gmail_session
# ---------------------------------------------------------------------------


class TestGmailSession:
    """Integration tests for the MCP subprocess lifecycle."""

    @pytest.mark.asyncio
    async def test_session_opens_and_closes_cleanly(
        self,
        phdata_account: str,
        credentials_base: str,
    ) -> None:
        # Arrange / Act — open a session and immediately exit
        async with gmail_session(phdata_account, credentials_base) as session:
            assert session is not None
        # No exception = clean teardown

    @pytest.mark.asyncio
    async def test_list_tools_returns_nonempty_list(
        self,
        phdata_account: str,
        credentials_base: str,
    ) -> None:
        async with gmail_session(phdata_account, credentials_base) as session:
            tools = await list_tools(session)

        assert len(tools) > 0

    @pytest.mark.asyncio
    async def test_list_tools_includes_expected_gmail_operations(
        self,
        phdata_account: str,
        credentials_base: str,
    ) -> None:
        async with gmail_session(phdata_account, credentials_base) as session:
            tools = await list_tools(session)

        tool_names = {t.name for t in tools}
        # The MCP server should expose at minimum a search/list and send capability.
        assert any("email" in name.lower() or "mail" in name.lower() for name in tool_names), (
            f"No email-related tools found. Got: {tool_names}"
        )

    @pytest.mark.asyncio
    async def test_each_tool_has_name_and_schema(
        self,
        phdata_account: str,
        credentials_base: str,
    ) -> None:
        async with gmail_session(phdata_account, credentials_base) as session:
            tools = await list_tools(session)

        for tool in tools:
            assert tool.name, "Tool missing name"
            assert tool.inputSchema is not None, f"Tool '{tool.name}' missing inputSchema"


# ---------------------------------------------------------------------------
# Tests: call_tool
# ---------------------------------------------------------------------------


class TestCallTool:
    """Integration tests for tool invocation through the MCP session."""

    @pytest.mark.asyncio
    async def test_list_emails_returns_string(
        self,
        phdata_account: str,
        credentials_base: str,
    ) -> None:
        # Arrange — find the list/search tool name dynamically
        async with gmail_session(phdata_account, credentials_base) as session:
            tools = await list_tools(session)
            tool_names = {t.name for t in tools}

            # Find a listing tool (name varies by MCP server version)
            list_tool = next(
                (n for n in tool_names if "list" in n.lower() and "email" in n.lower()),
                None,
            )
            if not list_tool:
                pytest.skip(f"No list_emails-style tool found. Available: {tool_names}")

            result = await call_tool(session, list_tool, {"maxResults": 1})

        assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_unknown_tool_raises_runtime_error(
        self,
        phdata_account: str,
        credentials_base: str,
    ) -> None:
        async with gmail_session(phdata_account, credentials_base) as session:
            with pytest.raises(RuntimeError):
                await call_tool(session, "this_tool_does_not_exist", {})
