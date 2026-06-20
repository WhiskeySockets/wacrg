<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call reject stanza

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `call-reject`

**`call-reject`** · status: review · features: audio, video · since: 0.1.0

The `<reject>` action stanza, sent by a callee device to decline an incoming call offer without ever entering the media phase. It names the call by its `call-id`/`call-creator` and carries no child elements.

**Normative**

A callee device declines a ringing call by sending a `<call>` stanza whose
single action child is `<reject>`. The wire layout is:

    <call to="{caller-jid}">
      <reject call-id="{call-id}" call-creator="{call-creator-jid}"/>
    </call>

**Construction.**

- The outer `<call>` element MUST carry a `to` attribute set to the JID the
  offer was received from (the caller). The reject builder MUST NOT add an
  `id` attribute to the `<call>` wrapper; the I/O layer's stanza id applies.
- The `<reject>` action element MUST carry exactly two attributes:
  - `call-id` — the `call-id` copied verbatim from the `<offer>` being
    declined (see [call-offer](../signalling/call-offer.md)).
  - `call-creator` — the `call-creator` JID copied verbatim from that
    `<offer>`.
- The `<reject>` element MUST be empty: it MUST NOT contain any child
  elements and carries no content bytes.

**Semantics.**

- A device MUST send `<reject>` only to decline an offer it has not accepted.
  It is distinct from `<terminate>` (see [call-terminate](../signalling/call-terminate.md)),
  which ends a call that has already progressed past offer.
- `<reject>` MUST NOT be preceded by `<preaccept>` or `<accept>` for the same
  call from the same device; rejecting is the terminal action for that offer.
- No media keying, relay allocation, or transport negotiation is performed on
  the reject path: a rejecting device skips the entire media stack.

**Receiving.**

- A `<reject>` arrives wrapped in an inbound `<call>` stanza alongside the
  standard call envelope attributes (`from`, `id`, `t`, and optionally
  `notify`, `platform`, `version`, `e`). A receiver MUST treat `call-id` and
  `call-creator` on the `<reject>` element as required; a `<reject>` missing
  either attribute MUST be rejected as malformed.
- The generic `<call>` acknowledgement covers receipt of a `<reject>`; no
  `<receipt>`-style ack-of-offer is emitted in response (that is specific to
  `<offer>`).

**Findings**

The `<reject>` action is symmetric on both directions of the stack: the
outbound builder emits `<call to=peer><reject call-id call-creator/></call>`
with no children, and the inbound parser recognises `reject` as a known action
carrying only `call-id` and `call-creator`, mapping it to a `Reject` call
action that mirrors the stanza one-to-one.

Unlike `<terminate>`, `<reject>` carries no `reason`, `duration`, or
`audio_duration` attributes and no `<destination>` child for fanning the
decline out to sibling devices — declining is expressed purely by the two
identifying attributes.

**Requires:** [`call-offer`](../signalling/call-offer.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working | ported from zapo-caller signaling.ts |
| [`meowcaller`](../../flavors.md) | planned | signalling is a planned module |

**Open questions**

- Whether any client emits an optional <reject> attribute (e.g. a reason or media-type hint) under newer protocol versions; none is observed in the current builders or parser.
- Whether the caller forwards a reject-derived terminate to other callee devices, or whether each device rejects independently.

**References**

- [RFC 2119 — Key words for use in RFCs](https://www.rfc-editor.org/rfc/rfc2119)

---

[in the full RFC →](../index.md#call-reject) · [RFC contents](../index.md#contents)
