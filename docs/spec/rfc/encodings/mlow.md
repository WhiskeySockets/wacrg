<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# MLow audio codec

_Encodings · `mlow`_

_status: review · audio_

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
- **whatsapp-rust** — working · [commits ↗](https://github.com/oxidezap/whatsapp-rust/commits)
- **meowcaller** — partial — receive DSP largely KAT-verified; CELP synth + decoder orchestration in progress · [commits ↗](https://github.com/purpshell/meowcaller/commits)

Discovered by Rajeh Taher · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/encodings/mlow.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/encodings/mlow.yaml)

**References**
- [RFC 6716 — Opus](https://www.rfc-editor.org/rfc/rfc6716)

---

[← in the full RFC](../../../index.md#mlow)
