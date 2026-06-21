<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call Terminate

**Tag:** `<call>`  
**Category:** signaling  
**Status:** draft  
**Spec version:** 0.1.0  
**Direction:** outgoing, incoming, bidirectional

## Summary

Ends an existing call or a still-ringing offer. Either party (or the server on their behalf) may emit a <call> wrapping a <terminate> child that carries the call-id and a machine-readable reason drawn from enum:terminate-reasons (e.g. timeout, busy, declined, connection_lost, accept_elsewhere). Terminate covers normal hang-ups, unanswered calls that time out, network drops, and the multi-device fork resolution where non-answering companion devices are told the call was accepted elsewhere. It is bidirectional: the caller can cancel, the callee can decline-after-ringing, and the server can tear down on error. Details below are a working model, not yet confirmed by a real capture.

## Attributes

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `from` | `jid` | yes | probable | JID of the party (or server) ending the call. <br/>_observed:_ `A@s.whatsapp.net`, `B.0:7@s.whatsapp.net` | techniques: websocket-capture; sources: none |
| `to` | `jid` | yes | probable | JID of the peer the termination is routed to. <br/>_observed:_ `B@s.whatsapp.net`, `A@s.whatsapp.net` | techniques: websocket-capture; sources: none |
| `id` | `string` | yes | probable | Stanza id used to correlate the server <ack> for this termination. <br/>_observed:_ `4D5E6F7081` | techniques: websocket-capture; sources: none |

## Children

### `<terminate>`

**occurrence:** 1 - **confidence:** probable

Container that ends the session. Carries the call-id and the reason. Some reasons (e.g. accept_elsewhere) are produced by the server during multi-device fork resolution rather than by a peer.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `call-id` | `string` | yes | probable | The logical call session id being terminated, copied from the offer. <br/>_observed:_ `CALLID-0001-synthetic` | techniques: websocket-capture, baileys-instrumentation; sources: none |
| `reason` | `enum:terminate-reasons` | no | probable | Why the call ended, drawn from enum:terminate-reasons. May be absent on a plain user hang-up, where the absence itself implies a normal end-of-call. <br/>_observed:_ `timeout`, `busy`, `declined`, `connection_lost`, `accept_elsewhere` | techniques: websocket-capture, baileys-instrumentation; sources: none |
| `call-creator` | `jid` | no | speculative | JID of the original call creator, sometimes echoed for attribution. Whether terminate always includes it is unconfirmed. <br/>_observed:_ `A@s.whatsapp.net` | techniques: websocket-capture; sources: none |

## Examples

### Illustrative caller cancels an unanswered call (synthetic)

> Synthetic and sanitized, not a real capture. Shows a timeout termination emitted toward the callee after no answer.


```xml
<call from="A@s.whatsapp.net" to="B@s.whatsapp.net" id="4D5E6F7081">
  <terminate call-id="CALLID-0001-synthetic" reason="timeout"/>
</call>
```

### Illustrative server tears down companion devices after accept (synthetic)

> Synthetic and sanitized. After one device accepts, the server is expected to terminate the other ringing devices with accept_elsewhere.


```xml
<call from="A@s.whatsapp.net" to="B.12:3@s.whatsapp.net" id="4D5E6F7082">
  <terminate call-id="CALLID-0001-synthetic" reason="accept_elsewhere"/>
</call>
```

## Notes

Terminate is the universal shutdown stanza; reject is a more specific pre-answer variant. The shared enum:terminate-reasons keeps reject and terminate vocabularies aligned so the corpus does not fork two near-identical reason lists.

## Open questions

- Is reason ever omitted on a normal hang-up, with absence meaning a clean end?
- Which reasons are peer-originated versus server-originated (e.g. accept_elsewhere, connection_lost)?
- Does terminate carry any post-call metadata (duration, byte counters) for diagnostics?

## References

- [Baileys (WhatsApp Web multi-device library)](https://github.com/WhiskeySockets/Baileys)

---

[Back to stanza catalog](./index.md) - [Spec overview](../index.md)
