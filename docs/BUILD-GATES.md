# Build Gates

## Gate 0 — foundation

- [x] Repository initialized from scratch
- [x] Product/domain boundary documented
- [x] Perfect Corp adapter isolated
- [x] Direct-upload ticket route scaffolded
- [x] cloth-v4 task create/poll scaffolded
- [x] PWA manifest/service worker shell
- [x] Browser EXIF/GPS stripping by decode + re-encode
- [x] Browser direct-to-provider upload flow
- [x] Vertical-slice `/lab` route with polling/result rendering
- [x] Binding mismatch test
- [x] Secret-not-returned provider test

## Gate 1 — real provider proof

- [ ] Redeem APIWORLD and create Perfect Corp API key
- [ ] Set `PERFECT_API_KEY` as deployment secret only
- [ ] Run six-image vertical-slice matrix
- [ ] Verify real upload PUT headers/CORS from mobile browser
- [ ] Verify `garment_category=auto` and `outerwear`
- [ ] Capture real success and failure payloads
- [ ] Verify exact provider task/resource deletion endpoint before implementation

## Gate 2 — user-facing fitting room

- [ ] Camera/photo guidance
- [ ] Stronger task progress/failure UX
- [ ] Result/item binding enforcement in UI
- [ ] Before/after comparator
- [ ] Evidence receipt

## Gate 3 — Relay

- [ ] Search provider adapter
- [ ] Current-result normalization
- [ ] Similar live alternatives
- [ ] Marketplace handoff safety
