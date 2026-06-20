<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# RFC updates

How libraries follow the spec. **Pull:** poll [`feed.json`](./feed.json) — it lists every part, its `since` version, and the flavors that implement it; diff across versions to see what changed in the parts you implement. **Push (opt-in):** a flavor that sets `notify_repo` + `notify_opt_in: true` in its `spec/flavors/<id>.yaml` gets a tracking issue opened in its repo when a part it implements changes.

## Parts by version

### 0.1.0

- [`call-offer`](./index.md#call-offer) — Call offer stanza (signalling, review)
- [`group-call`](./index.md#group-call) — Group call setup (signalling, draft)
- [`raise-hand`](./index.md#raise-hand) — Raise hand (signalling, draft)
- [`reactions`](./index.md#reactions) — In-call emoji reactions (signalling, draft)
- [`screen-share`](./index.md#screen-share) — Screen sharing (signalling, draft)
- [`mlow`](./index.md#mlow) — MLow audio codec (encodings, review)
- [`video`](./index.md#video) — Video codec (encodings, draft)
- [`srtp-master-key`](./index.md#srtp-master-key) — SRTP master key and salt derivation (crypto, review)
- [`srtp-hop-by-hop`](./index.md#srtp-hop-by-hop) — Hop-by-hop SRTP (crypto, draft)
- [`sframe-media`](./index.md#sframe-media) — SFrame media end-to-end encryption (crypto, draft)
- [`stun-relay`](./index.md#stun-relay) — STUN relay handshake (relay, draft)
- [`warp`](./index.md#warp) — WARP relay framing (relay, draft)

[Back to spec overview](../index.md)
