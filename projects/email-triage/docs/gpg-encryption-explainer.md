# GPG Asymmetric Encryption: Technical Breakdown

Applied to the email-triage relay/agent architecture.

---

## 1. The core problem asymmetric encryption solves

Symmetric encryption uses **one key** that both encrypts and decrypts. If you want to give
someone the ability to send you locked boxes, you have to give them your only key — which
also lets them open every box you've ever locked. That's the problem.

Asymmetric (public-key) encryption uses **two mathematically linked keys** with a critical
property:

> **What one key locks, only the other key can unlock.**

This is not obvious — it requires specific mathematical structures (RSA uses modular
exponentiation with large primes; elliptic curve variants use different group operations,
but the property holds for all of them).

The two keys are called:

- **Public key** — you give this to everyone. Anyone can encrypt with it. Nobody can
  decrypt with it, including the person who has it.
- **Private key** — you keep this secret. It is the *only* thing that can decrypt what
  the public key encrypted.

The relationship is one-way by design: deriving the private key from the public key requires
solving a problem (integer factorisation for RSA, discrete logarithm for ECC) that is
computationally infeasible with current hardware for sufficiently large key sizes.

---

## 2. What a GPG key pair actually is

GPG (GNU Privacy Guard) is an implementation of the OpenPGP standard. When you generate a
key pair with `gpg --gen-key`, it produces:

**Private key file** (stored in `~/.gnupg/private-keys-v1.d/`):

```
-----BEGIN PGP PRIVATE KEY BLOCK-----
[~3-4KB of base64-encoded data containing the actual private key material,
 optionally protected by a symmetric passphrase]
-----END PGP PRIVATE KEY BLOCK-----
```

**Public key** (exported with `gpg --export --armor`):

```
-----BEGIN PGP PUBLIC KEY BLOCK-----
[~1KB of base64-encoded data containing the public key material,
 user ID (name/email), key creation timestamp, self-signature]
-----END PGP PUBLIC KEY BLOCK-----
```

The private key file contains **both** the private and public portions internally — GPG
needs the public part to know which messages are addressed to you.

---

## 3. What a fingerprint is

A fingerprint is a **collision-resistant hash of the public key**.

Specifically, GPG computes:

```
fingerprint = SHA-1(public_key_packet)    # for legacy v3/v4 keys
fingerprint = SHA-256(public_key_packet)  # for v5 keys
```

The result is displayed as 40 hex characters (for v4 SHA-1):

```
A3F8 B2C1 9D44 7F02 E81A  55B3 C209 4F6A 8B1E 3D7C
```

**Why this matters:**

Email addresses and names in GPG keys are just metadata — they are not cryptographically
bound to the key material in a way that prevents forgery without a trust infrastructure.
Two different keys could both claim `Name: Alice <alice@example.com>`. The fingerprint
uniquely identifies the *actual key material*.

When the relay is configured with:

```
RELAY__GPG_RECIPIENT_FINGERPRINT=A3F8B2C19D447F02E81A55B3C2094F6A8B1E3D7C
```

It means: "encrypt to the specific key whose hash is this value." Not "encrypt to whoever
calls themselves Alice." The hardening check in `GPGEncryptor.__init__` validates this is
exactly 40 hex characters before doing anything else, and verifies the fingerprint exists
in the relay's keyring before accepting it.

---

## 4. The encryption operation step by step

When the relay calls `encryptor.encrypt(raw_email_bytes)`, here is what GPG does internally:

**Step 1: Generate a random session key**

GPG generates a random symmetric key (typically AES-256) for this specific message only.
This is called the **session key**. It is never reused.

**Step 2: Encrypt the message with the session key**

The raw email bytes are encrypted with AES-256 using the random session key. This is fast —
symmetric encryption is orders of magnitude faster than asymmetric.

**Step 3: Encrypt the session key with the recipient's public key**

The session key (32 bytes) is encrypted using the RSA/ECC public key. This produces a small
blob called the **encrypted session key packet**.

