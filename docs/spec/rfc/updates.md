<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# RFC updates

How libraries follow the spec. **Pull:** poll [`feed.json`](./feed.json) — it lists every part, its `since` version, and the flavors that implement it; diff across versions to see what changed in the parts you implement. **Push (opt-in):** a flavor that sets `notify_repo` + `notify_opt_in: true` in its `spec/flavors/<id>.yaml` gets a tracking issue opened in its repo when a part it implements changes.

## Parts by version

### 0.1.0

- [`call-offer`](../../index.md#call-offer) — Call offer stanza (signalling, review)
- [`video-call`](../../index.md#video-call) — Video call negotiation (signalling, draft)
- [`call-accept`](../../index.md#call-accept) — Call accept stanza (signalling, review)
- [`call-preaccept`](../../index.md#call-preaccept) — Call pre-accept (ringing) (signalling, review)
- [`call-transport`](../../index.md#call-transport) — Transport stanza (signalling, review)
- [`group-call`](../../index.md#group-call) — Group call setup (signalling, draft)
- [`call-ack`](../../index.md#call-ack) — Call stanza acknowledgement (signalling, review)
- [`call-reject`](../../index.md#call-reject) — Call reject stanza (signalling, review)
- [`raise-hand`](../../index.md#raise-hand) — Raise hand (signalling, draft)
- [`reactions`](../../index.md#reactions) — In-call emoji reactions (signalling, draft)
- [`screen-share`](../../index.md#screen-share) — Screen sharing (signalling, draft)
- [`flow-call-missed`](../../index.md#flow-call-missed) — Missed / timed-out call flow (signalling, draft)
- [`call-mute`](../../index.md#call-mute) — Mute signalling (signalling, draft)
- [`call-terminate`](../../index.md#call-terminate) — Call terminate stanza (signalling, draft)
- [`call-relaylatency`](../../index.md#call-relaylatency) — Relay latency reporting (signalling, draft)
- [`flow-incoming-1to1`](../../index.md#flow-incoming-1to1) — Incoming 1:1 call flow (signalling, review)
- [`flow-outgoing-1to1`](../../index.md#flow-outgoing-1to1) — Outgoing 1:1 call flow (signalling, draft)
- [`flow-call-rejected`](../../index.md#flow-call-rejected) — Rejected call flow (signalling, draft)
- [`mlow`](../../index.md#mlow) — MLow audio codec (encodings, review)
- [`mlow-red-fec`](../../index.md#mlow-red-fec) — MLow RED and Reed-Solomon FEC (encodings, draft)
- [`mlow-frame`](../../index.md#mlow-frame) — MLow frame and TOC (encodings, review)
- [`mlow-rangecoder`](../../index.md#mlow-rangecoder) — MLow range coder (encodings, review)
- [`opus`](../../index.md#opus) — Opus codec (encodings, draft)
- [`video`](../../index.md#video) — Video codec (encodings, draft)
- [`video-packetization`](../../index.md#video-packetization) — Video packetization (encodings, draft)
- [`mlow-lsf-lpc`](../../index.md#mlow-lsf-lpc) — MLow LSF and LPC (encodings, review)
- [`mlow-encoder`](../../index.md#mlow-encoder) — MLow encode pipeline (encodings, draft)
- [`mlow-excitation`](../../index.md#mlow-excitation) — MLow CELP excitation (encodings, draft)
- [`mlow-decoder`](../../index.md#mlow-decoder) — MLow decode pipeline (encodings, draft)
- [`mlow-noise`](../../index.md#mlow-noise) — MLow comfort noise (encodings, review)
- [`mlow-postfilter`](../../index.md#mlow-postfilter) — MLow post-filters (encodings, draft)
- [`mlow-synthesis`](../../index.md#mlow-synthesis) — MLow CELP synthesis (encodings, draft)
- [`mlow-vad`](../../index.md#mlow-vad) — MLow voice activity detection (encodings, draft)
- [`call-key`](../../index.md#call-key) — Call key establishment (crypto, draft)
- [`srtp-master-key`](../../index.md#srtp-master-key) — SRTP master key and salt derivation (crypto, review)
- [`srtp-hop-by-hop`](../../index.md#srtp-hop-by-hop) — Hop-by-hop SRTP (crypto, draft)
- [`sframe-media`](../../index.md#sframe-media) — SFrame media end-to-end encryption (crypto, draft)
- [`srtp-e2e`](../../index.md#srtp-e2e) — End-to-end SRTP (crypto, review)
- [`group-call-crypto`](../../index.md#group-call-crypto) — Group call crypto (crypto, draft)
- [`warp-crypto`](../../index.md#warp-crypto) — WARP key wrap (crypto, review)
- [`relay-candidates`](../../index.md#relay-candidates) — Transport candidates (relay, draft)
- [`stun-relay`](../../index.md#stun-relay) — STUN relay handshake (relay, draft)
- [`warp`](../../index.md#warp) — WARP relay framing (relay, draft)
- [`rtcp`](../../index.md#rtcp) — RTCP control (relay, review)
- [`rtp-framing`](../../index.md#rtp-framing) — RTP framing (relay, review)
- [`ssrc`](../../index.md#ssrc) — SSRC allocation (relay, review)
- [`media-loop`](../../index.md#media-loop) — Media loop and session (relay, draft)

[← the RFC](../../index.md)
