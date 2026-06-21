<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Outgoing 1:1 call flow

_Signalling - `flow-outgoing-1to1`_

`SIG-17` - _status: draft - audio, video_

Caller-side stanza sequence for a 1:1 call: key delivery, offer, ack, receipts, preaccept/accept, transport, media, and terminate, with the ordering and correlation rules between them.

This part governs ordering, correlation, and state transitions. Each step's
stanza wire format is normative in its own part.

**Identifiers.**
- The caller MUST generate a `call-id` (opaque logical call identifier; observed
  as a short hex-like token) before sending the offer, and MUST echo `call-id`
  + `call-creator` in every subsequent stanza for this call.
- `call-id` is distinct from the per-stanza `id` used for server acks.
- `call-creator` MUST be the caller's own addressable id (in practice its
  phone-number JID) and MUST remain constant for the call's lifetime.

**Step 1 — Device discovery / key delivery (before the offer).**
- MUST enumerate the callee's devices and MUST establish a Signal session with
  each target device.
- MUST generate one random 32-byte call key for the call and MUST encrypt it
  once per target device to that device's session (`type="pkmsg"` to establish,
  `type="msg"` to reuse). All target devices receive the same call key; each
  peer derives its own SRTP keys from it, keyed by participant id.

**Step 2 — Offer.** MUST send top-level `<call to="{callee}" id="{stanza-id}">`
whose `<offer>` carries `call-id`, `call-creator`, the advertised `<audio>`
formats, the `<capability>` blob, and the per-device encrypted call key (single
`<enc>` for one device, or `<destination>` of `<to><enc/></to>` entries for
several). Layout and child order are normative in [call-offer](../signalling/call-offer.md).

**Step 3 — Server ack.** MUST treat the call as pending until acked. The server
`<ack>` correlates by the `<call>` stanza `id`, NOT by `call-id`
(see [call-ack](../signalling/call-ack.md)).

**Step 4 — Offer receipts (ringing).** Per ringing callee device the caller
receives a `<receipt>` whose `<offer call-id call-creator/>` echoes the call
(see [call-ack](../signalling/call-ack.md)). At least one receipt indicates the offer reached a
ringing device. MUST correlate by `call-id` + `call-creator`.

**Step 5 — Preaccept (optional, early-media).** A callee device MAY send
`<preaccept>` before accepting (see [call-preaccept](../signalling/call-preaccept.md)). The caller
MUST treat it as a ringing/early-media signal only; MUST NOT begin protected
media or tear down the offer on a preaccept alone.

**Step 6 — Accept.** On accept the caller receives an `<accept>` for this
`call-id` selecting the answering device (see [call-accept](../signalling/call-accept.md)). From
this point the caller MUST direct subsequent signalling to the accepting device
and MUST consider the call answered.

**Step 7 — Transport / relay negotiation.** See [call-transport](../signalling/call-transport.md)
and [stun-relay](../relay/stun-relay.md). MUST be prepared to send and receive `<transport>`
stanzas (relay candidates, peer ICE, keepalive/reply) carrying `call-id` +
`call-creator`, and MAY report per-relay RTT via `<relaylatency>`
(see [call-relaylatency](../signalling/call-relaylatency.md)). MAY begin once relay data is
available and MAY overlap with steps 4–6.

**Step 8 — Media.** On an established path, protect/exchange RTP using SRTP keys
derived from the call key (see [srtp-master-key](../crypto/srtp-master-key.md)); the
negotiated `<audio>` format governs the codec. While connected the caller MUST
keep the path alive with consent-freshness traffic; absence of it causes the
relay to drop the stream and the call to fail (see [stun-relay](../relay/stun-relay.md)).

**Step 9 — Terminate.** Either party ends the call with `<terminate>` carrying
`call-id` + `call-creator` (see [call-terminate](../signalling/call-terminate.md)). After sending
or receiving `<terminate>` the caller MUST stop media, consider the `call-id`
closed, and MUST NOT reuse that `call-id`.

**Cancellation.** Before an `<accept>`, the caller MAY cancel a pending call by
sending `<terminate>` for the `call-id`.

**Multi-device fan-in.** When the offer reached several callee devices and one
answers, the call is bound to that device. The caller MUST address later
signalling to the answering device and MUST NOT continue to treat the other
callee devices as live participants.

**Correlation summary.** Offer↔ack and offer receipt correlate on the `<call>`
stanza `id`; `accept`, `transport`, `relaylatency`, and `terminate` correlate on
`call-id` + `call-creator`.

Requires: [`call-offer`](../signalling/call-offer.md), [`call-ack`](../signalling/call-ack.md), [`call-preaccept`](../signalling/call-preaccept.md), [`call-accept`](../signalling/call-accept.md), [`call-transport`](../signalling/call-transport.md), [`call-relaylatency`](../signalling/call-relaylatency.md), [`call-terminate`](../signalling/call-terminate.md), [`stun-relay`](../relay/stun-relay.md), [`srtp-master-key`](../crypto/srtp-master-key.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | partial | [:material-github: history](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/src/handlers/call.rs) - [:material-github: blame](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/src/handlers/call.rs) - commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) [`d68af6c`](https://github.com/oxidezap/whatsapp-rust-private/commit/d68af6c608297c864669850b9bc05d4a54410d15) | device discovery, call-key encryption, and the offer/ack/receipt/preaccept/accept signalling are exercised; live caller-side media orchestration is still landing |
| `zapo-caller` | working | — | outbound caller signalling + relay; not the codec |

**Annotation** `wacrg:SIG-17` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

**Contributors** [![Rajeh Taher](https://github.com/purpshell.png?size=20) Rajeh Taher](../contributors.md#purpshell) (wrote initial spec)

[:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/flow-outgoing-1to1.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/flow-outgoing-1to1.yaml)

**Open questions**
- Exact caller-side transport-message-type handshake sequence (which <transport> rounds the caller initiates vs. answers) to converge the media path.
- Precise trigger that promotes an accepted call into the active RTP/media phase on the caller side.
- Whether the caller must explicitly hang up the non-answering callee devices (e.g. a terminate with reason) once one device accepts a multi-device offer.
- Timeout/retry behaviour if no offer receipt, preaccept, or accept arrives within a ringing window.

**References**
- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)
- [RFC 6120 — XMPP Core (stanza acknowledgement model)](https://www.rfc-editor.org/rfc/rfc6120)
- [RFC 8445 — ICE](https://www.rfc-editor.org/rfc/rfc8445)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#flow-outgoing-1to1)
