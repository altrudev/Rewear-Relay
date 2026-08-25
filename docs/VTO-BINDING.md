# Candidate → Perfect Corp VTO binding

This document covers the authority bridge between a Relay recommendation and a Perfect Corp Clothes VTO task.

## Why this boundary exists

A recommendation is not a transformation authorization.

The application therefore does not allow Rig output, a browser-provided URL, or an arbitrary candidate ID to create a Perfect task. The required transition is:

```text
signed search evidence
      |
      v
validated Rig recommendation
      |
      v
explicit user candidate selection
      |
      v
local user-photo preparation
      |
      v
Perfect upload + candidate-bound task
```

## Candidate authority

`POST /api/tryon/candidate` accepts:

- the original signed candidate-set token;
- an exact candidate ID;
- the Perfect `src_file_id` for the user's sanitized photo;
- an optional garment category.

Edge verifies the candidate-set token and its expiry, then resolves the candidate from the signed inventory itself. The browser cannot substitute a different garment URL.

The candidate must contain a public HTTPS image URL. Rewear rejects obvious private/local reference destinations before using the URL as Perfect Corp `ref_file_url`.

## Perfect request

The candidate path intentionally uses:

- `src_file_id` for the user's uploaded photo;
- `ref_file_url` for the exact garment image recovered from the signed inventory.

The Perfect provider adapter enforces exactly one garment reference: `ref_file_id` **or** `ref_file_url`, never both.

## VTO binding receipt

After Perfect returns a task ID, Edge creates a separately scoped HMAC receipt (`vto-v1`) that binds:

- Perfect task ID;
- candidate ID;
- source item ID;
- user `src_file_id`;
- exact garment image URL;
- candidate-set evidence timestamp;
- creation time;
- display expiry.

Candidate-set tokens and VTO binding tokens use different cryptographic scopes. One token type cannot be reused as the other.

## Polling and display

Candidate-task status is available only through the signed binding:

`POST /api/tryon/candidate/status`

The client additionally verifies that the returned binding still identifies the expected candidate and source item before displaying the result.

A provider-successful image with the wrong candidate/source binding is invalid for display.

## Cleanup

`POST /api/tryon/candidate/delete` requires the signed VTO binding and calls Perfect Corp task deletion. Cleanup remains allowed after the binding's display window expires so privacy cleanup is not prevented by an expired UI session.

When a bound task fails after a task ID exists, the UI attempts task deletion automatically.

### Residual unattached-upload risk

Perfect Corp's public documentation currently exposes the File API upload flow and task-level deletion, but Rewear has not verified a standalone File API delete operation.

Therefore this failure sequence remains possible:

```text
user upload succeeds
      |
      v
Perfect src_file_id exists
      |
      v
candidate task creation fails before task_id
```

Without a task ID, Rewear cannot truthfully claim explicit task cleanup. The unattached upload falls back to Perfect Corp's retention policy.

Mitigations:

1. candidate-set token and candidate image are validated **before** the user image is uploaded;
2. the sanitized image stays local until the user explicitly presses the candidate try-on button;
3. upload and task creation are performed immediately back-to-back;
4. the UI explicitly reports the retention fallback if upload succeeded but no task ID was established;
5. once a task ID exists, task cleanup is attempted on failures and can also be requested explicitly by the user.

This residual is preferable to falsely representing an undocumented file-deletion capability.

## DDC invariants

- **Authority:** user selection bridges recommendation to transformation.
- **Predecessor binding:** task must remain bound to exact source item + candidate + user file + garment URL.
- **Resource binding:** the browser cannot replace the signed garment URL.
- **Claim boundary:** output remains a visualization, not physical-fit evidence.
- **Deletion evidence:** deletion is reported only after the task deletion call succeeds.
- **Failure honesty:** an unattached uploaded file is reported as retention fallback rather than deleted.
