# Build Gates

## Gate 0 — foundation

- [x] Repository initialized from scratch
- [x] Product/domain boundary documented
- [x] Perfect Corp adapter isolated
- [x] Direct-upload ticket route scaffolded
- [x] `cloth-v4` task create/poll/delete path
- [x] PWA manifest/service worker shell
- [x] Browser EXIF/GPS stripping by decode + re-encode
- [x] Browser direct-to-provider upload flow
- [x] Vertical-slice `/lab` route with polling/result rendering
- [x] Verified Perfect task-management cleanup contract
- [x] Explicit finished-task/resource deletion path
- [x] Binding mismatch and display-predecessor tests
- [x] Secret-not-returned provider tests

## Gate 1 — deterministic runtime gate

Code exists; runtime evidence is still required on an execution host.

- [x] One-command `npm run gate` entry point
- [x] Node workspace typecheck included
- [x] JavaScript/TypeScript tests included
- [x] Production web build included
- [x] Rust formatting/check/clippy/tests included
- [x] Optional Rig/Ollama health smoke test included
- [ ] Execute `npm run gate` successfully on the target host
- [ ] Record Node/npm/rustc/cargo versions with the passing result
- [ ] Commit the resulting `package-lock.json` after the first trusted install

## Gate 2 — local Rig product loop

- [x] Rig `0.42.0` bounded recommendation runtime
- [x] Explicit `ollama` / `openai` provider selection
- [x] No default model
- [x] Typed `RelayPlan`
- [x] MockCompletionModel zero-cost tests
- [x] Source/predecessor and candidate-closure gates
- [x] Prompt-injection containment for marketplace/user strings
- [x] `npm run dev:local:rig` zero-cost local launcher
- [x] Launcher keeps search in fixture mode and generates an ephemeral signing key
- [x] Launcher never auto-pulls an Ollama model
- [ ] Start local stack with an explicitly installed Ollama model
- [ ] Exercise `/relay-lab` through browser → Edge → Rig → validated plan
- [ ] Capture latency and memory/CPU measurements

## Gate 3 — search / Relay evidence

- [x] Provider-neutral search adapter
- [x] Fixture provider as zero-cost default
- [x] SerpApi Google Shopping adapter
- [x] Current-result normalization
- [x] Provider-evidenced strict secondhand gate
- [x] Safe outbound URL normalization
- [x] Provider observation time separated from Rewear receipt time
- [x] HMAC-signed candidate-set receipt
- [x] Receipt expiry and tamper rejection
- [x] Browser cannot submit arbitrary candidates to Rig
- [x] Candidate-set size bounded to 12
- [x] Marketplace handoff remains separate from recommendation authority
- [ ] Explicitly enable SerpApi with a runtime secret
- [ ] Run representative Canadian secondhand queries
- [ ] Inspect false negatives/false positives in `second_hand_condition`
- [ ] Record live result latency and evidence freshness

## Gate 4 — signed candidate → Perfect VTO

- [x] Rig recommendation requires explicit user selection before VTO
- [x] Candidate is recovered from the signed search receipt
- [x] Perfect candidate VTO uses signed `ref_file_url` evidence
- [x] Separate scoped HMAC VTO binding receipt
- [x] Task binding includes candidate, source item, user file, garment image and Perfect task ID
- [x] Poll/display fails closed on candidate/source mismatch
- [x] Changing search, intent, candidate or user photo invalidates downstream state
- [x] Successful/failed bound task cleanup path
- [x] Residual unattached-upload retention risk documented
- [ ] Redeem APIWORLD and create Perfect Corp API key
- [ ] Set `PERFECT_API_KEY` as runtime/deployment secret only
- [ ] Run six-image vertical-slice matrix
- [ ] Verify real upload PUT headers/CORS from mobile browser
- [ ] Verify `garment_category=auto` and `outerwear`
- [ ] Capture real success and failure payloads
- [ ] Confirm cleanup succeeds for a real completed `cloth-v4` task
- [ ] Run end-to-end search → Rig → selected signed candidate → Perfect → cleanup

## Gate 5 — competition polish

- [ ] Camera/photo guidance
- [ ] Stronger task progress/failure UX
- [ ] Before/after comparator
- [ ] User-visible provenance/evidence receipt
- [ ] Mobile/PWA production pass
- [ ] Demo script + screenshots + 1–3 minute video
- [ ] Devpost submission copy and final DDC/Perun audit
