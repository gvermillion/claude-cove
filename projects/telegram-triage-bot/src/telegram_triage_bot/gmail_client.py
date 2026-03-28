"""Gmail MCP client — async context manager wrapping the Gmail MCP subprocess.

Each instance opens one `npx @gongrzhe/server-gmail-autoauth-mcp` subprocess
for a single account and tears it down on exit. Instances are short-lived:
open at the start of a triage/draft/send operation, close when done.

IMPORTANT: Run `npm install -g @gongrzhe/server-gmail-autoauth-mcp` on the VPS
to cache the package globally and eliminate npx download latency on first use.

Pattern: Adapter (wraps MCP stdio protocol, shields callers from subprocess details).
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator

import structlog
from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.types import Tool as McpTool

log = structlog.get_logger(__name__)

# Account identifiers → credential subdirectory names (same as account names).
ACCOUNT_CREDENTIAL_DIRS: dict[str, str] = {
    "phdata": "phdata",
    "pgmc": "pgmc",
    "multdems": "multdems",
    "personal": "personal",
}


def _build_server_params(account: str, credentials_base: str) -> StdioServerParameters:
    """Build StdioServerParameters for a given account.

    The MCP server reads credentials from GMAIL_CREDENTIALS_PATH. We inherit
    the full current environment so npx has access to PATH, NODE_PATH, etc.,
    then override only the credential path.

    Args:
        account: Account identifier (e.g. "phdata").
        credentials_base: Base directory containing per-account credential subdirs.

    Returns:
        StdioServerParameters ready to pass to stdio_client.

    Raises:
        ValueError: If account is not recognized.
    """
    if account not in ACCOUNT_CREDENTIAL_DIRS:
        raise ValueError(
            f"Unknown account '{account}'. Valid: {list(ACCOUNT_CREDENTIAL_DIRS)}"
        )

    cred_dir = Path(credentials_base).expanduser() / ACCOUNT_CREDENTIAL_DIRS[account]
    # Trailing slash is required by the MCP server to locate credentials.json correctly.
    cred_path = str(cred_dir) + "/"

    return StdioServerParameters(
        command="npx",
        args=["-y", "@gongrzhe/server-gmail-autoauth-mcp"],
        env={**os.environ, "GMAIL_CREDENTIALS_PATH": cred_path},
    )


@asynccontextmanager
async def gmail_session(
    account: str,
    credentials_base: str,
) -> AsyncIterator[ClientSession]:
    """Async context manager providing an authenticated Gmail MCP session.

    Opens the MCP subprocess, initializes the session, and yields the
    ClientSession. On exit, tears down the session and subprocess cleanly.

    Args:
        account: Account identifier (e.g. "phdata").
        credentials_base: Base path for credential subdirectories.

    Yields:
        Initialized mcp.ClientSession ready for tool calls.

    Example:
        >>> async with gmail_session("phdata", "~/.gmail-mcp") as session:
        ...     result = await session.list_tools()
    """
    params = _build_server_params(account, credentials_base)
    log.info("gmail_mcp_starting", account=account, command=params.command)

    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            log.info(
                "gmail_mcp_ready",
                account=account,
                tool_count=len(tools.tools),
                tool_names=[t.name for t in tools.tools],
            )
            yield session

    log.info("gmail_mcp_closed", account=account)


async def list_tools(session: ClientSession) -> list[McpTool]:
    """Return the list of tools available on an initialized MCP session.

    Args:
        session: An initialized ClientSession from gmail_session().

    Returns:
        List of McpTool objects describing available Gmail operations.
    """
    result = await session.list_tools()
    return result.tools


async def call_tool(
    session: ClientSession,
    name: str,
    arguments: dict[str, Any],
) -> str:
    """Call a Gmail MCP tool and return its text output.

    Args:
        session: An initialized ClientSession.
        name: Tool name (e.g. "search_emails", "send_email").
        arguments: Tool input arguments.

    Returns:
        Concatenated text content from all content blocks in the tool result.

    Raises:
        RuntimeError: If the tool returns an error result.
    """
    log.debug("mcp_tool_call", tool=name, arguments=arguments)
    result = await session.call_tool(name, arguments)

    if result.isError:
        error_text = " ".join(
            item.text for item in result.content if hasattr(item, "text")
        )
        log.error("mcp_tool_error", tool=name, error=error_text)
        raise RuntimeError(f"MCP tool '{name}' returned an error: {error_text}")

    text_parts = [item.text for item in result.content if hasattr(item, "text")]
    output = "\n".join(text_parts)
    log.debug("mcp_tool_result", tool=name, output_length=len(output))
    return output


def mcp_tools_as_anthropic_defs(tools: list[McpTool]) -> list[dict[str, Any]]:
    """Convert MCP tool definitions to the Anthropic API tool definition format.

    The Anthropic API expects tools as dicts with name, description, and
    input_schema. MCP tools expose the same fields with slightly different
    attribute names.

    Args:
        tools: List of McpTool objects from session.list_tools().

    Returns:
        List of tool definition dicts suitable for the Anthropic messages API.
    """
    return [
        {
            "name": t.name,
            "description": t.description or "",
            "input_schema": t.inputSchema if isinstance(t.inputSchema, dict) else t.inputSchema.model_dump(),
        }
        for t in tools
    ]
