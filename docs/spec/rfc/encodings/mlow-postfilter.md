<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# MLow post-filters

**Category:** [Encodings](../index.md#encodings)  
**Part id:** `mlow-postfilter`

**`mlow-postfilter`** · status: draft · features: audio · since: 0.1.0

The three decoder-side enhancement filters MLow applies after range decoding: the excitation-domain harmonic comb post-filter (run before LPC synthesis), the post-synthesis HP pitch comb, and the final per-packet harmonic post-filter that mixes lag-delayed copies of the output to sharpen pitch harmonics. None alters the bitstream; each is a deterministic DSP stage a decoder MUST reproduce to obtain bit-aligned PCM.

**Normative**

MLow applies three enhancement filters during decode. They consume no bits and
carry no wire format; they are pure post-processing of decoded signal. A decoder
MUST run them in the order and with the constants below. All math is single-precision
(`f32`) computed with fast (non-strict-IEEE) arithmetic, so a strict-IEEE decoder
reproduces the output to within the i16 output quantization step (1/32768), not
bit-for-bit.

## 1. Excitation harmonic comb post-filter

Applied per subframe to the low-band excitation BEFORE LPC synthesis; its output
is ADDED back into the excitation. The filter derives a 2nd-order pitch-resonant
filter from the excitation's own 3-lag autocorrelation (NOT the pitch lag) and
resonates envelope-shaped noise through it. Subframe length `N` is 80 or 160.

Active-subframe path:

1. Compute the 3-lag autocorrelation `auto[0..2]` of the input, then
   `auto[0] += 9.999999960041972e-13`.
2. Smooth into persistent `smoothed_c[i]` with `coef = 0.4` when `N == 160`,
   else `coef = 0.16`: `smoothed_c[i] = coef*(auto[i] - smoothed_c[i]) + smoothed_c[i]`.
3. Form `local5 = auto[0] * 0.1224999949336052 / smoothed_c[0]` and the scaled
   vector `{local5*smoothed_c[0], 2*local5*smoothed_c[1], 2*local5*smoothed_c[2]}`
   (lags 1 and 2 doubled).
4. Project the 3-vector through the fixed `G_PITCH` 3x16 decorrelation basis
   (row 0 = constant 0.25; rows 1,2 cosine bases, values below). With
   `proj[j] = sum_r scaled[r]*G_PITCH[r][j]`, `peak = max_j proj[j]`,
   `scale = 1.5*peak`, set `refl[i] = scale - proj[i]`, then recover comb
   coefficients `comb_c[r] = sum_i G_PITCH[r][i]*refl[i]`.
5. Fill `N` samples of LCG noise (constants below), seed `pitch_gain` from
   `env_state` on the first call, RMS-envelope-smooth the input with coef `0.95`,
   and multiply the noise by the resulting envelope.
6. Normalize: `local5 /= (sum(noise^2) + 9.999999960041972e-13)`, then
   `comb_c[i] *= local5`.

Inactive-subframe path resets `smoothed_c` and the LCG state and derives a single
scalar gain from the band-energy ratio; it does not build comb coefficients.

Resonator: if `comb_c[0] >= 0`, add `1.0000000031710769e-30`, run the
2-iteration Levinson-style solve (returns reflection terms `r5`, `r8`, `denom`).
On success `g = sqrt(comb_c[0]/denom)` and the resonator FIR coefficients are
`{g, r8*g, r5*g}`; on failure `{sqrt(comb_c[0]), 0, 0}`; if `comb_c[0] < 0` the
resonator is zeroed. Run the 3-tap resonator FIR over the env-shaped noise, then
the static de-emphasis FIR `{0.25, -0.49599999, 0.25}` to produce the additive
output. A trailing AR1/MA1 biquad (corner derived from the band energy and the
sigmoid trailing-pole `g5 = sigmoid(0.2*(nrgEnv[1]-nrgEnv[0]+1e-30) - 3)`) is
added UNLESS the subframe is active with `call_count > 1`.

LCG noise fill: `s = 196314165*s + 907633515` (wrapping i32), output
`s * 8.100000115085493e-10`, emitting the byte-shifted views `s<<8`, `s<<16`,
`s<<24` in the 4-wide block; `state` persists across calls.

`G_PITCH` rows (16 columns each):

    row0: 0.25 x16
    row1: 0.24879618 0.23923509 0.22048031 0.19325261 0.15859832 0.11784916
          0.07257116 0.02450428 -0.02450431 -0.07257118 -0.11784921 -0.15859832
          -0.19325262 -0.22048034 -0.23923509 -0.24879618
    row2: 0.24519631 0.20786740 0.13889255 0.04877256 -0.04877258 -0.13889259
          -0.20786741 -0.24519633 -0.24519631 -0.20786738 -0.13889250 -0.04877260
          0.04877260 0.13889261 0.20786740 0.24519633

## 2. HP (pitch) post-filter

Applied to one frame (`FRAME_LEN = 320`) of post-LPC-synthesis output. Structure:

    de-emphasis (AR1 leaky integrator, coef {1, -0.995})
      -> ARMA2 comb (MA2 numerator, AR2 denominator)
      -> companion pre-emphasis (MA1 differentiator, coef {1, -0.995})

The comb keys on the frame's average pitch lag `lag = sum(l^2)/sum(l)` over the
subframe lags (0 -> unvoiced). The ARMA2 biquad is built by `smpl_calc_hp_coefs`
with `f = 1/lag` for the voiced curve, or `f = 50/16000` (50 Hz corner) when
`lag <= 0`:

    cos_approx(x) = 1 - 0.5*x^2
    coef_ma = { 1, -2*cos_approx(2*pi*maf*f), 1 }
    far = arf[0]*f + arf[1]*f^2
    rar = arr[0]*f + arr[1]*f^2
    coef_ar = { 1, -2*cos_approx(2*pi*far)*(1+rar), 1 + (2*rar + rar^2) }
    sc = (1 - coef_ar[1] + coef_ar[2]) / (1 - coef_ma[1] + coef_ma[2])
    coef_ma *= sc                                   ; unity DC gain

The AR denominator is a resonance at angle `2*pi*far` with radius `1+rar`; `rar`
is negative for a stable pole. Voiced pitch curve: `maf = 0.1`,
`arf = {0.608057355, 0.070939485}`, `arr = {-2.187380512, 2.291030664}`.
Default curve: `maf = 0.1`, `arf = {0.728508218, 0.476039848}`,
`arr = {-4.363803713, 8.441854006}`.

When the lag changes such that `lag > 1.25*lag_old` or `1.25*lag < lag_old`, the
decoder MUST run the OLD coefficients and the NEW coefficients over the frame and
overlap-add with the `cos(omega)^2` down-ramp table (`HP_POSTF_TRANSITION_SPEED = 2`,
`d_omega = pi/(2*(FRAME_LEN+1))`, omega accumulated by repeated addition) before
the companion pre-emphasis. `lag_old < 0` marks a fresh/reset filter.

## 3. Harmonic post-filter

The final per-packet stage; runs on the full low-band output after the HP filter.
It enhances pitch harmonics by mixing `x[-lag] + x[+lag]`, low-pass filtered by a
lag-dependent kernel, and introduces the codec's total group delay
`SMPL_TOT_POSTFILT_DELAY = 48` samples (8 feedback + 40 lag-subframe). Constants:

    FRAME_LEN = 320            LAG_SUBFR_LEN = 40       FB_DELAY = 8
    MIN_PITCH_LAG = 32         MAX_PITCH_LAG = 320      MAXPITCH_LEN = 320
    FB_STRENGTH = 0.4734       STRENGTH = 0.6438        CUTOFF_HZ = 4000
    NHARM_CUTOFF = 6.3         REDUCTION_FAC = 0.0579   LP_FILT_RES = 2500
    PITCH_NUM_SUBFRAMES = 8

The filter operates per 40-sample lag block. The packet is appended to a persistent
StateComb buffer at offset `MAX_PITCH_LAG + HARM_DELAY`; reads index back into
history. The per-packet feedback strength is `fb_strength = 1 - FB_STRENGTH*normalized_bitrate`.
For a block with `lag > 0`:

    y_harm[i] = comb[x+i-lag] + comb[x+i+lag]        ; (lookforward-clamped at packet edge)
    xy = dot(comb[x..], y_harm)
    if xy > 0:
      xx = nrg(comb[x..], L);  yy = 0.25*nrg(y_harm, L)
      strength = 0.5*xy / max(yy, xx)
      high_lag_reduction = 1 - REDUCTION_FAC*((lag-MIN_PITCH_LAG)/(MAX_PITCH_LAG-MIN_PITCH_LAG))
      strength *= high_lag_reduction * STRENGTH
      y_harm *= 0.5*strength
      diff = y_harm - strength*comb[x..]
      lpcoefs = lp_filter(lag) * fb_strength            ; 17-tap symmetric kernel
      y_harm = MA17(diff) + comb[x - FB_DELAY ..]       ; 48-delayed base, recursive

When `xy <= 0` (or `lag <= 0`) the block copies the 48-delayed base signal; if the
previous block filtered, the first `2*FB_DELAY` samples carry the previous kernel's
zero-input response. The per-bucket LP kernel is built by `create_lp_filter` from a
cosine window `filt_win[i] = cos(omega)/(i+1)` (`omega` stepping `0.5*pi/(FB_DELAY+1)`),
cutoff `omega_c = min(omega0*NHARM_CUTOFF, CUTOFF_HZ/16000*pi)` with `omega0 = 2*pi/lag`,
scaled to unity sum; the bucket index is `LP_FILT_RES/max(lag+30,80) - LP_FILT_RES/MAX_PITCH_LAG`.
After processing, StateComb is shifted left by the packet length. The block's lag for
iteration `k` is `round(lags[k])`; `prev_lag` carries across packets.

**Findings**

The three filters are distinct stages. The excitation comb resonates noise shaped by
the excitation's own short-lag autocorrelation. The HP and harmonic post-filters are
organized as the `smpl_postfilter_util`, `smpl_calc_hp_coefs`, and
`smpl_harm_postfilter` stages. Because the codec uses fast (non-strict-IEEE) `f32`
arithmetic, recursive accumulations through the near-unit-circle pitch poles can drift
up to ~1.5e-5 from strict IEEE arithmetic; this is below the i16 LSB and therefore
identical once written to the 16-bit PCM the codec emits. The single larger residual is
the first 48 samples of a silence packet immediately following a voiced packet (the
comb's zero-input response under the prior frame's coefficients), bounded well under
audibility.

**Requires:** [`mlow`](../encodings/mlow.md), [`mlow-excitation`](../encodings/mlow-excitation.md), [`mlow-synthesis`](../encodings/mlow-synthesis.md), [`mlow-frame`](../encodings/mlow-frame.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working | all three filters ported and validated against the live WASM decoder and the C decoder dumps |
| [`meowmeow`](../../flavors.md) | working | codec post-filter stage |
| [`meowcaller`](../../flavors.md) | partial | encodings codec modules are partial |

**Open questions**

- The excitation comb carries a single unresolved 8/7 output scalar; its exact value is not yet pinned down.
- Whether the excitation-comb subframe length selection (N in {80,160}) is fully determined by frame size or also depends on bandwidth mode.

**References**

- [MLow: WhatsApp's low-bitrate speech codec (engineering blog)](https://engineering.fb.com/2024/06/13/web/mlow-metas-low-bitrate-audio-codec/)

---

[in the full RFC →](../index.md#mlow-postfilter) · [RFC contents](../index.md#contents)
