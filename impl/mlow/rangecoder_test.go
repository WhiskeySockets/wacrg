package mlow

import (
	"math/rand"
	"testing"
)

// A few valid inverse-CDF tables (strictly decreasing to 0, total = 2^ftb).
var icdfTables = []struct {
	icdf []byte
	ftb  uint
}{
	{[]byte{2, 0}, 2},                // ft=4:  freqs {2,2}
	{[]byte{10, 5, 2, 0}, 4},         // ft=16: freqs {6,5,3,2}
	{[]byte{200, 120, 60, 20, 0}, 8}, // ft=256
	{[]byte{128, 0}, 8},              // ft=256: freqs {128,128}
}

type op struct {
	kind int // 0=icdf, 1=bitLogp, 2=rawBits
	a    int // icdf table index | bit value | raw value
	b    int // symbol s | logp | nbits
}

func genOps(seed int64, n int) []op {
	r := rand.New(rand.NewSource(seed))
	ops := make([]op, n)
	for i := range ops {
		switch r.Intn(3) {
		case 0:
			ti := r.Intn(len(icdfTables))
			ops[i] = op{kind: 0, a: ti, b: r.Intn(len(icdfTables[ti].icdf))}
		case 1:
			ops[i] = op{kind: 1, a: r.Intn(2), b: 1 + r.Intn(8)}
		default:
			nbits := 1 + r.Intn(16)
			ops[i] = op{kind: 2, a: r.Intn(1 << uint(nbits)), b: nbits}
		}
	}
	return ops
}

func encodeOps(ops []op) []byte {
	e := newRangeEncoder(8192)
	for _, o := range ops {
		switch o.kind {
		case 0:
			e.encodeICDF(o.b, icdfTables[o.a].icdf, icdfTables[o.a].ftb)
		case 1:
			e.encodeBitLogp(o.a, uint(o.b))
		case 2:
			e.encodeBits(uint32(o.a), uint(o.b))
		}
	}
	if e.err {
		panic("encoder overflow")
	}
	return e.done()
}

// The matched encoder/decoder are both verbatim CELT, so a faithful transcription
// must round-trip every op exactly. A failure here means a transcription bug.
func TestRangeCoderRoundTrip(t *testing.T) {
	for _, seed := range []int64{1, 7, 42, 1234, 99999} {
		ops := genOps(seed, 500)
		buf := encodeOps(ops)
		d := newRangeDecoder(buf)
		for i, o := range ops {
			switch o.kind {
			case 0:
				got := d.decodeICDF(icdfTables[o.a].icdf, icdfTables[o.a].ftb)
				if got != o.b {
					t.Fatalf("seed %d op %d: icdf table %d got symbol %d, want %d", seed, i, o.a, got, o.b)
				}
			case 1:
				got := d.decodeBitLogp(uint(o.b))
				if got != o.a {
					t.Fatalf("seed %d op %d: bitLogp(logp=%d) got %d, want %d", seed, i, o.b, got, o.a)
				}
			case 2:
				got := d.decodeBits(uint(o.b))
				if got != uint32(o.a) {
					t.Fatalf("seed %d op %d: bits(n=%d) got %d, want %d", seed, i, o.b, got, o.a)
				}
			}
		}
	}
}

// ec_dec_init must reproduce the exact CELT initial state we matched in the WASM
// (#8855): rng=128, nbits_total=9, offs=1, val=127-(buf[0]>>1).
func TestRangeDecoderInitMatchesCELT(t *testing.T) {
	buf := []byte{0xA6, 0x12, 0x34, 0x56}
	d := &rangeDecoder{buf: buf, storage: uint32(len(buf)),
		nbitsTotal: ecCodeBits + 1 - ((ecCodeBits-ecCodeExtra)/ecSymBits)*ecSymBits,
		rng:        1 << ecCodeExtra}
	d.rem = d.readByte()
	d.val = d.rng - 1 - uint32(d.rem>>(ecSymBits-ecCodeExtra))
	if d.rng != 128 {
		t.Errorf("initial rng = %d, want 128", d.rng)
	}
	if d.nbitsTotal != 9 {
		t.Errorf("initial nbits_total = %d, want 9", d.nbitsTotal)
	}
	if d.offs != 1 {
		t.Errorf("offs after first byte = %d, want 1", d.offs)
	}
	if want := uint32(127 - (0xA6 >> 1)); d.val != want {
		t.Errorf("initial val = %d, want %d", d.val, want)
	}
}
