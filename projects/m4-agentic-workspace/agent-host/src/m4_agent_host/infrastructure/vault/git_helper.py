from __future__ import annotations
import subprocess
from pathlib import Path
from m4_agent_host.config import settings


def commit_vault(message: str) -> None:
    """Stage all vault changes and create a git commit."""
    vault = Path(settings.vault_path)
    subprocess.run(["git", "add", "-A"], cwd=vault, check=True, capture_output=True)
    subprocess.run(
        ["git", "commit", "-m", message, "--allow-empty"],
        cwd=vault,
        check=True,
        capture_output=True,
    )
