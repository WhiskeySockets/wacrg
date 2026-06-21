<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call offer stanza

_Signalling · `call-offer`_

`SIG-01` · _status: review · audio, video_

A caller opens a 1:1 call with a <call> stanza whose <offer> child proposes the session, carries per-device media keys, and seeds transport negotiation.

Send a top-level `<call>` stanza with `id` (stanza id, correlates the server
`<ack>`), `from`, and `to`. Its `<offer>` child MUST carry `call-id` (opaque
logical call identifier, echoed in every later stanza for this call) and
`call-creator`.

`<offer>` children MUST appear in this exact order; a mis-ordered offer is
rejected by the server with error **439**:

    privacy → audio(8000) → audio(16000) → net(medium) → capability
            → (destination | enc) → encopt(keygen) → device-identity

- Media: two nodes `<audio enc="opus" rate="8000">` and `<audio enc="opus" rate="16000">`.
- `<capability ver="1">` body MUST be the fixed 7-byte blob `01 05 f7 09 e4 bb 13`.
- `<encopt keygen="2">` selects the v2 SRTP key path.
- Each recipient device MUST receive its own `<enc>` node carrying the call key
  encrypted to that device's Signal session: `type="pkmsg"` to establish,
  `type="msg"` to reuse. A multi-device callee receives several `<enc>` nodes.

Breakdown: [`call-key`](../crypto/call-key.md), [`group-call-crypto`](../crypto/group-call-crypto.md), [`srtp-master-key`](../crypto/srtp-master-key.md), [`warp-crypto`](../crypto/warp-crypto.md), [`opus`](../encodings/opus.md), [`video-packetization`](../encodings/video-packetization.md), [`stun-relay`](../relay/stun-relay.md), [`call-accept`](../signalling/call-accept.md), [`call-ack`](../signalling/call-ack.md), [`call-mute`](../signalling/call-mute.md), [`call-preaccept`](../signalling/call-preaccept.md), [`call-reject`](../signalling/call-reject.md), [`call-relaylatency`](../signalling/call-relaylatency.md), [`call-terminate`](../signalling/call-terminate.md), [`call-transport`](../signalling/call-transport.md), [`flow-call-missed`](../signalling/flow-call-missed.md), [`flow-call-rejected`](../signalling/flow-call-rejected.md), [`flow-incoming-1to1`](../signalling/flow-incoming-1to1.md), [`flow-outgoing-1to1`](../signalling/flow-outgoing-1to1.md), [`group-call`](../signalling/group-call.md), [`video-call`](../signalling/video-call.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [history ↗](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stanza.rs) · [blame ↗](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stanza.rs) · commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `zapo-caller` | working | — | — |

**Annotation** `wacrg:SIG-01` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/call-offer.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/call-offer.yaml)

**Open questions**
- Full meaning of the packed <capability> bitfield.
- Whether an explicit media-key length/salt is carried, or all is derived from the Signal plaintext.

**References**
- [Signal Protocol (X3DH + Double Ratchet)](https://signal.org/docs/)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[← in the full spec](../../index.md#call-offer)
