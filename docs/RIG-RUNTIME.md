# Rewear Relay — Rig Runtime

Rewear Relay uses Rig as its bounded recommendation-reasoning runtime. The current integration is pinned to Rig `0.42.0`.

## Role

Rig is responsible for reasoning over a finite set of normalized secondhand candidates and returning a typed `RelayPlan`.

Rig is **not** authorized to:

- browse arbitrary marketplace URLs;
- invent listings, prices, merchants, measurements, condition, or availability;
- invoke Perfect Corp Virtual Try-On;
- purchase, reserve, message a seller, or follow outbound commerce links;
- claim that a garment physically fits the shopper;
- change the source item or substitute an unobserved candidate.

## Boundary

```text
Search / marketplace adapters
        |
        v
Normalized candidate set
        |
        v
Pre-model contract validation
        |
        v
Rig typed recommendation agent
        |
        v
RelayPlan
        |
        v
Post-model contract validation
        |
        +---- reject unknown candidate id
        +---- reject source mismatch
        +---- reject duplicate candidate
        +---- reject invalid score
        |
        v
Rewear application
        |
        +---- user chooses a candidate
        |
        v
Perfect Corp VTO (separate authority path)
```

The model never receives authority simply because it can recommend an action. Recommendation, selection, visualization and purchase are distinct transitions.

## API

The service exposes:

- `GET /health`
- `POST /v1/relay/rank`

The default bind address is loopback-only (`127.0.0.1:8788`). An operator must explicitly set `RELAY_RIG_BIND` to expose it elsewhere.

## Model provider

The first runtime adapter uses Rig's OpenAI provider through environment configuration. `RIG_MODEL` selects the model and `OPENAI_API_KEY` is read only by the Rust runtime. The provider is replaceable; Rewear's `RelayRequest` and `RelayPlan` contracts are provider-independent.

A local `rig-candle` provider is a later deployment option and should be evaluated on the target DDC Lab hardware rather than added to the hackathon critical path without performance measurements.

## DDC invariants

1. **Authority** — Rig may recommend only; it cannot transform or transact.
2. **Predecessor binding** — `source_item_id` in every returned plan must match the request source.
3. **Candidate closure** — every returned `candidate_id` must exist in the supplied candidate set.
4. **Evidence boundary** — `observed_at` is not equivalent to current availability.
5. **Claim boundary** — recommendation score is not physical-fit probability.
6. **Fail closed** — a plan failing contract validation is discarded entirely.
7. **No hidden retrieval** — the ranking runtime does not fetch candidate URLs.

## Testing

Unit tests cover source mismatch and invented-candidate rejection. Further gates before production use:

- duplicate candidates and duplicate rankings;
- candidate-count limit;
- malformed structured output;
- provider timeout/rate-limit behavior;
- prompt injection contained inside seller-controlled titles;
- model attempts to assert physical fit or unsupported availability;
- deterministic cassette/replay tests once the live provider contract is proven.
