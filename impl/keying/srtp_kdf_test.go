package keying

import (
	"bytes"
	"encoding/hex"
	"testing"
)

func unhex(t *testing.T, s string) []byte {
	t.Helper()
	b, err := hex.DecodeString(s)
	if err != nil {
		t.Fatal(err)
	}
	return b
}

// HKDF-SHA256 is validated against RFC 5869 Appendix A, Test Case 1 - an
// authoritative known-answer, so the WAHKDF layer rests on a proven primitive
// rather than self-consistency alone.
func TestHKDFSHA256_RFC5869(t *testing.T) {
	ikm := unhex(t, "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b")
	salt := unhex(t, "000102030405060708090a0b0c")
	info := unhex(t, "f0f1f2f3f4f5f6f7f8f9")
	want := unhex(t, "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865")
	got := hkdfSHA256(ikm, salt, string(info), 42)
	if !bytes.Equal(got, want) {
		t.Fatalf("HKDF-SHA256 mismatch:\n got  %x\n want %x", got, want)
	}
}

// All-synthetic. Exercises the WAHKDF master derivation: correct sizes,
// determinism, and per-participant separation via the LID info.
func TestDeriveMaster(t *testing.T) {
	callKey := bytes.Repeat([]byte{0x42}, 32) // synthetic, not a real key
	m, err := DeriveMaster(callKey, "1234567890@lid")
	if err != nil {
		t.Fatal(err)
	}
	if len(m.Key) != MasterKeyLen || len(m.Salt) != MasterSaltLen {
		t.Fatalf("sizes: key=%d salt=%d", len(m.Key), len(m.Salt))
	}
	m2, _ := DeriveMaster(callKey, "1234567890@lid")
	if !bytes.Equal(m.Key, m2.Key) || !bytes.Equal(m.Salt, m2.Salt) {
		t.Error("derivation not deterministic")
	}
	other, _ := DeriveMaster(callKey, "9999999999@lid")
	if bytes.Equal(m.Key, other.Key) {
		t.Error("different LID must yield a different master key")
	}

	if _, err := DeriveMaster(nil, "x"); err == nil {
		t.Error("empty call key should error")
	}
	if _, err := DeriveMaster(callKey, ""); err == nil {
		t.Error("empty LID should error")
	}
}

// The hop-by-hop path: a 30-byte relay key splits straight into master+salt.
func TestParseHBHKey(t *testing.T) {
	raw := make([]byte, 30)
	for i := range raw {
		raw[i] = byte(i)
	}
	m, err := ParseHBHKey(raw)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(m.Key, raw[:16]) || !bytes.Equal(m.Salt, raw[16:30]) {
		t.Error("HBH split mismatch")
	}
	if _, err := ParseHBHKey(raw[:20]); err == nil {
		t.Error("short HBH key should error")
	}
}

// The RFC 3711 layer: six keys, correct lengths, deterministic, and all distinct
// (the label-XOR-salt IV must separate every output).
func TestSessionKeys(t *testing.T) {
	m := &Master{Key: bytes.Repeat([]byte{0x01}, 16), Salt: bytes.Repeat([]byte{0x02}, 14)}
	s, err := m.Session()
	if err != nil {
		t.Fatal(err)
	}
	keys := map[string][]byte{
		"srtp_cipher":  s.SRTPCipher,
		"srtp_auth":    s.SRTPAuth,
		"srtp_salt":    s.SRTPSalt,
		"srtcp_cipher": s.SRTCPCipher,
		"srtcp_auth":   s.SRTCPAuth,
		"srtcp_salt":   s.SRTCPSalt,
	}
	wantLen := map[string]int{
		"srtp_cipher": 16, "srtp_auth": 20, "srtp_salt": 14,
		"srtcp_cipher": 16, "srtcp_auth": 20, "srtcp_salt": 14,
	}
	for name, k := range keys {
		if len(k) != wantLen[name] {
			t.Errorf("%s: len %d, want %d", name, len(k), wantLen[name])
		}
	}
	// All six must differ (distinct labels).
	seen := map[string]string{}
	for name, k := range keys {
		h := hex.EncodeToString(k)
		if prev, ok := seen[h[:24]]; ok {
			t.Errorf("%s collides with %s", name, prev)
		}
		seen[h[:24]] = name
	}
	// Determinism.
	s2, _ := m.Session()
	if !bytes.Equal(s.SRTPCipher, s2.SRTPCipher) {
		t.Error("session derivation not deterministic")
	}
}
