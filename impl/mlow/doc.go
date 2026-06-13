// Package mlow is a clean-room reference implementation of WhatsApp's MLow
// audio codec and its receive pipeline, reconstructed by static analysis of the
// WhatsApp Web calling engine (Emscripten WASM).
//
// # Provenance and honesty
//
// Every type and constant here traces to a finding documented in the wacrg
// research repo. Source of truth is the docs, not this code:
//
//   - docs/codec/mlow/index.md        architecture of the audio media plane
//   - docs/codec/mlow/function-map.md WASM function <-> C++ class identity map
//   - docs/codec/mlow/methodology.md  how each fact was recovered (reproducible)
//
// The findings come from ONE technique (static wasm-analysis), so the wacrg
// corroboration rule caps their confidence at "probable" for structure and
// "speculative" for the inner DSP. This package is therefore explicit about what
// is recovered versus pending: functions for not-yet-recovered stages return
// [ErrNotRecovered] rather than guessing a bitstream. It has deliberately NOT
// been validated against the WASM output (no live decode oracle is used), so do
// not treat its output as bit-exact with WhatsApp until a second technique
// corroborates the bitstream.
//
// # Architecture (the receive path)
//
// Recovered from the binary's C++ RTTI and source-path strings:
//
//	RTP/SRTP payload
//	  -> MlowRedPayloadSplitter   RED redundancy split  (red.go)
//	  -> ReedSolomonCode          FEC erasure recovery  (fec.go)
//	  -> concerto::NetEq          jitter buffer + PLC    (out of scope here)
//	  -> AudioDecoderMLowImpl     MLow CELP decode       (decoder.go)
//	       (+ mlowcompanion neural post-filter -- OUT OF SCOPE)
//	  -> PCM
//
// Opus is present in the binary as an alternate codec (wa_opus.cc); this package
// targets MLow. The neural "companion" post-filter (mlowcompanion_* weights,
// running on ExecuTorch/XNNPACK) is intentionally excluded: intelligible audio
// is reachable without it.
//
// # Scope
//
// Decode first (the higher-value, more-recoverable direction), then encode. The
// goal is intelligible audio and an honest, well-documented mapping back to the
// binary, not a byte-exact reproduction of an unverified bitstream.
package mlow
