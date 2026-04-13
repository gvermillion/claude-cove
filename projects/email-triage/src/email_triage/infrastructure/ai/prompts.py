"""Prompt constants and tool schema for the Claude email triage client.

Prompts live in dedicated constants rather than inline strings to:
1. Make them easy to version and diff.
2. Allow unit tests to assert on their content.
3. Keep business logic (the triage client) free of large string literals.

Exports:
    TRIAGE_SYSTEM_PROMPT: System prompt for the triage Claude call.
    TRIAGE_TOOL_SCHEMA: Tool definition used with forced tool_choice.
"""

from __future__ import annotations

from typing import Any

TRIAGE_SYSTEM_PROMPT: str = """\
You are an expert email triage assistant embedded in a secure, zero-knowledge \
email processing pipeline. Your role is to analyse incoming emails and produce \
structured classification output that helps prioritise a busy inbox.

You will receive a raw email (selected headers + decoded body). Analyse it \
carefully and call the record_triage_result tool exactly once with your assessment.

## Priority Levels

- CRITICAL: Imminent security breaches, active system outages, legal deadlines \
within 24 h, financial fraud alerts, medical emergencies. Requires response within 15 minutes.
- HIGH: Important business requests requiring same-day response, time-sensitive \
customer issues, financial transactions requiring approval, meeting cancellations \
with short notice.
- NORMAL: Standard business correspondence, meeting requests, project updates, \
general vendor communication.
- LOW: Newsletters, automated notifications, FYI updates, marketing that the \
recipient opted into, digest emails.
- SPAM: Unsolicited commercial email, phishing attempts, scam messages, \
mass-marketing without prior consent.

## Category Selection

Choose the single most accurate category. When in genuine doubt, use UNKNOWN.

## Mandatory Privacy Rules

- Your summary MUST NOT include: full email addresses, phone numbers, account \
numbers, passwords, credit card numbers, social security numbers, or any PII \
that would compromise privacy if the summary were read by a third party.
- You MAY reference the sender domain (e.g., "from stripe.com") but NEVER \
the full address.
- Summarise purpose and required action in neutral, factual language without \
quoting sensitive content verbatim.

## Action Items

Extract only concrete, actionable next steps explicitly implied by the email. \
Do not invent actions. Do not include passive FYI items as action items.

## Output

Call record_triage_result exactly once with complete, accurate data. \
Do not add any text before or after the tool call.\
"""

TRIAGE_TOOL_SCHEMA: dict[str, Any] = {
    "name": "record_triage_result",
    "description": (
        "Record the structured triage result for an analysed email. "
        "Call this exactly once after analysing the email."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "priority": {
                "type": "string",
                "enum": ["critical", "high", "normal", "low", "spam"],
                "description": "Urgency level determining how quickly the recipient must act.",
            },
            "category": {
                "type": "string",
                "enum": [
                    "security_alert",
                    "financial",
                    "legal",
                    "customer_support",
                    "vendor",
                    "internal",
                    "newsletter",
                    "notification",
                    "personal",
                    "unknown",
                ],
                "description": "Semantic category of the email content.",
            },
            "summary": {
                "type": "string",
                "maxLength": 500,
                "description": (
                    "Neutral one-paragraph summary of the email's purpose and any "
                    "required action. Must contain NO PII (no full email addresses, "
                    "phone numbers, account numbers, etc.)."
                ),
            },
            "subject_line": {
                "type": "string",
                "description": "The email Subject header value, verbatim.",
            },
            "sender_domain": {
                "type": "string",
                "description": (
                    "Domain portion of the From address only, e.g. 'stripe.com'. "
                    "Never include the local-part (before the @)."
                ),
            },
            "action_items": {
                "type": "array",
                "description": "Concrete next steps the recipient must take. Empty if none.",
                "items": {
                    "type": "object",
                    "properties": {
                        "description": {
                            "type": "string",
                            "description": "Human-readable action description.",
                        },
                        "deadline": {
                            "type": "string",
                            "description": "ISO date (YYYY-MM-DD) if a deadline is mentioned.",
                        },
                        "is_time_sensitive": {
                            "type": "boolean",
                            "description": "True if this action must happen within 24 hours.",
                        },
                    },
                    "required": ["description", "is_time_sensitive"],
                },
            },
            "requires_reply": {
                "type": "boolean",
                "description": "True if the sender explicitly requests or expects a reply.",
            },
            "estimated_read_minutes": {
                "type": "number",
                "description": (
                    "Estimated minutes to read and process this email. "
                    "Use one of: 0.5, 1, 2, 5, 10, 20."
                ),
            },
            "routing_tags": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Optional tags for downstream routing. Use lowercase-hyphenated "
                    "strings, e.g. ['finance-team', 'legal-review', 'urgent']."
                ),
            },
        },
        "required": [
            "priority",
            "category",
            "summary",
            "subject_line",
            "sender_domain",
            "requires_reply",
            "estimated_read_minutes",
        ],
    },
}
