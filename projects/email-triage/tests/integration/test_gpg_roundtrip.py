"""Integration test: GPG encrypt → decrypt roundtrip.

Requires GPG to be installed on the system. Generates a throw-away key pair,
encrypts a test payload, decrypts it, and asserts byte-for-byte equality.

Run with:
    uv run pytest tests/integration -m integration
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import pytest

pytestmark = pytest.mark.integration


@pytest.fixture()
def gpg_home(tmp_path: Path) -> Path:
    """Create a temporary GPG home directory."""
    home = tmp_path / ".gnupg"
    home.mkdir(mode=0o700)
    return home


@pytest.fixture()
def test_key_pair(gpg_home: Path) -> str:
    """Generate a throw-away GPG key pair and return the fingerprint.

    Uses batch key generation for non-interactive operation.
    """
    key_params = f"""\
%no-protection
Key-Type: RSA
Key-Length: 2048
Subkey-Type: RSA
Subkey-Length: 2048
Name-Real: Test Triage Key
Name-Email: triage-test@example.local
Expire-Date: 1d
%commit
"""
    params_file = gpg_home / "key_params.txt"
    params_file.write_text(key_params)

    subprocess.run(
        [
            "gpg",
            "--homedir", str(gpg_home),
            "--batch",
            "--gen-key",
            str(params_file),
        ],
        check=True,
        capture_output=True,
    )

    # Retrieve the fingerprint of the newly generated key.
    result = subprocess.run(
        [
            "gpg",
            "--homedir", str(gpg_home),
            "--list-keys",
            "--with-colons",
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    fingerprint: str | None = None
    for line in result.stdout.splitlines():
        if line.startswith("fpr:"):
            fingerprint = line.split(":")[9]
            break

    assert fingerprint is not None, "Failed to extract GPG fingerprint"
    return fingerprint


@pytest.mark.integration
def test_gpg_encrypt_decrypt_roundtrip(gpg_home: Path, test_key_pair: str) -> None:
    """Encrypt bytes with the public key, decrypt with the private key, assert equality."""
    from email_triage.infrastructure.gpg.adapter import GPGDecryptor, GPGEncryptor

    # Use the same GPG home for both (relay and agent share a home in this test only).
    # In production they are separate — this is acceptable for a roundtrip test.
    passphrase_file = gpg_home / "passphrase.txt"
    passphrase_file.write_text("")  # No protection was set; passphrase is empty.
    passphrase_file.chmod(0o400)

    # Arrange
    plaintext = (
        b"From: test@example.com\r\n"
        b"Subject: Roundtrip Test\r\n"
        b"\r\n"
        b"This email tests the GPG roundtrip pipeline."
    )
    encryptor = GPGEncryptor(
        gpg_home=gpg_home,
        recipient_fingerprint=test_key_pair,
    )
    decryptor = GPGDecryptor(
        gpg_home=gpg_home,
        passphrase_file=passphrase_file,
    )

    # Act
    ciphertext = encryptor.encrypt(plaintext)
    recovered_plaintext = decryptor.decrypt(ciphertext)

    # Assert
    assert recovered_plaintext == plaintext


@pytest.mark.integration
def test_gpg_ciphertext_is_not_plaintext(gpg_home: Path, test_key_pair: str) -> None:
    """Encrypted bytes should not contain the original plaintext."""
    from email_triage.infrastructure.gpg.adapter import GPGEncryptor

    # Arrange
    plaintext = b"SECRET CONTENT that must not appear in ciphertext"
    encryptor = GPGEncryptor(
        gpg_home=gpg_home,
        recipient_fingerprint=test_key_pair,
    )

    # Act
    ciphertext = encryptor.encrypt(plaintext)

    # Assert
    assert b"SECRET CONTENT" not in ciphertext
