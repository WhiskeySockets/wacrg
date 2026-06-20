<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Video packetization

**Category:** [Encodings](../index.md#encodings)  
**Part id:** `video-packetization`

**`video-packetization`** · status: draft · features: video, screen-share · since: 0.1.0

How an H.264 video track is signalled, keyed, and carried over the call's RTP transport: the video capability advertisement, the RTP payload that distinguishes video from audio, and the NAL-unit packetization that maps an encoded H.264 access unit onto RTP payloads. The H.264 NAL framing rules themselves are not yet fully specified and are recorded as open questions.

**Normative**

**Signalling a video track.** A call is a video call when its `<offer>` carries a
`<video>` child element alongside the `<audio>` advertisements (see
[call-offer](../signalling/call-offer.md)). A receiver MUST treat the presence of `<video>` as the
signal that the caller intends to send (and is willing to receive) a video track;
its absence means an audio-only call. For group calls the same intent is carried as
the `media="video"` attribute on the `<offer_notice>` element. A client that does
not support video MUST still parse the offer and MAY accept it as audio-only.

    <offer call-id=… call-creator=…>
      <audio enc="opus" rate="16000"/>
      <video/>                         <!-- present iff this is a video call -->
      …
    </offer>

**Carriage.** The video track MUST be carried over the same per-call media
transport as audio: an RTP stream multiplexed onto the relay DataChannel,
protected end-to-end with the call's SRTP keys (see
[srtp-master-key](../crypto/srtp-master-key.md)) and, on the relay leg, hop-by-hop SRTP (see
[srtp-hop-by-hop](../crypto/srtp-hop-by-hop.md)). The video track MUST use a distinct SSRC from
the audio track (see [ssrc](../relay/ssrc.md)) and a distinct RTP payload type, so a receiver
can demultiplex audio and video by payload type / SSRC. Audio uses RTP payload
type 120 (and 121); a video payload type MUST NOT collide with those.

**Packetization (general rules that any conforming implementation MUST follow).**
An encoded H.264 access unit MUST be split into one or more NAL units and mapped
onto RTP payloads following RFC 6184:

- A NAL unit that fits within the path MTU (after the RTP header and the SRTP auth
  tag are accounted for) MUST be sent as a single-NAL-unit RTP payload (the NAL
  unit placed directly in the RTP payload, its first byte being the NAL header).
- A NAL unit too large to fit MUST be fragmented across consecutive RTP packets
  using FU-A fragmentation units; the start, middle, and end fragments MUST set the
  FU header start/end bits accordingly, and all fragments of one NAL unit MUST
  share the same RTP timestamp.
- All RTP packets that belong to one access unit (one captured frame) MUST share
  the same RTP timestamp, and the last RTP packet of an access unit MUST set the
  RTP marker bit.
- The 90 kHz RTP clock SHOULD be used for the video timestamp.

The exact negotiated H.264 profile/level, the packetization mode, the concrete
video payload-type value, and whether aggregation packets (STAP-A) are used are not
established by this revision; an implementation MUST NOT assume a fixed value for
these until they are pinned (see open_questions).

**Findings**

The signalling surface for video is observable and stable: an inbound `<offer>` is
classified as a video call when it contains a `<video>` child, and a group
`<offer_notice>` carries `media="video"`. These map to the `is_video` flag the
client exposes on the parsed call action. The media transport, SRTP/SRTCP keying,
SSRC derivation, and RTP framing are shared with the audio path; a video track is an
additional RTP stream on the same DataChannel rather than a separate connection. The
video path uses H.264 NAL handling with a passthrough / packetizer stage (plus
screen-content and luma histogram detectors used to bias encoding for screen
sharing), which produces the RFC 6184-style single-NAL/FU-A behaviour described
above. The specifics of that packetizer — payload type, profile negotiation,
packetization mode — are not yet specified.

**Requires:** [`call-offer`](../signalling/call-offer.md), [`video`](../encodings/video.md), [`ssrc`](../relay/ssrc.md), [`rtp-framing`](../relay/rtp-framing.md), [`srtp-master-key`](../crypto/srtp-master-key.md), [`srtp-hop-by-hop`](../crypto/srtp-hop-by-hop.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | unknown | Audio media path is implemented; the H.264 video packetizer is not yet present. |
| [`meowmeow`](../../flavors.md) | unknown | Covers the audio codec/keying; video packetization not yet addressed. |
| [`meowcaller`](../../flavors.md) | planned | Encodings modules are partial; video packetization is a planned module. |

**Open questions**

- The concrete RTP payload type assigned to the H.264 video track.
- H.264 profile/level negotiation and the RFC 6184 packetization mode in use (mode 0/1, single-NAL vs FU-A vs STAP-A aggregation).
- Whether the video RTP clock is the standard 90 kHz and how the WhatsApp 0xdebe RTP header extension applies (or does not) to video packets.
- How a screen-share track is distinguished on the wire from a camera video track (separate SSRC, separate payload type, or signalling attribute).
- Whether any video codec other than H.264 is negotiated, and how keyframe/SPS/PPS delivery and resends are handled.

**References**

- [RFC 6184 — RTP Payload Format for H.264 Video](https://www.rfc-editor.org/rfc/rfc6184)
- [RFC 3550 — RTP: A Transport Protocol for Real-Time Applications](https://www.rfc-editor.org/rfc/rfc3550)

---

[in the full RFC →](../index.md#video-packetization) · [RFC contents](../index.md#contents)
