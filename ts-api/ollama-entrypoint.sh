#!/bin/bash
set -e

MODEL="${OLLAMA_MODEL:-llama3.2:3b}"

echo "[Ollama] Starting server..."
ollama serve &
SERVER_PID=$!

echo "[Ollama] Waiting for server to be ready..."
MAX_WAIT=60
WAITED=0
until curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "[Ollama] Server failed to start within ${MAX_WAIT}s"
    exit 1
  fi
  sleep 1
  WAITED=$((WAITED + 1))
done
echo "[Ollama] Server ready after ${WAITED}s"

# Pull model only if not already present on persistent disk
if ollama list | grep -q "^${MODEL}"; then
  echo "[Ollama] Model ${MODEL} already present — skipping pull"
else
  echo "[Ollama] Pulling model: ${MODEL}"
  ollama pull "${MODEL}"
  echo "[Ollama] Model pull complete"
fi

echo "[Ollama] Ready — serving on :11434"

# Keep server in foreground
wait $SERVER_PID