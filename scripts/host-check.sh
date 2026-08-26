#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0
warnings=0

pass() { printf 'PASS  %-24s %s\n' "$1" "$2"; }
warn() { printf 'WARN  %-24s %s\n' "$1" "$2"; warnings=$((warnings+1)); }
fail() { printf 'FAIL  %-24s %s\n' "$1" "$2"; failures=$((failures+1)); }
value_or_missing() {
  if command -v "$1" >/dev/null 2>&1; then "$1" "${@:2}" 2>/dev/null | head -n 1; else printf 'missing'; fi
}

printf 'Rewear Relay host preflight\n'
printf '===========================\n\n'

if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  pass 'OS' "${PRETTY_NAME:-${NAME:-unknown}}"
else
  warn 'OS' 'Unable to read /etc/os-release'
fi

arch="$(uname -m 2>/dev/null || echo unknown)"
kernel="$(uname -r 2>/dev/null || echo unknown)"
pass 'Architecture' "$arch"
pass 'Kernel' "$kernel"

if command -v nproc >/dev/null 2>&1; then
  cpus="$(nproc)"
  if [[ "$cpus" -ge 4 ]]; then pass 'CPU threads' "$cpus"; else warn 'CPU threads' "$cpus (4+ preferred)"; fi
fi

if command -v free >/dev/null 2>&1; then
  mem_mib="$(free -m | awk '/^Mem:/ {print $2}')"
  if [[ -n "$mem_mib" && "$mem_mib" -ge 8192 ]]; then
    pass 'Memory' "${mem_mib} MiB"
  elif [[ -n "$mem_mib" && "$mem_mib" -ge 4096 ]]; then
    warn 'Memory' "${mem_mib} MiB (8 GiB+ preferred for local models)"
  else
    fail 'Memory' "${mem_mib:-unknown} MiB (4 GiB minimum practical target)"
  fi
fi

if command -v df >/dev/null 2>&1; then
  disk_line="$(df -Pk "$ROOT_DIR" | awk 'NR==2 {print $4" "$6}')"
  disk_kib="${disk_line%% *}"
  mount="${disk_line#* }"
  if [[ "$disk_kib" =~ ^[0-9]+$ ]]; then
    disk_gib=$((disk_kib / 1024 / 1024))
    if [[ "$disk_gib" -ge 15 ]]; then pass 'Free disk' "${disk_gib} GiB on $mount"; else warn 'Free disk' "${disk_gib} GiB on $mount (15+ GiB preferred)"; fi
  fi
fi

printf '\nToolchain\n---------\n'

if command -v git >/dev/null 2>&1; then pass 'git' "$(git --version)"; else fail 'git' 'missing'; fi
if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)"
  if [[ "$node_major" -ge 20 ]]; then pass 'node' "$(node --version)"; else fail 'node' "$(node --version) (20+ required)"; fi
else fail 'node' 'missing (20+ required)'; fi
if command -v npm >/dev/null 2>&1; then pass 'npm' "$(npm --version)"; else fail 'npm' 'missing'; fi

if command -v rustc >/dev/null 2>&1; then
  rust_version="$(rustc --version)"
  pass 'rustc' "$rust_version"
else fail 'rustc' 'missing'; fi
if command -v cargo >/dev/null 2>&1; then pass 'cargo' "$(cargo --version)"; else fail 'cargo' 'missing'; fi
if command -v rustfmt >/dev/null 2>&1 || cargo fmt --version >/dev/null 2>&1; then
  pass 'rustfmt' "$(cargo fmt --version 2>/dev/null || rustfmt --version 2>/dev/null)"
else fail 'rustfmt' 'missing'; fi
if command -v cargo >/dev/null 2>&1 && cargo clippy --version >/dev/null 2>&1; then
  pass 'clippy' "$(cargo clippy --version 2>/dev/null)"
else fail 'clippy' 'missing'; fi

if command -v curl >/dev/null 2>&1; then pass 'curl' "$(curl --version | head -n1)"; else fail 'curl' 'missing'; fi
if command -v openssl >/dev/null 2>&1; then pass 'openssl' "$(openssl version)"; else fail 'openssl' 'missing'; fi

printf '\nLocal model runtime\n-------------------\n'
if command -v ollama >/dev/null 2>&1; then
  pass 'ollama binary' "$(ollama --version 2>/dev/null | head -n1)"
  if curl --fail --silent --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    pass 'ollama service' 'responding on 127.0.0.1:11434'
    models="$(ollama list 2>/dev/null | awk 'NR>1 {print $1}' | paste -sd ', ' -)"
    if [[ -n "$models" ]]; then pass 'ollama models' "$models"; else warn 'ollama models' 'none installed; choose/pull one explicitly before local Rig smoke'; fi
  else
    warn 'ollama service' 'binary installed but service is not currently responding'
  fi
else
  fail 'ollama binary' 'missing'
fi

if command -v nvidia-smi >/dev/null 2>&1; then
  gpu="$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null | paste -sd '; ' -)"
  pass 'NVIDIA GPU' "${gpu:-detected}"
else
  warn 'NVIDIA GPU' 'not detected; Ollama can still run on CPU but may be slower'
fi

printf '\nLocal ports\n-----------\n'
port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltnH 2>/dev/null | awk '{print $4}' | grep -Eq "(^|:)$port$"
  elif command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  else
    return 1
  fi
}
for pair in '11434 Ollama' '8788 Rig' '8787 Edge' '5173 Web'; do
  port="${pair%% *}"
  name="${pair#* }"
  if port_in_use "$port"; then
    if [[ "$port" == '11434' ]] && curl --fail --silent --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
      pass "port $port" "$name already listening as expected"
    else
      warn "port $port" "$name target port is already in use"
    fi
  else
    pass "port $port" "$name target port available"
  fi
done

printf '\nRepository\n----------\n'
if [[ -f package.json && -f Cargo.toml && -d services/relay-rig ]]; then
  pass 'repo layout' 'Node workspace + Rust Rig service found'
else
  fail 'repo layout' 'run this command from the Rewear-Relay repository'
fi
if [[ -f package-lock.json ]]; then pass 'package lock' 'package-lock.json present'; else warn 'package lock' 'not yet generated; commit it after first trusted npm install'; fi

printf '\nSummary\n-------\n'
printf 'Failures: %d\nWarnings: %d\n' "$failures" "$warnings"

if [[ "$failures" -gt 0 ]]; then
  printf '\nNOT READY: resolve FAIL items before running npm run gate.\n'
  exit 2
fi

printf '\nREADY FOR GATE: run npm run gate.\n'
if command -v ollama >/dev/null 2>&1; then
  printf 'For the local product stack, set RIG_MODEL to an already-installed Ollama model and run npm run dev:local:rig.\n'
fi
