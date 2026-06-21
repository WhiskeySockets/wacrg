<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call Accept

**Tag:** `<call>`  
**Category:** signaling  
**Status:** draft  
**Spec version:** 0.1.0  
**Direction:** outgoing, incoming

## Summary

Sent by the callee device when the user answers the call. The <call> node wraps an <accept> child that echoes the call-id and call-creator from the original offer and carries the callee's own keying material and transport candidates so media can begin flowing. From the answering device's perspective this is outgoing; from the caller's it is incoming. Acceptance is exclusive in multi-device: once one of the callee's devices accepts, the others receive a terminate with reason accept_elsewhere (see enum:terminate-reasons). All details below are a working model, not yet confirmed by a real capture.

## Attributes

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `from` | `jid` | yes | probable | JID of the accepting device. On the wire the server may stamp/augment this so the caller learns which specific companion device answered. <br/>_observed:_ `B.0:7@s.whatsapp.net` | techniques: websocket-capture; sources: none |
| `to` | `jid` | yes | probable | JID of the original caller account/device the acceptance is routed to. <br/>_observed:_ `A@s.whatsapp.net` | techniques: websocket-capture; sources: none |
| `id` | `string` | yes | probable | Stanza id used to correlate the server <ack> for this acceptance. <br/>_observed:_ `2B3C4D5E6F` | techniques: websocket-capture; sources: none |

## Children

### `<accept>`

**occurrence:** 1 - **confidence:** probable

Container confirming the call. Echoes the session identifiers from the offer and, in most call designs, carries the callee's keying contribution and its own transport endpoints so the SRTP session can be completed.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `call-id` | `string` | yes | probable | The logical call session id, copied verbatim from the originating offer. <br/>_observed:_ `CALLID-0001-synthetic` | techniques: websocket-capture, baileys-instrumentation; sources: none |
| `call-creator` | `jid` | yes | probable | JID of the call creator (the caller), copied from the offer for attribution. <br/>_observed:_ `A@s.whatsapp.net` | techniques: websocket-capture; sources: none |

#### `<enc>`

**occurrence:** 0..n - **confidence:** speculative

Optional keying payload from the callee back to the caller's device(s), again wrapped in the Signal session. Whether the callee re-sends keying on accept (versus the offer's key being authoritative) is unconfirmed; some designs use the accept purely as a confirmation and rely on the offer key.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `v` | `int` | no | speculative | Envelope/version of the enc payload format. <br/>_observed:_ `2` | techniques: websocket-capture; sources: none |
| `type` | `string` | no | speculative | Signal message type (pkmsg or msg), as on the offer's enc node. <br/>_observed:_ `msg`, `pkmsg` | techniques: websocket-capture, baileys-instrumentation; sources: none |

#### `<destination>`

**occurrence:** 0..1 - **confidence:** speculative

The callee's chosen/advertised transport endpoints, mirroring the offer's <destination>. Lets both sides converge on a relay for the SRTP-over-UDP media path.

##### `<te>`

**occurrence:** 0..n - **confidence:** speculative

A transport endpoint candidate advertised by the callee.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `ip` | `string` | no | speculative | Candidate IP address (synthetic example only). <br/>_observed:_ `203.0.113.20` | techniques: websocket-capture; sources: none |
| `port` | `int` | no | speculative | Candidate UDP port for media. <br/>_observed:_ `3478` | techniques: websocket-capture; sources: none |

## Examples

### Illustrative call acceptance (synthetic)

> Synthetic and sanitized, not a real capture. Whether <accept> carries its own <enc>/<destination> or is a bare confirmation is an open question; both are shown for illustration.


```xml
<call from="B.0:7@s.whatsapp.net" to="A@s.whatsapp.net" id="2B3C4D5E6F">
  <accept call-id="CALLID-0001-synthetic" call-creator="A@s.whatsapp.net">
    <enc v="2" type="msg"><!-- optional callee keying contribution --></enc>
    <destination>
      <te ip="203.0.113.20" port="3478"/>
    </destination>
  </accept>
</call>
```

## Notes

Acceptance flips the session from "ringing" to "connected". The other companion devices of the callee should observe a terminate (reason accept_elsewhere) once this stanza is processed, which is the multi-device fork-resolution behaviour.

## Open questions

- Does <accept> carry keying material, or is the offer's media key authoritative for the whole call?
- Are transport candidates exchanged in <accept>, or only via later <transport> updates?
- Is there an attribute distinguishing audio-only acceptance from accepting a video upgrade?

## References

- [Signal Protocol overview](https://signal.org/docs/)

---

[Back to stanza catalog](./index.md) - [Spec overview](../index.md)
