<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call Reject

**Tag:** `<call>`  
**Category:** signaling  
**Status:** draft  
**Spec version:** 0.1.0  
**Direction:** outgoing, incoming

## Summary

Sent by a callee device to decline an offered call before it is answered. The <call> node wraps a <reject> child echoing the call-id and call-creator and carrying a reason. The reject reason vocabulary is shared with terminate via enum:terminate-reasons (e.g. declined, busy), so the corpus maintains a single reason list rather than two overlapping ones. Reject is the pre-answer counterpart to terminate: it tells the caller "I will not take this call now". From the declining device this is outgoing; from the caller it is incoming. Details below are a working model, not yet confirmed by a real capture.

## Attributes

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `from` | `jid` | yes | probable | JID of the callee device declining the call. <br/>_observed:_ `B.0:7@s.whatsapp.net` | techniques: websocket-capture; sources: none |
| `to` | `jid` | yes | probable | JID of the caller the rejection is routed to. <br/>_observed:_ `A@s.whatsapp.net` | techniques: websocket-capture; sources: none |
| `id` | `string` | yes | probable | Stanza id used to correlate the server <ack> for this rejection. <br/>_observed:_ `5E6F708192` | techniques: websocket-capture; sources: none |

## Children

### `<reject>`

**occurrence:** 1 - **confidence:** probable

Container declining the call. Echoes the session identifiers from the offer and carries a reason drawn from enum:terminate-reasons. Distinguished from terminate by being emitted before any acceptance.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `call-id` | `string` | yes | probable | The logical call session id being rejected, copied verbatim from the offer. <br/>_observed:_ `CALLID-0001-synthetic` | techniques: websocket-capture, baileys-instrumentation; sources: none |
| `call-creator` | `jid` | yes | probable | JID of the call creator (the caller), copied from the offer for attribution. <br/>_observed:_ `A@s.whatsapp.net` | techniques: websocket-capture; sources: none |
| `reason` | `enum:terminate-reasons` | no | probable | Why the call was rejected, drawn from the shared enum:terminate-reasons (most commonly declined or busy). Reusing the terminate enum keeps the reason vocabularies aligned across both stanzas. <br/>_observed:_ `declined`, `busy` | techniques: websocket-capture, baileys-instrumentation; sources: none |

## Examples

### Illustrative user declines an incoming call (synthetic)

> Synthetic and sanitized, not a real capture. Shows a declined rejection routed back to the caller while the call is still ringing.


```xml
<call from="B.0:7@s.whatsapp.net" to="A@s.whatsapp.net" id="5E6F708192">
  <reject call-id="CALLID-0001-synthetic" call-creator="A@s.whatsapp.net" reason="declined"/>
</call>
```

## Notes

Reject and terminate are closely related; the practical distinction is timing (reject happens before acceptance) and that reject is always peer-originated. They deliberately share enum:terminate-reasons so a future capture only needs to extend one enum. If captures show reject uses a strictly smaller reason set, that subset can be documented in the enum's value confidence rather than by forking a new enum.

## Open questions

- Does reject use the full enum:terminate-reasons set, or only a declined/busy subset?
- Is there a separate "auto-reject" reason (e.g. do-not-disturb / blocked) distinct from user decline?
- After reject, does the server also emit terminate to the caller, or is reject sufficient on its own?

## References

- [Baileys (WhatsApp Web multi-device library)](https://github.com/WhiskeySockets/Baileys)

---

[Back to stanza catalog](./index.md) - [Spec overview](../index.md)
