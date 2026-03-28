"""Telegram bot handlers for the triage bot.

All handlers enforce the OWNER_CHAT_ID guard — any message from a non-owner
chat is silently dropped (logged at DEBUG level). This is the primary access
control boundary.

TOTP 2FA flow:
  Tap Approve → bot checks grace period → if expired, sends PIN prompt
  User sends 6-digit code → verified against TOTP_SECRET
  On success: last_totp_verified_at updated, send proceeds
  On failure: send aborted, draft re-displayed

Callback data format:
  "approve"  — user tapped Approve on current draft
  "edit"     — user tapped Edit on current draft
  "skip"     — user tapped Skip on current draft
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pyotp
import structlog
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import ContextTypes

from .config import Settings
from .formatting import (
    format_draft_preview,
    format_sensitive_item,
    format_triage_summary,
)
from .gmail_client import gmail_session
from .models import DraftState, SessionState, TriageItem, VALID_ACCOUNTS
from .session import store
from .triage_agent import (
    NEW_MESSAGES_SENTINEL,
    generate_draft,
    run_triage,
    send_reply,
)

log = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _draft_keyboard() -> InlineKeyboardMarkup:
    """Build the Approve / Edit / Skip inline keyboard for draft review."""
    return InlineKeyboardMarkup(
        [[
            InlineKeyboardButton("✅ Approve", callback_data="approve"),
            InlineKeyboardButton("✏️ Edit", callback_data="edit"),
            InlineKeyboardButton("⏭️ Skip", callback_data="skip"),
        ]]
    )


def _is_within_grace(session: SessionState, grace_minutes: int) -> bool:
    """Return True if the session is within the TOTP grace period.

    Args:
        session: Current session state.
        grace_minutes: Grace period length in minutes.

    Returns:
        True if last TOTP verification was recent enough to skip re-auth.
    """
    if session.last_totp_verified_at is None:
        return False
    elapsed = datetime.now(timezone.utc) - session.last_totp_verified_at
    return elapsed < timedelta(minutes=grace_minutes)


def _verify_totp(code: str, secret: str) -> bool:
    """Verify a TOTP code against the secret.

    Uses a ±1 window (±30 seconds) to accommodate clock drift.

    Args:
        code: 6-digit code from the authenticator app.
        secret: Base32 TOTP secret from settings.

    Returns:
        True if the code is valid.
    """
    return pyotp.TOTP(secret).verify(code.strip(), valid_window=1)


def _owner_guard(update: Update, settings: Settings) -> bool:
    """Return True if the update is from the authorized owner chat.

    Logs and drops all non-owner interactions silently.

    Args:
        update: Incoming Telegram update.
        settings: Application settings containing owner_chat_id.

    Returns:
        True if authorized, False if not.
    """
    chat_id = update.effective_chat.id if update.effective_chat else None
    if chat_id != settings.owner_chat_id:
        log.debug("unauthorized_interaction", chat_id=chat_id)
        return False
    return True


async def _advance_to_next_draft(
    chat_id: int,
    context: ContextTypes.DEFAULT_TYPE,
    settings: Settings,
) -> None:
    """Generate and display the next pending draft, or show completion message.

    Pops the first item from pending_drafts, generates a draft via the agent,
    and sends it to Telegram with the Approve/Edit/Skip keyboard. If no drafts
    remain, sends the "all done" summary.

    Args:
        chat_id: Telegram chat ID.
        context: python-telegram-bot context for sending messages.
        settings: Application settings.
    """
    session = store.get(chat_id)
    if not session:
        return

    # Handle sensitive items first — no drafting, just show them.
    while session.pending_drafts:
        next_item = session.pending_drafts[0].item
        if next_item.is_sensitive:
            session.pending_drafts.pop(0)
            store.set(chat_id, session)
            await context.bot.send_message(
                chat_id=chat_id,
                text=format_sensitive_item(next_item),
                parse_mode=ParseMode.MARKDOWN_V2,
            )
            continue
        break

    if not session.pending_drafts:
        session.current_draft = None
        store.set(chat_id, session)
        await context.bot.send_message(
            chat_id=chat_id,
            text="✅ All drafts reviewed\\. Session complete\\.",
            parse_mode=ParseMode.MARKDOWN_V2,
        )
        return

    next_draft_state = session.pending_drafts.pop(0)
    position = f"{len(session.triage_items) - len(session.pending_drafts)} of {len(session.triage_items)}"

    session.draft_in_progress = True
    store.set(chat_id, session)

    await context.bot.send_message(chat_id=chat_id, text="✍️ Generating draft…")

    try:
        async with gmail_session(next_draft_state.item.account, settings.gmail_mcp_credentials_base) as mcp:
            draft_text = await generate_draft(next_draft_state.item, mcp, settings)
    except Exception as exc:
        log.error("draft_generation_failed", error=str(exc))
        session = store.get(chat_id)
        if session:
            session.draft_in_progress = False
            store.set(chat_id, session)
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"❌ Draft generation failed: {exc}\n\nSkipping to next item\\.",
            parse_mode=ParseMode.MARKDOWN_V2,
        )
        await _advance_to_next_draft(chat_id, context, settings)
        return

    next_draft_state.draft_body = draft_text
    session = store.get(chat_id)
    if session:
        session.current_draft = next_draft_state
        session.draft_in_progress = False
        store.set(chat_id, session)

    msg = await context.bot.send_message(
        chat_id=chat_id,
        text=format_draft_preview(next_draft_state, position),
        parse_mode=ParseMode.MARKDOWN_V2,
        reply_markup=_draft_keyboard(),
    )
    if session:
        session.current_draft.telegram_message_id = msg.message_id  # type: ignore[union-attr]
        store.set(chat_id, session)


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------


async def triage_command(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    settings: Settings,
) -> None:
    """/triage [account] — fetch and classify unread emails for an account.

    Args:
        update: Incoming command update.
        context: Bot context; context.args contains command arguments.
        settings: Application settings.
    """
    if not _owner_guard(update, settings):
        return

    chat_id = update.effective_chat.id  # type: ignore[union-attr]

    # Validate account argument.
    account = (context.args[0].lower() if context.args else "").strip()
    if account not in VALID_ACCOUNTS:
        await update.message.reply_text(  # type: ignore[union-attr]
            f"Usage: /triage [account]\nValid accounts: {', '.join(VALID_ACCOUNTS)}"
        )
        return

    # Guard against concurrent triage.
    existing = store.get(chat_id)
    if existing and existing.triage_in_progress:
        await update.message.reply_text(  # type: ignore[union-attr]
            "Triage already in progress. Wait or /cancel."
        )
        return

    # Initialize session.
    session = SessionState(account=account, triage_in_progress=True)
    # Preserve TOTP grace period across sessions.
    if existing and existing.last_totp_verified_at:
        session.last_totp_verified_at = existing.last_totp_verified_at
    store.set(chat_id, session)

    placeholder = await update.message.reply_text(  # type: ignore[union-attr]
        f"🔍 Triaging {account} inbox… this may take 30–90 seconds."
    )

    try:
        async with gmail_session(account, settings.gmail_mcp_credentials_base) as mcp:
            items = await run_triage(account, mcp, settings)
    except Exception as exc:
        log.error("triage_command_failed", account=account, error=str(exc))
        session = store.get(chat_id)
        if session:
            session.triage_in_progress = False
            store.set(chat_id, session)
        await context.bot.edit_message_text(
            chat_id=chat_id,
            message_id=placeholder.message_id,
            text=f"❌ Triage failed: {exc}",
        )
        return

    # Update session with results.
    session = store.get(chat_id)
    if not session:
        return
    session.triage_items = items
    session.triage_in_progress = False

    # Queue items that need a draft (reply/acknowledge, non-sensitive).
    draftable = [
        DraftState(item=i, draft_body="")
        for i in items
        if i.action in ("reply", "acknowledge") and not i.is_sensitive
    ]
    session.pending_drafts = draftable
    store.set(chat_id, session)

    # Delete placeholder and send triage summary.
    await context.bot.delete_message(chat_id=chat_id, message_id=placeholder.message_id)
    for msg_text in format_triage_summary(items):
        await context.bot.send_message(
            chat_id=chat_id,
            text=msg_text,
            parse_mode=ParseMode.MARKDOWN_V2,
        )

    log.info("triage_presented", account=account, item_count=len(items), draft_count=len(draftable))

    # Start draft flow immediately if there are items to draft.
    if draftable:
        await _advance_to_next_draft(chat_id, context, settings)


async def status_command(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    settings: Settings,
) -> None:
    """/status — show current session state.

    Args:
        update: Incoming command update.
        context: Bot context.
        settings: Application settings.
    """
    if not _owner_guard(update, settings):
        return

    chat_id = update.effective_chat.id  # type: ignore[union-attr]
    session = store.get(chat_id)

    if not session:
        await update.message.reply_text("No active session. Run /triage [account].")  # type: ignore[union-attr]
        return

    pending = len(session.pending_drafts)
    current = "Yes" if session.current_draft else "No"
    totp_status = (
        "✅ In grace period"
        if _is_within_grace(session, settings.totp_grace_minutes)
        else "🔐 Will require TOTP"
    )

    text = (
        f"Account: {session.account}\n"
        f"Items triaged: {len(session.triage_items)}\n"
        f"Drafts pending: {pending}\n"
        f"Draft displayed: {current}\n"
        f"TOTP: {totp_status}\n"
        f"Triage in progress: {session.triage_in_progress}"
    )
    await update.message.reply_text(text)  # type: ignore[union-attr]


async def cancel_command(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    settings: Settings,
) -> None:
    """/cancel — clear session state and reset the bot.

    Args:
        update: Incoming command update.
        context: Bot context.
        settings: Application settings.
    """
    if not _owner_guard(update, settings):
        return

    chat_id = update.effective_chat.id  # type: ignore[union-attr]
    store.clear(chat_id)
    await update.message.reply_text("Session cleared. Run /triage [account] to start again.")  # type: ignore[union-attr]


# ---------------------------------------------------------------------------
# Callback query handler (inline button presses)
# ---------------------------------------------------------------------------


async def button_callback(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    settings: Settings,
) -> None:
    """Handle Approve / Edit / Skip button presses on draft messages.

    Args:
        update: Incoming callback query update.
        context: Bot context.
        settings: Application settings.
    """
    query = update.callback_query
    if not query:
        return
    await query.answer()  # acknowledge the tap immediately

    if not _owner_guard(update, settings):
        return

    chat_id = update.effective_chat.id  # type: ignore[union-attr]
    session = store.get(chat_id)

    # Handle stale callbacks (e.g., after a bot restart).
    if not session or not session.current_draft:
        await query.edit_message_text(
            "⚠️ Session expired\\. Run /triage again\\.",
            parse_mode=ParseMode.MARKDOWN_V2,
        )
        return

    action = query.data

    if action == "skip":
        log.info("draft_skipped", thread_id=session.current_draft.item.thread_id)
        session.current_draft = None
        store.set(chat_id, session)
        await query.edit_message_reply_markup(reply_markup=None)
        await _advance_to_next_draft(chat_id, context, settings)

    elif action == "edit":
        session.current_draft.edit_pending = True
        store.set(chat_id, session)
        await query.edit_message_reply_markup(reply_markup=None)
        await context.bot.send_message(
            chat_id=chat_id,
            text="Send your replacement draft text now:",
        )

    elif action == "approve":
        if _is_within_grace(session, settings.totp_grace_minutes):
            # Skip TOTP — proceed directly to send.
            log.info("approve_within_grace", thread_id=session.current_draft.item.thread_id)
            await query.edit_message_reply_markup(reply_markup=None)
            await _execute_send(chat_id, context, settings)
        else:
            session.awaiting_totp = True
            store.set(chat_id, session)
            await query.edit_message_reply_markup(reply_markup=None)
            await context.bot.send_message(
                chat_id=chat_id,
                text="🔐 Enter your 6-digit authenticator code to send:",
            )


# ---------------------------------------------------------------------------
# Message handler (free text — TOTP codes or draft edits)
# ---------------------------------------------------------------------------


async def message_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    settings: Settings,
) -> None:
    """Route free-text messages to TOTP verification or draft editing.

    Args:
        update: Incoming message update.
        context: Bot context.
        settings: Application settings.
    """
    if not _owner_guard(update, settings):
        return

    chat_id = update.effective_chat.id  # type: ignore[union-attr]
    text = (update.message.text or "").strip()  # type: ignore[union-attr]
    session = store.get(chat_id)

    if not session:
        await update.message.reply_text("No active session. Run /triage [account].")  # type: ignore[union-attr]
        return

    # TOTP verification path.
    if session.awaiting_totp:
        if _verify_totp(text, settings.totp_secret):
            session.awaiting_totp = False
            session.last_totp_verified_at = datetime.now(timezone.utc)
            store.set(chat_id, session)
            log.info("totp_verified", chat_id=chat_id)
            await update.message.reply_text("✅ Verified. Sending…")  # type: ignore[union-attr]
            await _execute_send(chat_id, context, settings)
        else:
            log.warning("totp_invalid", chat_id=chat_id)
            await update.message.reply_text(  # type: ignore[union-attr]
                "❌ Invalid code. Send aborted. Tap Approve again to retry."
            )
            session.awaiting_totp = False
            store.set(chat_id, session)
            # Re-show the draft.
            if session.current_draft:
                await context.bot.send_message(
                    chat_id=chat_id,
                    text=format_draft_preview(session.current_draft),
                    parse_mode=ParseMode.MARKDOWN_V2,
                    reply_markup=_draft_keyboard(),
                )
        return

    # Draft editing path.
    if session.current_draft and session.current_draft.edit_pending:
        session.current_draft.draft_body = text
        session.current_draft.edit_pending = False
        store.set(chat_id, session)
        await context.bot.send_message(
            chat_id=chat_id,
            text=format_draft_preview(session.current_draft),
            parse_mode=ParseMode.MARKDOWN_V2,
            reply_markup=_draft_keyboard(),
        )
        return

    # Unrecognized message.
    await update.message.reply_text(  # type: ignore[union-attr]
        "Use /triage [account], /status, or /cancel. "
        "Tap a button on a draft to approve, edit, or skip."
    )


# ---------------------------------------------------------------------------
# Internal: execute the send after TOTP approval
# ---------------------------------------------------------------------------


async def _execute_send(
    chat_id: int,
    context: ContextTypes.DEFAULT_TYPE,
    settings: Settings,
) -> None:
    """Send the current draft after TOTP has been verified.

    Re-fetches the thread (race condition check) then sends. If new messages
    are detected, aborts and re-displays the draft for re-confirmation.

    Args:
        chat_id: Telegram chat ID.
        context: Bot context for sending messages.
        settings: Application settings.
    """
    session = store.get(chat_id)
    if not session or not session.current_draft:
        await context.bot.send_message(chat_id=chat_id, text="No draft to send.")
        return

    draft = session.current_draft
    await context.bot.send_message(chat_id=chat_id, text="📤 Checking thread and sending…")

    try:
        async with gmail_session(draft.item.account, settings.gmail_mcp_credentials_base) as mcp:
            result = await send_reply(draft.item, draft.draft_body, mcp, settings)
    except Exception as exc:
        log.error("send_failed", error=str(exc), thread_id=draft.item.thread_id)
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"❌ Send failed: {exc}\n\nYou can try again or /cancel.",
        )
        return

    if result.startswith(NEW_MESSAGES_SENTINEL):
        summary = result.split("||", 1)[1] if "||" in result else "New messages detected."
        log.warning("send_blocked_new_messages", thread_id=draft.item.thread_id)
        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                f"⚠️ New messages arrived since triage:\n\n{summary}\n\n"
                "Draft held. Tap Approve again to re-confirm or Skip to discard."
            ),
            reply_markup=_draft_keyboard(),
        )
        return

    # Send succeeded — advance to next draft.
    log.info("send_succeeded", account=draft.item.account, sender=draft.item.sender)
    session = store.get(chat_id)
    if session:
        session.current_draft = None
        store.set(chat_id, session)

    await context.bot.send_message(chat_id=chat_id, text=f"✅ Sent — {result}")
    await _advance_to_next_draft(chat_id, context, settings)
