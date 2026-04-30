#!/usr/bin/env bash
set -euo pipefail

echo "Pulling Ollama models..."
ollama pull gemma3:9b
ollama pull qwen2.5:32b
echo "Done. Verify with: ollama list"
