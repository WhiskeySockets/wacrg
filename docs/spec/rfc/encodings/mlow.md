<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# MLow audio codec

**Category:** [Encodings](../index.md#encodings)  
**Part id:** `mlow`

**`mlow`** · status: review · features: audio · since: 0.1.0

WhatsApp's low-bitrate speech codec (internally "SMPL"): a split-band CELP codec that reuses the Opus/CELT range coder for entropy coding.

**Normative**

An MLow payload MUST be decoded as split-band CELP. The entropy layer is the
Opus/CELT range coder verbatim; symbols are read from the front of the buffer and
raw bits from the back. The decode schedule MUST run, in order: TOC/frame parse,
RED de-packetization, range-coded LSF → LPC, excitation pulses, gains, pitch/LTP,
CELP synthesis, the harmonic and HP post-filters, and comfort-noise generation.
Decoded output is 16 kHz PCM.

MLow is one registered decoder alongside Opus; codec selection is signalled in the
offer (see [call-offer](../signalling/call-offer.md)). The neural companion post-filter is OPTIONAL
and not required for intelligible audio.

**Findings**

The receive (decode) path is the priority for a working
call; the encoder mirrors it plus rate control, DTX, and RED strength.

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`meowmeow`](../../flavors.md) | working |  |
| [`meowcaller`](../../flavors.md) | partial | receive DSP largely KAT-verified; CELP synth + decoder orchestration in progress |

**References**

- [RFC 6716 — Opus](https://www.rfc-editor.org/rfc/rfc6716)

---

[in the full RFC →](../index.md#mlow) · [RFC contents](../index.md#contents)
