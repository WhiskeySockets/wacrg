<!-- Hand-written narrative. Findings split into "verified by direct body read" vs
     "agent-reported, pending verification". One technique => probable cap. -->

# MLow decode pipeline

This page records what the MLow **decode** path actually is, recovered by reading
the lifted bodies of the codec's DSP functions. The headline: MLow is **not** the
bare SILK-style LPC codec earlier guesses assumed. It is an **LPC + MDCT hybrid
transform codec whose entropy layer is the CELT/Opus range coder, present
unmodified**.

> **Confidence.** Still one technique (static `wasm-analysis`), so capped at
> `probable`. Below, claims are split into **verified** (I read the body and
> matched it to a known algorithm constant-for-constant) and **reported**
> (surfaced by an analysis agent, consistent with the bodies but not yet
> line-verified). Provenance: module `wa.wasm` SHA-1 `3638a50…`; technique
> `wasm-analysis` · tool `warden` · contributor `purpshell` · source: commit
> `365daa6` (the range coder is additionally corroborated by the round-trip test
> in `impl/mlow/`). Functions cited by index.

## Correction: #1839 is not the decoder

An earlier note (and an analysis agent) called function **1839** the "MLow decode
dispatcher". Reading it disproves that: its callees are `format_wide_char_to_utf8`,
`compare_wide_string_arrays`, and `format_64bit_value_to_buffer`, and it sets a
parse error (code 18) on bad input. It references `AudioDecoderMLowImpl` typeinfo
but is **configuration serialization/validation**, not PCM synthesis. The KB name
and summary were corrected accordingly. The real synthesis path is the float DSP
cluster around #9013 (below). This is logged here as a worked example of the
"verify the body, not the name" rule.

## Entropy coder: the CELT range coder (verified)

MLow's entropy layer is **libopus' CELT range coder (`ec_dec`), unmodified**. This
is the strongest result on this page: the functions match libopus
`celt/entdec.c` constant-for-constant.

| WASM | role | decisive evidence |
| --- | --- | --- |
| #8855 `ec_dec_init` | init | `rng=128` (`1<<EC_CODE_EXTRA`), `val=127-(buf[0]>>1)`, `nbits_total=9`, `offs=1` |
| #8856 `ec_dec_normalize` | renorm | byte refill `while rng <= 0x800000` (`EC_CODE_BOT`), `rng<<=8` |
| #8858 `ec_dec_bit_logp` | binary symbol | `s=rng>>logp; ret=val<s; if(!ret) val-=s; rng=ret?s:rng-s` |
| #8859 `ec_dec_icdf` | table symbol | `ft=rng>>ftb; do{t=s;s=ft*icdf[++i]}while(val<s); rng=t-s; val-=s` |
| #8861 `ec_dec_bits` | raw bits | read from the **back** of the buffer (CELT front/back split) |

The initial state alone (`rng=128`, `val=127-(buf[0]>>1)`, `nbits_total=9`) is a
fingerprint of `ec_dec_init` with `EC_CODE_BITS=32, EC_SYM_BITS=8,
EC_CODE_EXTRA=7`. Callers are `audio_mdct_quantization_decode` (#8911, #8992) and
`audio_encode_frame` (#8918), i.e. an MDCT transform path.

Because this is a published coder, the reference implementation ports it exactly
and **round-trip tests** it against a matched CELT encoder (no guessing):
[`impl/mlow/rangecoder.go`](../../../impl/mlow/rangecoder.go),
[`ec_enc.go`](../../../impl/mlow/ec_enc.go),
[`rangecoder_test.go`](../../../impl/mlow/rangecoder_test.go). This is the first
codec layer that is both recovered *and* verified by an executable test.

## DSP kernels (LPC verified; MDCT reported)

The synthesis cluster is classic transform-codec DSP:

- **Levinson-Durbin LPC — verified.** #9083 (`lpc_levinson_durbin_recurse`) is a
  double-precision Levinson-Durbin recursion: reflection-coefficient stability
  clamp `k*k > 0.9994999766349792` and the `1/(1 - k*k)` update. #9082 drives it
  iteratively. Confirms an LPC (linear-predictive / SILK-like) stage.
- **Inverse MDCT — reported.** #9086/#9032 are reported as IMDCT + windowing, and
  #9013 (the float synthesis kernel) indexes an MDCT window/scale table at data
  address `1155664` and codec state at `1379056` (both confirmed present in the
  body). The presence of both LPC and MDCT is the basis for the "hybrid" claim.
- **Excitation / overlap-add — reported.** #9043, #9056-#9061, #9060, #9065 are
  the excitation and overlap-add helpers called from #9013.

So the picture is an Opus-like split: an **LPC/SILK-style** stage and a
**CELT-style MDCT** stage sharing the CELT range coder. Whether MLow is a thin
customization of Opus or an independent codec reusing Opus components is an open
question.

## Frame parameters (reported, pending verification)

These came from an analysis agent and are **not yet line-verified**; treated as
`speculative`:

- **LPC order ~16** (a loop bound `!= 16`).
- **Frame sizes 320 / 640 / 1280 samples** (20 / 40 / 80 ms at 16 kHz).
- Output low-pass via `mlow_dec_cutoff_hz` / the
  `WebRTC-MLowDecoder-lowPassCutoffFrequencyHz` field trial.

The sample-rate discrepancy from [index](index.md#open-questions) (8 vs 16 vs
32 kHz) is unresolved; the range coder and LPC are rate-agnostic, so they do not
settle it.

## What the reference implementation does with this

- **Implemented + tested:** the range coder (decode and a matched encoder).
- **Next, in order of how well it is recovered:** the CELT-style band/MDCT
  decode that consumes the range coder, then the LPC synthesis stage, then frame
  framing. Each lands with the WASM evidence cited and returns `ErrNotRecovered`
  until its body is read, never a guess.

## See also

- [index](index.md) (architecture, open questions) ·
  [function-map](function-map.md) · [methodology](methodology.md)
- [`impl/mlow/`](../../../impl/mlow/README.md) — the reference implementation.
