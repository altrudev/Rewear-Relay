#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'FAIL: required command not found: %s\n' "$1" >&2
    exit 2
  fi
}

need node
need npm
need cargo
need ollama
need curl
need openssl

if [[ -z "${RIG_MODEL:-}" ]]; then
  cat >&2 <<'EOF'
FAIL: RIG_MODEL is not set.
Choose an Ollama model already installed on this machine, for example:
  export RIG_MODEL='<installed-model-name>'
Then run this script again.
The script never pulls a model automatically.
EOF
  exit 2
fi

if [[ ! -d node_modules ]]; then
  printf '\n==> Installing Node workspace dependencies\n'
  npm install --no-audit --no-fund
fi

TMP_BASE="${TMPDIR:-/tmp}/rewear-relay-local"
mkdir -p "$TMP_BASE"
SEARCH_SIGNING_KEY="${SEARCH_SIGNING_KEY:-$(openssl rand -hex 32)}"
OLLAMA_PID=""
RIG_PID=""
EDGE_PID=""
WEB_PID=""

cleanup() {
  for pid in "$WEB_PID" "$EDGE_PID" "$RIG_PID" "$OLLAMA_PID"; do
    if [[ -n "$pid" ]]; then kill "$pid" >/dev/null 2>&1 || true; fi
  done
  for pid in "$WEB_PID" "$EDGE_PID" "$RIG_PID" "$OLLAMA_PID"; do
    if [[ -n "$pid" ]]; then wait "$pid" 2>/dev/null || true; fi
  done
}
trap cleanup EXIT INT TERM

if ! curl --fail --silent --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null; then
  printf '\n==> Starting local Ollama\n'
  ollama serve >"$TMP_BASE/ollama.log" 2>&1 &
  OLLAMA_PID=$!
  for _ in $(seq 1 30); do
    curl --fail --silent --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null && break
    sleep 1
  done
fi

if ! curl --fail --silent --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null; then
  cat "$TMP_BASE/ollama.log" >&2 2>/dev/null || true
  printf 'FAIL: Ollama did not become healthy.\n' >&2
  exit 2
fi

if ! ollama list 2>/dev/null | awk 'NR>1 {print $1}' | grep -Fxq "$RIG_MODEL"; then
  printf 'FAIL: Ollama model is not installed locally: %s\n' "$RIG_MODEL" >&2
  printf 'Install it deliberately with: ollama pull %q\n' "$RIG_MODEL" >&2
  exit 2
fi

printf '\n==> Starting Rig 0.42 runtime with local Ollama\n'
RIG_PROVIDER=ollama \
RIG_MODEL="$RIG_MODEL" \
RELAY_RIG_BIND=127.0.0.1:8788 \
  cargo run -q -p rewear-relay-rig >"$TMP_BASE/rig.log" 2>&1 &
RIG_PID=$!

for _ in $(seq 1 90); do
  curl --fail --silent --max-time 2 http://127.0.0.1:8788/health >"$TMP_BASE/rig-health.json" && break
  sleep 1
done
if ! curl --fail --silent --max-time 2 http://127.0.0.1:8788/health >/dev/null; then
  cat "$TMP_BASE/rig.log" >&2 || true
  printf 'FAIL: Rig runtime did not become healthy.\n' >&2
  exit 2
fi

printf '\n==> Starting local Edge in fixture-search mode\n'
npm run dev:edge -- \
  --port 8787 \
  --var "SEARCH_PROVIDER:fixture" \
  --var "SEARCH_SIGNING_KEY:$SEARCH_SIGNING_KEY" \
  --var "RELAY_RIG_URL:http://127.0.0.1:8788" \
  >"$TMP_BASE/edge.log" 2>&1 &
EDGE_PID=$!

for _ in $(seq 1 60); do
  curl --fail --silent --max-time 2 http://127.0.0.1:8787/api/health >"$TMP_BASE/edge-health.json" && break
  sleep 1
done
if ! curl --fail --silent --max-time 2 http://127.0.0.1:8787/api/health >/dev/null; then
  cat "$TMP_BASE/edge.log" >&2 || true
  printf 'FAIL: local Edge did not become healthy.\n' >&2
  exit 2
fi

printf '\n==> Starting Rewear Relay web app\n'
npm run dev:web -- --host 0.0.0.0 --port 5173 >"$TMP_BASE/web.log" 2>&1 &
WEB_PID=$!

for _ in $(seq 1 45); do
  curl --fail --silent --max-time 2 http://127.0.0.1:5173/relay-lab >/dev/null && break
  sleep 1
done
if ! curl --fail --silent --max-time 2 http://127.0.0.1:5173/relay-lab >/dev/null; then
  cat "$TMP_BASE/web.log" >&2 || true
  printf 'FAIL: web app did not become healthy.\n' >&2
  exit 2
fi

cat <<EOF

PASS: local Rewear Relay stack is running.

Web:      http://127.0.0.1:5173/relay-lab
Edge:     http://127.0.0.1:8787/api/health
Rig:      http://127.0.0.1:8788/health
Search:   fixture only (no SerpApi spend)
Model:    local Ollama / $RIG_MODEL
Perfect:  not configured by this script

Press Ctrl+C to stop all processes.
Logs: $TMP_BASE
EOF

wait "$WEB_PID"
