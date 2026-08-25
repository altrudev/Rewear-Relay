# Rewear Relay

**Try it before someone else buys it.**

Rewear Relay is a mobile-first visual decision layer for secondhand fashion. It helps shoppers discover a one-off item, visualize that exact garment on themselves using Perfect Corp AI Clothes Virtual Try-On, and relay to similar live alternatives when the original is unavailable or rejected.

## Hackathon target

Built from scratch for the DevNetwork API + Cloud + AI Hackathon 2026 — Perfect Corp Challenge.

Primary product loop:

`SEARCH → SELECT → VISUALIZE → DECIDE → RELAY`

## Architecture principles

- Perfect Corp Clothes VTO is the central visualization engine.
- User images are uploaded directly from the browser to Perfect Corp presigned upload targets; Rewear does not proxy or persist raw photos.
- Perfect Corp and search credentials remain server-side only.
- Completed Perfect tasks/resources are explicitly deleted when a fitting-room session is deleted.
- AI visualization is never presented as physical sizing evidence.
- Every result remains bound to its source item, garment asset, user asset, and provider task.
- The first engineering milestone is a real `cloth-v4` vertical slice before search or UI expansion.

## Repository layout

- `apps/web` — React + TypeScript PWA
- `apps/edge` — Cloudflare Worker + Hono API boundary
- `packages/domain` — product state and invariants
- `packages/providers` — external provider adapters
- `packages/validation` — shared validation
- `packages/receipts` — provenance/preview receipts
- `docs` — architecture, privacy, threat model, hackathon plan

## Current status

Foundation/scaffold in progress. No API credentials belong in this repository.

## Ownership

Copyright © 2026 Altru.dev. All rights reserved.

This repository is publicly visible for competition review. No license is granted for copying, modifying, redistributing, or commercial reuse unless explicitly stated in writing.
