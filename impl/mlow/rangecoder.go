package mlow

// Range decoder for MLow's entropy layer.
//
// Recovered finding: MLow's entropy coder is the **CELT/Opus range coder**
// (libopus celt/entdec.c), present in the WASM unmodified. This was verified by
// reading the lifted bodies of these functions and matching them constant-for-
// constant to libopus ec_dec:
//
//	WASM #8855 ec_dec_init       rng=128, val=127-(buf[0]>>1), nbits_total=9, offs=1
//	WASM #8856 ec_dec_normalize  byte renorm while rng <= 0x800000 (EC_CODE_BOT)
//	WASM #8858 ec_dec_bit_logp   one binary symbol at probability 2^-logp
//	WASM #8859 ec_dec_icdf       symbol from an inverse-CDF table
//	WASM #8861 ec_dec_bits       raw (uncoded) bits read from the BACK of the buffer
//
// Callers are audio_mdct_quantization_decode (#8911/#8992) and audio_encode_frame
// (#8918), i.e. an MDCT/CELT-family transform path. See
// docs/codec/mlow/entropy-coder.md and docs/codec/mlow/function-map.md.
//
// Because this is the published CELT coder, it is implemented exactly (not
// guessed) and is round-trip tested against a matching encoder (ec_enc.go) in
// rangecoder_test.go.

// CELT range-coder constants (entcode.h). 8-bit symbols, 32-bit code.
const (
	ecSymBits    = 8
	ecCodeBits   = 32
	ecSymMax     = (1 << ecSymBits) - 1          // 255
	ecCodeTop    = uint32(1) << (ecCodeBits - 1) // 0x80000000
	ecCodeBot    = ecCodeTop >> ecSymBits        // 0x00800000
	ecCodeExtra  = (ecCodeBits-2)%ecSymBits + 1  // 7
	ecWindowBits = 32
)

// rangeDecoder is libopus ec_dec. Field offsets in the comments are the byte
// offsets of the corresponding fields in the WASM struct, for traceability.
type rangeDecoder struct {
	buf        []byte // +0  the coded buffer
	storage    uint32 // +4  len(buf)
	endOffs    uint32 // +8  bytes consumed from the end (raw bits)
	endWindow  uint32 // +12 raw-bit window
	nendBits   int32  // +16 bits available in endWindow
	nbitsTotal int32  // +20 total bits read (for ec_tell)
	offs       uint32 // +24 bytes consumed from the front (range-coded)
	rng        uint32 // +28 the current range
	val        uint32 // +32 the difference val (rng-1-...) per CELT
	rem        int32  // +40 the last byte read from the front
}

// readByte reads the next front byte, 0 past the end (CELT ec_read_byte).
func (d *rangeDecoder) readByte() int32 {
	if d.offs < d.storage {
		b := int32(d.buf[d.offs])
		d.offs++
		return b
	}
	return 0
}

// readByteFromEnd reads the next byte from the back of the buffer
// (CELT ec_read_byte_from_end); raw bits live there, range-coded bits at the front.
func (d *rangeDecoder) readByteFromEnd() int32 {
	if d.endOffs < d.storage {
		d.endOffs++
		return int32(d.buf[d.storage-d.endOffs])
	}
	return 0
}

// newRangeDecoder is libopus ec_dec_init.
func newRangeDecoder(buf []byte) *rangeDecoder {
	d := &rangeDecoder{
		buf:        buf,
		storage:    uint32(len(buf)),
		nbitsTotal: ecCodeBits + 1 - ((ecCodeBits-ecCodeExtra)/ecSymBits)*ecSymBits, // 9
		rng:        1 << ecCodeExtra,                                                // 128
	}
	d.rem = d.readByte()
	d.val = d.rng - 1 - uint32(d.rem>>(ecSymBits-ecCodeExtra)) // 127 - (buf[0]>>1)
	d.normalize()
	return d
}

// normalize is libopus ec_dec_normalize: refill a byte while rng <= EC_CODE_BOT.
func (d *rangeDecoder) normalize() {
	for d.rng <= ecCodeBot {
		d.nbitsTotal += ecSymBits
		d.rng <<= ecSymBits
		sym := d.rem
		d.rem = d.readByte()
		// sym = (oldRem<<8 | newRem) >> (EC_SYM_BITS - EC_CODE_EXTRA)
		sym = (sym<<ecSymBits | d.rem) >> (ecSymBits - ecCodeExtra)
		// val = ((val<<8) + (EC_SYM_MAX & ~sym)) & (EC_CODE_TOP-1)
		d.val = ((d.val << ecSymBits) + uint32(ecSymMax & ^sym)) & (ecCodeTop - 1)
	}
}

// decodeBitLogp decodes one binary symbol whose probability of being 1 is
// 2^-logp (libopus ec_dec_bit_logp).
func (d *rangeDecoder) decodeBitLogp(logp uint) int {
	s := d.rng >> logp
	if d.val < s {
		d.rng = s
		d.normalize()
		return 1
	}
	d.val -= s
	d.rng -= s
	d.normalize()
	return 0
}

// decodeICDF decodes a symbol against an inverse-CDF table whose total is 2^ftb
// (icdf[len-1] must be 0). Libopus ec_dec_icdf.
func (d *rangeDecoder) decodeICDF(icdf []byte, ftb uint) int {
	r := d.rng >> ftb
	s := d.rng
	var t uint32
	ret := -1
	for {
		t = s
		ret++
		s = r * uint32(icdf[ret])
		if d.val >= s {
			break
		}
	}
	d.rng = t - s
	d.val -= s
	d.normalize()
	return ret
}

// decodeBits reads n raw, uncoded bits from the back of the buffer
// (libopus ec_dec_bits). n must be <= 25.
func (d *rangeDecoder) decodeBits(n uint) uint32 {
	window := d.endWindow
	available := d.nendBits
	if available < int32(n) {
		for {
			window |= uint32(d.readByteFromEnd()) << uint(available)
			available += ecSymBits
			if available >= ecWindowBits-ecSymBits+1 { // CELT: until window is full enough
				break
			}
		}
	}
	ret := window & ((1 << n) - 1)
	d.endWindow = window >> n
	d.nendBits = available - int32(n)
	d.nbitsTotal += int32(n)
	return ret
}

// tell reports the number of bits consumed so far (libopus ec_tell).
func (d *rangeDecoder) tell() int {
	return int(d.nbitsTotal) - ilog(d.rng)
}

// ilog returns 1 + floor(log2(x)) for x>0, 0 for x==0 (libopus EC_ILOG).
func ilog(x uint32) int {
	n := 0
	for x != 0 {
		n++
		x >>= 1
	}
	return n
}
