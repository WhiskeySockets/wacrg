<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# STUN relay handshake

_Relay · `stun-relay`_

_status: draft · audio, video, group_

A STUN-dialect handshake binds the client to a relay candidate before WARP media frames flow.

- Candidates come from the offer's `<destination>` (see [call-offer](../signalling/call-offer.md)),
  each annotated with measured latency.
- The client MUST complete the STUN handshake against these candidates to establish
  the client↔relay binding that WARP frames ride over.
- The client SHOULD select the lowest-latency candidate.

Requires: [`call-offer`](../signalling/call-offer.md)  
Breakdown: [`media-loop`](../relay/media-loop.md), [`relay-candidates`](../relay/relay-candidates.md), [`warp`](../relay/warp.md), [`call-relaylatency`](../signalling/call-relaylatency.md), [`call-transport`](../signalling/call-transport.md), [`flow-outgoing-1to1`](../signalling/flow-outgoing-1to1.md)

**Implemented by**
- **whatsapp-rust** — working · [commits ↗](https://github.com/oxidezap/whatsapp-rust/commits)
- **zapo-caller** — working

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/relay/stun-relay.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/relay/stun-relay.yaml)

---

[← in the full RFC](../../../index.md#stun-relay)
