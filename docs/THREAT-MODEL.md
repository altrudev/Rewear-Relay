# Threat Model

Priority abuse/failure cases:

## Credentials and infrastructure

- API key leakage to browser, source maps, errors or logs.
- Browser-controlled Rig or search-provider endpoint creating an SSRF/open-proxy path.
- Weak or missing candidate-set signing key.
- Search provider enabled unintentionally and consuming paid credits.

## Image and VTO path

- MIME spoofing, oversized uploads, malformed images.
- Raw photo or presigned URL logged accidentally.
- Stale VTO task displayed against the wrong listing.
- Provider 401/429/5xx and task timeout.
- User refresh during provider processing.
- Unverified deletion presented as successful deletion.

## Search and inventory path

- Marketplace title/metadata contains prompt-injection instructions.
- Browser mutates or invents candidates after search and before Rig ranking.
- Candidate-set receipt is tampered with.
- Valid candidate-set receipt is replayed after expiry.
- Search evidence is cached/stale but displayed as freshly observed.
- Ordinary retail result is mislabeled as secondhand.
- Search result contains an unsafe `javascript:`/`data:` URL.
- Search result redirects to an unexpected merchant/domain.
- Duplicate provider results produce multiple identities for one item.
- Price number is interpreted as a currency that the provider did not establish.
- Search provider returns malformed or oversized fields.

## Rig reasoning path

- Schema-valid model output contains an invented candidate ID.
- Schema-valid model output changes the source/predecessor ID.
- Model treats listing text as instructions rather than evidence.
- Model claims physical fit, authenticity, condition, or current availability without evidence.
- Rig timeout/provider failure is silently converted into a best-effort recommendation.

## Cross-path escalation

- Rig recommendation automatically invokes Perfect Corp without explicit user selection.
- Ranked candidate identity is not bound to the exact search evidence later used for VTO.
- Browser substitutes a different garment image or listing after recommendation.

## Current controls

- Search defaults to fixture mode; SerpApi requires explicit server configuration.
- Strict resale mode admits only results with provider-supplied `second_hand_condition` evidence.
- Search provider URLs are normalized to HTTP(S) only.
- Candidate-set inventory is HMAC-signed by Edge and replay-limited by expiry.
- `/api/relay/rank` accepts a signed candidate-set token plus shopper intent, not a browser-provided candidate array.
- SerpApi `search_metadata.created_at` is preserved as evidence time; Rewear receipt time is recorded separately.
- Rig candidate closure and predecessor binding are checked in Rust and independently at Edge.
- Search/listing text is explicitly treated as untrusted data.
- Recommendation and VTO remain separate authority transitions.
- Perfect task/resource deletion requires provider confirmation.

Security gates must be automated before submission. No GitHub Actions are required; tests are run locally/through the selected execution environment.
