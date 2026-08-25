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

## Rig boundary

The Relay reasoning path is intentionally separated from commerce and transformation authority:

`normalized candidates → contract gate → Rig → typed RelayPlan → contract gate → user decision`

Only after the user selects a candidate may the separate Perfect Corp visualization path run.

See `docs/RIG-RUNTIME.md` for the trust and execution model.

## Current status

Perfect Corp vertical-slice scaffolding and the governed Rig recommendation runtime are present. Live provider credentials and runtime execution remain environment configuration, never repository content.

## Ownership

Copyright © 2026 Altru.dev. All rights reserved.

This repository is publicly visible for competition review. No license is granted for copying, modifying, redistributing, or commercial reuse unless explicitly stated in writing.
