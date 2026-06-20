<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call stanza acknowledgement

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `call-ack`

**`call-ack`** · status: review · features: audio, video, group · since: 0.1.0

How a client acknowledges an inbound `<call>` stanza: the generic transport `<ack>` that every `<call>` receives, and the additional `<receipt><offer/></receipt>` that an `<offer>` action specifically requires so the caller's signalling layer learns the ringing device received the offer.

**Normative**

A `<call>` stanza carries exactly one action child (`<offer>`, `<offer_notice>`,
`<preaccept>`, `<accept>`, `<reject>`, `<terminate>`, `<transport>`, or
`<relaylatency>`). Acknowledgement happens at two levels.

**Level 1 — generic transport ack.** Every received `<call>` stanza MUST be
acknowledged with a generic `<ack>` keyed to the stanza envelope, exactly as for
any other top-level server stanza. The `<ack>` correlates to the `<call>` by its
`id` attribute (the *stanza id*, distinct from the action's `call-id`). This ack is
independent of the action child and is sent for all action types, including
`<offer_notice>`.

**Level 2 — offer receipt.** When and only when the action child is `<offer>`, the
receiving device MUST additionally send a `<receipt>` that echoes the offer back to
the caller, so the caller's signalling layer learns the device received the ring:

    <receipt to="{caller}" id="{stanza_id}" from="{own_addressable_id}">
      <offer call-id="{call-id}" call-creator="{call-creator}"/>
    </receipt>

The `<receipt>` attributes MUST be set as follows:

- `to` MUST equal the `from` JID of the originating `<call>` stanza (the caller).
- `id` MUST equal the *stanza id* — the `id` attribute of the `<call>` stanza,
  NOT the action's `call-id`.
- `from` SHOULD be set to the acknowledging device's own addressable id. The id
  MUST be chosen to match the address space of the inbound `<call>`'s `from` JID:
  when `from` is a LID, the device's own LID is used; otherwise its own phone-number
  JID is used. If no own addressable id is available the `from` attribute MUST be
  omitted.

The single child `<offer>` MUST carry exactly two attributes copied verbatim from
the inbound offer action: `call-id` and `call-creator`. It MUST NOT echo the offer's
media or capability children.

An offer receipt MUST NOT be sent for any non-`<offer>` action. In particular,
`<offer_notice>` (the group-call fan-out notification) is acknowledged by the
generic Level-1 ack only and MUST NOT produce an offer receipt.

A receiver MUST treat an action child whose tag it does not recognise as a no-op
for acknowledgement purposes beyond the generic Level-1 ack: it MUST NOT fail the
stanza and MUST NOT emit an offer receipt.

**Findings**

The inbound `<call>` envelope carries `from`, `id` (stanza id), `t` (unix time),
and optionally `notify`, `platform`, `version`, and `e` (`e == "1"` marks offline
delivery). The action's `call-id` is a separate identifier from the stanza `id`;
the offer receipt correlates on the stanza `id` while later signalling (accept,
transport, terminate) correlates on `call-id` + `call-creator`.

The generic ack is emitted by the stanza router's should-ack path, so the call
handler itself only adds the offer receipt. The receipt mirrors the WhatsApp Web
shape: a `<receipt>` whose lone `<offer>` child repeats just `call-id` and
`call-creator`.

**Requires:** [`call-offer`](../signalling/call-offer.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working | signalling layer consumes/produces the offer receipt |
| [`meowcaller`](../../flavors.md) | planned |  |

**Open questions**

- Whether the server expects (or rejects) an offer receipt that omits the `from` attribute when an own addressable id exists.
- Whether any action other than `<offer>` (e.g. video offers carrying a `<video>` child) triggers an additional receipt beyond the generic ack.

**References**

- [RFC 6120 — XMPP Core (stanza acknowledgement model)](https://www.rfc-editor.org/rfc/rfc6120)

---

[in the full RFC →](../index.md#call-ack) · [RFC contents](../index.md#contents)
