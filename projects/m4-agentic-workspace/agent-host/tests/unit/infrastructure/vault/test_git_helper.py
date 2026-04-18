from __future__ import annotations
from pathlib import Path
from unittest.mock import patch
import pytest
from m4_agent_host.infrastructure.vault.git_helper import commit_vault


def test_commit_vault_runs_git_add_then_commit(tmp_path: Path) -> None:
    with patch("m4_agent_host.infrastructure.vault.git_helper.settings") as mock_settings, \
         patch("subprocess.run") as mock_run:
        mock_settings.vault_path = str(tmp_path)
        commit_vault("test: commit message")
        assert mock_run.call_count == 2
        first_call_args = mock_run.call_args_list[0][0][0]
        assert first_call_args == ["git", "add", "-A"]
        second_call_args = mock_run.call_args_list[1][0][0]
        assert "git" in second_call_args
        assert "commit" in second_call_args
        assert "test: commit message" in second_call_args
