package mlow

import (
	"math/rand"
	"testing"
)

// The recovered tables must be well-formed inverse-CDFs: non-increasing, ending
// in 0, with icdf[0] in (0, 2^ftb]. A malformed table would mean a bad address
// or a misread ftb.
func TestRecoveredICDFTablesWellFormed(t *testing.T) {
	for _, tb := range mlowICDFTables {
		if len(tb.icdf) < 2 {
			t.Fatalf("table @%d: too short", tb.addr)
		}
		if tb.icdf[len(tb.icdf)-1] != 0 {
			t.Errorf("table @%d: not 0-terminated: %v", tb.addr, tb.icdf)
		}
		if tb.icdf[0] == 0 || uint32(tb.icdf[0]) > (1<<tb.ftb) {
			t.Errorf("table @%d: icdf[0]=%d out of (0, 2^%d]", tb.addr, tb.icdf[0], tb.ftb)
		}
		for i := 1; i < len(tb.icdf); i++ {
			if tb.icdf[i] > tb.icdf[i-1] {
				t.Errorf("table @%d: not non-increasing at %d: %v", tb.addr, i, tb.icdf)
			}
		}
	}
}

// The real payoff: the recovered tables are usable with the recovered range
// coder. Encoding then decoding any symbol of any table must round-trip, which
// jointly validates the table bytes, the ftb, and the ec_dec_icdf transcription.
func TestRecoveredICDFTablesRoundTrip(t *testing.T) {
	r := rand.New(rand.NewSource(20260613))
	type pick struct {
		tbl int
		sym int
	}
	var seq []pick
	for i := 0; i < 800; i++ {
		ti := r.Intn(len(mlowICDFTables))
		seq = append(seq, pick{ti, r.Intn(len(mlowICDFTables[ti].icdf))})
	}

	e := newRangeEncoder(8192)
	for _, p := range seq {
		tb := mlowICDFTables[p.tbl]
		e.encodeICDF(p.sym, tb.icdf, tb.ftb)
	}
	if e.err {
		t.Fatal("encoder overflow")
	}
	buf := e.done()

	d := newRangeDecoder(buf)
	for i, p := range seq {
		tb := mlowICDFTables[p.tbl]
		got := d.decodeICDF(tb.icdf, tb.ftb)
		if got != p.sym {
			t.Fatalf("op %d table@%d ftb=%d: decoded %d, want %d", i, tb.addr, tb.ftb, got, p.sym)
		}
	}
}
