"""GPG encryption and decryption adapters (Adapter pattern).

Wraps the python-gnupg library to shield the rest of the application from
its API surface. Plaintext data flows through memory only — never via
temporary files on disk.

Exports:
    GPGEncryptor: Encrypts bytes to a configured recipient fingerprint.
    GPGDecryptor: Decrypts bytes using a private key and file-based passphrase.
"""

from __future__ import annotations

import logging
from pathlib import Path

import gnupg
import structlog

from email_triage.domain.exceptions import DecryptionError, EncryptionError

log: structlog.BoundLogger = structlog.get_logger(__name__)


class GPGEncryptor:
    """Adapter (Adapter pattern) wrapping python-gnupg for encryption only.

    Only the recipient public key is required in gpg_home. No private key
    or passphrase is needed. This means the relay process can be fully
    compromised without exposing any decrypted email content.

    Attributes:
        _gpg: Underlying gnupg.GPG instance.
        _recipient_fingerprint: 40-character fingerprint of the recipient key.
    """

    def __init__(self, gpg_home: Path, recipient_fingerprint: str) -> None:
        """Initialise the encryptor and verify the recipient key is present.

        Args:
            gpg_home: Path to a GPG home directory. Must contain the
                recipient's public key. Should be owned by the relay user.
            recipient_fingerprint: Full 40-character GPG fingerprint to
                encrypt to.

        Raises:
            EncryptionError: If the recipient key is not found in gpg_home.
        """
        self._gpg = gnupg.GPG(gnupghome=str(gpg_home))
        self._recipient_fingerprint = recipient_fingerprint

        # Validate key presence at startup rather than at first encrypt call.
        keys = self._gpg.list_keys()
        fingerprints = [k["fingerprint"] for k in keys]
        if recipient_fingerprint not in fingerprints:
            raise EncryptionError(
                f"Recipient key {recipient_fingerprint} not found in {gpg_home}. "
                "Import the public key before starting the relay."
            )

        log.info(
            "gpg_encryptor_ready",
            gpg_home=str(gpg_home),
            recipient_fingerprint=recipient_fingerprint,
        )

    def encrypt(self, plaintext: bytes) -> bytes:
        """Encrypt plaintext bytes and return ASCII-armored GPG ciphertext.

        The plaintext is passed to GPG via an in-memory pipe (python-gnupg
        handles this). No temporary files are written.

        Args:
            plaintext: Raw bytes to encrypt (typically a complete RFC 2822
                email including headers and body).

        Returns:
            ASCII-armored GPG ciphertext as bytes.

        Raises:
            EncryptionError: If GPG reports any failure, including key not
                trusted or key expired.
        """
        result = self._gpg.encrypt(
            plaintext,
            self._recipient_fingerprint,
            armor=True,
            always_trust=True,  # Trust the explicitly configured fingerprint.
        )

        if not result.ok:
            raise EncryptionError(
                f"GPG encryption failed: {result.status!r}. "
                f"Stderr: {result.stderr.strip()}"
            )

        log.debug("gpg_encrypt_success", ciphertext_size_bytes=len(result.data))
        return result.data


class GPGDecryptor:
    """Adapter (Adapter pattern) wrapping python-gnupg for decryption only.

    The private key must be imported into gpg_home. The passphrase is read
    from a file at construction time and held in memory — it is never
    re-read from disk during operation, minimising file system access.

    The gpg_home for the decryptor must be a different directory from the
    encryptor's gpg_home, owned by a different system user, so that relay
    compromise cannot expose the private key.

    Attributes:
        _gpg: Underlying gnupg.GPG instance.
        _passphrase: Private key passphrase, held in memory.
    """

    def __init__(self, gpg_home: Path, passphrase_file: Path) -> None:
        """Initialise the decryptor and load the passphrase from file.

        Args:
            gpg_home: Path to a GPG home directory containing the private key.
                Must be accessible only by the agent system user (mode 700).
            passphrase_file: Path to a file containing the private key
                passphrase. Must have 0400 permissions. Leading/trailing
                whitespace is stripped.

        Raises:
            DecryptionError: If the passphrase file cannot be read or the
                private key is not found in gpg_home.
        """
        self._gpg = gnupg.GPG(gnupghome=str(gpg_home))

        try:
            self._passphrase: str = passphrase_file.read_text().strip()
        except OSError as exc:
            raise DecryptionError(
                f"Cannot read passphrase file {passphrase_file}: {exc}"
            ) from exc

        if not self._passphrase:
            raise DecryptionError(f"Passphrase file {passphrase_file} is empty.")

        # Validate private key presence at startup.
        secret_keys = self._gpg.list_keys(secret=True)
        if not secret_keys:
            raise DecryptionError(
                f"No private keys found in {gpg_home}. "
                "Import the private key before starting the agent."
            )

        log.info(
            "gpg_decryptor_ready",
            gpg_home=str(gpg_home),
            passphrase_file=str(passphrase_file),
            private_key_count=len(secret_keys),
        )

    def decrypt(self, ciphertext: bytes) -> bytes:
        """Decrypt ASCII-armored GPG ciphertext and return plaintext bytes.

        The result is returned as bytes in memory. The caller must not write
        this to disk.

        Args:
            ciphertext: ASCII-armored GPG ciphertext to decrypt.

        Returns:
            Decrypted plaintext bytes (complete RFC 2822 email).

        Raises:
            DecryptionError: If the private key is missing, the passphrase
                is wrong, or the ciphertext is corrupt.
        """
        result = self._gpg.decrypt(ciphertext, passphrase=self._passphrase)

        if not result.ok:
            # Do not include passphrase or key fingerprint in the error message.
            raise DecryptionError(
                f"GPG decryption failed: {result.status!r}. "
                "Check that the private key is imported and passphrase is correct."
            )

        plaintext = result.data
        log.debug(
            "gpg_decrypt_success",
            plaintext_size_bytes=len(plaintext),
        )
        return plaintext


def configure_gpg_logging() -> None:
    """Silence verbose gnupg library logging below WARNING level.

    python-gnupg emits INFO-level logs for every GPG subprocess invocation.
    These are too noisy for production use.
    """
    logging.getLogger("gnupg").setLevel(logging.WARNING)
