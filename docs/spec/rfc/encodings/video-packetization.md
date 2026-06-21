<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Video packetization

_Encodings · `video-packetization`_

_status: draft · video, screen-share_

Signals, keys, and carries an H.264 video track over the call's RTP transport, mapping each access unit onto RFC 6184 NAL-unit RTP payloads.

**Signalling.** A call is a video call iff its `<offer>` carries a `<video>` child
alongside the `<audio>` advertisements (see [call-offer](../signalling/call-offer.md)); its absence
means audio-only. For group calls the intent is the `media="video"` attribute on
`<offer_notice>`. A client without video support MUST still parse the offer and MAY
accept it as audio-only.

    <offer call-id=… call-creator=…>
      <audio enc="opus" rate="16000"/>
      <video/>                         <!-- present iff video call -->
      …
    </offer>

**Carriage.**
- The video track MUST be carried over the same per-call media transport as audio:
  RTP multiplexed onto the relay DataChannel, protected with the call's SRTP keys
  (see [srtp-master-key](../crypto/srtp-master-key.md)) and hop-by-hop SRTP on the relay leg (see
  [srtp-hop-by-hop](../crypto/srtp-hop-by-hop.md)).
- The video track MUST use a distinct SSRC from audio (see [ssrc](../relay/ssrc.md)) and a
  distinct RTP payload type, so a receiver demultiplexes by payload type / SSRC.
- Audio uses RTP payload type 120 (and 121); the video payload type MUST NOT collide
  with those.

**Packetization (RFC 6184).** An encoded H.264 access unit MUST be split into one or
more NAL units and mapped onto RTP payloads:
- A NAL unit that fits the path MTU (after RTP header and SRTP auth tag) MUST be sent
  as a single-NAL-unit payload: the NAL unit placed directly in the RTP payload, its
  first byte being the NAL header.
- A NAL unit too large MUST be fragmented across consecutive RTP packets using FU-A
  units; start/middle/end fragments MUST set the FU header start/end bits accordingly,
  and all fragments of one NAL unit MUST share the same RTP timestamp.
- All RTP packets of one access unit (one frame) MUST share the same RTP timestamp,
  and the last RTP packet of an access unit MUST set the RTP marker bit.
- The 90 kHz RTP clock SHOULD be used for the video timestamp.

The negotiated H.264 profile/level, packetization mode, concrete video payload-type
value, and whether STAP-A aggregation is used are not established by this revision; an
implementation MUST NOT assume a fixed value until they are pinned (see open_questions).

**Notes.** The signalling classifiers (`<video>` child; group `media="video"`) map to the
client's `is_video` flag. The video path uses a passthrough / packetizer stage with
screen-content and luma-histogram detectors that bias encoding for screen sharing.

Parent: [`video`](../encodings/video.md)  
Requires: [`call-offer`](../signalling/call-offer.md), [`video`](../encodings/video.md), [`ssrc`](../relay/ssrc.md), [`rtp-framing`](../relay/rtp-framing.md), [`srtp-master-key`](../crypto/srtp-master-key.md), [`srtp-hop-by-hop`](../crypto/srtp-hop-by-hop.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | unknown | [commits ↗](https://github.com/oxidezap/whatsapp-rust/commits) | Audio media path is implemented; the H.264 video packetizer is not yet present. |
| `meowcaller` | planned | [commits ↗](https://github.com/purpshell/meowcaller/commits) | Encodings modules are partial; video packetization is a planned module. |

Discovered by Rajeh Taher · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/encodings/video-packetization.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/encodings/video-packetization.yaml)

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

[← in the full RFC](../../../index.md#video-packetization)
