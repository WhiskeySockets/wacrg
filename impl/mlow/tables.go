package mlow

// Inverse-CDF (icdf) tables recovered from wa.wasm, used by the MLow entropy
// decode (audio_mdct_quantization_decode, WASM #8911) as the second argument to
// ec_dec_icdf (#8859). Each was verified two ways: (1) the address appears as an
// ec_dec_icdf call argument in #8911's body, and (2) the bytes at that address
// are a valid inverse-CDF -- monotonically decreasing and terminated by 0, with
// icdf[0] ~= 2^ftb. They are exercised by a round-trip test against the matched
// encoder (tables_test.go), so these are recovered AND executable, not guessed.
//
// Extraction is reproducible with analysis/extract_table.py <addr> in the warden
// repo (the binary uses bulk-memory passive segments, so addresses resolve via
// the memory.init placements in __wasm_init_memory). See
// docs/codec/mlow/decode-pipeline.md (decode schedule).

// icdfTable is one recovered inverse-CDF: the table bytes plus the ftb (total
// frequency bits) ec_dec_icdf is called with, and the WASM data address it came
// from (for traceability back to the binary).
type icdfTable struct {
	addr int    // wa.wasm data-section address
	ftb  uint   // ftb argument to ec_dec_icdf
	icdf []byte // inverse-CDF, decreasing, terminated by 0
}

// The icdf tables #8911 decodes against. Names note the address; roles are from
// the recovered (and partly data-dependent) decode schedule, so they stay
// descriptive rather than over-claiming exact semantics.
var (
	// 0x112ab0: read once during frame init (ec_dec_icdf ftb=2).
	icdfFrameInit = icdfTable{addr: 1125040, ftb: 2, icdf: []byte{2, 1, 0}}
	// 0x111560: read inside the per-band quantization loop (ftb=2).
	icdfBandLoop = icdfTable{addr: 1119584, ftb: 2, icdf: []byte{2, 1, 0}}
	// 0x112ab3: conditional mid-range parameter (ftb=5).
	icdfMid = icdfTable{addr: 1125043, ftb: 5, icdf: []byte{25, 23, 2, 0}}
	// 0x112ab7: conditional large parameter (ftb=7); icdf[0]=126 ~= 2^7.
	icdfLarge = icdfTable{addr: 1125047, ftb: 7, icdf: []byte{126, 124, 119, 109, 87, 41, 19, 9, 4, 2, 0}}
)

// mlowICDFTables is every icdf table #8911 references, for iteration in tests and
// future decode wiring.
var mlowICDFTables = []icdfTable{icdfFrameInit, icdfBandLoop, icdfMid, icdfLarge}
