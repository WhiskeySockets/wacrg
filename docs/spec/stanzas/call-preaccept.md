<!-- GENERATED FILE — do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call Pre-Accept

**Tag:** `<call>`  
**Category:** signaling  
**Status:** draft  
**Spec version:** 0.1.0  
**Direction:** outgoing, incoming

## Summary

An early-acknowledgement stanza emitted by a callee device after it has received and decrypted the offer but before the user has answered. The <call> node wraps a <preaccept> child echoing the call-id and call-creator. It signals "your offer reached me and I am now ringing", letting the caller show an accurate ringing state and optionally begin transport warm-up. It is not a commitment to accept the call. From the ringing device this is outgoing; from the caller it is incoming. Details below are a working model, not yet confirmed by a real capture.

## Attributes

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `from` | `jid` | yes | probable | JID of the ringing callee device emitting the pre-accept. <br/>_observed:_ `B.0:7@s.whatsapp.net` | techniques: websocket-capture; sources: — |
| `to` | `jid` | yes | probable | JID of the caller the pre-accept is routed to. <br/>_observed:_ `A@s.whatsapp.net` | techniques: websocket-capture; sources: — |
| `id` | `string` | yes | probable | Stanza id used to correlate the server <ack> for this pre-accept. <br/>_observed:_ `3C4D5E6F70` | techniques: websocket-capture; sources: — |

## Children

### `<preaccept>`

**occurrence:** 1 · **confidence:** probable

Container marking the call as received-and-ringing. Echoes the session identifiers. It may optionally carry early transport candidates so the relay handshake can begin while the phone rings, but it carries no acceptance.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `call-id` | `string` | yes | probable | The logical call session id, copied verbatim from the offer. <br/>_observed:_ `CALLID-0001-synthetic` | techniques: websocket-capture, baileys-instrumentation; sources: — |
| `call-creator` | `jid` | yes | probable | JID of the call creator (the caller), copied from the offer. <br/>_observed:_ `A@s.whatsapp.net` | techniques: websocket-capture; sources: — |

#### `<destination>`

**occurrence:** 0..1 · **confidence:** speculative

Optional early transport candidates, allowing relay warm-up before the user answers. Whether pre-accept carries these or they wait for <accept> is unconfirmed.

##### `<te>`

**occurrence:** 0..n · **confidence:** speculative

A transport endpoint candidate advertised early by the ringing device.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `ip` | `string` | no | speculative | Candidate IP address (synthetic example only). <br/>_observed:_ `203.0.113.20` | techniques: websocket-capture; sources: — |
| `port` | `int` | no | speculative | Candidate UDP port for media. <br/>_observed:_ `3478` | techniques: websocket-capture; sources: — |

## Examples

### Illustrative pre-accept / ringing (synthetic)

> Synthetic and sanitized — not a real capture. Whether <preaccept> carries early <destination> candidates is an open question; a bare form is also plausible.


```xml
<call from="B.0:7@s.whatsapp.net" to="A@s.whatsapp.net" id="3C4D5E6F70">
  <preaccept call-id="CALLID-0001-synthetic" call-creator="A@s.whatsapp.net"/>
</call>
```

## Notes

Pre-accept is the protocol's analogue of an SIP 180 Ringing: it confirms delivery and that the device is alerting the user, distinct from the actual <accept>. Not every device or call necessarily emits it, so the caller must not block on it.

## Open questions

- Is <preaccept> always emitted, or only under certain client versions / network conditions?
- Does pre-accept carry early transport candidates, or is transport deferred to <accept>?
- In multi-device, do all ringing devices send pre-accept, and how does the caller aggregate them?

## References

- [Baileys (WhatsApp Web multi-device library)](https://github.com/WhiskeySockets/Baileys)

---

[Back to stanza catalog](./index.md) · [Spec overview](../index.md)
