<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# MLow CELP synthesis

_Encodings · `mlow-synthesis`_

_status: draft · audio_

Synthesize one MLow 20 ms internal frame from its decoded parameters into excitation and run the order-16 CELP synthesis filter to produce 16 kHz PCM.

Each 20 ms internal frame is four 80-sample (5 ms) subframes at 16 kHz; LPC
order is 16. Per subframe, in order: LPC interpolation, FCB pulse excitation,
ACB/LTP addition (voiced), residual-energy floor decode + shaped-noise
addition, order-16 AR synthesis filter. All arithmetic is single-precision
float; NLSF→LPC polynomial recursions accumulate in double precision.

## Per-subframe LPC interpolation

The decoder reconstructs one order-16 NLSF vector per frame (see
[mlow-lsf-lpc](../encodings/mlow-lsf-lpc.md)). It MUST interpolate, per subframe `sf`, between
the previous frame's final interpolated NLSF (`prev`) and this frame's NLSF
(`lsf`) using `f = interp[idx][sf]`:

    ilsf[k] = prev[k] * (1 - f) + lsf[k] * f     (f != 1.0)
    ilsf    = lsf                                 (f == 1.0)

The interpolation tables (4 factors each, selected by a 1-bit index) are:

    idx 0: [0.55, 0.88, 1.00, 1.00]
    idx 1: [0.30, 0.65, 0.95, 1.00]

If a subframe's factor equals the previous subframe's factor, the decoder MAY
reuse the previous subframe's LPC coefficients. If `prev` is uninitialised
(its last element is exactly 0.0), it MUST be seeded from `lsf` before
interpolation. After the four subframes, `prev` MUST be set to the last
interpolated NLSF (`ilsf` of subframe 3) for the next frame.

Each per-subframe interpolated NLSF MUST be converted to LPC coefficients
`a[0..16]` with the NLSF→LPC procedure: build the order/2 sum and difference
polynomials from the cosines of the NLSF angles and combine them so that
`a[0] = 1.0` and

    a[k+1]       = 0.5 * (P[k+1] + P[k] + Q[k+1] - Q[k])
    a[order-k]   = 0.5 * (P[k+1] + P[k] - Q[k+1] + Q[k])     for k in 0..8

where `P`/`Q` are the parity-0/parity-1 polynomials of the NLSF cosines.

## Fixed-codebook (FCB) excitation

The decoder MUST scale the sparse signed FCB pulses (320 positions per frame;
see [mlow-excitation](../encodings/mlow-excitation.md)) by a per-subframe fixed-codebook gain:

    res[pos] = pulses[pos] * fcbgain[ fcbg_idx[sf] ]     for pos in subframe sf

Two gain magnitude tables MUST be used, selected by whether the frame is voiced:

    voiced (34 entries):    fcbgain_v[i]  = 10 ^ (0.05 * (i*3.0 + (-100.0)))
    unvoiced (91 entries):  fcbgain_uv[i] = 10 ^ (0.05 * (i*1.0 + ( -90.0)))

i.e. voiced gains step 3 dB from -100 dB, unvoiced gains step 1 dB from -90 dB.

## Adaptive-codebook (ACB / LTP) contribution — voiced only

For voiced frames the decoder MUST add the ACB (long-term prediction)
contribution into the residual before noise and synthesis. Each 80-sample
subframe carries two 40-sample lag sub-blocks (`lags_per_subframe == 2`); each
block lag = `intLagQ6*0.5 + 32`, clamped to a maximum of 320.

The decoder maintains an ACB state buffer of length
`subfrlen + 2*MAX_PITCH_LAG + LTP_INTERPOL_DELAY` = `80 + 640 + 8 = 728`
samples. For each 40-sample sub-block it MUST build a two-component basis from
the pitch-extended excitation history:

- **Integer lag** (`floor(lag) == lag`): copy `state[p+i] = state[p+i-lag]`;
  `basis0[i] = state[p+i]`; `basis1[i] = state[p+i-lag-1] + state[p+i-lag+1]`.
- **Fractional lag**: interpolate the history with the 16-tap symmetric kernel

      K = [-6.3925986e-6, 0.00011064114, -0.0009153038, 0.00484772,
           -0.018698348, 0.05759091, -0.15997477, 0.6170455,
            0.61704546, -0.15997475, 0.057590906, -0.018698348,
            0.00484772, -0.0009153038, 0.000110641144, -6.392598e-6]

  to produce `basis0`, and form `basis1[i] = state[p+i-1] + state[p+i+1]`
  (with the kernel-interpolated end taps at i=0 and i=39).

