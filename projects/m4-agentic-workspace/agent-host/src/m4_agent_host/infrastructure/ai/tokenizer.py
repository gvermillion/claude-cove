"""Lazy-loaded, model-aware token counter with graceful fallback.

Uses HuggingFace ``tokenizers`` (Rust) to get exact token counts for
Ollama models.  Falls back to ``len(text) // 4`` when a tokenizer
cannot be loaded (network down, gated model, unknown model).
"""

from __future__ import annotations

import structlog
from tokenizers import Tokenizer

log = structlog.get_logger(__name__)

# Ollama model name (or prefix) → HuggingFace repo ID.
_OLLAMA_TO_HF: dict[str, str] = {
    "qwen3:8b": "Qwen/Qwen3-8B",
    "qwen3": "Qwen/Qwen3-8B",
    "mistral:latest": "mistralai/Mistral-7B-v0.1",
    "mistral": "mistralai/Mistral-7B-v0.1",
}

_cache: dict[str, Tokenizer] = {}
_warned: set[str] = set()


def _resolve_hf_repo(model: str) -> str | None:
    """Map an Ollama model string to a HuggingFace repo ID."""
    # Exact match first.
    if model in _OLLAMA_TO_HF:
        return _OLLAMA_TO_HF[model]
    # Strip tag and try prefix (e.g. "qwen3:8b-fp16" → "qwen3").
    prefix = model.split(":")[0]
    return _OLLAMA_TO_HF.get(prefix)


def count_tokens(text: str, model: str) -> int:
    """Return the number of tokens in *text* for the given Ollama *model*.

    Falls back to ``len(text) // 4`` when the HuggingFace tokenizer
    cannot be loaded.
    """
    hf_repo = _resolve_hf_repo(model)
    if hf_repo is None:
        if model not in _warned:
            _warned.add(model)
            log.warning("tokenizer_no_mapping", model=model, fallback="len//4")
        return len(text) // 4

    try:
        tok = _cache.get(hf_repo)
        if tok is None:
            log.info("tokenizer_loading", hf_repo=hf_repo)
            tok = Tokenizer.from_pretrained(hf_repo)
            _cache[hf_repo] = tok
        return len(tok.encode(text).ids)
    except Exception:
        if model not in _warned:
            _warned.add(model)
            log.warning("tokenizer_load_failed", model=model, hf_repo=hf_repo, fallback="len//4", exc_info=True)
        return len(text) // 4
