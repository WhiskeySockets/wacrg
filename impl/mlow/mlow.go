package mlow

import "errors"

// ErrNotRecovered marks a code path whose exact behavior has not yet been
// recovered from the WASM. Returning it (instead of guessing) keeps the
// implementation honest: a caller learns "this stage is documented but not yet
// reproducible" rather than receiving plausible-but-wrong output. Each such site
// names the wacrg doc that tracks the open question.
var ErrNotRecovered = errors.New("mlow: stage not yet recovered from the WASM (see docs/codec/mlow)")

// ErrInvalidPayload is returned when a payload cannot be parsed as the framing
// recovered in docs/codec/mlow (RED split, frame header).
var ErrInvalidPayload = errors.New("mlow: invalid payload")

// Decoder turns one received RTP/SRTP audio payload into PCM samples. A payload
// may carry RED redundancy (a primary plus older frames) protected by
// Reed-Solomon FEC; the decoder is responsible for the whole receive path down
// to PCM. The neural companion post-filter is out of scope (see [doc.go]).
//
// The concrete implementation is built up across red.go, fec.go, frame.go, and
// decoder.go as each layer is recovered; until a layer is recovered its method
// returns [ErrNotRecovered].
type Decoder interface {
	// Decode parses one transport payload and returns mono PCM (signed 16-bit).
	// The sample rate is reported by [Decoder.SampleRate].
	Decode(payload []byte) (pcm []int16, err error)

	// SampleRate is the PCM output rate in Hz. The internal MLow core rate, the
	// output rate, and any super-wideband resampling are an open question: the
	// binary references both 8000 and 16000, with configuration language hinting
	// at a 32 kHz path. See docs/codec/mlow/index.md (open questions).
	SampleRate() int

	// Reset clears decoder state (e.g. inter-frame predictor history) so a new
	// stream can be decoded with the same instance.
	Reset()
}
