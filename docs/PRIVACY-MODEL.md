# Privacy Model

## Data minimization

Rewear needs a temporary person image, a garment image, provider file/task IDs, and minimal session metadata. It does not need identity recognition, biometric profiles, GPS metadata, or a permanent wardrobe for the hackathon flow.

## Browser preprocessing

Before upload: decode → normalize orientation → resize if needed → canvas/image re-encode → remove EXIF/GPS → hash sanitized bytes → request upload ticket.

## Provider retention reality

Perfect Corp documentation states uploaded files and task IDs may be retained for 30 days by default, while result download URLs expire sooner. Therefore Rewear must not describe provider-side assets as ephemeral merely because URLs expire. Our target behavior is explicit provider task/resource deletion after a fitting-room session ends, once the exact deletion endpoint is verified against current API documentation/account capabilities.

## User-facing claim

Allowed: “Rewear Relay does not store your fitting-room photo.”

Not allowed until verified cleanup succeeds: “Your photo is immediately deleted everywhere.”
