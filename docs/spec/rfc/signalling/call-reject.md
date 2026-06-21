<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call reject stanza

_Signalling · `call-reject`_

_status: review · audio, video_

The `<reject>` action stanza declines an incoming call offer before the media phase, naming the call by `call-id`/`call-creator` with no child elements.

Wire layout:

    <call to="{caller-jid}">
      <reject call-id="{call-id}" call-creator="{call-creator-jid}"/>
    </call>

**Construction.**

- The outer `<call>` MUST carry `to` = the JID the offer was received from
  (the caller). The builder MUST NOT add an `id` attribute to `<call>`; the
  I/O layer's stanza id applies.
- `<reject>` MUST carry exactly two attributes:
  - `call-id` — copied verbatim from the declined `<offer>` (see
    [call-offer](../signalling/call-offer.md)).
  - `call-creator` — `call-creator` JID copied verbatim from that `<offer>`.
- `<reject>` MUST be empty: no child elements, no content bytes.

**Semantics.**

- Send `<reject>` only to decline an offer not yet accepted; distinct from
  `<terminate>` (see [call-terminate](../signalling/call-terminate.md)), which ends a call past
  offer.
- `<reject>` MUST NOT be preceded by `<preaccept>` or `<accept>` for the same
  call from the same device; it is the terminal action for that offer.
- No media keying, relay allocation, or transport negotiation occurs on the
  reject path.

**Receiving.**

- A `<reject>` arrives in an inbound `<call>` stanza with the standard
  envelope attributes (`from`, `id`, `t`, optionally `notify`, `platform`,
  `version`, `e`). A receiver MUST treat `call-id` and `call-creator` as
  required; a `<reject>` missing either MUST be rejected as malformed.
- The generic `<call>` acknowledgement covers receipt; no `<receipt>`-style
  ack-of-offer is emitted (that is specific to `<offer>`).

Unlike `<terminate>`, `<reject>` carries no `reason`, `duration`, or
`audio_duration` attributes and no `<destination>` child.

Requires: [`call-offer`](../signalling/call-offer.md)  
Breakdown: [`flow-call-rejected`](../signalling/flow-call-rejected.md), [`flow-incoming-1to1`](../signalling/flow-incoming-1to1.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | — | — |
| `zapo-caller` | working | — | ported from zapo-caller signaling.ts |

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/signalling/call-reject.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/signalling/call-reject.yaml)

**Open questions**
- Whether any client emits an optional <reject> attribute (e.g. a reason or media-type hint) under newer protocol versions; none is observed in the current builders or parser.
- Whether the caller forwards a reject-derived terminate to other callee devices, or whether each device rejects independently.

**References**
- [RFC 2119 — Key words for use in RFCs](https://www.rfc-editor.org/rfc/rfc2119)

---

[← in the full RFC](../../../index.md#call-reject)
