<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# MLow voice activity detection

_Encodings · `mlow-vad`_

`ENC-15` · _status: draft · audio_

Fixed-point SILK VAD over a four-band allpass filterbank that produces a per-internal-frame speech-activity probability and a packet-level coded_as_active_voice flag.

Run the VAD on the raw int16 input PCM, **before** any encoder high-pass
stage, at 16 kHz. Internal frame = 320 samples (20 ms). A media packet = 60 ms
= 3 internal frames (960 samples).

Persistent state across packets: three two-element allpass-filterbank states,
per-band carried subframe energy (`xnrg_subfr`), four per-band noise levels
and their reciprocals, per-band noise-level bias, frame counter, high-pass
filter state, DTX hangover counter.

Default tuning: `noise_lvl_update_speed`, `non_binariness`,
`highpass_sharpness` all 0.

## Per-internal-frame speech_activity_Q8 (range 0..=255, reported /256)

**1. Four-band split** (`ana_filt_bank_1`) into 0–1, 1–2, 2–4, 4–8 kHz via
three cascaded first-order allpass splits:
- 0–8 kHz → 0–4 (low) + 4–8 (high);
- 0–4 → 0–2 + 2–4;
- 0–2 → 0–1 + 1–2.

Coefficients: `A_FB1_20 = 3894 << 1`, `A_FB1_21 = -29322`. Even-indexed input
samples go through the `A_FB1_21` branch (`x = SMLAWB(y, y, A_FB1_21)`),
odd-indexed through `A_FB1_20` (`x = SMULWB(y, A_FB1_20)`). Low output =
`RSHIFT_ROUND(out_2 + out_1, 11)`, high output = `RSHIFT_ROUND(out_2 - out_1, 11)`,
both saturated to int16. Each split carries its own two-element state.

**2. Lowest-band high-pass.** First-order ARMA (zero at DC, −3 dB @ 66 Hz) on
the lowest band: `a_neg_Q16 = 53084` (scaled by `(100 - highpass_sharpness)/100`),
`b_Q16 = (65536 + a_neg_Q16) / 2`, carrying `hp_state`.

**3. Per-band energy.** Sum over four internal subframes; each sample
right-shifted by 3 before squaring (`SMLABB`), accumulated with saturating
positive adds. Carry the last subframe's energy of each band into the next
frame (`xnrg_subfr`); running total adds the final subframe's energy at half
weight (`sum_squared >> 1`).

**4. Noise-level update** (`GetNoiseLevels`), before SNR:
- smoothing coef `VAD_NOISE_LEVEL_SMOOTH_COEF_Q16 = 1024`, reduced to `>> 3`
  when band energy > `8 * nl`, full when < `nl`, interpolated between;
- while `counter < 1000`, floor coef at `min_coef = INT16_MAX / ((counter >> 4) + 1)`
  and increment `counter`;
- bias each band energy by `noise_level_bias[b]`; clamp `nl[b]` to ≤ `0x00FF_FFFF`.

Init: `bias[b] = max(VAD_NOISE_LEVELS_BIAS / (b+1), 1)` with
`VAD_NOISE_LEVELS_BIAS = 50`; `nl[b] = 100 * bias[b]`;
`inv_nl[b] = INT32_MAX / nl[b]`; `counter = 15`.

**5. SNR and activity.** Per band, speech energy = `xnrg[b] - nl[b]`. For
positive speech energy: form a Q8 ratio, convert to Q7 SNR via `lin2log` minus
`8 * 128`, accumulate squared SNR, weight a tilt accumulator by
`TILT_WEIGHTS = [30000, 6000, -12000, -12000]`. Square-root the mean squared
SNR (`SQRT_APPROX`), scale by 3 → `p_SNR_dB_Q7`. Then:

    sa_Q15 = sigm_Q15(SMULWB(vad_snr_factor_Q16, p_SNR_dB_Q7) - VAD_NEGATIVE_OFFSET_Q5)
    speech_activity_Q8 = min(sa_Q15 >> 7, 255)

with `VAD_SNR_FACTOR_Q16 = 45000` (scaled by `(150 - non_binariness)/150`) and
`VAD_NEGATIVE_OFFSET_Q5 = 128`.

This path MUST be bit-exact with reference fixed-point SILK
`smpl_VAD_GetSA_Q8_c`; use SILK fixed-point primitives (`SMULWB`, `SMLAWB`,
`SMULWW`, `SMULBB`, `SMLABB`, saturating adds, `lin2log`, `sqrt_approx`,
`sigm_Q15`, `RSHIFT_ROUND`).

## Packet-level activity and DTX hangover

Per 60 ms packet, classify each of the 3 internal frames as `Active` when
`speech_activity_Q8 > SPEECH_ACTIVITY_DTX_THRES_Q8` (= `round(0.05*256)` = 12),
else `Inactive`, then apply hangover:
- `Active` frame: reset `remaining_dtx_hangover` to `hangover_ms` (default 60);
- non-`Active` frame while `remaining_dtx_hangover > 0`: reclassify as
  `Hangover`, decrement by `PACKET_MS / FRAMES_PER_PACKET` (= 60/3 = 20).

Set `coded_as_active_voice` true if any frame is `Active` or `Hangover`, false
only if all three are `Inactive`. Use this flag for the DTX / comfort-noise
decision; use per-frame `speech_activity` for bitrate control and
voiced/unvoiced classification.

This reflects the `activity == NO_DECISION` path; the input-tilt value from the
SNR pass is not consumed downstream in this configuration.

**Notes.** Per-frame `speech_activity` and packet `coded_as_active_voice` are validated
bit-exactly against reference libopus `smpl_VAD_GetSA_Q8_c` (enc_dump) over
packets where carried noise-level state remains bit-exact.

Parent: [`mlow`](../encodings/mlow.md)  
Requires: [`mlow`](../encodings/mlow.md), [`mlow-frame`](../encodings/mlow-frame.md)  
Breakdown: [`mlow-encoder`](../encodings/mlow-encoder.md), [`mlow-noise`](../encodings/mlow-noise.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [history ↗](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/mlow/smpl_vad.rs) · [blame ↗](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/mlow/smpl_vad.rs) · commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `meowcaller` | partial | — | encoding codec modules are partial |

**Annotation** `wacrg:ENC-15` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Rajeh Taher · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/encodings/mlow-vad.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/encodings/mlow-vad.yaml)

**Open questions**
- Whether non-default VAD tuning (noise_lvl_update_speed, non_binariness, highpass_sharpness) is ever negotiated on the wire, or always left at 0.
- How the per-frame speech_activity is quantised into the bitrate controller and the voiced/unvoiced classifier downstream of the VAD.
- Whether the input_tilt_Q15 value is consumed by any other encoder configuration.

**References**
- [RFC 6716 — Definition of the Opus Audio Codec (SILK VAD)](https://www.rfc-editor.org/rfc/rfc6716)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[← in the full spec](../../index.md#mlow-vad)
