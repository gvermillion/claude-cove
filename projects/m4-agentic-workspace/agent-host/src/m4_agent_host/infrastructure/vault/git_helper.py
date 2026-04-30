from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from openinference.semconv.trace import OpenInferenceSpanKindValues, SpanAttributes
from opentelemetry.trace import Status, StatusCode

from m4_agent_host.config import settings
from m4_agent_host.infrastructure.telemetry.tracer import tracer


def _ensure_git_repo(vault: Path, git_bin: str) -> None:
    """Initialize the vault as a git repo if it isn't one already."""
    if (vault / ".git").exists():
        return
    subprocess.run(  # noqa: S603
        [git_bin, "init"], cwd=vault, check=True, capture_output=True,
    )
    subprocess.run(  # noqa: S603
        [git_bin, "add", "-A"], cwd=vault, check=True, capture_output=True,
    )
    subprocess.run(  # noqa: S603
        [git_bin, "commit", "-m", "init: vault baseline", "--allow-empty"],
        cwd=vault, check=True, capture_output=True,
    )


def commit_vault(message: str) -> None:
    """Stage all vault changes and create a git commit."""
    with tracer.start_as_current_span("vault.git_commit") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.TOOL.value)
        span.set_attribute("vault.commit_message", message)
        span.set_attribute(SpanAttributes.INPUT_VALUE, f"git commit -m \"{message}\" (vault: {settings.vault_path})")
        vault = Path(settings.vault_path)
        git_bin = shutil.which("git") or "/usr/bin/git"
        try:
            _ensure_git_repo(vault, git_bin)
            subprocess.run([git_bin, "add", "-A"], cwd=vault, check=True, capture_output=True)  # noqa: S603
            result = subprocess.run(  # noqa: S603
                [git_bin, "commit", "-m", message, "--allow-empty"],
                cwd=vault,
                check=True,
                capture_output=True,
            )
            stdout = result.stdout.decode(errors="replace").strip()
            span.set_attribute("vault.git_output", stdout[:500])
            span.set_attribute(SpanAttributes.OUTPUT_VALUE, stdout[:500] or "committed (no output)")
            span.set_status(Status(StatusCode.OK))
        except subprocess.CalledProcessError as exc:
            stderr = (exc.stderr or b"").decode(errors="replace").strip()
            span.set_attribute("vault.git_error", stderr[:500])
            span.set_status(Status(StatusCode.ERROR, stderr[:200]))
            raise
