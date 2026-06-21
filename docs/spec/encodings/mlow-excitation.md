<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# MLow CELP excitation

_Encodings - `mlow-excitation`_

`ENC-10` - _status: draft - audio_

Decode the range-coded CELP excitation of one MLow internal frame: per-subframe pulse counts and positions/signs, plus the gains block (unvoiced) or pitch/LTP block (voiced).

Decode the excitation of one internal frame (320 samples at 16 kHz, `p3 = 4`
subframes) from the range coder immediately after the LSF/LPC parameters
([mlow-lsf-lpc](../encodings/mlow-lsf-lpc.md)) and before synthesis
([mlow-synthesis](../encodings/mlow-synthesis.md)). All reads use the Opus/CELT range coder
([mlow-rangecoder](../encodings/mlow-rangecoder.md)): CDF symbols from the front, raw uniform
bits from the back.

The LSF stage-1 selector `s1` selects the mode (mutually exclusive per frame):
`s1 == 1` (voiced) MUST decode the pitch/LTP block; `s1 == 0` (unvoiced) MUST
decode the gains block.

## Pulses (algebraic codebook)

Establish the frame pulse budget. Let `config` be the band/config flag (`p6`;
`0` = narrowband) and `idx = p4 + s1` (`p4` = regular-frame flag). Look up:

    SMPL_PULSE_COUNT_BYTE = [80, 160, 160, 16, 32, 32, 0, 0]   ; index = config*3 + idx

Then `frame_budget = budget_byte * p2 / 320`, `subfr_budget = frame_budget / p3`.

**Total pulse count.** For `config != 0`, read the total with a config-indexed
CDF. For `config == 0`, draw the total from a triangular prior over
`[0, frame_budget]`: with `L = frame_budget`,

    T(k) = ( (k+2)*(L+1) - ((k-1)*(k+131070) >> 1) ) & 0xffff

`ft = max(T(L), 1)`. Read `val = range_decode(ft)`, scan `k = 0,1,2,...` up to
`frame_budget`, select the first `k` with `T(k-1) <= val < T(k)`, and finalise
the symbol over that interval. Result = total pulse count.

**Split.** With `p3 == 4`, split the total into four per-subframe counts by two
binary-split levels. Top level: read a bias-corrected CDF (when the constrained
interval is non-empty) for the first-half sum. Then split each half with
`smpl_split`: for a half carrying `count` pulses over `granularity` positions,
`min_split = max(count - granularity, 0)`, `lo = min(count, granularity)`; when
`min_split < lo` read a CDF symbol over `lo - min_split + 2` entries and add to
`min_split`, else count = `min_split`. Four results = `subfr[0..4]`.

**Positions and magnitudes.** For each subframe with `cnt > 0`, read run-length
pulse positions over the `p2/p3` positions. Repeatedly read a position-delta CDF
of length `pos + 1` (remaining positions). A non-zero delta (or the subframe's
first read) starts a new magnitude-1 pulse at the advanced position; a zero
delta on a subsequent read increments the current pulse's magnitude (stacked).

**Signs.** After all positions, read one sign bit per pulse position as raw
uniform bits, batched at most 15 bits per read. Sign is `+1` when set, `-1`
otherwise, applied to that position's magnitude. Scatter signed magnitudes into
the excitation vector at their sample positions; all others are 0.

## Gains (unvoiced frames)

Read a main log-gain (CDF, 85 entries) and a delta log-gain (CDF, 99 entries),
then reconstruct per-subframe quantized log-gain:

    base = gain_main * gain_scale[cfg] - 0x154000
    gain_q[sf] = base + (gain_cb[sf + p3*gain_delta] << 4)

`gain_scale` and `gain_cb` are config-selected tables. For each subframe with
`cnt > 0`, read an energy-residual symbol from a bucketed CDF (92 entries):
bucket = `min(cnt/10, 3)` (i.e. `3` for `cnt >= 30`); the CDF base is shifted by
`-2 * min(g, 0)` where `g = clamp((gain_q[sf] + 8192) >> 14, >= -85)`. Subframes
with no pulses produce no read and residual 0.

## Pitch / LTP (voiced frames)

Decode in order: LTP gains-and-filters, then the pitch lag.

**LTP gains and filters.** For each of `p3` subframes, read a gain index from a
17-entry CDF whose row is selected by the previous subframe's gain index (decoder
state). Using a config-selected gain-weight table, the running accumulator adds
`w0 + 2*w2` per subframe; `avg_gain = gain_accum / p3` is retained for
fractional-lag selection. For each subframe with pulses, read a 35-entry filter
index: from the base CDF when no previous filter index exists (state `== -1`),
else from a CDF row offset by the previous filter index. Gain and filter indices
update decoder state.

