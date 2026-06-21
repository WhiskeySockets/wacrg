<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# MLow audio codec

_Encodings - `mlow`_

`ENC-01` - _status: review - audio_

WhatsApp's low-bitrate split-band CELP speech codec ("SMPL") that reuses the Opus/CELT range coder for entropy coding.

- Decode an MLow payload as split-band CELP. Output is 16 kHz PCM.
- Entropy layer is the Opus/CELT range coder verbatim: read symbols from the
  front of the buffer, raw bits from the back.
- Run the decode schedule in this order: TOC/frame parse; RED de-packetization;
  range-coded LSF -> LPC; excitation pulses; gains; pitch/LTP; CELP synthesis;
  harmonic and HP post-filters; comfort-noise generation.
- MLow is a registered decoder alongside Opus; codec selection is signalled in
  the offer (see [call-offer](../signalling/call-offer.md)).
- The neural companion post-filter is OPTIONAL; not required for intelligible audio.

Breakdown: [`mlow-decoder`](../encodings/mlow-decoder.md), [`mlow-encoder`](../encodings/mlow-encoder.md), [`mlow-excitation`](../encodings/mlow-excitation.md), [`mlow-frame`](../encodings/mlow-frame.md), [`mlow-lsf-lpc`](../encodings/mlow-lsf-lpc.md), [`mlow-noise`](../encodings/mlow-noise.md), [`mlow-postfilter`](../encodings/mlow-postfilter.md), [`mlow-rangecoder`](../encodings/mlow-rangecoder.md), [`mlow-red-fec`](../encodings/mlow-red-fec.md), [`mlow-vad`](../encodings/mlow-vad.md), [`opus`](../encodings/opus.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [:material-github: history](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/mlow/mod.rs) - [:material-github: blame](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/mlow/mod.rs) - commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `meowcaller` | partial | [:material-github: history](https://github.com/purpshell/meowcaller/commits/70af2501dbc1b29be8f8e2ead92d117b7ed000a4/mlow/mem.go) - [:material-github: blame](https://github.com/purpshell/meowcaller/blame/70af2501dbc1b29be8f8e2ead92d117b7ed000a4/mlow/mem.go) - commits [`70af250`](https://github.com/purpshell/meowcaller/commit/70af2501dbc1b29be8f8e2ead92d117b7ed000a4) [`f7103c5`](https://github.com/purpshell/meowcaller/commit/f7103c5a6084f5e95e94e0bc0a3ba237e83088cc) [`b0fe93c`](https://github.com/purpshell/meowcaller/commit/b0fe93c61ea77c36eaacaf67450e2f844c489889) [`e362783`](https://github.com/purpshell/meowcaller/commit/e362783d5f8988607d5b12fd419710fb275ea9e4) [`8b5ad0b`](https://github.com/purpshell/meowcaller/commit/8b5ad0b00fecd944a053cbc2e5dbf9a9541b6661) [`72d8a03`](https://github.com/purpshell/meowcaller/commit/72d8a03dbd47a5ff0b362647129a80c8edf5a820) | receive DSP largely KAT-verified; CELP synth + decoder orchestration in progress |

**Annotation** `wacrg:ENC-01` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

**Contributors** [![Rajeh Taher](https://github.com/purpshell.png?size=20) Rajeh Taher](../contributors.md#purpshell) (wrote initial spec)

[:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/encodings/mlow.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/encodings/mlow.yaml)

**References**
- [RFC 6716 — Opus](https://www.rfc-editor.org/rfc/rfc6716)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#mlow)
