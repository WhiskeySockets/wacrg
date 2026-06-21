<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# STUN relay handshake

_Relay · `stun-relay`_

`REL-02` · _status: draft · audio, video, group_

A STUN-dialect handshake binds the client to a relay candidate before WARP media frames flow.

- Candidates come from the offer's `<destination>` (see [call-offer](../signalling/call-offer.md)),
  each annotated with measured latency.
- The client MUST complete the STUN handshake against these candidates to establish
  the client↔relay binding that WARP frames ride over.
- The client SHOULD select the lowest-latency candidate.

Requires: [`call-offer`](../signalling/call-offer.md)  
Breakdown: [`media-loop`](../relay/media-loop.md), [`relay-candidates`](../relay/relay-candidates.md), [`warp`](../relay/warp.md), [`call-relaylatency`](../signalling/call-relaylatency.md), [`call-transport`](../signalling/call-transport.md), [`flow-outgoing-1to1`](../signalling/flow-outgoing-1to1.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [history ↗](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stun.rs) · [blame ↗](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stun.rs) · commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `zapo-caller` | working | — | — |

**Annotation** `wacrg:REL-02` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/relay/stun-relay.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/relay/stun-relay.yaml)

## Changelog
- **2026-06-21** · v0.1.0 — Initial spec entry.

---

[← in the full spec](../../index.md#stun-relay)
