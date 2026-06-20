<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Outgoing 1:1 call flow

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `flow-outgoing-1to1`

**`flow-outgoing-1to1`** · status: draft · features: audio, video · since: 0.1.0

The end-to-end stanza sequence a caller follows to place a 1:1 call: device discovery and key delivery in the offer, the server ack and per-device offer receipts, the callee's preaccept/accept, the transport (relay/ICE) exchange, the media phase, and termination. This part orders the individual call stanzas into the caller-side timeline; each stanza's wire format is normative in its own part.

**Normative**

This part specifies the caller's view of a 1:1 call. Each numbered step names
the stanza whose full wire format is normative elsewhere; the requirements here
govern ordering, correlation, and state transitions, not the byte layout of the
individual stanzas.

**Identifiers.** The caller MUST generate a `call-id` (the opaque logical call
identifier) before sending the offer and MUST echo it, together with
`call-creator`, in every subsequent stanza for this call. The `call-id` is
distinct from the per-stanza `id` used to correlate server acks. The
`call-creator` MUST be the caller's own addressable id and MUST remain constant
for the lifetime of the call.

**Step 1 — Device discovery and key delivery.** Before sending the offer the
caller MUST enumerate the callee's devices and MUST establish a Signal session
with each target device. The caller MUST generate one random call key for the
call and MUST encrypt it once per target device to that device's Signal session.

**Step 2 — Offer.** The caller MUST send a top-level `<call to="{callee}"
id="{stanza-id}">` whose `<offer>` child carries `call-id`, `call-creator`, the
advertised `<audio>` formats, the `<capability>` blob, and the per-device
encrypted call key (a single `<enc>` for one device, or a `<destination>` of
`<to><enc/></to>` entries for several). The full `<offer>` layout and its
load-bearing child order are normative in [call-offer](../signalling/call-offer.md).

**Step 3 — Server ack.** The caller MUST treat the call as pending until the
server acknowledges the offer stanza. The server `<ack>` correlates to the offer
by the `<call>` stanza `id`, NOT by `call-id` (see [call-ack](../signalling/call-ack.md)).

**Step 4 — Offer receipts (ringing).** For each ringing callee device, the
caller receives a `<receipt>` whose `<offer call-id call-creator/>` child echoes
the call (see [call-ack](../signalling/call-ack.md)). Receipt of at least one offer receipt
indicates the offer reached a device and it is ringing. The caller MUST correlate
these to the call by `call-id` + `call-creator`.

**Step 5 — Preaccept (optional, early-media).** A callee device MAY send a
`<preaccept>` before accepting (see [call-preaccept](../signalling/call-preaccept.md)). The caller
MUST treat `<preaccept>` as a ringing/early-media signal only; it MUST NOT begin
protected media or tear down the offer on the basis of a preaccept alone.

**Step 6 — Accept.** When a callee device accepts, the caller receives an
`<accept>` for this `call-id` (see [call-accept](../signalling/call-accept.md)). The `<accept>`
selects the answering device. From this point the caller MUST direct subsequent
signalling for the call to the accepting device, and MUST consider the call
answered.

**Step 7 — Transport / relay negotiation.** The caller and callee exchange
transport state to converge on a media path (see [call-transport](../signalling/call-transport.md)
and [stun-relay](../relay/stun-relay.md)). The caller MUST be prepared to send and receive
`<transport>` stanzas (relay candidates, peer ICE, keepalive/reply) carrying the
`call-id` + `call-creator`, and MAY report measured per-relay round-trip time via
`<relaylatency>` (see [call-relaylatency](../signalling/call-relaylatency.md)). Transport
negotiation MAY begin as soon as relay data is available and MAY overlap with
steps 4–6.

**Step 8 — Media.** Once a media path is established, the caller protects and
exchanges RTP using the SRTP keys derived from the call key (see
[srtp-master-key](../crypto/srtp-master-key.md)). The negotiated `<audio>` format governs the
codec. While the call is connected the caller MUST keep the media path alive with
consent-freshness traffic; absence of such traffic causes the relay to drop the
stream and the call to fail (see [stun-relay](../relay/stun-relay.md)).

**Step 9 — Terminate.** Either party ends the call by sending a `<terminate>`
carrying the `call-id` + `call-creator` (see [call-terminate](../signalling/call-terminate.md)).
After sending or receiving a `<terminate>` the caller MUST stop media and
consider the `call-id` closed; it MUST NOT reuse that `call-id` for a new call.

**Cancellation.** Before an `<accept>` is received, the caller MAY cancel the
pending call by sending a `<terminate>` for the `call-id`; this is the caller-side
equivalent of hanging up while ringing.

**Multi-device fan-in.** When the offer was delivered to several callee devices
and one device answers, the call is bound to that device. The caller MUST address
later signalling to the answering device and MUST NOT continue to treat the other
callee devices as live participants in this 1:1 call.

**Findings**

The caller generates the `call-id` as an opaque token (observed as a short
hex-like string) independent of the `<call>` stanza `id`. The caller's
`call-creator` is its own addressable id; outbound offers in practice set it to
the caller's phone-number JID.

Key delivery precedes the offer: the caller discovers the callee's device list,
asserts a Signal session per device, generates one random 32-byte call key, and
encrypts it per device (`type="pkmsg"` to establish a session, `type="msg"` to
reuse). All target devices receive the same call key; each peer then derives its
own SRTP keys from it keyed by participant id.

Correlation splits across two identifiers: the offer↔ack handshake and the
per-device offer receipt correlate on the `<call>` stanza `id`, while every later
action (`accept`, `transport`, `relaylatency`, `terminate`) correlates on
`call-id` + `call-creator`.

The signalling layer (offer → ack → receipts → preaccept/accept → transport →
terminate) is exercised by working callers. The boundary between signalling and
the live media phase — the precise trigger that promotes an accepted call into
active RTP, and the caller's exact transport-handshake message sequence — is the
least-pinned part of the outgoing timeline.

**Requires:** [`call-offer`](../signalling/call-offer.md), [`call-ack`](../signalling/call-ack.md), [`call-preaccept`](../signalling/call-preaccept.md), [`call-accept`](../signalling/call-accept.md), [`call-transport`](../signalling/call-transport.md), [`call-relaylatency`](../signalling/call-relaylatency.md), [`call-terminate`](../signalling/call-terminate.md), [`stun-relay`](../relay/stun-relay.md), [`srtp-master-key`](../crypto/srtp-master-key.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | partial | device discovery, call-key encryption, and the offer/ack/receipt/preaccept/accept signalling are exercised; live caller-side media orchestration is still landing |
| [`zapo-caller`](../../flavors.md) | working | outbound caller signalling + relay; not the codec |
| [`meowcaller`](../../flavors.md) | planned | signalling/relay are planned modules |

**Open questions**

- Exact caller-side transport-message-type handshake sequence (which <transport> rounds the caller initiates vs. answers) to converge the media path.
- Precise trigger that promotes an accepted call into the active RTP/media phase on the caller side.
- Whether the caller must explicitly hang up the non-answering callee devices (e.g. a terminate with reason) once one device accepts a multi-device offer.
- Timeout/retry behaviour if no offer receipt, preaccept, or accept arrives within a ringing window.

**References**

- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)
- [RFC 6120 — XMPP Core (stanza acknowledgement model)](https://www.rfc-editor.org/rfc/rfc6120)
- [RFC 8445 — ICE](https://www.rfc-editor.org/rfc/rfc8445)

---

[in the full RFC →](../index.md#flow-outgoing-1to1) · [RFC contents](../index.md#contents)
