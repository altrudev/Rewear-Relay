# DDC Assessment — Rewear Relay

DDC is used as an internal design/audit discipline, not as a competition dependency.

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
