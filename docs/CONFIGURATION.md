# Rewear Relay runtime configuration

Runtime secrets and provider choices are intentionally not committed to the repository.

## Rewear Edge

### Perfect Corp

- `PERFECT_API_KEY` — required for real upload/VTO/task cleanup operations.
- `PERFECT_API_BASE` — optional API base override; repository config points to Perfect Corp's documented production API base.

### Search

- `SEARCH_PROVIDER` — `fixture` or `serpapi`. Repository default is `fixture` so starting the app cannot spend SerpApi credits.
- `SEARCH_SIGNING_KEY` — required for search and VTO binding receipts. Use a high-entropy secret at least 32 characters long. Never expose it to the browser.
- `SEARCH_RECEIPT_TTL_SECONDS` — candidate-set replay window. Repository default is 900 seconds and the Edge clamps it to 60–3600 seconds.
- `SERPAPI_KEY` — required only when `SEARCH_PROVIDER=serpapi`.

### Rig connection

- `RELAY_RIG_URL` — server-side URL for `services/relay-rig`. Non-local connections must use HTTPS. The browser never supplies this URL.

## Rig service

- `RIG_PROVIDER` — explicit provider choice: `ollama` or `openai`.
- `RIG_MODEL` — explicit model identifier. There is no default model.
- `RELAY_RIG_BIND` — bind address; defaults to loopback `127.0.0.1:8788`.
- `OPENAI_API_KEY` — required only when `RIG_PROVIDER=openai`.

For the preferred local path, use Rig with Ollama. That keeps Relay reasoning on operator-controlled hardware and avoids hosted-model token charges.

## Cost-authority defaults

The repository is deliberately fail-safe with respect to paid services:

- search starts in fixture mode;
- no Rig provider/model is silently selected;
- Perfect operations do not occur until a user explicitly requests a try-on;
- the homepage does not automatically execute a live search merely because a query is present.

## Secret placement

Use the deployment platform's secret manager / runtime secret mechanism. Do not commit real values to `.env`, `wrangler.jsonc`, source files, screenshots, issues, demo fixtures or test recordings.
