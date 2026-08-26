# Rewear Relay

**Try it before someone else buys it.**

Rewear Relay is a mobile-first visual decision layer for secondhand fashion. It helps shoppers discover a one-off item, visualize that exact garment on themselves using Perfect Corp AI Clothes Virtual Try-On, and relay to similar alternatives when the original is unavailable or rejected.

## Hackathon target

Built from scratch for the DevNetwork API + Cloud + AI Hackathon 2026 — Perfect Corp Challenge.

Primary product loop:

`SEARCH → RANK → SELECT → VISUALIZE → DECIDE → RELAY`

## Run the zero-cost development path

On the target Ubuntu host, use the gates in this order:

```bash
npm run host:check
npm run gate
```

`host:check` is non-mutating. `gate` runs the Node workspace typecheck/tests/build plus Rust formatting/check/clippy/tests.

For the local product loop, first choose an Ollama model that is **already installed** on the machine, then:

```bash
export RIG_MODEL='<installed-ollama-model>'
npm run dev:local:rig
```

The launcher:

- never pulls a model automatically;
- keeps search in fixture mode, so it cannot spend SerpApi credits;
- generates an ephemeral search-receipt signing key for the local session;
- starts Ollama, Rig, Edge and the PWA;
- runs `npm run smoke:relay` before exposing the web UI;
- refuses to report success if the signed fixture search → Rig → candidate/source closure path fails.

When it passes, open:

`http://127.0.0.1:5173/relay-lab`

Perfect Corp is deliberately not configured by this zero-cost launcher. Live search and real VTO are enabled only after the local path passes and their secrets are intentionally supplied at runtime.

## Architecture principles

- Perfect Corp Clothes VTO is the central visualization engine.
- Rig `0.42.0` is the bounded reasoning runtime for Relay candidate ranking.
- Search evidence is normalized at Edge and sealed into an HMAC-signed candidate-set receipt before the browser can ask Rig to rank it.
- The browser cannot add, replace or mutate candidate membership for a ranking request.
- Rig receives only normalized candidate evidence and cannot browse arbitrary listing URLs, purchase items, invoke VTO, or claim physical fit.
- Every Rig `RelayPlan` is validated after model execution; unknown candidates or source/predecessor mismatches fail closed.
- Marketplace titles and shopper text are treated as untrusted data, not instructions.
- Rig provider/model selection is explicit. Local Ollama and optional OpenAI modes are supported; no paid model provider is silently selected.
- Search starts in fixture mode. Live SerpApi occurs only after explicit server configuration.
- Strict resale search admits only provider results carrying explicit secondhand-condition evidence.
- Search evidence time and Rewear receipt time are preserved separately so cached evidence is not mislabeled as fresh.
- Shopping handoff URLs are normalized to HTTP(S); garment image evidence used for candidate VTO is restricted to HTTPS.
- User images are uploaded directly from the browser to Perfect Corp presigned upload targets; Rewear does not proxy or persist raw photos.
- A Perfect candidate task can be created only after explicit user selection of a candidate contained in the signed search receipt.
- Candidate VTO uses the exact signed HTTPS garment image as Perfect Corp `ref_file_url` and creates a separately scoped signed task binding.
- Perfect Corp, search, receipt-signing and model-provider credentials remain server-side only.
- Completed Perfect tasks/resources are explicitly deleted when the user deletes or switches a bound try-on.
- AI visualization is never presented as physical sizing evidence.

## Repository layout

- `apps/web` — React + TypeScript PWA
- `apps/edge` — Cloudflare Worker + Hono API boundary
- `services/relay-rig` — Rust + Rig governed recommendation runtime
- `packages/domain` — product state and invariants
- `packages/providers` — Perfect Corp and search provider adapters
- `packages/validation` — shared validation and receipt payload schemas
- `packages/receipts` — provenance/preview receipt support
- `scripts` — host preflight, deterministic gate, signed Relay smoke and local Rig launcher
- `docs` — architecture, privacy, threat model, DDC, runtime and hackathon documentation

