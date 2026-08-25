# Threat Model

Priority abuse/failure cases:

- API key leakage to browser, source maps, errors or logs.
- MIME spoofing, oversized uploads, malformed images.
- SSRF/open redirect through listing or image URLs.
- XSS through marketplace titles/descriptions.
- Stale VTO task displayed against the wrong listing.
- Provider 401/429/5xx and task timeout.
- User refresh during provider processing.
- Unverified deletion presented as successful deletion.
- Search result redirects to an unexpected merchant/domain.
- Raw photo or presigned URL logged accidentally.

Security gates must be automated before submission. No GitHub Actions are required; tests are run locally/through the selected deployment environment.
