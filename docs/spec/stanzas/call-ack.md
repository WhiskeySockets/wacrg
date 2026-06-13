<!-- GENERATED FILE — do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call Acknowledgement / Receipt

**Tag:** `<ack>`  
**Category:** signaling  
**Status:** draft  
**Spec version:** 0.1.0  
**Direction:** outgoing, incoming

## Summary

A server-generated acknowledgement confirming receipt of a call stanza. Like the rest of WhatsApp multi-device, call signaling is reliable: after a device sends a <call> (offer, accept, reject, terminate, transport, mute, etc.), the server replies with an <ack> echoing the original stanza id and class so the sender knows it was delivered into the routing fabric. A peer device may likewise be expected to ack certain call stanzas it receives. The <ack> tag is shared across the whole protocol (messages, receipts, etc.); this entry documents the call-signaling-specific usage where class="call". The attribute set largely mirrors generic WA acks and is modelled with moderate confidence.

## Attributes

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | yes | probable | Echoes the id of the <call> stanza being acknowledged, letting the original sender match the ack to its outstanding stanza. | techniques: websocket-capture; sources: — |
| `class` | `string` | yes | probable | Stanza class being acknowledged; for call signaling this is "call". Reuses the same class attribute seen on message/receipt acks elsewhere in the protocol. <br/>_observed:_ `call` | techniques: websocket-capture; sources: — |
| `from` | `jid` | no | probable | Originating address of the ack. For server acks this is typically the server JID (s.whatsapp.net); for peer-to-peer acks it is the acking device. <br/>_observed:_ `s.whatsapp.net` | techniques: websocket-capture; sources: — |
| `to` | `jid` | no | speculative | Destination of the ack (the device that sent the acknowledged stanza). | techniques: websocket-capture; sources: — |
| `type` | `string` | no | speculative | Sub-type of the ack, when present. Some call stanzas may be acknowledged with a type qualifier (mirroring how message receipts carry types). Vocabulary unconfirmed. | techniques: websocket-capture; sources: — |
| `t` | `timestamp` | no | speculative | Server timestamp at which the ack was generated (epoch seconds). | techniques: websocket-capture; sources: — |

## Children

### `<error>`

**occurrence:** 0..1 · **confidence:** speculative

Optional error detail when the acknowledged stanza could not be routed/accepted (e.g. callee offline, stanza malformed). Mirrors the <error> child seen on failed message acks. Presence on call acks is unconfirmed.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `code` | `int` | no | speculative | Numeric error code (HTTP-like) describing the failure. <br/>_observed:_ `404`, `503` | techniques: websocket-capture; sources: — |
| `text` | `string` | no | speculative | Human-readable error text. | techniques: websocket-capture; sources: — |

## Examples

### Illustrative server ack for a call offer (synthetic)

> Synthetic and sanitized — not a real capture.

```xml
<ack id="OF-0001" class="call" from="s.whatsapp.net" t="1700000000"/>
```

### Illustrative ack carrying a routing error (synthetic)

> Synthetic and sanitized — not a real capture; error framing on call acks is unconfirmed.

```xml
<ack id="OF-0002" class="call" from="s.whatsapp.net">
  <error code="503" text="service unavailable"/>
</ack>
```

## Notes

The ack is the reliability backbone of call signaling: absence of an ack within a timeout is what drives client-side retransmission of offers and other control stanzas. Note this stanza's tag is <ack>, not <call> — it is the server/peer response to a call stanza rather than a call stanza itself.

## Open questions

- Do peer devices ack received call stanzas, or only the server?
- Which call stanzas (beyond the offer) elicit an explicit ack versus being best-effort?
- Does the <error> child appear on call acks, and what is its code vocabulary?
- Is there a distinct <receipt> stanza for calls, separate from <ack>?

---

[Back to stanza catalog](./index.md) · [Spec overview](../index.md)
