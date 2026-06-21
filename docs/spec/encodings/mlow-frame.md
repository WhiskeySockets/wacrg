<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# MLow frame and TOC

_Encodings - `mlow-frame`_

`ENC-03` - _status: review - audio_

The leading "smpl" TOC byte of an MLow payload routes the frame (standard Opus vs. MLow), carries DTX/VAD flags, internal sample rate, and frame duration, and governs the three-chained-20 ms-subframe layout of an active MLow frame.

An MLow RTP payload begins with a single TOC byte `b`, followed by the
range-coded body. The TOC MUST be parsed first; it selects the decode path and
supplies the output length even when no body is decoded.

**Routing.** Inspect the top two bits first:

    (b & 0xC0) == 0xC0   →  standard Opus/CELT TOC (decode with stock Opus)
    (b & 0xC0) != 0xC0   →  smpl MLow TOC (decode with the MLow path)

When `(b & 0xC0) == 0xC0`, the remaining bits MUST be interpreted as a standard
Opus TOC per RFC 6716 §3.1; the frame is NOT MLow. Internal sample rate is fixed
at 16 kHz; frame duration comes from the Opus config `config = b >> 3` (RFC 6716
Table 2): configs < 12 SILK {10, 20, 40, 60} ms; 12–15 Hybrid {10, 20} ms;
≥ 16 CELT {2.5, 5, 10, 20} ms (round 2.5 ms up to 3 ms).

**smpl TOC bit layout** (bit 0 = LSB), used when `(b & 0xC0) != 0xC0`:

    bit 7  SID        comfort-noise / DTX (silence-insertion descriptor)
    bit 6  VAD        voice-activity flag
    bit 5  rate       internal sample rate: 0 → 16000 Hz, 1 → 32000 Hz
    bits 4:3  size    frame-duration index into {10, 20, 60, 120} ms
    bit 2  flag2      low-rate / config flag (selects active-frame config)
    bit 1  enable     voiced-enable bit
    bit 0  flag0      reserved flag

Derived fields MUST be computed as:

    sample_rate = (b & 0x20) ? 32000 : 16000
    frame_ms    = {10, 20, 60, 120}[(b >> 3) & 3]
    sid         = (b >> 7) & 1
    vad         = (b >> 6) & 1
    voiced      = vad AND ((b >> 1) & 1)
    active      = vad OR  ((b >> 1) & 1)

**Output length.** MUST be `sample_rate / 1000 * frame_ms` for an MLow frame, and
`16000 / 1000 * frame_ms` for a standard-Opus-routed frame.

**Inactive frames.** If `sid` is set or `active` is false, the frame carries no
excitation: the decoder MUST emit `output_length` samples of silence (or comfort
noise) and MUST NOT decode an active body. A standard-Opus TOC MUST be routed
away from the MLow active-frame decoder.

**Active-frame layout.** An active MLow frame (typically 60 ms) MUST be decoded as
three chained 20 ms internal frames over a single range-coded body beginning at
byte offset 1. For each internal frame, the body MUST be read in order: LSF/LPC
indices, excitation pulses, then either the pitch/LTP block (voiced, i.e. LSF
stage-1 index == 1) or the unvoiced gains block. Each internal frame divides into
4 subframes; the voiced pitch block carries one lag per 40-sample block (8 per
internal frame, 24 per packet). `flag2` (`(b >> 2) & 1`) selects active-frame
config 0 or 1, applied uniformly across all three internal frames. Cross-frame
predictor and synthesis history MUST persist across packets (the stream is
continuous); a decoder MUST reset this state only at a stream discontinuity.

**Notes.** In captured traffic the internal rate bit is 0 (16 kHz) and `flag2` is 0; a
60 ms active frame produces 3 × 320 = 960 samples at 16 kHz before the per-packet
harmonic post-filter, then resized to the TOC-derived output length if they
differ. A range-coder desync after active-frame decode indicates a TOC/body
mismatch.

Parent: [`mlow`](../encodings/mlow.md)  
Requires: [`mlow`](../encodings/mlow.md), [`mlow-rangecoder`](../encodings/mlow-rangecoder.md), [`opus`](../encodings/opus.md)  
Breakdown: [`mlow-decoder`](../encodings/mlow-decoder.md), [`mlow-encoder`](../encodings/mlow-encoder.md), [`mlow-lsf-lpc`](../encodings/mlow-lsf-lpc.md), [`mlow-noise`](../encodings/mlow-noise.md), [`mlow-postfilter`](../encodings/mlow-postfilter.md), [`mlow-red-fec`](../encodings/mlow-red-fec.md), [`mlow-synthesis`](../encodings/mlow-synthesis.md), [`mlow-vad`](../encodings/mlow-vad.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [:material-github: history](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/mlow/toc.rs) - [:material-github: blame](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/mlow/toc.rs) - commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `meowcaller` | partial | [:material-github: history](https://github.com/purpshell/meowcaller/commits/b0fe93c61ea77c36eaacaf67450e2f844c489889/mlow/toc.go) - [:material-github: blame](https://github.com/purpshell/meowcaller/blame/b0fe93c61ea77c36eaacaf67450e2f844c489889/mlow/toc.go) - commits [`b0fe93c`](https://github.com/purpshell/meowcaller/commit/b0fe93c61ea77c36eaacaf67450e2f844c489889) [`e362783`](https://github.com/purpshell/meowcaller/commit/e362783d5f8988607d5b12fd419710fb275ea9e4) [`7ff050a`](https://github.com/purpshell/meowcaller/commit/7ff050af9b194a7d2914ab950a9e64f9bbc5253f) [`2a4cd7c`](https://github.com/purpshell/meowcaller/commit/2a4cd7c00d02c36f89ccdc801684f9bcd2157f3c) | TOC parse + routing present; active-frame orchestration in progress |

**Annotation** `wacrg:ENC-03` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Rajeh Taher - [:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/encodings/mlow-frame.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/encodings/mlow-frame.yaml)

**Open questions**
- Semantics of flag0 (bit 0) — present in the TOC but not consumed by the decode path.
- Whether the 32 kHz internal rate (bit 5 = 1) and the 10/20/120 ms frame sizes occur in live calls, or are reserved; only 16 kHz / 60 ms active frames are seen in capture.
- Exact role of flag2 beyond selecting config 0 vs 1 for the active-frame decode.

**References**
- [RFC 6716 — Opus (TOC, §3.1, Table 2)](https://www.rfc-editor.org/rfc/rfc6716#section-3.1)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#mlow-frame)
