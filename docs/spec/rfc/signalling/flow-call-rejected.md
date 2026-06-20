<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Rejected call flow

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `flow-call-rejected`

**`flow-call-rejected`** · status: draft · features: audio, video · since: 0.1.0

The end-to-end stanza sequence when a callee device declines an incoming call: receiving the `<offer>`, acknowledging it, and emitting a single `<reject>` action without ever entering the preaccept, accept, media-keying, relay, or transport phases.

**Normative**

This flow specifies the ordered exchange between a caller and a callee device
when the callee declines the call. It composes the individual
[call-offer](../signalling/call-offer.md), [call-ack](../signalling/call-ack.md), and [call-reject](../signalling/call-reject.md)
actions into a terminal sequence; the per-stanza wire layouts are defined by
those parts and are not restated here except where ordering is load-bearing.

**Sequence (callee side).** On receiving an inbound `<offer>` and deciding to
decline, the callee device MUST perform the following steps, in order:

1. **Acknowledge the offer.** The device MUST send the two acknowledgements
   required for any `<offer>` per [call-ack](../signalling/call-ack.md): the generic transport
   `<ack>` keyed to the `<call>` stanza `id`, and the offer `<receipt>` that
   echoes `<offer call-id call-creator/>` back to the caller. These MUST be
   sent regardless of the decision to reject, so the caller learns the device
   received the ring.

2. **Send the reject.** The device MUST send a `<call>` stanza whose single
   action child is `<reject>`, as defined by [call-reject](../signalling/call-reject.md):

       <call to="{caller-jid}">
         <reject call-id="{call-id}" call-creator="{call-creator-jid}"/>
       </call>

   The `to` attribute MUST be the JID the `<offer>` was received from. The
   `call-id` and `call-creator` attributes MUST be copied verbatim from the
   `<offer>` being declined. The `<reject>` element MUST be empty.

**Steps that MUST NOT occur on this path.** A rejecting device:

- MUST NOT send `<preaccept>` (see [call-preaccept](../signalling/call-preaccept.md)) or
  `<accept>` (see [call-accept](../signalling/call-accept.md)) for the same call. `<reject>` is
  the terminal action for that offer from that device; once it has decided to
  reject, the device MUST NOT also advance the accept path for the same
  `call-id`.
- MUST NOT decrypt or derive media keys from the offer's `<enc>` callKey, and
  MUST NOT perform relay allocation, candidate exchange (`<transport>`), or
  relay-latency probing (`<relaylatency>`). The entire media stack is skipped.
- MUST NOT send `<terminate>` (see [call-terminate](../signalling/call-terminate.md)) for a
  call that never progressed past the offer; declining is expressed by
  `<reject>`, not `<terminate>`.

**Caller side.** The caller MUST treat a received `<reject>` for one of its
outstanding offers as a decline of the call by that device. The `<reject>`
arrives wrapped in an inbound `<call>` stanza and is acknowledged by the
generic `<call>` ack only; no offer receipt is emitted in response to a
`<reject>`.

**Multi-device offers.** When the caller offered to several callee devices,
each device decides independently and MAY emit its own `<reject>`. Each
`<reject>` carries the same `call-id`/`call-creator` and is sent from the
declining device. This part does not specify whether or how the caller fans a
decline out to the callee's sibling devices.

**Findings**

The reject path is a strict subset of the full incoming-call flow: it shares
the offer- acknowledgement (generic ack plus offer receipt) but branches at the
decision point, emitting `<reject>` instead of `<preaccept>`/`<accept>`. In the
reference flow the callee builds and sends the reject stanza directly from the
parsed offer's `call_id`/`call_creator` and the originating `from` JID, with no
intervening media work.

The inbound `<offer>` carries the caller's `call-id`, `call-creator`, optional
caller identity attributes, and one or more `<audio enc=opus rate=…>`
advertisements plus the per-device `<enc>` callKey; a rejecting device consumes
none of the codec or keying material. The `<reject>` it sends back carries only
the two identifying attributes and no children — symmetric on the outbound
builder and the inbound parser.

**Requires:** [`call-offer`](../signalling/call-offer.md), [`call-ack`](../signalling/call-ack.md), [`call-reject`](../signalling/call-reject.md), [`call-preaccept`](../signalling/call-preaccept.md), [`call-accept`](../signalling/call-accept.md), [`call-terminate`](../signalling/call-terminate.md), [`flow-incoming-1to1`](../signalling/flow-incoming-1to1.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working | listen mode default-rejects: acks the offer, then sends <reject> with no media work |
| [`zapo-caller`](../../flavors.md) | working | reject builder ported from zapo-caller signaling.ts |
| [`meowcaller`](../../flavors.md) | planned | signalling is a planned module |

**Open questions**

- Whether the caller emits a terminate or notice to the callee's sibling devices once one device rejects, or whether each device rejects independently with no cross-device fan-out.
- Whether a rejecting device must wait for the offer receipt to be sent before emitting <reject>, or whether the two may be pipelined.
- Whether the caller surfaces a distinct call-state (declined vs. unanswered) on receiving <reject> versus a missed-call timeout (see flow-call-missed).

**References**

- [RFC 2119 — Key words for use in RFCs](https://www.rfc-editor.org/rfc/rfc2119)

---

[in the full RFC →](../index.md#flow-call-rejected) · [RFC contents](../index.md#contents)
