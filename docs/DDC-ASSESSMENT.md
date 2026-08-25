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

## Rig Relay reasoning path

Rig introduces a separate transition class: **recommendation without execution authority**.

```text
observed source item
      +
closed candidate set
      +
shopper intent
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

Rig is authorized to rank a supplied candidate set. It is not authorized to:

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

`RelayPlan.source_item_id` must equal the exact request source ID. A semantically reasonable plan against the wrong source item is invalid.

### Candidate closure

Every returned `candidate_id` must be a member of the exact supplied candidate set. The model cannot create a successor resource merely by naming it.

Closure is checked twice:

1. inside the Rust Rig service;
2. again at Rewear Edge before the plan reaches the browser.

### Directive influence

All marketplace and shopper text is treated as untrusted data. A seller-controlled title such as `ignore prior rules` is evidence about a listing string, not an instruction to the runtime.

Prompt-level containment is not treated as sufficient by itself. Even if directive influence changes model behavior, the post-model closure and predecessor gates remain authoritative.

### Evidence boundary

`observed_at` means only that a candidate was observed at that time. It does not prove current availability.

A recommendation score means recommendation confidence under supplied evidence. It is not:

- physical-fit probability;
- authenticity probability;
- condition verification;
- current-availability certainty.

### Resource boundary

The browser does not select the Rig endpoint or receive model credentials. Rewear Edge communicates with the operator-configured Rig service over a fixed server-side URL.

Rig itself receives normalized candidate metadata, not the user's fitting-room photograph.

### State transitions

Allowed:

`CANDIDATES_SUPPLIED → RANKING_REQUESTED → PLAN_RETURNED → PLAN_VALIDATED → PLAN_DISPLAYED`

Rejected terminal transitions include:

- `SOURCE_MISMATCH`
- `UNKNOWN_CANDIDATE`
- `DUPLICATE_RANKING`
- `INVALID_SCORE`
- `MALFORMED_PLAN`
- `RUNTIME_UNAVAILABLE`

No rejected transition is silently converted into a best-effort recommendation.

## Cross-path invariant

The Rig path and Perfect Corp path remain separated:

```text
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

The recommendation itself cannot become a Perfect Corp task. The user's explicit selection is the authority bridge between the two systems.

## Current audit status

Implemented controls:

- source/predecessor binding;
- candidate closure;
- duplicate candidate rejection;
- score bounds;
- typed `RelayPlan` output;
- post-model validation;
- Edge revalidation;
- untrusted-input prompt boundary;
- explicit Rig provider/model configuration;
- no default paid-provider selection;
- direct Perfect upload architecture;
- explicit Perfect task/resource cleanup.

Still requires runtime evidence on an execution host:

- Rust compile/test pass;
- Ollama model quality and structured-output behavior;
- latency/resource measurements;
- Edge → deployed Rig HTTPS connectivity;
- real Perfect Corp `cloth-v4` transaction;
- end-to-end user-selected candidate → VTO binding test.
