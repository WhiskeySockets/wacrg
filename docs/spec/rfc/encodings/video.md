<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Video codec

**Category:** [Encodings](../index.md#encodings)  
**Part id:** `video`

**`video`** · status: draft · features: video, screen-share · since: 0.1.0

The video codec and packetization used for video calls and screen sharing.

**Normative**

TODO. Video tracks are carried as H.264 (and the engine contains an H.26x
passthrough/packetizer path). The exact profile negotiation, packetization mode,
and how a screen-content track is distinguished are not yet specified.

**Findings**

The WhatsApp Web engine contains H.264 NAL handling and an
`wa_h26x_passthrough` / `h26x_packetizer` path, plus screen-content and luma
histogram detectors.

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | unknown |  |

**Open questions**

- H.264 profile/level negotiation and packetization mode.
- Whether other video codecs are supported.

---

[in the full RFC →](../index.md#video) · [RFC contents](../index.md#contents)
