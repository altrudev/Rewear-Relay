#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

say() { printf '\n==> %s\n' "$*"; }
need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'FAIL: required command not found: %s\n' "$1" >&2
    exit 2
  fi
}

need node
need npm
need cargo
need rustc

say "Toolchain"
node --version
npm --version
rustc --version
cargo --version

if [[ ! -d node_modules ]]; then
  say "Installing Node workspace dependencies"
  npm install --no-audit --no-fund
fi

say "TypeScript workspace typecheck"
npm run typecheck

say "JavaScript/TypeScript tests"
npm test

say "Production web build"
npm run build

say "Rust formatting"
if ! cargo fmt --version >/dev/null 2>&1; then
  printf 'FAIL: rustfmt is not installed for this Rust toolchain.\n' >&2
  exit 2
fi
cargo fmt --all -- --check

say "Rust compile/check"
cargo check --workspace --all-targets

say "Rust clippy"
if ! cargo clippy --version >/dev/null 2>&1; then
  printf 'FAIL: clippy is not installed for this Rust toolchain.\n' >&2
  exit 2
fi
cargo clippy --workspace --all-targets -- -D warnings

say "Rust tests"
cargo test --workspace

if command -v ollama >/dev/null 2>&1 && [[ -n "${RIG_MODEL:-}" ]]; then
  say "Optional local Rig/Ollama smoke test"
  need curl

  if ! curl --fail --silent --max-time 3 http://127.0.0.1:11434/api/tags >/dev/null; then
    printf 'FAIL: Ollama is installed but not responding at http://127.0.0.1:11434.\n' >&2
    exit 2
  fi

  RIG_PROVIDER=ollama \
  RIG_MODEL="$RIG_MODEL" \
  RELAY_RIG_BIND=127.0.0.1:8788 \
    cargo run -q -p rewear-relay-rig >"${TMPDIR:-/tmp}/rewear-rig-smoke.log" 2>&1 &
  RIG_PID=$!
  cleanup_rig() { kill "$RIG_PID" >/dev/null 2>&1 || true; wait "$RIG_PID" 2>/dev/null || true; }
  trap cleanup_rig EXIT

  ready=0
  for _ in $(seq 1 60); do
    if curl --fail --silent --max-time 2 http://127.0.0.1:8788/health >"${TMPDIR:-/tmp}/rewear-rig-health.json"; then
      ready=1
      break
    fi
    sleep 1
  done

  if [[ "$ready" -ne 1 ]]; then
    cat "${TMPDIR:-/tmp}/rewear-rig-smoke.log" >&2 || true
    printf 'FAIL: Rig runtime did not become healthy.\n' >&2
    exit 2
  fi

  node -e '
    const fs=require("fs");
    const p=process.env.TMPDIR || "/tmp";
    const h=JSON.parse(fs.readFileSync(`${p}/rewear-rig-health.json`,"utf8"));
    if(h.runtime!=="rig" || h.rig_version!=="0.42.0" || h.provider!=="ollama" || !h.model_configured){
      console.error(h);
      process.exit(1);
    }
    console.log(JSON.stringify(h));
  '

  cleanup_rig
  trap - EXIT
else
  say "Rig/Ollama smoke test skipped"
  printf 'Set RIG_MODEL and ensure Ollama is installed/running to include the live local-model smoke test.\n'
fi

say "PASS: Rewear Relay runtime gate"
