# Privacy Model

## Data minimization

Rewear needs a temporary person image, a garment image, provider file/task IDs, and minimal session metadata. It does not need identity recognition, biometric profiles, GPS metadata, or a permanent wardrobe for the hackathon flow.

## Browser preprocessing

Before upload: decode → normalize orientation → resize if needed → canvas/image re-encode → remove EXIF/GPS → hash sanitized bytes → request upload ticket.

## Provider retention reality

Perfect Corp documentation states uploaded files and task IDs may be retained for 30 days by default, while result download URLs expire sooner. Rewear therefore does not infer deletion from URL expiry.

Perfect Corp Task Management provides `POST /s2s/v2.0/task/delete` for a finished `task_id`; the documented behavior deletes the task, associated input files, and generated outputs. Rewear exposes cleanup only after provider confirmation and does not claim deletion when that request fails.

## User-facing claims

Allowed: “Rewear Relay does not store your fitting-room photo.”

Allowed after successful task cleanup: “Provider task and associated files deleted.”

Not allowed: “Nothing ever leaves your device.”
