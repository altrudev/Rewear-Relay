# DDC Assessment — Rewear Relay

DDC is used as an internal design/audit discipline, not as a competition dependency.

## Perfect Corp visualization path

For every visualization:

- **Authority:** user explicitly requested the transformation.
- **Source:** exact selected listing/garment image.
- **Context:** exact user asset + garment asset + item.
- **Transformation:** Perfect Corp AI Clothes VTO.
- **State:** source assets → queued task → provider result.
- **Claim boundary:** visualization is not sizing evidence.
- **Resource boundary:** Rewear stores no raw user-photo bytes.
- **Lineage:** session/item/asset/task IDs remain bound.
- **Deletion:** success must be evidenced; deletion is not inferred from URL expiry.

Primary invariant: a valid provider result with the wrong predecessor/item binding is invalid for display.

## Search / inventory evidence path

Search introduces an evidence-acquisition transition before Rig is allowed to reason.

```text
shopper/source item
      |
      v
search request
      |
      v
provider response
      |
      v
normalization + resale evidence gate
      |
      v
candidate inventory
      |
      v
Edge-signed candidate-set receipt
```

### Authority

The search provider may return evidence. It does not authorize ranking, VTO, purchase, reservation, messaging or any marketplace-side action.

### Evidence normalization

Rewear normalizes only bounded fields required for the decision layer. In strict secondhand mode, a candidate is admitted only when the provider supplies explicit secondhand-condition evidence. Rewear does not infer resale status solely from words such as `vintage`, `used-looking`, or seller branding.

Unsafe non-HTTP(S) outbound URLs are removed before the candidate reaches the browser.

### Search time vs receipt time

Two timestamps are preserved:

- **observedAt** — when the search provider says the underlying search was created/observed;
- **receivedAt** — when Rewear received that provider response.

This distinction is required because provider cache behavior can make a response older than the moment Rewear receives it. Rewear must never rewrite cached evidence as newly observed evidence.

`observedAt` does not prove current availability.

### Candidate-set integrity

After normalization, Edge creates an HMAC-signed candidate-set token containing:

- source item;
- normalized inventory;
- provider identity;
- original and provider-expanded query;
- observation time;
- receipt time;
- expiry time.

The browser cannot create or modify a candidate array for ranking. `/api/relay/rank` accepts only the signed token plus shopper intent.

A modified token is invalid. An expired token is invalid even if its contents were once legitimate.

### Cost authority

Search defaults to fixture mode. A paid/live SerpApi search occurs only when the server operator explicitly configures `SEARCH_PROVIDER=serpapi` and supplies the provider key. Loading the application or opening the lab does not itself authorize a live search.

## Rig Relay reasoning path

Rig introduces a separate transition class: **recommendation without execution authority**.

```text
signed candidate-set receipt
      +
shopper intent
      |
      v
receipt verification
      |
      v
pre-model validation
      |
      v
Rig typed reasoning
      |
      v
RelayPlan
      |
      v
post-model validation
      |
      v
user-visible recommendation
```

### Authority

Rig is authorized to rank only the candidate set recovered from the verified search receipt. It is not authorized to:

- add candidates;
- browse;
- invoke VTO;
- transact;
- reserve inventory;
- message sellers;
- change source identity;
- assert physical fit or unsupported availability.

A recommendation does not implicitly authorize the next transition.

### Predecessor binding

`RelayPlan.source_item_id` must equal the exact signed request source ID. A semantically reasonable plan against the wrong source item is invalid.

### Candidate closure

Every returned `candidate_id` must be a member of the exact signed candidate set. The model cannot create a successor resource merely by naming it.

Closure is checked twice:

1. inside the Rust Rig service;
2. again at Rewear Edge before the plan reaches the browser.

The browser is no longer the authority for candidate membership.

### Directive influence

All marketplace and shopper text is treated as untrusted data. A seller-controlled title such as `ignore prior rules` is evidence about a listing string, not an instruction to the runtime.

Prompt-level containment is not treated as sufficient by itself. Even if directive influence changes model behavior, the signed-set closure and predecessor gates remain authoritative.

### Evidence boundary

`observed_at` means only that a candidate was observed at that time. It does not prove current availability.

A recommendation score means recommendation confidence under supplied evidence. It is not:

- physical-fit probability;
- authenticity probability;
- condition verification;
- current-availability certainty.

### Resource boundary

The browser does not select the Rig endpoint or receive model credentials. Rewear Edge communicates with the operator-configured Rig service over a fixed server-side URL.

Rig receives normalized candidate metadata, not the user's fitting-room photograph or marketplace credentials.

### State transitions

Allowed:

`SEARCH_EVIDENCE_RECEIVED → CANDIDATE_SET_SIGNED → RECEIPT_VERIFIED → RANKING_REQUESTED → PLAN_RETURNED → PLAN_VALIDATED → PLAN_DISPLAYED`

Rejected terminal transitions include:

- `SEARCH_PROVIDER_UNAVAILABLE`
- `CANDIDATE_SET_TOKEN_INVALID`
- `CANDIDATE_SET_EXPIRED`
- `SOURCE_MISMATCH`
- `UNKNOWN_CANDIDATE`
- `DUPLICATE_RANKING`
- `INVALID_SCORE`
- `MALFORMED_PLAN`
- `RUNTIME_UNAVAILABLE`

No rejected transition is silently converted into a best-effort recommendation.

## Cross-path invariant

The search, Rig and Perfect Corp paths remain separated:

```text
Search observes candidate
        |
        v
Edge signs candidate set
        |
        v
Rig recommends candidate
        |
        v
User selects candidate
        |
        v
Rewear binds exact candidate asset
        |
        v
Perfect Corp VTO
```

Neither search observation nor Rig recommendation can directly become a Perfect Corp task. The user's explicit selection is the authority bridge into the transformation path.

## Current audit status

Implemented controls:

- strict provider-evidenced secondhand gate;
- normalized inventory provider abstraction;
- safe outbound URL normalization;
- provider observation time preserved separately from Rewear receipt time;
- HMAC-signed candidate-set receipts;
- receipt expiry and tamper rejection;
- browser cannot submit arbitrary ranking candidates;
- source/predecessor binding;
- candidate closure;
- duplicate candidate rejection;
- score bounds;
- typed `RelayPlan` output;
- post-model validation;
- Edge revalidation;
- untrusted-input prompt boundary;
- explicit Rig provider/model configuration;
- no default paid model-provider selection;
- fixture search as the zero-cost default;
- live SerpApi only by explicit server configuration;
- direct Perfect upload architecture;
- explicit Perfect task/resource cleanup.

Still requires runtime evidence on an execution host:

- JavaScript/TypeScript install, typecheck and test pass;
- Rust compile/test/clippy pass;
- Ollama model quality and structured-output behavior;
- latency/resource measurements;
- Edge → deployed Rig HTTPS connectivity;
- live SerpApi response against real secondhand queries;
- real Perfect Corp `cloth-v4` transaction;
- end-to-end signed candidate selection → exact garment image → VTO binding test.
