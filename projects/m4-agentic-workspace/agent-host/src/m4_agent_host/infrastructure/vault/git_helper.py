from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from m4_agent_host.config import settings


def commit_vault(message: str) -> None:
    """Stage all vault changes and create a git commit."""
    vault = Path(settings.vault_path)
    git_bin = shutil.which("git") or "/usr/bin/git"
    subprocess.run([git_bin, "add", "-A"], cwd=vault, check=True, capture_output=True)  # noqa: S603
    subprocess.run(  # noqa: S603
        [git_bin, "commit", "-m", message, "--allow-empty"],
        cwd=vault,
        check=True,
        capture_output=True,
    )
