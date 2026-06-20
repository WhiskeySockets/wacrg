<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# MLow decode pipeline

**Category:** [Encodings](../index.md#encodings)  
**Part id:** `mlow-decoder`

**`mlow-decoder`** · status: draft · features: audio · since: 0.1.0

The top-level MLow decode orchestration: how one RTP payload is turned into a 16 kHz PCM frame by stripping RED redundancy, routing on the TOC byte, and — for an active frame — running three chained 20 ms internal frames (LSF/LPC, pulses, pitch-or-gains, CELP synthesis) through the per-packet harmonic post-filter, while carrying the cross-frame predictor and synthesis history across packets.

**Normative**

An MLow decoder is a stateful object that consumes one RTP MLow payload per call
and produces one PCM frame of 32-bit floats in `[-1.0, 1.0]` at the TOC-derived
output length. The same decoder instance MUST be reused for the lifetime of a
continuous stream, because the cross-frame predictor (`prev_nlsf`), the CELP/LTP
synthesis history, the HP post-filter state, and the harmonic post-filter state
all persist from one packet to the next. The decoder MUST expose a reset operation
that clears all of this carried state, and a caller MUST invoke it at a stream
discontinuity (e.g. a new SSRC or a detected gap) and MUST NOT invoke it between
consecutive packets of one stream.

**Stage 0 — empty payload.** If the payload is empty, the decoder MUST emit one
full silence frame of `OPUS_FRAME_SAMPS = 960` samples (60 ms at 16 kHz) and MUST
NOT advance any decode state.

**Stage 1 — RED strip.** A decoder configured with a negotiated RED redundancy
level `n > 0` MUST first de-packetize the SplitRED container (see
[mlow-red-fec](../encodings/mlow-red-fec.md)). The main (current) frame is the LAST element of the
recovered frame list; the decoder MUST extract that frame's data and decode it as a
bare MLow frame (Stage 2 onward). If RED de-packetization fails, the decoder MUST
emit `OPUS_FRAME_SAMPS` (960) samples of silence and MUST NOT advance decode state.
When `n == 0` (the common case) the payload is already a bare MLow frame and is
passed directly to Stage 2.

**Stage 2 — TOC routing.** The decoder MUST parse the first byte as the smpl TOC
(see [mlow-frame](../encodings/mlow-frame.md)) and compute `output_length`:

    output_length = std_opus ? (16000 / 1000 * frame_ms)
                             : (sample_rate / 1000 * frame_ms)

The decoder MUST then route as follows, in this order:

    std_opus == true        →  emit output_length samples of silence
    sid == true             →  emit output_length samples of silence
    active == false         →  emit output_length samples of silence
    otherwise               →  decode the active frame (Stage 3)

A `std_opus` frame is a standard Opus/CELT packet and is not decoded by the MLow
active-frame path; an SID or inactive frame carries no excitation. In every
silence case the decoder MUST emit exactly `output_length` samples of `0.0`.

**Stage 3 — active-frame decode.** The active-frame body begins at byte offset 1
(immediately after the TOC) and is a single range-coded bitstream (see
[mlow-rangecoder](../encodings/mlow-rangecoder.md)) covering all three internal frames. The
decoder MUST:

  1. Read the active-frame config and low-rate flag from the TOC byte:

         config   = (b >> 2) & 1
         low_rate = ((b >> 2) & 1) != 0

     and initialise a range decoder over `frame[1..]`.

  2. For each internal frame `f` in `0, 1, 2`, read from the SAME range decoder, in
     this exact order:

       a. LSF/LPC indices (see [mlow-lsf-lpc](../encodings/mlow-lsf-lpc.md)). The frame is voiced
          iff the decoded LSF stage-1 index equals `1`.
       b. Excitation pulses (see [mlow-excitation](../encodings/mlow-excitation.md)), over
          `SMPL_INTF_LEN = 320` samples with 4 subframes.
       c. If voiced: the pitch/LTP block (see [mlow-lsf-lpc](../encodings/mlow-lsf-lpc.md) /
          pitch). The per-40-sample-block lags MUST be reconstructed as
          `lag = clamp(block_lag * 0.5 + 32.0, .., 320.0)` (8 lags per internal
          frame), the ACB gain indices taken per subframe, and the voiced FCB gain
          index taken from the pitch block's `filt_idx` (floored at 0).
          If unvoiced: the gains block, whose decoded `gain_q` and `nrg_res` map
          directly to the synthesis params `nrgres_dbq_q14` and `fcbg_idx`.
       d. Reconstruct the NLSF vector from the LSF stage indices, `config`, the grid
          index, the stage-2 residual, and the carried `prev_nlsf`, then update
          `prev_nlsf` with the result for the next internal frame/packet.
       e. Run CELP synthesis (see [mlow-synthesis](../encodings/mlow-synthesis.md)) over
          `SMPL_INTF_LEN = 320` samples, gated on `low_rate`, into a 320-sample
          signal, and append it to the packet output.

     The decoder MUST also accumulate, across the three internal frames, the full
     list of per-40-block lags (8 per frame, 24 per packet) and the sum of the
     per-frame normalized bitrate (computed from the total pulse count and 320).

  3. After all three internal frames, the decoder MUST run the per-packet harmonic
     post-filter (see [mlow-postfilter](../encodings/mlow-postfilter.md)) ONCE over the full
     `3 * 320 = 960` sample buffer, passing the 24 accumulated per-block lags and
     the average normalized bitrate (`accumulated_sum / 3.0`). This post-filter
     introduces the codec's `SMPL_TOT_POSTFILT_DELAY = 48` sample group delay, so
     the emitted PCM is aligned at lag 0 against the reference.

  4. Each output sample MUST be clamped to `[-1.0, 1.0]`. If `output_length` is
     nonzero and differs from the produced length, the buffer MUST be resized to
     `output_length` (truncating, or zero-padding the tail).

A range-coder error flag set after the active-frame decode indicates a TOC/body
desync; a decoder SHOULD surface this (it does not change the emitted samples).

**Findings**

The decode path is `RED strip → TOC route → 3 × (LSF → pulses → pitch|gains →
reconstruct NLSF → CELP synth) → per-packet harmonic post-filter → clamp/resize`.
The synthesis is a port of the `smpl_celpdec` decoder: excitation is built in the
codec's float domain together with generated shaped noise (`gen_noise`) and run
through LPC synthesis.

In captured 1-to-1 audio the TOC internal-rate bit is 0 (16 kHz) and the low-rate
flag (`(b >> 2) & 1`) is 0, so an active 60 ms frame yields 3 × 320 = 960 samples
before the harmonic post-filter, matching `OPUS_FRAME_SAMPS`. The end-to-end
decode of a full inbound capture aligns sample-for-sample at lag 0 with the
reference `useSmpl` (real `smpl_opus`) output, correlating > 0.95 once the
per-block voiced ACB/LTP lags, the HP post-filter, and the harmonic post-filter
(which contributes the 48-sample group delay) are all in place.

The voiced/unvoiced split is driven entirely by the LSF stage-1 index (`== 1`
means voiced), which gates whether the pitch block or the gains block follows the
pulses in the bitstream. The unvoiced gains decode reads the same bits as the C
`decode_lb_unvoiced`: the Rust `gain_q` is the C `nrgres_dbq_Q14` and the Rust
`nrg_res` is the C `fcbg_idx`.

**Requires:** [`mlow`](../encodings/mlow.md), [`mlow-frame`](../encodings/mlow-frame.md), [`mlow-rangecoder`](../encodings/mlow-rangecoder.md), [`mlow-red-fec`](../encodings/mlow-red-fec.md), [`mlow-lsf-lpc`](../encodings/mlow-lsf-lpc.md), [`mlow-excitation`](../encodings/mlow-excitation.md), [`mlow-synthesis`](../encodings/mlow-synthesis.md), [`mlow-postfilter`](../encodings/mlow-postfilter.md), [`mlow-noise`](../encodings/mlow-noise.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working | pure-Rust stateful MlowDecoder; e2e decode matches the smpl_opus useSmpl reference at lag 0 |
| [`meowmeow`](../../flavors.md) | working | implements the codec/encodings stack |
| [`meowcaller`](../../flavors.md) | partial | codec modules partial; full decode orchestration in progress |

**Open questions**

- Whether the 32 kHz internal rate and the 10/20/120 ms active frame sizes ever drive the active-frame decode in live calls, or only 16 kHz / 60 ms frames occur (only the latter is seen in capture).
- Comfort-noise generation for SID/inactive frames: the decoder currently emits pure silence rather than synthesizing comfort noise from the SID descriptor.
- Whether RED redundancy beyond the main (last) frame is ever used for loss concealment, or the older frames are always discarded after de-packetization.

**References**

- [RFC 6716 — Opus](https://www.rfc-editor.org/rfc/rfc6716)

---

[in the full RFC →](../index.md#mlow-decoder) · [RFC contents](../index.md#contents)
