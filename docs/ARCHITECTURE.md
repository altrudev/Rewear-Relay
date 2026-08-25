# Architecture

## Product loop

`SEARCH → SELECT → VISUALIZE → DECIDE → RELAY`

Rewear Relay is a visual decision layer over existing commerce, not a marketplace.

## Trust boundary

Browser → Rewear Edge API → Perfect Corp authorization/task APIs.

Raw user images should travel Browser → Perfect Corp presigned upload URL. Rewear must not proxy or persist the bytes.

## VTO flow

1. Browser validates/re-encodes image and strips metadata.
2. Edge requests `/s2s/v2.0/file` using the server-side Perfect API key.
3. Edge returns the provider file ID and presigned PUT request data.
4. Browser uploads bytes directly to the presigned URL.
5. Edge creates `/s2s/v2.0/task/cloth-v4` with user/ref file IDs and `garment_category`.
6. Browser polls Rewear; Rewear polls Perfect until success/error.
7. Result remains bound to session + item + person asset + garment asset + task ID.
8. Session deletion must explicitly delete provider task resources once the exact Perfect deletion contract is verified.

## Non-negotiable invariants

- No provider/search secret reaches browser code.
- No raw user photo is written to Rewear logs or persistent storage.
- A result cannot be displayed for a different source item binding.
- Visualization must never be represented as physical fit verification.
- Provider cleanup is fail-closed in product claims: the UI must not claim deletion until provider deletion succeeds.
