# DDC Assessment — Rewear Relay

DDC is used as an internal design/audit discipline, not as a competition dependency.

## End-to-end authority chain

```text
source item + shopper query
        |
        v
SEARCH EVIDENCE
        |
        v
normalize + strict resale gate
        |
        v
HMAC-signed candidate set
        |
        v
RIG RECOMMENDATION
        |
        v
post-model identity/closure gate
        |
        v
EXPLICIT USER SELECTION
        |
        v
local user-photo preparation
        |
        v
candidate-bound Perfect task
        |
        v
signed VTO binding
        |
        v
bound result display / cleanup
```

No earlier transition implicitly authorizes a later one.

## 1. Search / inventory evidence

### Authority

The search provider may return evidence. It cannot authorize ranking, VTO, purchase, reservation, messaging or other marketplace actions.

### Evidence normalization

Rewear normalizes only bounded decision fields. In strict secondhand mode a candidate is admitted only when the provider supplies explicit secondhand-condition evidence. Rewear does not infer secondhand status solely from seller language such as `vintage`.

Unsafe non-HTTP(S) outbound URLs are removed before browser display.

### Evidence time

Rewear preserves:

- `observedAt` — provider search creation/observation time;
- `receivedAt` — when Rewear received the response;
- `expiresAt` — Rewear's candidate-set replay limit.

Provider-cached evidence is therefore not relabeled as freshly observed. Observation still does not prove current availability.

### Candidate-set integrity

Edge signs the normalized source + candidate inventory with HMAC-SHA-256 using the scoped `candidate-v1` token format.

`/api/relay/rank` accepts the signed token and shopper intent, not a browser-provided candidate array. A modified or expired candidate-set token is invalid.

### Cost authority

Search defaults to `fixture`. Live SerpApi requires explicit server configuration and a provider key. Opening the app does not itself authorize paid search.

## 2. Rig recommendation

Rig is a bounded recommendation runtime.

### Authority

Rig may rank only candidates recovered from a verified candidate-set receipt. It may not:

- add candidates;
- browse arbitrary URLs;
- invoke Perfect Corp;
- purchase/reserve/message;
- change source identity;
- assert physical fit or unsupported availability.

### Predecessor binding

`RelayPlan.source_item_id` must equal the exact signed source item ID.

### Candidate closure

Every returned candidate ID must exist in the signed set. Closure is independently enforced:

1. inside the Rust Rig service;
2. at Rewear Edge after model execution.

A schema-valid invented candidate is rejected.

### Directive influence

Marketplace titles and shopper text are untrusted data. Prompt-level containment is useful but not treated as sufficient: even if model behavior is influenced, post-model predecessor and candidate-closure gates remain authoritative.

### Claim boundary

A Rig score represents recommendation confidence under supplied evidence. It is not physical-fit probability, authenticity verification, condition verification or availability certainty.

## 3. User selection — authority bridge

A validated recommendation still cannot create a Perfect task.

The user must explicitly select a ranked candidate. That selection is the authority bridge from recommendation to transformation.

Changing the signed search or ranking intent invalidates downstream selection state. Replacing the active user photo deletes/invalidates any existing bound task before the new photo becomes the active predecessor in the UI.

## 4. Candidate-bound Perfect Corp VTO

### Candidate source

`POST /api/tryon/candidate` accepts a signed candidate-set token, exact candidate ID and user `src_file_id`.

Edge resolves the candidate from the signed inventory; the browser does not supply the garment URL. The selected candidate must contain a public HTTPS garment image.

Perfect receives:

- `src_file_id` — sanitized user photo uploaded directly to Perfect;
- `ref_file_url` — exact signed garment reference URL.

The provider adapter accepts exactly one garment reference (`ref_file_id` XOR `ref_file_url`).

### VTO binding receipt

After Perfect returns `task_id`, Edge creates a separately scoped `vto-v1` HMAC receipt binding:

- task ID;
- candidate ID;
- source item ID;
- user file ID;
- exact garment URL;
- candidate evidence timestamp;
- creation/expiry times.

Candidate-set and VTO token scopes are cryptographically distinct; a token of one type is invalid as the other.

### Result display

Candidate-task polling requires the signed VTO binding. The browser additionally checks returned candidate and source IDs before accepting even a provider `success` result.

Primary invariant:

> A provider-successful result with the wrong candidate/source predecessor binding is invalid for display.

### Claim boundary

Perfect output is labeled visualization only. It does not establish size, physical fit, material behavior, authenticity, condition or availability.

## 5. Privacy / resource lifecycle

### Normal path

User photo is re-encoded client-side before upload. Rewear does not proxy or persist raw user-photo bytes.

Once a Perfect task exists, bound task cleanup uses Perfect task deletion. Failed bound tasks with a task ID trigger an automatic cleanup attempt; users can explicitly delete successful tasks.

Cleanup remains callable after the UI binding display window expires so expiry cannot prevent privacy cleanup.

### Residual unattached-upload risk

Perfect publicly documents File API upload and task-level deletion. Rewear has not verified a standalone uploaded-file delete operation.

Residual sequence:

`user upload succeeds → task creation fails before task_id`

Without a task ID Rewear cannot honestly claim explicit deletion. The UI reports provider-retention fallback.

Mitigations:

- candidate receipt/image validated before upload;
- sanitized photo stays local until explicit try-on;
- upload and task creation run immediately back-to-back;
- once a task ID exists, cleanup is available;
- unattached-upload fallback is surfaced rather than concealed.

## 6. Rejected transitions

Fail-closed terminal states include:

- `SEARCH_PROVIDER_UNAVAILABLE`
- `CANDIDATE_SET_TOKEN_INVALID`
- `CANDIDATE_SET_EXPIRED`
- `SOURCE_MISMATCH`
- `UNKNOWN_CANDIDATE`
- `DUPLICATE_RANKING`
- `INVALID_SCORE`
- `RIG_PLAN_REJECTED`
- `CANDIDATE_NOT_IN_SET`
- `CANDIDATE_IMAGE_MISSING`
- `CANDIDATE_IMAGE_UNSAFE`
- `VTO_BINDING_TOKEN_INVALID`
- `VTO_BINDING_MISMATCH`
- `VTO_BINDING_EXPIRED`
- `CANDIDATE_VTO_BINDING_MISMATCH`
- provider/runtime failures.

No rejected transition is silently converted into a best-effort successor.

## Current audit status

Implemented in code/tests:

- strict provider-evidenced secondhand gate;
- normalized search abstraction + fixture/SerpApi adapters;
- provider evidence timestamp separated from Rewear receipt time;
- safe outbound URL normalization;
- HMAC candidate-set integrity + expiry;
- browser-proof candidate closure;
- Rig typed output + source/candidate validation;
- prompt-injection containment;
- explicit Rig model/provider selection;
- scoped candidate/VTO token separation tests;
- exact `ref_file_url` Perfect request tests;
- explicit user-selection bridge;
- signed candidate → Perfect task binding;
- client display rejection for candidate/source mismatch;
- explicit task cleanup path;
- UI state invalidation when query/intent/photo predecessor changes;
- documented residual unattached-upload retention fallback.

Still requires runtime evidence:

- `npm install`, root typecheck and Vitest pass;
- Rust format/compile/clippy/test pass;
- Ollama structured-output/quality and resource measurements;
- Edge → deployed Rig HTTPS connection;
- live SerpApi search against real resale queries;
- real Perfect Corp `cloth-v4` transaction;
- end-to-end live signed search → Rig → candidate selection → Perfect result → deletion;
- mobile/browser QA and demo recording.
