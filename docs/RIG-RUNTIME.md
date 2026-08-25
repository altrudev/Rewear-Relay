# Rewear Relay — Rig Runtime

Rewear Relay uses Rig as its bounded recommendation-reasoning runtime. The integration is pinned to Rig `0.42.0`.

## Role

Rig is responsible for reasoning over a finite set of normalized secondhand candidates and returning a typed `RelayPlan`.

Rig is **not** authorized to:

- browse arbitrary marketplace URLs;
- invent listings, prices, merchants, measurements, condition, or availability;
- invoke Perfect Corp Virtual Try-On;
- purchase, reserve, message a seller, or follow outbound commerce links;
- claim that a garment physically fits the shopper;
- change the source item or substitute an unobserved candidate;
- treat text embedded in titles, source labels, or shopper intent as instructions.

## Boundary

```text
Browser
   |
   v
Rewear Edge /api/relay/rank
   |
   +---- request schema + candidate closure
   |
   v
Configured Rig service /v1/relay/rank
   |
   +---- pre-model contract validation
   |
   v
Rig typed recommendation agent
   |
   v
RelayPlan
   |
   +---- Rust post-model validation
   |
   v
Rewear Edge
   |
   +---- independent source + candidate validation
   |
   v
Browser
   |
   +---- user chooses a candidate
   |
   v
Perfect Corp VTO (separate authority path)
```

The model never receives authority simply because it can recommend an action. Recommendation, selection, visualization and purchase are distinct transitions.

## API

The Rust service exposes:

- `GET /health`
- `POST /v1/relay/rank`

The default bind address is loopback-only (`127.0.0.1:8788`). An operator must explicitly set `RELAY_RIG_BIND` to expose it elsewhere.

The browser never chooses the Rig endpoint. Rewear Edge uses the operator-configured `RELAY_RIG_URL`; non-local connections must use HTTPS.

## Model providers

Provider selection is explicit and fail-closed. Both `RIG_PROVIDER` and `RIG_MODEL` must be set.

### Ollama — preferred local path

Set `RIG_PROVIDER=ollama` to use Rig's native Ollama provider. Rig's Ollama client defaults to `http://localhost:11434` and does not require an API key.

This is the preferred long-term local development path because the Relay reasoner can run on operator-controlled hardware without model-provider token charges.

### OpenAI — optional hosted path

Set `RIG_PROVIDER=openai` together with `OPENAI_API_KEY` when a hosted model is intentionally selected. The key is read only by the Rust runtime and never belongs in the browser or Worker bundle.

The `RelayRequest` and `RelayPlan` contracts remain provider-independent.

## Required configuration

- `RIG_PROVIDER` — `ollama` or `openai`
- `RIG_MODEL` — explicit provider model identifier
- `RELAY_RIG_BIND` — bind address for the Rust service
- `RELAY_RIG_URL` — Edge-side URL for the Rig service
- `OPENAI_API_KEY` — only when `RIG_PROVIDER=openai`

No provider or model is silently selected by default.

## DDC invariants

1. **Authority** — Rig may recommend only; it cannot transform or transact.
2. **Predecessor binding** — `source_item_id` in every returned plan must match the request source.
3. **Candidate closure** — every returned `candidate_id` must exist in the supplied candidate set.
4. **Directive containment** — seller/user strings are untrusted data and cannot expand Rig's authority.
5. **Evidence boundary** — `observed_at` is not equivalent to current availability.
6. **Claim boundary** — recommendation score is not physical-fit probability.
7. **Fail closed** — a plan failing contract validation is discarded entirely.
8. **No hidden retrieval** — the ranking runtime does not fetch candidate URLs.
9. **Separation of authority** — recommendation does not itself authorize Perfect Corp VTO or a purchase action.

## Testing without model spend

The Rust service enables Rig's `test-utils` feature in development and uses `MockCompletionModel` for deterministic typed-output tests. These tests exercise the real `prompt_typed<RelayPlan>` boundary without API keys or token charges.

Current tests cover:

- valid typed plan acceptance;
- unknown candidate rejection even when the object matches the JSON schema;
- source/predecessor mismatch rejection;
- duplicate candidate closure checks;
- embedded marketplace prompt-injection text being marked as untrusted input.

Before production use, add measured provider tests for:

- malformed/partial structured output;
- provider timeout and rate-limit behavior;
- local Ollama model quality on the Relay fixtures;
- unsupported availability/fit assertions;
- resource and latency ceilings on the target host.

## Development lab

The PWA exposes `/relay-lab` with fixed fixture inventory. The fixture intentionally avoids any claim that the products are live. It exercises the production browser → Edge → Rig → validated `RelayPlan` route once the Rust runtime is connected.
