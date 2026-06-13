package mlow

// Range ENCODER (libopus celt/entenc.c), the exact inverse of the decoder in
// rangecoder.go. It is included so the decoder's correctness can be proven by a
// matched round-trip (rangecoder_test.go) without needing external test vectors:
// because both sides are verbatim CELT, any transcription error shows up as a
// round-trip mismatch. It is also the natural starting point for the MLow encode
// path. The WASM's own encoder counterparts are audio_encode_frame (#8918) etc.

const ecCodeShift = ecCodeBits - ecSymBits - 1 // 23

type rangeEncoder struct {
	buf        []byte
	storage    uint32
	endOffs    uint32
	endWindow  uint32
	nendBits   int32
	nbitsTotal int32
	offs       uint32
	rng        uint32
	val        uint32
	ext        uint32
	rem        int32
	err        bool
}

func newRangeEncoder(size int) *rangeEncoder {
	return &rangeEncoder{
		buf:        make([]byte, size),
		storage:    uint32(size),
		nbitsTotal: ecCodeBits + 1, // 33
		rng:        ecCodeTop,      // 0x80000000
		rem:        -1,
	}
}

func (e *rangeEncoder) writeByte(v uint32) {
	if e.offs+e.endOffs >= e.storage {
		e.err = true
		return
	}
	e.buf[e.offs] = byte(v)
	e.offs++
}

func (e *rangeEncoder) writeByteAtEnd(v uint32) {
	if e.offs+e.endOffs >= e.storage {
		e.err = true
		return
	}
	e.endOffs++
	e.buf[e.storage-e.endOffs] = byte(v)
}

func (e *rangeEncoder) carryOut(c int32) {
	if c != ecSymMax {
		carry := c >> ecSymBits
		if e.rem >= 0 {
			e.writeByte(uint32(e.rem + carry))
		}
		if e.ext > 0 {
			sym := uint32((ecSymMax + carry) & ecSymMax)
			for e.ext > 0 {
				e.writeByte(sym)
				e.ext--
			}
		}
		e.rem = c & ecSymMax
	} else {
		e.ext++
	}
}

func (e *rangeEncoder) normalize() {
	for e.rng <= ecCodeBot {
		e.carryOut(int32(e.val >> ecCodeShift))
		e.val = (e.val << ecSymBits) & (ecCodeTop - 1)
		e.rng <<= ecSymBits
		e.nbitsTotal += ecSymBits
	}
}

// encodeICDF is the inverse of (*rangeDecoder).decodeICDF.
func (e *rangeEncoder) encodeICDF(s int, icdf []byte, ftb uint) {
	r := e.rng >> ftb
	if s > 0 {
		e.val += e.rng - r*uint32(icdf[s-1])
		e.rng = r * uint32(icdf[s-1]-icdf[s])
	} else {
		e.rng -= r * uint32(icdf[s])
	}
	e.normalize()
}

// encodeBitLogp is the inverse of (*rangeDecoder).decodeBitLogp.
func (e *rangeEncoder) encodeBitLogp(val int, logp uint) {
	r := e.rng
	s := r >> logp
	r -= s
	if val != 0 {
		e.val += r
		e.rng = s
	} else {
		e.rng = r
	}
	e.normalize()
}

// encodeBits is the inverse of (*rangeDecoder).decodeBits (raw bits at the end).
func (e *rangeEncoder) encodeBits(fl uint32, bits uint) {
	window := e.endWindow
	used := e.nendBits
	if used+int32(bits) > ecWindowBits {
		for {
			e.writeByteAtEnd(window & ecSymMax)
			window >>= ecSymBits
			used -= ecSymBits
			if used < ecSymBits {
				break
			}
		}
	}
	window |= fl << uint(used)
	used += int32(bits)
	e.endWindow = window
	e.nendBits = used
	e.nbitsTotal += int32(bits)
}

// done finalizes the stream (libopus ec_enc_done) and returns the coded bytes.
func (e *rangeEncoder) done() []byte {
	l := ecCodeBits - ilog(e.rng)
	msk := (ecCodeTop - 1) >> uint(l)
	end := (e.val + msk) &^ msk
	if (end | msk) >= e.val+e.rng {
		l++
		msk >>= 1
		end = (e.val + msk) &^ msk
	}
	for l > 0 {
		e.carryOut(int32(end >> ecCodeShift))
		end = (end << ecSymBits) & (ecCodeTop - 1)
		l -= ecSymBits
	}
	if e.rem >= 0 || e.ext > 0 {
		e.carryOut(0)
	}
	window := e.endWindow
	used := e.nendBits
	for used >= ecSymBits {
		e.writeByteAtEnd(window & ecSymMax)
		window >>= ecSymBits
		used -= ecSymBits
	}
	if !e.err {
		// zero the gap between the front and back streams
		for i := e.offs; i < e.storage-e.endOffs; i++ {
			e.buf[i] = 0
		}
		if used > 0 {
			if e.endOffs >= e.storage {
				e.err = true
			} else {
				e.buf[e.storage-e.endOffs-1] |= byte(window)
			}
		}
	}
	return e.buf
}
