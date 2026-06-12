<!-- GENERATED FILE — do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Mute / Video Toggle State Update

**Tag:** `<call>`  
**Category:** media  
**Status:** draft  
**Spec version:** 0.1.0  
**Direction:** outgoing, incoming

## Summary

A call-routed stanza that communicates in-call media state changes between peers: muting/unmuting audio, enabling/disabling the outgoing video track, and (for calls that escalate from audio to video) requesting a media upgrade. It is a lightweight signaling notification so the remote UI can reflect that the other party has muted or turned their camera on/off; the actual media simply stops/starts in the SRTP stream. We model it as a <call> carrying a state-change child (e.g. <mute>, <unmute>, or a generic <state>) with attributes naming the affected media type and the new value. The precise tag and attribute vocabulary is unconfirmed and hedged accordingly.

## Attributes

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `from` | `jid` | yes | probable | Sender device JID announcing the media state change. | techniques: websocket-capture; sources: — |
| `to` | `jid` | yes | probable | Destination peer device JID. | techniques: websocket-capture; sources: — |
| `id` | `string` | yes | probable | Stanza id used to correlate with the server <ack>. | techniques: websocket-capture; sources: — |

## Children

### `<mute>`

**occurrence:** 0..1 · **confidence:** speculative

Indicates the sender muted (or, paired with a value attribute, unmuted) a media track. We are unsure whether mute/unmute are distinct tags or a single tag with a boolean attribute; both are represented here as hypotheses.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `call-id` | `string` | yes | probable | Identifier of the call whose media state changed. | techniques: websocket-capture; sources: — |
| `call-creator` | `jid` | no | probable | JID of the call-creating device, used with call-id to key the call. | techniques: websocket-capture; sources: — |
| `media` | `enum:media-types` | no | speculative | Which media track the state change applies to (audio or video). Defaults to audio if absent in the audio-only case. | techniques: websocket-capture; sources: — |
| `value` | `bool` | no | speculative | New mute state (true = muted). Present only if a single tag encodes both mute and unmute via a boolean rather than using separate tags. | techniques: websocket-capture; sources: — |

### `<video>`

**occurrence:** 0..1 · **confidence:** speculative

Toggles the outgoing video track on/off, or requests an audio-to-video upgrade. Likely shares the call-id/call-creator keying of other in-call updates.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `call-id` | `string` | yes | probable | Identifier of the call whose video state changed. | techniques: websocket-capture; sources: — |
| `state` | `string` | no | speculative | New video state. Observed/assumed values include on, off, and possibly an upgrade-request marker; exact vocabulary unconfirmed. <br/>_observed:_ `on`, `off` | techniques: websocket-capture; sources: — |

## Examples

### Illustrative audio mute notification (synthetic)

> Synthetic and sanitized — not a real capture. Tag/attribute names are hypothetical.

```xml
<call from="A.1@s.whatsapp.net" to="B.2@s.whatsapp.net" id="MU-0001">
  <mute call-id="9f86d081" call-creator="A@s.whatsapp.net" media="audio" value="true"/>
</call>
```

### Illustrative video-toggle (camera on) notification (synthetic)

> Synthetic and sanitized — not a real capture.

```xml
<call from="A.1@s.whatsapp.net" to="B.2@s.whatsapp.net" id="MU-0002">
  <video call-id="9f86d081" state="on"/>
</call>
```

## Notes

Categorised as media because it concerns the audio/video tracks, though it is delivered over the signaling WebSocket like all other call stanzas. Mute is best understood as a courtesy notification: even without it, a peer simply stops receiving audio packets, but the explicit signal lets the UI show a mute indicator promptly.

## Open questions

- Are mute and unmute separate tags, or one tag with a boolean value attribute?
- Does video-toggle reuse the <video> media descriptor tag from the offer, or a distinct tag?
- Is an audio-to-video escalation signalled here or via a fresh <offer> with a <video> descriptor?
- Does a mute update require a server <ack>, or is it best-effort fire-and-forget?

---

[Back to stanza catalog](./index.md) · [Spec overview](../index.md)