## Development labs

- `/lab` — direct Perfect Corp vertical slice: sanitize images → direct upload → `cloth-v4` → poll → result → explicit cleanup.
- `/relay-lab` — integrated Relay path: normalized search → signed candidate set → Rig ranking → explicit candidate selection → local user-photo sanitization → candidate-bound Perfect task → bound result → cleanup.

Fixture search is the zero-cost default and deliberately does not pretend its products are live. A fixture without a usable public garment image remains rankable but cannot be sent to Perfect VTO.

## Governed Relay boundary

The application separates evidence, recommendation and execution authority:

```text
search provider evidence
        |
        v
normalize + sign candidate set
        |
        v
Rig typed RelayPlan
        |
        v
post-model identity gate
        |
        v
explicit user selection
        |
        v
signed candidate → Perfect task binding
        |
        v
Perfect Corp visualization
```

A recommendation cannot automatically become a Perfect task. A user selection is the authority bridge.

See:

- `docs/RIG-RUNTIME.md`
- `docs/VTO-BINDING.md`
- `docs/DDC-ASSESSMENT.md`
- `docs/THREAT-MODEL.md`
- `docs/CONFIGURATION.md`
- `docs/BUILD-GATES.md`

## Current status

Implemented:

- mobile-first PWA shell;
- browser-side image re-encoding and EXIF/GPS removal;
- Perfect Corp upload/task/poll/delete integration;
- Perfect `ref_file_url` support for signed search candidates;
- normalized `SearchProvider` abstraction;
- zero-cost fixture provider;
- SerpApi Google Shopping adapter;
- strict provider-evidenced secondhand filtering;
- provider observation time + Rewear receipt time separation;
- safe HTTP(S) shopping-link normalization and HTTPS-only VTO garment-image evidence;
- HMAC-signed candidate-set receipts with expiry;
- cryptographically separate candidate-set and VTO-binding token scopes;
- browser-proof candidate closure for Rig ranking;
- governed Edge → Rig facade;
- Rig `0.42.0` Rust runtime;
- explicit Ollama/OpenAI provider selection;
- typed Relay request/plan contracts;
- source/predecessor and candidate-closure validation in Rust and Edge;
- prompt-injection containment for marketplace/user strings;
- zero-cost Rig mock-model tests;
- signed candidate → Perfect task binding;
- status/display binding to exact candidate + source item + user file + task;
- automatic cleanup attempt for failed bound tasks once a task ID exists;
- explicit UI disclosure of the residual provider-retention fallback when upload succeeds but task creation fails before a task ID exists;
- host/toolchain preflight;
- one-command deterministic runtime gate;
- signed Relay smoke harness with positive and invented-candidate negative execution checks;
- zero-cost local Rig/Ollama launcher;
- fitting-room and integrated Relay development labs;
- DDC/threat-model coverage of search, reasoning and transformation transitions.

Still requires runtime evidence on the actual execution host:

- first trusted dependency install and committed `package-lock.json`;
- successful `npm run gate` with recorded Node/npm/rustc/cargo versions;
- measured Ollama model quality and resource use;
- browser exercise of the real local Edge → Rig path;
- Edge → Rig HTTPS connectivity outside local development;
- live SerpApi response against real secondhand queries;
- a real Perfect Corp `cloth-v4` transaction;
- full signed search → Rig → selection → candidate-bound Perfect result test;
- mobile/browser QA and demo recording.

## Known provider limitation

Perfect Corp publicly documents File API upload and task-level deletion. Rewear has not verified a standalone File API delete operation. If the user image upload succeeds but Perfect task creation fails before returning a task ID, Rewear cannot honestly claim immediate explicit cleanup of that unattached upload; the UI reports the provider-retention fallback. Once a task ID exists, Rewear uses task-level cleanup.

## Ownership

Copyright © 2026 Altru.dev. All rights reserved.

This repository is publicly visible for competition review. No license is granted for copying, modifying, redistributing, or commercial reuse unless explicitly stated in writing.
