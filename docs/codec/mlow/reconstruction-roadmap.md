<!-- Hand-written narrative: the gap analysis for a full MLow reconstruction. -->

# MLow reconstruction roadmap

This page answers one question end to end: **what would it take to fully
reconstruct MLow** from the binary, and how far along is each piece? It is the
consolidated gap analysis behind the [decode pipeline](decode-pipeline.md) and the
[reference implementation](../../../impl/mlow/README.md).

> **Provenance.** Module `wa.wasm` SHA-1 `3638a50…`. Technique `wasm-analysis` ·
> tool `warden` · contributor `purpshell` · source: commit history of
> `docs/codec/mlow/` and `impl/mlow/`. One technique, so structural claims are
> `probable` and algorithmic ones `speculative`; the range coder is additionally
> corroborated by an executable test.

## Definition of "done"

- **Primary goal:** a **decoder** that turns a received MLow payload into
  intelligible PCM. The companion neural post-filter is explicitly excluded;
  "intelligible, not bit-exact-with-companion" is the bar.
- **Secondary:** an **encoder** (mostly the mirror of decode).
- **Out of scope:** the `mlowcompanion` NN (ExecuTorch/XNNPACK), the
  `concerto::NetEq` jitter buffer / PLC (can be stubbed for offline decode), and
  congestion control.

## The leverage question, answered

A natural hope was that MLow is "just Opus", so reconstruction would reduce to
porting libopus. The binary says **partly**:

- **The entropy coder is verbatim libopus CELT** (`ec_dec`, the `entcode`/`entdec`
  range coder). Verified and implemented. This is the one free lunch.
