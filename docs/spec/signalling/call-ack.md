<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call stanza acknowledgement

_Signalling · `call-ack`_

`SIG-07` · _status: review · audio, video, group_

Acknowledging an inbound `<call>` stanza: a generic `<ack>` for every `<call>`, plus an `<offer>`-only `<receipt><offer/></receipt>`.

A `<call>` carries exactly one action child: `<offer>`, `<offer_notice>`,
`<preaccept>`, `<accept>`, `<reject>`, `<terminate>`, `<transport>`, or
`<relaylatency>`.

**Level 1 — generic ack.** Every received `<call>` MUST be acknowledged with a
generic `<ack>` correlated by the stanza `id` attribute (distinct from the
action's `call-id`), for all action types including `<offer_notice>`.

**Level 2 — offer receipt.** When and only when the action child is `<offer>`,
the device MUST additionally send:

    <receipt to="{caller}" id="{stanza_id}" from="{own_addressable_id}">
      <offer call-id="{call-id}" call-creator="{call-creator}"/>
    </receipt>

- `to` MUST equal the `from` JID of the inbound `<call>`.
- `id` MUST equal the stanza `id` of the `<call>`, NOT the action's `call-id`.
- `from` SHOULD be the device's own addressable id, chosen to match the address
  space of the inbound `from` JID: if `from` is a LID use the own LID, else the
  own phone-number JID. If no own addressable id exists, omit `from`.
- The `<offer>` child MUST carry exactly two attributes copied verbatim from the
  inbound offer: `call-id` and `call-creator`. It MUST NOT echo the offer's media
  or capability children.

An offer receipt MUST NOT be sent for any non-`<offer>` action; `<offer_notice>`
gets the Level-1 ack only.

An unrecognised action child MUST NOT fail the stanza and MUST NOT emit an offer
receipt; it gets the Level-1 ack only.

**Notes.** The action's `call-id` is separate from the stanza `id`: the offer receipt
correlates on stanza `id`, while later signalling (accept, transport, terminate)
correlates on `call-id` + `call-creator`. Inbound envelope `e == "1"` marks
offline delivery.

Requires: [`call-offer`](../signalling/call-offer.md)  
Breakdown: [`flow-call-rejected`](../signalling/flow-call-rejected.md), [`flow-incoming-1to1`](../signalling/flow-incoming-1to1.md), [`flow-outgoing-1to1`](../signalling/flow-outgoing-1to1.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `zapo-caller` | working | — | signalling layer consumes/produces the offer receipt |

**Annotation** `wacrg:SIG-07` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/call-ack.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/call-ack.yaml)

**Open questions**
- Whether the server expects (or rejects) an offer receipt that omits the `from` attribute when an own addressable id exists.
- Whether any action other than `<offer>` (e.g. video offers carrying a `<video>` child) triggers an additional receipt beyond the generic ack.

**References**
- [RFC 6120 — XMPP Core (stanza acknowledgement model)](https://www.rfc-editor.org/rfc/rfc6120)

---

[← in the full spec](../../index.md#call-ack)
