<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Rejected call flow

_Signalling · `flow-call-rejected`_

_status: draft · audio, video_

Callee-decline flow: acknowledge the `<offer>`, then emit a single `<reject>` without entering preaccept, accept, media-keying, relay, or transport.

Composes [call-offer](../signalling/call-offer.md), [call-ack](../signalling/call-ack.md), and
[call-reject](../signalling/call-reject.md) into a terminal sequence. Per-stanza wire layouts
are defined by those parts.

**Callee side — on inbound `<offer>`, to decline, in order:**

1. Acknowledge per [call-ack](../signalling/call-ack.md): send the generic transport `<ack>`
   keyed to the `<call>` stanza `id`, and the offer `<receipt>` echoing
   `<offer call-id call-creator/>`. Both MUST be sent regardless of the
   decision to reject.

2. Send a `<call>` stanza whose single action child is `<reject>` per
   [call-reject](../signalling/call-reject.md):

       <call to="{caller-jid}">
         <reject call-id="{call-id}" call-creator="{call-creator-jid}"/>
       </call>

   - `to` MUST be the JID the `<offer>` was received from.
   - `call-id` and `call-creator` MUST be copied verbatim from the `<offer>`.
   - `<reject>` MUST be empty.

**MUST NOT on this path:**

- MUST NOT send `<preaccept>` or `<accept>` for the same `call-id`; `<reject>`
  is terminal for that offer from that device.
- MUST NOT decrypt or derive media keys from the offer's `<enc>` callKey, and
  MUST NOT perform relay allocation, candidate exchange (`<transport>`), or
  relay-latency probing (`<relaylatency>`).
- MUST NOT send `<terminate>` for a call that never progressed past the offer.

**Caller side.** The caller MUST treat a received `<reject>` for an outstanding
offer as a decline by that device. The `<reject>` arrives wrapped in an inbound
`<call>` and is acknowledged by the generic `<call>` ack only; no offer receipt
is emitted in response to a `<reject>`.

**Multi-device.** Each offered device decides independently and MAY emit its own
`<reject>` carrying the same `call-id`/`call-creator`. Cross-device fan-out is
unspecified.

Requires: [`call-offer`](../signalling/call-offer.md), [`call-ack`](../signalling/call-ack.md), [`call-reject`](../signalling/call-reject.md), [`call-preaccept`](../signalling/call-preaccept.md), [`call-accept`](../signalling/call-accept.md), [`call-terminate`](../signalling/call-terminate.md), [`flow-incoming-1to1`](../signalling/flow-incoming-1to1.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [commits ↗](https://github.com/oxidezap/whatsapp-rust/commits) | listen mode default-rejects: acks the offer, then sends <reject> with no media work |
| `zapo-caller` | working | — | reject builder ported from zapo-caller signaling.ts |

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/signalling/flow-call-rejected.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/signalling/flow-call-rejected.yaml)

**Open questions**
- Whether the caller emits a terminate or notice to the callee's sibling devices once one device rejects, or whether each device rejects independently with no cross-device fan-out.
- Whether a rejecting device must wait for the offer receipt to be sent before emitting <reject>, or whether the two may be pipelined.
- Whether the caller surfaces a distinct call-state (declined vs. unanswered) on receiving <reject> versus a missed-call timeout (see flow-call-missed).

**References**
- [RFC 2119 — Key words for use in RFCs](https://www.rfc-editor.org/rfc/rfc2119)

---

[← in the full RFC](../../../index.md#flow-call-rejected)
