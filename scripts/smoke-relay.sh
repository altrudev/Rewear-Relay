#!/usr/bin/env bash
set -euo pipefail

EDGE_URL="${REWEAR_EDGE_URL:-http://127.0.0.1:8787}"
TMP_BASE="${TMPDIR:-/tmp}/rewear-relay-smoke"
mkdir -p "$TMP_BASE"
SEARCH_OUT="$TMP_BASE/search.json"
RANK_OUT="$TMP_BASE/rank.json"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'FAIL: required command not found: %s\n' "$1" >&2
    exit 2
  fi
}

need curl
need node

printf '==> Checking Edge health\n'
curl --fail --silent --show-error --max-time 5 "$EDGE_URL/api/health" >"$TMP_BASE/health.json"

printf '==> Requesting fixture search receipt\n'
curl --fail --silent --show-error --max-time 10 \
  -H 'content-type: application/json' \
  --data-binary @- \
  "$EDGE_URL/api/search" >"$SEARCH_OUT" <<'JSON'
{
  "source": {
    "id": "smoke-source-jacket",
    "title": "Vintage brown leather jacket",
    "price": 80,
    "currency": "CAD",
    "garment_category": "outerwear"
  },
  "query": "brown leather jacket",
  "maxResults": 3,
  "strictSecondhand": true,
  "region": "ca"
}
JSON

TOKEN="$(node - "$SEARCH_OUT" <<'NODE'
const fs = require('fs');
const path = process.argv[2];
const body = JSON.parse(fs.readFileSync(path, 'utf8'));
if (body.provider !== 'fixture') throw new Error(`expected fixture provider, got ${body.provider}`);
if (!Array.isArray(body.candidates) || body.candidates.length < 1) throw new Error('fixture search returned no candidates');
if (typeof body.candidateSetToken !== 'string' || body.candidateSetToken.length < 20) throw new Error('candidateSetToken missing');
for (const candidate of body.candidates) {
  if (candidate.secondHandCondition !== 'used') throw new Error(`candidate ${candidate.id} lacks fixture resale evidence`);
}
process.stdout.write(body.candidateSetToken);
NODE
)"

printf '==> Ranking signed candidate set through Rig\n'
TOKEN="$TOKEN" node <<'NODE' >"$TMP_BASE/rank-request.json"
process.stdout.write(JSON.stringify({
  candidateSetToken: process.env.TOKEN,
  intent: 'Keep the brown leather look and stay under the source-item price where evidence allows.'
}));
NODE

curl --fail --silent --show-error --max-time 30 \
  -H 'content-type: application/json' \
  --data-binary @"$TMP_BASE/rank-request.json" \
  "$EDGE_URL/api/relay/rank" >"$RANK_OUT"

node - "$SEARCH_OUT" "$RANK_OUT" <<'NODE'
const fs = require('fs');
const search = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const plan = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));

if (plan.source_item_id !== 'smoke-source-jacket') {
  throw new Error(`source predecessor mismatch: ${plan.source_item_id}`);
}
if (!Array.isArray(plan.ranked)) throw new Error('ranked output missing');
if (plan.ranked.length < 1) throw new Error('Rig returned no ranked candidates for deterministic fixture smoke');

const allowed = new Set(search.candidates.map((candidate) => candidate.id));
const seen = new Set();
for (const entry of plan.ranked) {
  if (!allowed.has(entry.candidate_id)) throw new Error(`unknown candidate escaped closure: ${entry.candidate_id}`);
  if (seen.has(entry.candidate_id)) throw new Error(`duplicate ranked candidate: ${entry.candidate_id}`);
  seen.add(entry.candidate_id);
  if (!Number.isInteger(entry.score) || entry.score < 0 || entry.score > 100) {
    throw new Error(`invalid score for ${entry.candidate_id}: ${entry.score}`);
  }
}
if (plan.candidateSet?.provider !== 'fixture') throw new Error('validated plan lost fixture provider evidence');

console.log(JSON.stringify({
  source: plan.source_item_id,
  ranked: plan.ranked.map(({candidate_id, score}) => ({candidate_id, score})),
  provider: plan.candidateSet?.provider,
  observedAt: plan.candidateSet?.observedAt
}, null, 2));
NODE

printf 'PASS: signed fixture search -> Edge receipt verification -> Rig -> candidate/source closure\n'
