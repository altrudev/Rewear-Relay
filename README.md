# Rewear Relay

**Try it before someone else buys it.**

Rewear Relay is a mobile-first visual decision layer for secondhand fashion. It helps shoppers discover a one-off item, visualize that exact garment on themselves using Perfect Corp AI Clothes Virtual Try-On, and relay to similar live alternatives when the original is unavailable or rejected.

## Hackathon target

Built from scratch for the DevNetwork API + Cloud + AI Hackathon 2026 — Perfect Corp Challenge.

Primary product loop:

`SEARCH → SELECT → VISUALIZE → DECIDE → RELAY`

## Architecture principles

- Perfect Corp Clothes VTO is the central visualization engine.
- Rig `0.42.0` is the bounded reasoning runtime for Relay candidate ranking and recommendation planning.
- Rig receives only normalized candidate evidence and cannot browse arbitrary listing URLs, purchase items, invoke VTO, or claim physical fit.
- Every Rig `RelayPlan` is validated after model execution; unknown candidates or source/predecessor mismatches fail closed.
- Marketplace titles and shopper text are treated as untrusted data, not instructions.
- Rig provider/model selection is explicit. Local Ollama and optional OpenAI modes are supported; no paid provider is silently selected.
- User images are uploaded directly from the browser to Perfect Corp presigned upload targets; Rewear does not proxy or persist raw photos.
- Perfect Corp, search and model-provider credentials remain server-side only.
- Completed Perfect tasks/resources are explicitly deleted when a fitting-room session is deleted.
- AI visualization is never presented as physical sizing evidence.
- Every result remains bound to its source item, garment asset, user asset, and provider task.
- The first visualization milestone remains a real `cloth-v4` vertical slice; agentic Relay reasoning is isolated so it cannot compromise that path.

## Repository layout

- `apps/web` — React + TypeScript PWA
- `apps/edge` — Cloudflare Worker + Hono API boundary
- `services/relay-rig` — Rust + Rig governed recommendation runtime
- `packages/domain` — product state and invariants
- `packages/providers` — external provider adapters
- `packages/validation` — shared validation
- `packages/receipts` — provenance/preview receipts
- `docs` — architecture, Rig runtime, privacy, threat model, DDC and hackathon plan

## Development labs

- `/lab` — Perfect Corp vertical-slice lab: sanitize images → direct upload → `cloth-v4` → poll → result → explicit cleanup.
- `/relay-lab` — Rig ranking lab: fixed candidate fixture → Edge → Rig → typed `RelayPlan` → independent validation → rendered recommendation.

The Relay lab uses fixture inventory intentionally; it makes no claim that fixture products are live listings.

## Rig boundary

The Relay reasoning path is intentionally separated from commerce and transformation authority:

`normalized candidates → contract gate → Rig → typed RelayPlan → contract gate → user decision`

Only after the user selects a candidate may the separate Perfect Corp visualization path run.

Rig can run through local Ollama for a no-provider-fee development path, or through an explicitly configured hosted provider. Deterministic tests use Rig's scripted `MockCompletionModel`, so typed-output and authority gates can be tested without API keys or token spend.

See `docs/RIG-RUNTIME.md` for the trust and execution model.

## Current status

Implemented:

- mobile PWA shell;
- browser-side image re-encoding and metadata removal;
- Perfect Corp upload/task/poll/delete integration path;
- governed Edge API boundary;
- Rig `0.42.0` Rust runtime;
- explicit Ollama/OpenAI provider selection;
- typed Relay request/plan contracts;
- source/predecessor and candidate-closure validation;
- prompt-injection containment for marketplace/user strings;
- zero-cost Rig mock-model tests;
- fitting-room and Relay development labs;
- DDC assessment of both transformation and recommendation transitions.

Still requires runtime evidence:

- Rust `cargo fmt`, compile, clippy and test pass on an execution host;
- measured Ollama model quality and resource use;
- Edge → Rig HTTPS connectivity outside local development;
- a real Perfect Corp `cloth-v4` transaction;
- real search inventory and end-to-end candidate selection → VTO binding.

No credentials belong in this repository.

## Ownership

Copyright © 2026 Altru.dev. All rights reserved.

This repository is publicly visible for competition review. No license is granted for copying, modifying, redistributing, or commercial reuse unless explicitly stated in writing.
