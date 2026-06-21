<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Video codec

_Encodings · `video`_

`ENC-06` · _status: draft · video, screen-share_

Video and screen-share tracks are carried as H.264; profile/level negotiation and packetization mode are not yet specified.

Video tracks MUST be H.264. The engine exposes an H.26x
passthrough/packetizer path (`wa_h26x_passthrough`, `h26x_packetizer`)
operating on H.264 NAL units.

TODO: H.264 profile/level negotiation, packetization mode, and how a
screen-content track is distinguished from a camera track.

**Notes.** Engine ships screen-content and luma-histogram detectors alongside the
H.264 NAL handling (likely inputs to screen-content track distinction).

Breakdown: [`video-packetization`](../encodings/video-packetization.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | unknown | — | — |

**Annotation** `wacrg:ENC-06` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Rajeh Taher · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/encodings/video.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/encodings/video.yaml)

**Open questions**
- H.264 profile/level negotiation and packetization mode.
- Whether other video codecs are supported.

## Changelog
- **2026-06-21** — Initial spec entry.

---

[← in the full spec](../../index.md#video)
