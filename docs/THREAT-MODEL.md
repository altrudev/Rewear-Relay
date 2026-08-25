# Threat Model

Priority abuse/failure cases:

## Credentials and infrastructure

- API key leakage to browser, source maps, errors or logs.
- Browser-controlled Rig or search-provider endpoint creating an SSRF/open-proxy path.
- Weak or missing candidate/VTO signing key.
- Search provider enabled unintentionally and consuming paid credits.
- Model provider selected unintentionally and consuming paid tokens.

## Image and VTO path

- MIME spoofing, oversized uploads, malformed images.
- Raw photo or presigned upload URL logged accidentally.
- Browser substitutes a different garment reference after selection.
- Candidate garment URL targets localhost/private/reserved address space.
- Stale VTO task is displayed against a different candidate/source/photo.
- Candidate-set token is confused with a VTO-binding token.
- Provider 401/429/5xx and task timeout.
- User refresh during provider processing.
- Replacing the local photo leaves an older result visually attached to the new predecessor.
- Unverified deletion is presented as successful deletion.
- User upload succeeds but task creation fails before any task ID exists, leaving no verified explicit cleanup primitive.

## Search and inventory path

- Marketplace title/metadata contains prompt-injection instructions.
- Browser mutates or invents candidates after search and before Rig ranking.
- Candidate-set receipt is tampered with.
- Valid candidate-set receipt is replayed after expiry.
- Search query is edited after a signed set exists, visually mislabeling old evidence as a new search.
- Search evidence is cached/stale but displayed as freshly observed.
- Ordinary retail result is mislabeled as secondhand.
- Search result contains an unsafe `javascript:`/`data:` URL.
- Search result redirects to an unexpected merchant/domain.
- Duplicate provider results produce multiple identities for one item.
- Price number is interpreted as a currency that the provider did not establish.
- Search provider returns malformed, overly long or oversized fields.
- Candidate receipt grows beyond a safe request envelope.

## Rig reasoning path

- Schema-valid model output contains an invented candidate ID.
- Schema-valid model output changes the source/predecessor ID.
- Shopper intent is edited after a plan exists, visually mislabeling an old recommendation as a new intent.
- Model treats listing text as instructions rather than evidence.
- Model claims physical fit, authenticity, condition or current availability without evidence.
- Rig timeout/provider failure is silently converted into a best-effort recommendation.

## Cross-path escalation

- Rig recommendation automatically invokes Perfect Corp without explicit user selection.
- Ranked candidate identity is not bound to the exact signed search evidence used for VTO.
- Browser supplies a garment URL directly to the candidate VTO endpoint.
- Perfect provider success is displayed despite candidate/source binding mismatch.
- A signed token from one transition class is accepted as authority for another transition class.

## Current controls

### Search

- Search defaults to fixture mode; SerpApi requires explicit server configuration.
- Strict resale mode admits only results with provider-supplied `second_hand_condition` evidence.
- Search provider URLs are normalized to HTTP(S), bounded in length, and unsafe schemes are dropped.
- Search candidate sets are capped at 12.
- Candidate-set inventory is HMAC-signed by Edge and replay-limited by expiry.
- `/api/relay/rank` accepts a signed candidate-set token plus shopper intent, not a browser-provided candidate array.
- SerpApi `search_metadata.created_at` is preserved as evidence time; Rewear receipt time is recorded separately.
- Once a signed set is displayed, the search query is frozen until the user explicitly starts a new search.

### Rig

- Rig candidate closure and predecessor binding are checked in Rust and independently at Edge.
- Search/listing text is explicitly treated as untrusted data.
- A completed plan freezes its shopper intent until the user explicitly invalidates the plan and re-ranks.
- No recommendation automatically authorizes VTO.

### Perfect candidate binding

- Candidate VTO accepts candidate-set token + candidate ID + user file ID; it does not accept a browser-provided garment URL.
- Edge recovers the exact garment image from signed inventory and sends it to Perfect as `ref_file_url`.
- Obvious non-public/private/local garment references are rejected.
- Perfect adapter enforces exactly one reference (`ref_file_id` XOR `ref_file_url`).
- After task creation, a separately scoped `vto-v1` receipt binds task + candidate + source + user file + garment URL.
- Candidate and VTO token scopes are cryptographically distinct and tested for cross-type rejection.
- Polling/display requires the VTO binding; the PWA rechecks candidate/source identity before accepting even a `success` response.
- Replacing the local user photo first deletes/invalidates the previous bound task/result.
- Failed bound tasks with a task ID trigger an automatic cleanup attempt.
- Explicit cleanup remains available after the display binding expires.
- If upload succeeds but no task ID is established, the UI reports provider-retention fallback rather than claiming deletion.

Security gates must be executed before submission. No GitHub Actions are required; tests are intended to run on the selected execution environment.
