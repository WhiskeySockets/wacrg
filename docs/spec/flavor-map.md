<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Implementation map

The inverse of the code-to-reference `// Source of truth:` comment: for each flavor, **where each bit of the spec is realized in real code**. Each row pairs a spec bit with a code permalink and the vector that validates it. Generated from `spec/flavors/*.map.yaml`.

## meowcaller

| Spec bit | Status | Validated by | Confidence | Code |
| --- | --- | --- | --- | --- |
| media · `mlow/rangecoder` | verified | `rc_vectors.json` | confirmed | [`RangeDecoder`](https://github.com/purpshell/meowcaller/blob/8cb06a9cd58dd764fac1ca5c7af07d4738718040/mlow/rangecoder.go#L34) |
| media · `mlow/mem` | verified | `smpl_tables.json` | confirmed | [`LoadSmplMem`](https://github.com/purpshell/meowcaller/blob/8cb06a9cd58dd764fac1ca5c7af07d4738718040/mlow/mem.go#L46) |
| media · `mlow/toc` | verified | `toc_vectors.json` | confirmed | [`ParseSmplTOC`](https://github.com/purpshell/meowcaller/blob/8cb06a9cd58dd764fac1ca5c7af07d4738718040/mlow/toc.go#L42) |
| media · `mlow/lpc` | verified | `lsf_quant_io.json` | confirmed | [`smplA2NLSF16`](https://github.com/purpshell/meowcaller/blob/8cb06a9cd58dd764fac1ca5c7af07d4738718040/mlow/lpc.go#L571) |
| media · `mlow/lsf` | verified | `lsf_vectors.json` | confirmed | [`DecodeSmplLsf`](https://github.com/purpshell/meowcaller/blob/8cb06a9cd58dd764fac1ca5c7af07d4738718040/mlow/lsf.go#L177) |
| media · `mlow/lsf_quant` | verified | `lsf_quant_io.json` | confirmed | [`LsfQuantCond`](https://github.com/purpshell/meowcaller/blob/8cb06a9cd58dd764fac1ca5c7af07d4738718040/mlow/lsf_quant.go#L563) |
| media · `mlow/pulse` | verified | `pulse_vectors.json` | confirmed | [`DecodeSmplPulses`](https://github.com/purpshell/meowcaller/blob/8cb06a9cd58dd764fac1ca5c7af07d4738718040/mlow/pulse.go#L30) |
| media · `mlow/gains` | verified | `gains_vectors.json` | confirmed | [`DecodeSmplGains`](https://github.com/purpshell/meowcaller/blob/8cb06a9cd58dd764fac1ca5c7af07d4738718040/mlow/gains.go#L14) |
| media · `mlow/pitch` | verified | `pitch_vectors.json` | confirmed | [`DecodeSmplPitch`](https://github.com/purpshell/meowcaller/blob/8cb06a9cd58dd764fac1ca5c7af07d4738718040/mlow/pitch.go#L31) |
| media · `mlow/noise` | verified | `gennoise_vectors.json` | confirmed | [`SmplCelpGenNoise`](https://github.com/purpshell/meowcaller/blob/8cb06a9cd58dd764fac1ca5c7af07d4738718040/mlow/noise.go#L359) |
| media · `mlow/synth` | verified | - | confirmed | [`SmplReconstructNLSF`](https://github.com/purpshell/meowcaller/blob/8cb06a9cd58dd764fac1ca5c7af07d4738718040/mlow/synth.go#L230) |
| media · `mlow/postfilter` | scaffolded | - | speculative | [`SmplCombPostfilter`](https://github.com/purpshell/meowcaller/blob/8cb06a9cd58dd764fac1ca5c7af07d4738718040/mlow/postfilter.go#L22) |

## meowmeow (Go VoIP reference)

No per-bit map yet. Declared coverage (plane level): `keying`, `media`. A flavor adds `spec/flavors/meowmeow.map.yaml` to record exact code permalinks.

## whatsapp-rust (VoIP)

No per-bit map yet. Declared coverage (plane level): `signaling`, `keying`, `media`, `transport`. A flavor adds `spec/flavors/whatsapp-rust.map.yaml` to record exact code permalinks.

## zapo-caller

No per-bit map yet. Declared coverage (plane level): `signaling`, `keying`, `transport`. A flavor adds `spec/flavors/zapo-caller.map.yaml` to record exact code permalinks.

[Back to spec overview](./index.md)