**Step 4: Assemble the message**

The final `.gpg` file contains:

```
[Header: "encrypted to fingerprint X"]
[Encrypted session key packet: RSA/ECC-encrypted AES key]
[Encrypted message body: AES-encrypted email bytes]
```

The file listing on the filesystem reveals only the fingerprint it was encrypted to (and
optionally not even that, with `--hidden-recipient`). The email content, headers, subject,
and sender are all inside the AES-encrypted body.

**Why this hybrid approach?**

RSA encryption is only safe for very small payloads (a few hundred bytes for a 2048-bit
key). A 500 KB email cannot be RSA-encrypted directly. The hybrid approach encrypts the
bulk data with fast symmetric AES and only uses RSA/ECC for the 32-byte session key.

---

## 5. The decryption operation step by step

When the agent calls `decryptor.decrypt(ciphertext_bytes)`:

**Step 1: Parse the message header**

GPG reads the fingerprint(s) the message was encrypted to. It looks up the corresponding
private key in the agent's keyring (`AGENT__GPG_HOME`).

**Step 2: Decrypt the session key with the private key**

Using the RSA/ECC private key (unlocked with the passphrase from the file), GPG decrypts
the encrypted session key packet. This recovers the original 32-byte AES session key.

**Step 3: Decrypt the message with the session key**

Using the recovered AES session key, GPG decrypts the message body.

**Step 4: Return plaintext bytes**

The raw email bytes are returned to the Python process in memory. They are never written to
disk — the return value lives only in the heap.

---

## 6. What the passphrase protects and why it is separate

The private key file on disk is itself protected by a symmetric passphrase (if you used
`%no-protection` in the batch key generation, it is unprotected — that is fine for
HSM or agent-managed scenarios but weaker for at-rest protection).

The passphrase is **not** part of the asymmetric encryption scheme. It protects the private
key at rest on disk:

```
Private key on disk = AES_encrypt(actual_RSA_private_key, derive_key(passphrase))
```

If an attacker steals the private key file without the passphrase, they have an
AES-encrypted blob they cannot use. The passphrase is the second factor.

In this system:

- The passphrase is stored in `/etc/email-triage/agent-key.passphrase` with `chmod 0400`
- `GPGDecryptor.__init__` reads it once into memory at startup
- The file permission check (`mode & 0o077`) ensures no group or world read bits exist
- If the file has `0o644` permissions, the code refuses to start — the passphrase could
  be read by any process running as any user on the system

---

## 7. How the relay/agent split enforces zero-knowledge on the relay

The relay's GPG home (`RELAY__GPG_HOME`) contains **only the public key**:

```
relay/.gnupg/
    pubring.kbx          ← contains: fingerprint + public key material only
    trustdb.gpg          ← web of trust database
    (no private-keys-v1.d/ directory)
```

The agent's GPG home (`AGENT__GPG_HOME`) contains **both keys**:

```
agent/.gnupg/
    pubring.kbx          ← public key
    private-keys-v1.d/
        <keygrip>.key    ← encrypted private key (needs passphrase)
```

These are different filesystem directories owned by different system users:

```
email-relay:email-relay  /var/lib/email-triage/relay/.gnupg   mode 700
email-agent:email-agent  /var/lib/email-triage/agent/.gnupg   mode 700
```

The relay systemd unit runs as `email-relay`. The agent runs as `email-agent`. Linux DAC
(discretionary access control) prevents `email-relay` from reading `email-agent`'s
directory.

**Consequence:** If an attacker fully compromises the relay process (RCE, stolen
credentials, anything), they can:

- Read the public key ✓ (already public, meaningless)
- Encrypt new data ✓ (useless to them)
- Read `.gpg` files in the queue ✓ (they are ciphertext — unreadable without the private key)
- Decrypt any `.gpg` file ✗ — they have no private key

The queue is effectively a dead drop. The relay can only put things in. Only the agent can
read them.

---

## 8. The `always_trust=True` flag explained

