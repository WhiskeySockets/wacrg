<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# MLow LSF and LPC

_Encodings · `mlow-lsf-lpc`_

_status: review · audio_

MLow carries an internal frame's spectral envelope as range-coded LSF indices, reconstructed into an order-16 quantized NLSF vector and interpolated per-subframe to LPC coefficients.

LSF coding is MLow-specific, NOT stock SILK codebook coding. Order is **16**. All
symbols are read with the cumulative-CDF primitive (`decode_cdf`, u16 cumulative
tables), not the ICDF path. Symbols are read from the range coder (see
[mlow-rangecoder](../encodings/mlow-rangecoder.md)).

**Wire read order (per internal frame).**

    1. stage-1 selector   ; 1 symbol, CDF = lsf_sel[sel]
    2. stage-1 grid        ; 1 symbol, CDF chosen by (match, stage1)
    3. stage-2 residuals   ; 16 symbols, coeff k from lsf_stage2[stage1][config][grid][k]
    4. extra               ; 1 symbol, 3-symbol static CDF lsf_extra

**Stage-1 selector.** Row index `sel`:

    sel = 0   if intf == 0          (first internal frame)
    sel = 2   if prev_stage1 != 0
    sel = 1   otherwise

`intf` is the internal-frame index (0,1,2) within the 60 ms packet; `prev_stage1`
is the stage-1 value of the previous internal frame. Decoded value is `stage1`.

**Match / predictor reset.**

    match = (intf != 0) AND (stage1 == prev_stage1)

When `match` is false, the cross-frame pitch/LTP predictor state (gain index,
filter index, lag, fractional lag) MUST be reset to -1 before decoding the rest of
the frame. `prev_stage1` MUST then be set to the current `stage1`.

**Stage-1 grid.** CDF selected as:

    match  && stage1 != 0   -> lsf_grid.match1
    match  && stage1 == 0   -> lsf_grid.match1_alt
    !match && stage1 != 0   -> lsf_grid.match0_alt
    !match && stage1 == 0   -> lsf_grid.match0

**Stage-2 residuals.** Exactly 16 symbols, coefficient `k` using CDF
`lsf_stage2[stage1][config][grid][k]`, where `config` is the MLow config (0/1). Per
coefficient, raw-symbol count `nraw = len(CDF) - 2`.

**Extra read.** One `extra` symbol from the 3-symbol static CDF `lsf_extra`. Always
fires on the standard decode path (num_subfr >= 2).

**NLSF reconstruction.** Map `(stage1, grid, stage2[16])` plus the previous internal
frame's NLSF to `qlsf[0..16]` (radians, 0..PI). The wire `grid` is the stage-1
codebook index; value 16 denotes the conditional ("cond") centroid derived from the
previous frame:

    qlsf = 2*cbhalf[grid] + we^T * qlvls(stage2)

i.e. twice the selected stage-1 half-centroid plus the weighted stage-2 levels, with
conditional prediction from the previous NLSF when the cond centroid is selected.

**LSF -> LPC interpolation.** For each of the 4 subframes interpolate between the
previous frame's NLSF (`prev`) and current `qlsf` using interpolation row 0:

    w = [0.55, 0.88, 1.0, 1.0]   (per subframe j)
    ilsf[k] = (1-w[j]) * prev[k] + w[j] * qlsf[k]   ; ilsf = qlsf when w == 1.0

On reset (no valid previous NLSF) `prev` MUST be initialized from current `qlsf`.
Each interpolated NLSF MUST be converted to monic LPC coefficients `A[0..16]`
(`A[0] = 1`) via the NLSF->A transform, then bandwidth-expanded until it forms a
stable all-pole filter (chirp factor `1 - iter*0.001` per iteration; stability bound
`|reflection| <= 0.9995`).

**Encoder side (LSF quantization).** Select wire indices so the decoder reconstructs
the same `qlsf` the encoder synthesizes with. Compute the analysis NLSF (forward
A->NLSF) from the analysis LPC, then run the LSF vector quantizer:

  - RD weights per LSF are the inverse spectral-envelope magnitude
    `1/sqrt(|A(e^jw)|^2 * scale)`, `scale = 1/min`.
  - A Mahalanobis shortlist (`VQ_temp`) over the stage-1 centroids (plus the cond
    centroid for conditional coding) selects `surv` survivors.
  - Per survivor, stage-2 residuals `qerr = wie^T*(lsf - 2*cbhalf[qi1]) / qstep`,
    rounded and per-coefficient clamped to `[min_qi, max_qi]`; an RD beam then
    refines one coefficient at a time minimizing `0.5*order*log2(werr)*RDw_adj + bits`.
  - Reconstructed LSFs MUST be spaced so consecutive distances exceed the
    per-coefficient `min_dist` table before the RD metric is evaluated.

The chosen `qi[0]` is the wire `grid` (stage-1 index, or 16 for the cond centroid);
`qi[1..16]` are the 16 stage-2 indices.

**Notes.** The selector, grid, and stage-2 CDFs are runtime-built (not static rodata), carried
as a table blob alongside the decoder; the stage-2 CDF is indexed
[stage1][config][grid][coeff]. The forward A->NLSF is the fixed-point silk_A2NLSF
transform (Q16 coefficients -> Q15 NLSF, scaled to radians).

Parent: [`mlow`](../encodings/mlow.md)  
Requires: [`mlow`](../encodings/mlow.md), [`mlow-rangecoder`](../encodings/mlow-rangecoder.md), [`mlow-frame`](../encodings/mlow-frame.md)  
Breakdown: [`mlow-decoder`](../encodings/mlow-decoder.md), [`mlow-encoder`](../encodings/mlow-encoder.md), [`mlow-excitation`](../encodings/mlow-excitation.md), [`mlow-noise`](../encodings/mlow-noise.md), [`mlow-synthesis`](../encodings/mlow-synthesis.md)

**Implemented by**
- **whatsapp-rust** — working · [commits ↗](https://github.com/oxidezap/whatsapp-rust/commits)
- **meowcaller** — partial — LSF decode/reconstruction KAT-verified; encoder-side LSF VQ not in scope · [commits ↗](https://github.com/purpshell/meowcaller/commits)

Discovered by Rajeh Taher · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/encodings/mlow-lsf-lpc.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/encodings/mlow-lsf-lpc.yaml)

**Open questions**
- The selector/grid/stage-2 CDF tables and the stage-1/stage-2 codebooks (cbhalf, we, wie, qstep, min_qi/max_qi, min_dist, means, reg_cond) are carried as opaque table blobs; their generating procedure inside the codec is not specified here.
- Whether interpolation rows other than row 0 ([0.55,0.88,1.0,1.0]) are ever signalled/used on the decode path, or only chosen encoder-side.

**References**
- [RFC 6716 — Opus (SILK NLSF/LSF background)](https://www.rfc-editor.org/rfc/rfc6716)

---

[← in the full RFC](../../../index.md#mlow-lsf-lpc)
