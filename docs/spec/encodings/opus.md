<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Opus codec

_Encodings · `opus`_

`ENC-05` · _status: draft · audio_

Standard Opus and MLow payloads share one RTP audio stream; the receiver routes each frame to a decoder by the top two bits of its first payload byte.

MLow ([mlow](../encodings/mlow.md)) and standard Opus (RFC 6716) are interleaved on the same
SRTP-protected RTP audio stream and the same SSRC. MLow is the default for 1:1
calls; standard Opus frames MAY appear on the same stream. A receiver MUST decode
both.

Codec selection is per-frame, by the first payload byte; there is no negotiation,
no RTP header field, no payload-type split. A receiver MUST branch on the top two
bits of the first byte, on every frame:

    (firstByte & 0xC0) == 0xC0   →  standard Opus packet, decode with RFC 6716 decoder
    (firstByte & 0xC0) != 0xC0   →  MLow "smpl" frame, route to MLow decoder ([mlow](../encodings/mlow.md))

For a standard Opus packet, read frame duration from `config = firstByte >> 3`
(RFC 6716 Table 2). Call-audio output sample rate is 16 kHz; decoded length =
`16 * frameMs` samples.

    config <  12          →  SILK,   frameMs ∈ {10, 20, 40, 60} = [config & 3]
    config 12..15         →  Hybrid, frameMs ∈ {10, 20}         = [(config-12) & 1]
    config >= 16          →  CELT,   frameMs ∈ {2.5, 5, 10, 20} = [config & 3]

Requires: [`mlow`](../encodings/mlow.md), [`call-offer`](../signalling/call-offer.md)  
Breakdown: [`mlow-frame`](../encodings/mlow-frame.md), [`media-loop`](../relay/media-loop.md), [`rtp-framing`](../relay/rtp-framing.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | — | — |
| `meowcaller` | partial | — | codec modules partial; first-byte routing present, Opus decode delegated to a stock libopus binding |

**Annotation** `wacrg:ENC-05` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Rajeh Taher · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/encodings/opus.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/encodings/opus.yaml)

**Open questions**
- Conditions under which a sender emits standard-Opus frames instead of MLow on a live 1:1 call (e.g. interop, fallback, or capability gating) are unspecified.
- Whether group calls or any specific transport mode default to standard Opus rather than MLow is unspecified.
- Whether standard-Opus payloads use a wider band (full 48 kHz Opus) than the 16 kHz call-audio output, or are always decoded down to 16 kHz, is unspecified.

**References**
- [RFC 6716 — Definition of the Opus Audio Codec](https://www.rfc-editor.org/rfc/rfc6716)

---

[← in the full spec](../../index.md#opus)