GPG has a concept called the **web of trust** — a social mechanism where keys are trusted
based on chains of signatures from other trusted keys. In the default model, a key you have
never personally verified is "unknown" trust, and GPG will refuse to encrypt to it.

In this system, `always_trust=True` bypasses the web of trust and says: "encrypt to this
key regardless of its trust level in my keyring."

**This is safe here because:**

1. The recipient is identified by its full 40-character fingerprint, not by name or email.
   Fingerprints are a hash of the key material — substituting a different key would require
   a SHA-1 preimage attack, which is computationally infeasible.
2. The fingerprint is configured via an environment variable under operator control — not
   resolved from a key server or email address lookup.
3. The web of trust is a distributed human trust network. For a controlled server-to-server
   pipeline with a single known recipient, there is no web to traverse.

The only scenario where `always_trust=True` would be dangerous is if someone could import a
*different* key with the same fingerprint into the relay's keyring — which would require a
SHA-1 chosen-prefix collision attack. This has been demonstrated theoretically (SHAttered,
2017) but only for certificate forgery, not for arbitrary fingerprint preimage attacks.

---

## 9. End-to-end data flow with cryptographic operations labelled

```
╔══════════════════════════════════════════════════════════════════╗
║  RELAY PROCESS  (has: public key only)                           ║
║                                                                  ║
║  IMAP fetch → raw_bytes (heap only, never disk)                  ║
║       ↓                                                          ║
║  GPGEncryptor.encrypt(raw_bytes):                                ║
║    1. generate random AES-256 session_key                        ║
║    2. ciphertext = AES_256_CFB(raw_bytes, session_key)           ║
║    3. enc_session = RSA_encrypt(session_key, public_key)         ║
║    4. output = [fingerprint_header | enc_session | ciphertext]   ║
║       ↓                                                          ║
║  write output to /run/email-triage/queue/<ts>_<rand>.gpg         ║
╚══════════════════════════════════════════════════════════════════╝

              [tmpfs queue — only ciphertext, opaque filenames]

╔══════════════════════════════════════════════════════════════════╗
║  AGENT PROCESS  (has: private key + passphrase)                  ║
║                                                                  ║
║  inotify detects new .gpg file                                   ║
║       ↓                                                          ║
║  ciphertext = path.read_bytes()   (bytes in heap)                ║
║       ↓                                                          ║
║  GPGDecryptor.decrypt(ciphertext):                               ║
║    1. parse fingerprint_header → look up private key             ║
║    2. unlock private key with passphrase (AES_decrypt)           ║
║    3. session_key = RSA_decrypt(enc_session, private_key)        ║
║    4. raw_bytes = AES_256_CFB_decrypt(ciphertext, session_key)   ║
║    5. return raw_bytes  (heap only, never disk)                  ║
║       ↓                                                          ║
║  ClaudeTriageClient.analyze(raw_bytes)                           ║
║    → only TriageResult (metadata) persisted, never raw_bytes     ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 10. What breaks at each attack surface

| Attacker gains access to | Can they read email content? | Why |
|---|---|---|
| Relay process memory | No | Plaintext exists for microseconds during the encrypt call; no disk write |
| Queue directory (`.gpg` files) | No | AES-256 ciphertext; session key is RSA-encrypted to a private key they don't have |
| Relay's GPG home | No | Contains public key only; encrypting with it produces more ciphertext |
| Agent process memory | Yes | Decrypted bytes exist in the heap during analysis |
| Agent's GPG home (no passphrase) | No | Private key file is AES-encrypted with the passphrase |
| Agent's GPG home + passphrase file | Yes | Full private key is recoverable — this is the critical secret |
| Passphrase file alone | No | The private key file is also needed |
| `done/` directory | No | Only `.gpg` (ciphertext) and `.json` (triage metadata, no body) are stored |

The attack surface collapses to: **the agent process's runtime memory** and **the agent's
GPG home + passphrase file together**. Everything else is either ciphertext or public
information.
