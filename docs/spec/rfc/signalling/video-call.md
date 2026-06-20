<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Video call negotiation

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `video-call`

**`video-call`** · status: draft · features: audio, video · since: 0.1.0

How a call is signalled as video-capable rather than audio-only: the offer carries a video marker alongside its audio advertisements, and the group fan-out notification carries the equivalent media flag.

**Normative**

A call is signalled as video-capable, rather than audio-only, by the presence of
a video marker inside the offer; the marker is additive and does not replace the
audio advertisement.

**1:1 offer.** A video-capable `<offer>` MUST carry a `<video>` child element in
addition to its `<audio enc="opus" rate="…">` advertisements
(see [call-offer](../signalling/call-offer.md)). A receiver MUST treat the call as a video call
if and only if the `<offer>` contains at least one `<video>` child, and as
audio-only otherwise. The audio `<audio>` advertisements are present in both the
audio-only and the video case; video is signalled purely by the extra `<video>`
element:

    <offer call-id call-creator>
      …
      <audio enc="opus" rate="8000"/>
      <audio enc="opus" rate="16000"/>
      <video/>                          <!-- present ⇒ video call -->
      …
    </offer>

A receiver MUST NOT require any attribute on `<video>` to recognise the call as
video; element presence is the signal. A receiver MUST still parse and honour the
`<audio>` advertisements of a video offer exactly as for an audio-only offer.

**Group fan-out notification.** When a video call is announced to group members
via an `<offer_notice>` (see [group-call](../signalling/group-call.md)), the video signal is
carried as the attribute `media="video"` on the `<offer_notice>` element, not as a
child element. A receiver MUST treat the notified call as video if and only if
`media == "video"`. (`type == "group"` independently marks the call as a group
call.)

**Answering.** The callee answers a video offer with the same `<preaccept>` /
`<accept>` handshake used for audio-only calls (see [call-accept](../signalling/call-accept.md) and
[call-preaccept](../signalling/call-preaccept.md)); the accept negotiates the `<audio>` rate as
usual. No additional video-specific child in the `<accept>` is required to accept
the audio portion of the call.

**Findings**

At the signalling layer the audio/video distinction for a 1:1 call is binary and
is decided entirely by whether the `<offer>` contains a `<video>` child: the field
is parsed as `is_video = any child tag == "video"`. The same `<offer>` always
advertises audio (`<audio enc="opus" rate="8000|16000">`), so a video offer is an
audio offer plus the `<video>` marker rather than a distinct stanza shape.

The group-call announcement path is separate: `<offer_notice>` does not nest media
elements and instead exposes `media="video"` (audio uses `media="audio"`) together
with `type="group"`. Both are simple attribute checks on the notice element.

**Requires:** [`call-offer`](../signalling/call-offer.md), [`group-call`](../signalling/group-call.md), [`call-accept`](../signalling/call-accept.md), [`call-preaccept`](../signalling/call-preaccept.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working | Parses the <video> child (is_video) on <offer> and media="video" on <offer_notice>; inbound recognition. |
| [`zapo-caller`](../../flavors.md) | partial | Signalling/relay stack present; video-offer construction not covered. |
| [`meowcaller`](../../flavors.md) | planned |  |

**Open questions**

- Attributes (if any) carried on the <video> child of <offer> — e.g. codec, resolution, or orientation hints — and whether the server enforces them.
- Whether a video-capable <accept> carries a reciprocal <video> child or other video-specific element to confirm acceptance of the video track.
- How mid-call escalation from audio-only to video is signalled (e.g. a renegotiation stanza vs. a fresh offer).
- Whether the offer's child-order rule (439 on mis-order) fixes the position of the <video> element relative to the <audio> nodes.

**References**

- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)

---

[in the full RFC →](../index.md#video-call) · [RFC contents](../index.md#contents)
