<!-- Hand-written narrative. CORRECTED 2026-06 from two KAT-pinned reconstructions:
     MLow is split-band CELP (not an MDCT hybrid); the MDCT path is standard Opus. -->

# MLow decode pipeline

This page records what the MLow decode path actually is, corrected by two
independent KAT-pinned reconstructions. MLow is a split-band CELP speech codec
(internally "SMPL") whose entropy layer is the CELT/Opus range coder, present
unmodified. It is not an MDCT transform codec: the MDCT DSP cluster in `wa.wasm`
belongs to the standard-Opus/CELT fallback path, which the decoder selects
separately by TOC (see [TOC routing](#toc-routing-mlow-vs-standard-opus)).

> **Confidence.** The CELP architecture and the CELT range coder are now
> corroborated (static `wasm-analysis` plus the [meowmeow](../../spec/flavors.md)
> Go reference and the [whatsapp-rust](../../spec/flavors.md) Rust port, both pinned
> to captured decode vectors): `probable` with executable backing. Per-stage
> constants below are `probable` where two sources agree, `speculative` where
> only the WASM read has them. Provenance: technique `wasm-analysis` · tools
> `warden` · flavors `meowmeow`, `whatsapp-rust` · contributors `purpshell`, `jlucaso1` ·
> source: `wacore/src/voip/mlow/` (Rust), commit
> `365daa6` (the range coder is additionally corroborated by the round-trip test
> in `impl/mlow/`). Functions cited by index.

## Correction: #1839 is not the decoder

An earlier note (and an analysis agent) called function 1839 the "MLow decode
dispatcher". Reading it disproves that: its callees are `format_wide_char_to_utf8`,
`compare_wide_string_arrays`, and `format_64bit_value_to_buffer`, and it sets a
parse error (code 18) on bad input. It references `AudioDecoderMLowImpl` typeinfo
but is configuration serialization and validation, not PCM synthesis. The KB name
and summary were corrected accordingly. The real synthesis path is the float DSP
cluster around #9013 (below). This is logged here as a worked example of the
"verify the body, not the name" rule.

## Entropy coder: the CELT range coder (verified)

MLow's entropy layer is libopus' CELT range coder (`ec_dec`), unmodified. The
functions match libopus `celt/entdec.c` constant-for-constant.

| WASM | role | decisive evidence |
| --- | --- | --- |
| #8855 `ec_dec_init` | init | `rng=128` (`1<<EC_CODE_EXTRA`), `val=127-(buf[0]>>1)`, `nbits_total=9`, `offs=1` |
| #8856 `ec_dec_normalize` | renorm | byte refill `while rng <= 0x800000` (`EC_CODE_BOT`), `rng<<=8` |
| #8858 `ec_dec_bit_logp` | binary symbol | `s=rng>>logp; ret=val<s; if(!ret) val-=s; rng=ret?s:rng-s` |
| #8859 `ec_dec_icdf` | table symbol | `ft=rng>>ftb; do{t=s;s=ft*icdf[++i]}while(val<s); rng=t-s; val-=s` |
| #8861 `ec_dec_bits` | raw bits | read from the back of the buffer (CELT front/back split) |

The initial state alone (`rng=128`, `val=127-(buf[0]>>1)`, `nbits_total=9`) is a
fingerprint of `ec_dec_init` with `EC_CODE_BITS=32, EC_SYM_BITS=8,
EC_CODE_EXTRA=7`. Callers are `audio_mdct_quantization_decode` (#8911, #8992) and
`audio_encode_frame` (#8918), i.e. an MDCT transform path.

Because this is a published coder, the reference implementation ports it exactly
and round-trip tests it against a matched CELT encoder:
[`impl/mlow/rangecoder.go`](../../../impl/mlow/rangecoder.go),
[`ec_enc.go`](../../../impl/mlow/ec_enc.go),
[`rangecoder_test.go`](../../../impl/mlow/rangecoder_test.go). This is the first
codec layer that is both recovered and verified by an executable test.

## Decode schedule and CDF tables (verified, then data-dependent)

The decoder that drives the range coder is `audio_mdct_quantization_decode`
(#8911); it calls `ec_dec_init` then a sequence of `ec_dec_bit_logp` /
`ec_dec_bits` / `ec_dec_icdf`. The start of the schedule is a fixed header
read; after that the schedule becomes data-dependent (per-band loops whose
bit counts and branch choices depend on the running entropy state), so it cannot
be transcribed as a flat list past the header. That data-dependence is the core
remaining decode work (see [reconstruction roadmap](reconstruction-roadmap.md)).

What is verified is the set of inverse-CDF (`icdf`) tables the decoder uses.
Each was confirmed twice: the address appears as an `ec_dec_icdf` argument in
#8911's body, and the bytes at that address in the static memory image are a
valid `icdf` (non-increasing, 0-terminated, `icdf[0] ~= 2^ftb`):

| WASM address | `ftb` | `icdf` bytes | role (from the schedule) |
| --- | --- | --- | --- |
| `0x112ab0` (1125040) | 2 | `2, 1, 0` | frame-init read |
| `0x111560` (1119584) | 2 | `2, 1, 0` | per-band quantization loop |
| `0x112ab3` (1125043) | 5 | `25, 23, 2, 0` | conditional mid-range parameter |
| `0x112ab7` (1125047) | 7 | `126, 124, 119, 109, 87, 41, 19, 9, 4, 2, 0` | conditional large parameter |

These are shipped and round-trip tested in
[`impl/mlow/tables.go`](../../../impl/mlow/tables.go) /
[`tables_test.go`](../../../impl/mlow/tables_test.go): encoding then decoding any
symbol of any table against the matched coder recovers it, which jointly
validates the bytes, the `ftb`, and the `ec_dec_icdf` transcription.

Extraction is reproducible: the binary uses bulk-memory passive data
segments placed by `memory.init` in `__wasm_init_memory` (#224), so there is no
static segment offset; the segment-to-address map is rebuilt from the 117
`memory.init` placements, after which any table is read by address (the
`analysis/extract_table.py` helper in the warden repo). This same tool will lift
the remaining DSP tables (e.g. the float-constant table at `1155664`) as the
data-dependent schedule is traced.

## TOC routing: MLow vs standard Opus

The decoder inspects the first payload byte (the TOC). If its top two bits are
both set (`(b & 0xC0) == 0xC0`) the frame is standard Opus/CELT and goes to
stock libopus; otherwise it is an MLow "smpl" frame and goes to the CELP
decoder. This resolves the earlier MDCT confusion: `wa.wasm`
contains a full Opus stack (which has a CELT/MDCT path), but MLow proper is the
non-MDCT CELP branch. The MDCT functions found in the WASM
(`#9086`/`#9032`/`#9013`, window table at `1155664`) belong to the standard-Opus
fallback, not to MLow.

## The CELP decode pipeline

The MLow ("SMPL") decode path is a classic split-band CELP chain, recovered from
the reconstructions (`wacore/src/voip/mlow/`) and consistent with the verified
WASM kernels:

1. **Range decode**: the CELT range coder (`ec_dec`, [verified](#entropy-coder-the-celt-range-coder-verified)).
2. **LSF / NLSF decode**: a three-way split (stage-1 VQ, an interpolation grid,
   stage-2 residual) against runtime CDF tables, then convert to LPC of
   order 16 (matches the verified Levinson-Durbin kernel #9083: stability
   clamp `k*k > 0.9995`).
3. **Long-term / pitch prediction (LTP)**: a fractional-delay adaptive codebook
   with multi-tap gains.
4. **Excitation**: a sparse algebraic pulse codebook (PVQ-like).
5. **Synthesis**: LPC synthesis filter, then a harmonic-comb postfilter
   (≈48-sample group delay), an MLow-specific stage with no MDCT.

`smpl` frames carry SID (silence/DTX), a VAD flag, the frame duration,
and per-subframe voiced flags in the TOC. RED redundancy uses a
`SplitRed` layout with 2-byte block headers. Config 0 runs at 16 kHz
(narrow-band); the `mlow_dec_cutoff_hz` field trial sets the output low-pass.

## What the reference implementation does with this

- **Implemented + tested:** the range coder (decode and a matched encoder).
- A complete, validated reference now exists in Rust
  ([whatsapp-rust](../../spec/flavors.md) `wacore/src/voip/mlow/`) and Go
  ([meowmeow](../../spec/flavors.md)), both pinned to captured decode vectors. The
  wacrg `impl/mlow/` Go reference can now follow that recovered CELP pipeline
  (LSF/NLSF -> LPC -> LTP -> algebraic pulse -> synthesis -> harmonic comb)
  rather than re-deriving it; the cross-check is the existing reconstructions.

## See also

- [index](index.md) (architecture, open questions) ·
  [function-map](function-map.md) · [methodology](methodology.md)
- [`impl/mlow/`](../../../impl/mlow/README.md): the reference implementation.