The two-component ACB gain MUST be dequantized from the per-subframe ACB gain
index against the high-rate (or, when the low-rate TOC bit is set, low-rate)
Q14 gain codebook, then a high-boost MUST be applied before synthesis:

    high_boost = 0.35 + (0.18 - 0.35) * normalized_bitrate
    f0 = g[0] + 2*g[1]
    f1 = g[0] - g[1]
    f1 *= min(|f1| + high_boost, |f0|) / (|f1| + 1e-12)
    g[0] = (f0 + 2*f1) / 3
    g[1] = (f0 - f1) / 3

The ACB signal `acb[i] = g[0]*basis0[i] + g[1]*basis1[i]` MUST be added into the
subframe residual. When the low-rate path is active the decoder MUST also apply
pitch sharpening to the residual before building the basis:
`res[i] += res[i-lag] * 0.9881` for `i >= lag`.

After processing each subframe the decoder MUST update the ACB state by shifting
it left by `subfrlen` (80) samples and appending the subframe's (post-ACB)
excitation. For unvoiced frames the ACB contribution is omitted but the state
MUST still be updated with the excitation.

## Residual-energy floor and shaped noise

The unvoiced excitation level is the per-subframe quantized residual-energy
floor `nrgres_dbq_Q14` (an unvoiced frame's wire "gain" block IS this
quantizer layout; see [mlow-noise](../encodings/mlow-noise.md)). The decoder MUST decode this
floor to a linear residual energy and add environment-shaped pseudo-random
noise into the residual after the ACB step and before LPC synthesis.

The floor MUST be reconstructed as a frame-mean scalar plus a 4-vector shape
codebook entry:

    frame_dbq_Q14 = frame_qi * 16686 + (-85) * 2^14
    nrgres_dbq_Q14[sf] = frame_dbq_Q14 + shape_cb_Q10[shape_qi][sf] * 16

where `16686` is the 4-subframe dB step (Q14), `-85` dB is the residual-energy
floor minimum (the maximum is 0 dB), and `shape_cb_Q10` is the 98-vector ×
4-subframe Q10 shape codebook. The dB-domain residual energy used by the
quantizer is `10*log10(nrg/subfrlen + 3.1622776e-9)` clamped to a 0 dB ceiling.

## Order-16 AR synthesis filter

The decoder MUST run the order-16 all-pole filter over the combined residual
(FCB + ACB + noise), per subframe, with the interpolated LPC coefficients `a`
(`a[0] == 1.0`):

    y[n] = res[n] - sum_{i=1..16} a[i] * y[n-i]

Synthesis MUST flow contiguously across subframes and across frames: the filter
state is the previous 16 output samples, carried into the next subframe and the
next frame. The 320 output samples of the frame are the synthesis-filter output.

After the four subframes, the decoder applies the post-LPC pitch-harmonic HP
post-filter to the 320-sample frame (see [mlow-postfilter](../encodings/mlow-postfilter.md));
its comb lag is the energy-weighted mean of the eight per-40-block pitch lags
(0 for unvoiced).

**Notes.** Output is float in [-1, 1]. `normalized_bitrate` (ACB high-boost) is a
function of the frame's total pulse count and the 16 kHz frame length.
Residual-energy reconstruction is deterministic: frame index 0 with
`frame_qi = 0`, `shape_qi = 8` yields
`nrgres_dbq_Q14 = [-1390064, -1392336, -1394000, -1394176]`.

Parent: [`mlow`](../encodings/mlow.md)  
Requires: [`mlow-lsf-lpc`](../encodings/mlow-lsf-lpc.md), [`mlow-excitation`](../encodings/mlow-excitation.md), [`mlow-noise`](../encodings/mlow-noise.md), [`mlow-postfilter`](../encodings/mlow-postfilter.md), [`mlow-frame`](../encodings/mlow-frame.md)  
Breakdown: [`mlow-decoder`](../encodings/mlow-decoder.md), [`mlow-excitation`](../encodings/mlow-excitation.md), [`mlow-noise`](../encodings/mlow-noise.md), [`mlow-postfilter`](../encodings/mlow-postfilter.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [commits ↗](https://github.com/oxidezap/whatsapp-rust/commits) | — |
| `meowcaller` | partial | [commits ↗](https://github.com/purpshell/meowcaller/commits) | CELP synth in progress; excitation/LPC modules partially wired |

Discovered by Rajeh Taher · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/encodings/mlow-synthesis.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/encodings/mlow-synthesis.yaml)

**Open questions**
- Whether the low-rate ACB gain codebook (vs high-rate) is exercised on production streams.
- The exact env-shaping parameters feeding the per-subframe excitation comb post-filter remain unconfirmed.

**References**
- [RFC 6716 — Opus (CELT range coder reused by MLow)](https://www.rfc-editor.org/rfc/rfc6716)

---

[← in the full RFC](../../../index.md#mlow-synthesis)
