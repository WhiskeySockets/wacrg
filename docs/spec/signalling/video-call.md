<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Video call negotiation

_Signalling - `video-call`_

`SIG-02` - _status: draft - audio, video_

A call is video-capable iff its `<offer>` carries a `<video>` child; the group fan-out notice signals video via `media="video"`.

**1:1 offer.** A video-capable `<offer>` MUST carry a `<video>` child in addition
to its `<audio enc="opus" rate="…">` advertisements (see [call-offer](../signalling/call-offer.md)).
The `<video>` marker is additive: the `<audio>` advertisements are identical in the
audio-only and video cases.

    <offer call-id call-creator>
      <audio enc="opus" rate="8000"/>
      <audio enc="opus" rate="16000"/>
      <video/>                          <!-- present ⇒ video call -->
    </offer>

- A receiver MUST treat the call as video iff the `<offer>` contains at least one
  `<video>` child, audio-only otherwise (`is_video = any child tag == "video"`).
- A receiver MUST NOT require any attribute on `<video>`; element presence is the signal.
- A receiver MUST parse and honour the `<audio>` advertisements of a video offer
  exactly as for an audio-only offer.

**Group fan-out notice.** A video call announced via `<offer_notice>`
(see [group-call](../signalling/group-call.md)) carries `media="video"` as an attribute (not a child;
audio uses `media="audio"`). A receiver MUST treat the call as video iff
`media == "video"`. `type == "group"` independently marks it a group call.

**Answering.** The callee answers a video offer with the same `<preaccept>` /
`<accept>` handshake as audio-only (see [call-accept](../signalling/call-accept.md),
[call-preaccept](../signalling/call-preaccept.md)); the accept negotiates the `<audio>` rate as usual.
No video-specific child in `<accept>` is required to accept the audio portion.

Requires: [`call-offer`](../signalling/call-offer.md), [`group-call`](../signalling/group-call.md), [`call-accept`](../signalling/call-accept.md), [`call-preaccept`](../signalling/call-preaccept.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [:material-github: history](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stanza.rs) - [:material-github: blame](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stanza.rs) - commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | Parses the <video> child (is_video) on <offer> and media="video" on <offer_notice>; inbound recognition. |
| `zapo-caller` | partial | — | Signalling/relay stack present; video-offer construction not covered. |

**Annotation** `wacrg:SIG-02` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

**Contributors**

| Contributor | Role |
| --- | --- |
| [<img src="https://github.com/purpshell.png?size=20" alt="Rajeh Taher" width="20" height="20" style="border-radius:50%;vertical-align:middle"> Rajeh Taher](../contributors.md#purpshell) | wrote initial spec |

[:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/video-call.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/video-call.yaml)

**Open questions**
- Attributes (if any) carried on the <video> child of <offer> — e.g. codec, resolution, or orientation hints — and whether the server enforces them.
- Whether a video-capable <accept> carries a reciprocal <video> child or other video-specific element to confirm acceptance of the video track.
- How mid-call escalation from audio-only to video is signalled (e.g. a renegotiation stanza vs. a fresh offer).
- Whether the offer's child-order rule (439 on mis-order) fixes the position of the <video> element relative to the <audio> nodes.

**References**
- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#video-call)
