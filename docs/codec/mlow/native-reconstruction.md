<!-- Hand-written narrative. An independent, runtime-anchored reconstruction of the
     MLow decoder from the NATIVE (macOS, ARM64) WhatsApp binary, with a frida-captured
     decode oracle. This is the second technique the WASM-only docs asked for. -->

# MLow: independent native reconstruction (with a decode oracle)

The other MLow pages on this site recover the codec from one technique — static
[`wasm-analysis`](../../techniques/wasm-analysis.md) of the Web engine `wa.wasm` —
and repeatedly flag the same two limits: there is **no decode oracle** ("claims
can be checked only structurally… until a runtime technique corroborates"), and
"promoting any of this to `confirmed` needs a second, independent technique: a
Frida hook or a live media capture."

This page is that second technique. It reconstructs MLow from the **native**
WhatsApp client (macOS, ARM64 `SharedModules`) using
[`frida-hooking`](../../techniques/frida-hooking.md) of the live decoder plus
static reading of the native binary in [Ghidra](https://ghidra-sre.org/), and it
carries a **decode oracle**: input MLow packets paired with the exact PCM the
real decoder produced for them, captured by hooking the decode entry point. An
independent decoder was then built and checked sample-by-sample against that
oracle.

> **Confidence.** This is a *different binary* (native ARM64, not WASM) reversed
> by a *different, runtime* technique (`frida-hooking`) than the rest of this
> directory. Facts on which it and the WASM read **agree** are therefore
> corroborated by two independent techniques and are graded **`confirmed`** here;
> facts only the native read has are **`probable`**; the parts of the synthesis
> not yet bit-reproduced are **`speculative`** and live in
> [open questions](#open-questions). The front-end (entropy + parameter decode) is
> reproduced **byte-exactly against the oracle** (80/80 captured packets); the
> float synthesis is structurally recovered and perceptually validated but **not
> yet sample-identical** (see [fidelity](#reconstruction-fidelity-honest)).
>
> **Provenance.** Module: native WhatsApp `SharedModules` (Apple silicon,
> ARM64). Technique [`frida-hooking`](../../techniques/frida-hooking.md) · tools
> [`frida`](https://frida.re/), [`ghidra`](https://ghidra-sre.org/) · contributor
> `denis`. Evidence: a 80-packet decode oracle (live native decoder
> input→PCM pairs, own test call) and a byte-exact front-end re-decode of it. No
> key material, no real PII, and no captured media bytes are in this repo; only
> structural facts and synthetic descriptions.

## The decode oracle (the missing runtime anchor)

Hooking the native decode entry point yields, per call, a stream of
`(MLow packet → 960×int16 PCM)` pairs — the exact output the shipping decoder
produced. This is the artifact the WASM-only work lacked. With it, every
front-end claim is checkable as a hard pass/fail (does our re-decode consume the
identical bits and produce the identical parameters?), and every synthesis claim
is checkable as a real error metric against ground-truth PCM rather than
"plausible output". The oracle stays private (it is captured audio); only the
derived, non-sensitive facts are documented here.

## What the native read corroborates (→ `confirmed`)

These match the [WASM decode-pipeline](decode-pipeline.md) findings and are now
seen by two independent techniques:

- **Entropy layer is the libopus range coder.** Same primitive, same init
  fingerprint: range register seeds `0x80` (= 128), the value register is seeded
  from the first payload byte (`>>1`), then renormalised to 2^31. Independently
  reproduced and verified bit-exact on the native path. *(`confirmed`.)*
- **Architecture is CELP**, not a transform codec: NLSF/LPC short-term synthesis
  with long-term (pitch) prediction and an entropy-coded excitation. *(`confirmed`.)*
- **Order-16 LPC**, with NLSF stage-1 + stage-2 + an interpolation index, and a
  min-spacing stabilisation clamp. *(`confirmed`.)*
- **A ≈48-sample decoder group delay.** The WASM page attributes this to the
  harmonic-comb postfilter; the native measurement finds the constant offset
  between our synthesis and the oracle PCM is **exactly 48 samples**, clean and
  drift-free across the whole stream. The two reads independently land on the
  same number. *(`confirmed` that it is ≈48 samples; its exact source is refined
  below.)*
- **16 kHz core.** *(`confirmed`.)*

## What the native read refines or corrects (`probable`)

The byte-exact front-end and the native decompile sharpen several points the
WASM read left coarse or guessed:

- **Excitation is SILK shell coding, not a PVQ-like algebraic codebook.**
  [decode-pipeline](decode-pipeline.md) describes step 4 as "a sparse algebraic
  pulse codebook (PVQ-like)". The native bit-exact reconstruction shows it is
  specifically **SILK-style shell coding**: a recursive pulse-count split
  16→8→4→2→1 through forward-CDF tables, then per-pulse LSB extension and
  MSB-first sign bits. This reproduces the captured frames exactly. *(`probable`;
  flagged as a refinement of the existing `speculative` description.)*
- **The MLow read schedule uses forward cumulative-frequency decoding, not the
  inverse-CDF (`ec_dec_icdf`) entry.** The same underlying range coder is driven
  by an `ec_decode` + `ec_dec_update` pair against binary-packed **forward**-CDF
  tables (cumulative, ascending), rather than the `ec_dec_icdf` (descending
  inverse-CDF) path the WASM tables on the MDCT/standard-Opus caller use. Same
  arithmetic engine, different table convention on the CELP path. *(`probable`;
  see [open questions](#open-questions) on whether both conventions coexist.)*
- **Synthesis ordering.** The native chain per 20 ms frame is: build the float
  excitation → per-subframe long-term (pitch) ring prediction → an **additive**
  noise-shaping postfilter folded in → a comb/long-term scaling → and the
  **order-16 LPC short-term synthesis filter applied last**, over the assembled
  frame (sign convention `y[n] = x[n] − Σ a[k]·y[n−1−k]`). The DSP is **IEEE-754
  float** (a `silk_FLOAT`-style build), not fixed-point. *(`probable`.)*
- **The ≈48-sample delay is intrinsic synthesis group delay, and the resampler
  is not its source on the 16 kHz path.** At equal input/output rate the
  resampler stage is skipped (output goes straight through a float→int16 step),
  so the constant 48-sample offset is the synthesis filters' own warm-up, not
  resampling latency. *(`probable`.)*

## New facts the oracle pins (answering open questions)

- **Frame geometry.** A 60 ms MLow packet is **3 × 20 ms wideband frames**
  decoded from **one shared range coder**; each 20 ms frame is **4 subframes of
  80 samples** → **960 samples at 16 kHz** per packet. This resolves
  [index open-question #2](index.md#open-questions) ("sample rate and frame size…
  unresolved"): the core runs at 16 kHz wideband with this fixed 3×(4×80)
  structure on the captured WB calls. *(`confirmed` — oracle frame count plus
  byte-exact re-decode, corroborated by the WASM 16 kHz read.)*
- **Bitstream layout is reproducible.** The full per-frame read schedule —
  signal-type/quant-offset, NLSF stage-1 + 16 stage-2 indices + interpolation,
  the shell-coded excitation, voiced pitch lag + LTP filter, and per-subframe
  gains — re-decodes the 80 captured packets with **zero leftover/overrun bits**
  (80/80). This is the concrete answer to
  [index open-question #1](index.md#open-questions) ("MLow bitstream layout").
  *(front-end `confirmed` against the oracle.)*
- **Per-subframe pitch lag.** The synthesis pitch lag in samples is
  `lag = contourQ6 × 0.5 + 32` (base 32, half-sample grid), matching the live
  decoder's pitch on 95% of voiced packets. *(`probable`.)*

## Reconstruction fidelity (honest)

- **Front-end: byte-exact.** All 80 oracle packets re-decode with identical bit
  consumption and parameters (entropy, NLSF→LPC, gains, pitch, shell excitation).
- **Synthesis: recovered and perceptually validated, not yet sample-identical.**
  Against the oracle PCM the current native reconstruction scores, on the loud
  voiced packets: spectral-envelope (timbre) correlation **≈0.98**, pitch match
  **95%**, and waveform Pearson **≈0.76** after removing the constant 48-sample
  delay (the loudest packets reach 0.92–0.95). The remaining gap to bit-identical
  is the postfilter (below).
- This is the runtime corroboration the spec asked for: an independent technique
  on a different binary, anchored to ground-truth PCM, agreeing with the WASM
  structure and pinning the parts it left open.

## Open questions

1. **Postfilter sample-identity.** The additive noise-shaping postfilter
   (`FUN_00111c3c`-equivalent) uses an LCG-driven noise term; reproducing it
   bit-for-bit needs the decoder's exact noise-seed initialisation and threading.
   Until then the postfilter is left out of the deterministic reconstruction (it
   contributes high-frequency "air"; intelligible, correct-timbre audio is
   reachable without it). *(`speculative`.)*
2. **icdf vs forward-CDF coexistence.** Whether the native build also exposes the
   `ec_dec_icdf` path for some fields, or uses the forward-CDF convention
   throughout the CELP path, is not fully mapped. Tracked as a possible
   technique-level [discrepancy](decode-pipeline.md#entropy-coder-the-celt-range-coder-verified)
   with the WASM read. *(`speculative`.)*
3. **Companion NN and encoder.** Out of scope here, as on the WASM pages.

## See also

- [index](index.md), [decode pipeline](decode-pipeline.md),
  [function map](function-map.md) — the WASM-derived view this corroborates.
- [reconstruction](../../reconstruction.md) — the system-level gap analysis
  (this supplies the "runtime technique / decode oracle" it lists as missing).
- [frida-hooking](../../techniques/frida-hooking.md) — the technique.
