<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Mute signalling

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `call-mute`

**`call-mute`** · status: draft · features: audio, video · since: 0.1.0

How a participant signals an in-call audio mute/unmute state change to the peer over the call signalling channel, using a `<mute_v2>` action inside the shared `<call>` envelope.

**Normative**

In-call mute state is conveyed out of band from the media stream, as a
signalling stanza. A participant that changes its local microphone mute state
MUST send a `<call>` stanza wrapping a `<mute_v2>` action child:

```
<call to="{peer}">
  <mute_v2 call-id="{call-id}"
           call-creator="{call-creator}"
           mute-state="{state}"/>
</call>
```

Requirements on the action:

- The `to` attribute on the `<call>` wrapper MUST be the peer JID. The wrapper
  carries no `id` attribute on this action (the I/O layer does not assign one).
- `call-id` MUST equal the `call-id` of the call established by the offer (see
  [call-offer](../signalling/call-offer.md)).
- `call-creator` MUST equal the call's `call-creator` JID — the JID of the
  party that placed the call — and MUST be byte-identical to the value carried
  by every other action of the same call.
- `mute-state` MUST carry the new mute state as a string attribute value.
- The action tag MUST be `mute_v2`. The `<mute_v2>` element MUST have no child
  elements; all state is carried in attributes.

A participant MUST send a fresh `<mute_v2>` on each transition (mute → unmute
or unmute → mute); the stanza expresses the new absolute state, not a toggle.

This action is informational signalling: the sender continues to follow the
established media path and does not renegotiate transport, codecs, or keys
(see [call-transport](../signalling/call-transport.md)). Muting is expected to be realised on
the media stream independently (for example by ceasing to transmit audio or by
transmitting silence); the `<mute_v2>` stanza only advertises the state to the
peer so it can update its UI.

**Findings**

The `<mute_v2>` action shares the common call-action shape used by every other
action in the call envelope: a tag carrying `call-id` and `call-creator`
attributes, wrapped in a `<call to=…>` element. It differs only by adding the
`mute-state` attribute and by carrying no child elements.

The `_v2` suffix in the tag name indicates a versioned action; the tag name
is sent verbatim on the wire as `mute_v2`.

**Requires:** [`call-offer`](../signalling/call-offer.md), [`call-transport`](../signalling/call-transport.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working | build_mute_v2 in wacore/src/voip/stanza.rs constructs the outbound stanza; no inbound parser yet (mute_v2 is not in the <call> action allow-list). |
| [`zapo-caller`](../../flavors.md) | planned |  |
| [`meowcaller`](../../flavors.md) | planned |  |

**Open questions**

- The set of valid mute-state values is not pinned by the source; the builder accepts an arbitrary string. The on-wire encoding (e.g. "muted"/"unmuted" vs a numeric flag) is unconfirmed.
- Whether video mute is signalled by the same mute_v2 action (e.g. an additional video-state attribute) or by a separate action is unknown.
- Whether the receiver acknowledges <mute_v2> (with a generic <ack> or a dedicated receipt) is not established; the inbound side does not yet parse this action.
- Whether a v1 <mute> action precedes mute_v2 on older clients, and how versions interoperate, is unknown.

**References**

- [WhatsApp call signalling — mute_v2 builder](https://github.com/WhiskeySockets)

---

[in the full RFC →](../index.md#call-mute) · [RFC contents](../index.md#contents)