**Lag.** A pitch-configuration block supplies the contour count, lag CDF, contour
map, fractional-lag table, and delta CDF. Read the primary lag absolutely (CDF
over `num_contours + 1`) when no previous lag exists, else as a delta: a 10-entry
delta CDF selects an interval `[lo, hi]`, and lag = `lo + symbol` read from the
lag CDF over `hi - lo + 2` entries. Search the contour map for `i` where
`contour_map[i] == lag + 1`; if none or out of range, the pitch block ends.

From the selected contour, read a contour base lag. Unless a previous lag exists
with `-1 <= (base_lag - prev_lag) < 3`, read a 64-symbol fine lag and combine as
`cur_lag = (base_lag << 6) + fine` (Q6, 1/64-sample, first contour segment). For
each remaining segment, read a 65-entry fractional CDF (segment selected by
`avg_gain`: `0` for `< 10007`, `1` for `< 14085`, else `2`) and accumulate into
the running Q6 lag. Replicate each segment's Q6 lag across the contour-defined
number of 40-sample blocks to produce per-block pitch lags
(`lag = block_lag * 0.5 + SMPL_MIN_PITCH_LAG`). Decoder state MUST retain the
previous gain index, filter index, integer lag, and fractional lag.

Parent: [`mlow`](../encodings/mlow.md)  
Requires: [`mlow`](../encodings/mlow.md), [`mlow-rangecoder`](../encodings/mlow-rangecoder.md), [`mlow-lsf-lpc`](../encodings/mlow-lsf-lpc.md), [`mlow-synthesis`](../encodings/mlow-synthesis.md)  
Breakdown: [`mlow-decoder`](../encodings/mlow-decoder.md), [`mlow-noise`](../encodings/mlow-noise.md), [`mlow-postfilter`](../encodings/mlow-postfilter.md), [`mlow-synthesis`](../encodings/mlow-synthesis.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [:material-github: history](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/mlow/smpl_pulse.rs) - [:material-github: blame](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/mlow/smpl_pulse.rs) - commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `meowcaller` | partial | [:material-github: history](https://github.com/purpshell/meowcaller/commits/45efc4c352b60517541977a4cb6219f7b57bb7d4/mlow/pulse.go) - [:material-github: blame](https://github.com/purpshell/meowcaller/blame/45efc4c352b60517541977a4cb6219f7b57bb7d4/mlow/pulse.go) - commits [`45efc4c`](https://github.com/purpshell/meowcaller/commit/45efc4c352b60517541977a4cb6219f7b57bb7d4) [`011af47`](https://github.com/purpshell/meowcaller/commit/011af47d049bb023c6692282176a13079787eff7) [`2d36efc`](https://github.com/purpshell/meowcaller/commit/2d36efc56b8aee88ec14affa776accb9dbd98eab) [`81bebc0`](https://github.com/purpshell/meowcaller/commit/81bebc080070b23b8dd620ad4ffc86004f54a115) [`a239706`](https://github.com/purpshell/meowcaller/commit/a2397064c51db24e7349b94d832e05614328b723) [`8e4f5c8`](https://github.com/purpshell/meowcaller/commit/8e4f5c80e9818e26b82b11e28e5773d99da3cdb8) [`d8dfcac`](https://github.com/purpshell/meowcaller/commit/d8dfcacc9e53f5fef3594de275c46ba6d8957e64) | excitation decode KAT-verified against the Go reference; CELP synthesis wiring in progress |

**Annotation** `wacrg:ENC-10` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

**Contributors** [![Rajeh Taher](https://github.com/purpshell.png?size=20) Rajeh Taher](../contributors.md#purpshell) (wrote initial spec)

[:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/encodings/mlow-excitation.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/encodings/mlow-excitation.yaml)

**Open questions**
- Wideband (config != 0) total-pulse-count CDF table location is referenced but the active captures are all narrowband, so the WB path is not exercised by vectors.
- Exact contents and addressing of the config-selected gain-scale and gain-codebook tables beyond the heap window reproduced for the active config.
- Whether the gains block is reached on any real (unvoiced) capture frame; current vectors force-run it on voiced decoder state to validate the arithmetic.

**References**
- [RFC 6716 — Opus (range coder)](https://www.rfc-editor.org/rfc/rfc6716)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#mlow-excitation)