- **Everything around it appears custom.** There are **no** CELT/Opus symbol
  strings (`celt`, `mdct`, `pvq`, `laplace`, `nlsf`, `band`, `alloc`) anywhere
  except the separate Opus codec (`wa_opus.cc`). The audio cluster that drives the
  range coder (`audio_mdct_quantization_decode` #8911, `audio_encode_frame` #8918)
  calls a bespoke transform+LPC stack: `decode_mdct_window`,
  `apply_dct_quantized_row`, `audio_subband_transform`, a second Levinson-Durbin
  (#8906), `convolve_with_symmetric_kernel`, `fft_forward_transform`.

**Conclusion:** reconstruction is *not* "configure libopus CELT". It is recovering
a custom MDCT + LPC transform codec that reuses CELT's range coder. The range
coder shortcut saves the entropy layer; the codec grammar and DSP must be RE'd.

## Component inventory

Status: **done** (recovered + implemented + tested) · **verified** (body-read,
not yet implemented) · **reported** (agent-surfaced, not body-verified) ·
**unknown**.

| # | Component | Status | WASM anchors | What full reconstruction needs |
| --- | --- | --- | --- | --- |
| 1 | RTP / payload framing | unknown | (RTP layer) | How an MLow payload sits in RTP: payload type, marker, header extensions. |
| 2 | RED depacketization | reported | `MlowRedPayloadSplitter` #11407/#11419 | Exact block layout: primary + N redundant frames, timestamp-offset and length field widths/endianness. |
| 3 | Reed-Solomon FEC | reported | `ReedSolomonCode` (22 fns), #6154/#7849 | RS params (k, n, symbol size, GF field, generator) and how a RED group maps onto shards. Agent guessed k=13/32-bit; **unverified**. |
| 4 | MLowFrame / TOC parse | reported | #4815/4819/4988/4951 | Frame header bits: mode/type field (agent: byte 120-125), length, codec byte (agent: 200-210), how subframes pack. **Verify bodies.** |
| 5 | Range coder (`ec_dec`) | **done** | #8855-8861 | Implemented + round-trip tested (`impl/mlow/rangecoder.go`). |
| 6 | **Decode schedule (bitstream grammar)** | unknown | #8911/#8992, #9013 | THE linchpin: the exact ordered sequence of `ec_dec_icdf`/`bit_logp`/`bits` calls and which CDF table each uses. This is the codec's grammar; without it the range coder decodes noise. Recoverable only by reading the decode hot path control flow. |
| 7 | Quantization / CDF tables | unknown (extractable) | data section via `i32.const` args | The icdf/CDF and codebook tables passed to the decode calls. Deterministically extractable from the data section once the decode functions name their table addresses. |
| 8 | NLSF/LSF -> LPC | reported | #9754 (+ #9752) | The LSF-to-LPC conversion (Chebyshev/poly) and the LSF codebook. |
| 9 | LPC synthesis filter | verified (kernel) | Levinson-Durbin #9083/#9082, #8906 | LPC recursion verified; the synthesis-filter application + order (agent: 16) still to confirm and implement. |
| 10 | LTP / pitch (long-term prediction) | reported | #9081, pitch helpers | Pitch-lag decode + LTP filter. Presence inferred; structure unread. |
| 11 | MDCT/DCT transform + IMDCT + window + overlap-add | reported | #9086/#9032/#9060, #8882/#8884/#8913 | The inverse transform, window table (@`1155664`), and overlap-add. Custom; not CELT's `clt_mdct_backward`. |
| 12 | Excitation / codebook | unknown | #9043, #9056-#9061 | The innovation/excitation model (algebraic pulses? VQ?). Unread. |
| 13 | Output low-pass | reported | `mlow_dec_cutoff_hz`, #5328? | A post-synthesis band-limit (the `WebRTC-MLowDecoder-lowPassCutoffFrequencyHz` field trial). |
| 14 | Decode orchestration | partial | `AudioDecoderMLowImpl`, #9013 vs #8911 | Wire the stages; resolve the **two candidate clusters** (#88xx around `audio_encode_frame`/`audio_mdct_quantization_decode` vs #90xx around #9013); pin sample rate + frame size. |
| 15 | Encoder | reported | #8918, `wa_hybrid_codec_*` #11416/#11420 | Mostly the mirror of 6-13 plus rate control / DTX / RED strength. |
| 16 | Companion NN | out of scope | `mlowcompanion_*` | Excluded by design. |
| 17 | NetEq jitter / PLC | out of scope | `concerto::NetEq*` | Stub for offline file decode. |

## Critical path to intelligible audio

The shortest path that produces sound, in dependency order:

1. **#4 MLowFrame parse** -> get one frame's coded bytes (and #2 RED to pick the
   primary frame; #3 RS only matters under loss).
2. **#6 decode schedule + #7 tables** -> the make-or-break. Read the decode hot
   path and extract the symbol order and the CDF/codebook tables it indexes.
3. **#8-#12 DSP** -> NLSF->LPC, LPC synthesis, transform/IMDCT, excitation,
   overlap-add -> PCM.
4. **#13 low-pass** -> cosmetic; skippable for a first sound.

Items 2 and 3 are ~80% of the remaining work. Item 6 is the single highest-risk
unknown: it is implicit in control flow, not named by any string.

## What may not be statically recoverable (honest limits)

- **The decode schedule (#6)** is recoverable in principle but tedious and
  error-prone from optimized lifted C; a wrong symbol order silently produces
  noise with no error. This is where a second technique (a runtime hook capturing
  one real frame's decode trace) would convert `speculative` to `confirmed` and
  de-risk the whole effort, per the [corroboration rule](../../methodology/index.md).
- **Validation.** With no decode oracle (the project decision: no live tests),
  correctness below the range coder can only be checked **structurally**
  (self-consistent enc/dec round-trips, plausible spectra), not against ground
  truth. The reference implementation marks every such stage and returns
  `ErrNotRecovered` rather than emitting unvalidated audio.

## Recommended order of attack

1. **#4 frame parse** (verify #4815/4819/4988/4951 bodies) -> `impl/mlow/frame.go`.
2. **#6 + #7**: trace the decode hot path (#8911/#9013), recover the symbol
   schedule, and extract the CDF/codebook tables from the data section. Biggest
   payoff, biggest risk.
3. **#8-#12 DSP** kernels, reusing the verified LPC recursion.
4. **#2/#3 RED + RS** (loss resilience) once a clean frame decodes.
5. **#15 encoder** last.

## See also

[decode-pipeline](decode-pipeline.md) · [function-map](function-map.md) ·
[methodology](methodology.md) · [impl/mlow](../../../impl/mlow/README.md).
