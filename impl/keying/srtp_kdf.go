// Package keying is a clean-room reference for WhatsApp's call SRTP key schedule,
// recovered by static analysis of the Web calling engine (wa.wasm) and
// corroborated by a runtime trace. It is the executable companion to
// docs/keying/srtp-key-schedule.md; that doc is the source of truth.
//
// The schedule has two layers:
//
//	Layer 1 (WAHKDF):  HKDF-SHA256(IKM=callKey, salt=nil, info=participantLID, L=46)
//	                   -> masterKey(16) || masterSalt(14) || unused(16)
//	Layer 2 (RFC3711): AES-128-CM(masterKey, IV = salt with iv[7]^=label) -> session keys
//
// Hop-by-hop SRTP skips Layer 1: the relay supplies a 30-byte masterKey||masterSalt
// directly (see ParseHBHKey). Cipher suite: AES_CM_128_HMAC_SHA1_80.
//
// Implemented with the standard library only (crypto/hmac, crypto/sha256,
// crypto/aes); HKDF is spelled out per RFC 5869 rather than pulled from a
// dependency. No key material ships in this repo: callers pass secrets in.
package keying

import (
	"crypto/aes"
	"crypto/hmac"
	"crypto/sha256"
	"errors"
)

// Sizes, in bytes.
const (
	MasterKeyLen  = 16 // AES-128 master key
	MasterSaltLen = 14 // SRTP master salt
	srtpKeyLen    = 16 // session cipher key (AES-128)
	srtpAuthLen   = 20 // session auth key (HMAC-SHA1)
	srtpSaltLen   = 14 // session salt
	wahkdfLen     = 46 // masterKey(16) + masterSalt(14) + unused(16)
)

// RFC 3711 KDF labels (0x00-0x02 SRTP, 0x03-0x05 SRTCP).
const (
	LabelSRTPCipher  byte = 0x00
	LabelSRTPAuth    byte = 0x01
	LabelSRTPSalt    byte = 0x02
	LabelSRTCPCipher byte = 0x03
	LabelSRTCPAuth   byte = 0x04
	LabelSRTCPSalt   byte = 0x05
)

// Master is an SRTP master key + salt: the output of WAHKDF, or a hop-by-hop key.
type Master struct {
	Key  []byte // MasterKeyLen
	Salt []byte // MasterSaltLen
}

// SessionKeys are the RFC 3711-derived per-session keys for SRTP and SRTCP.
type SessionKeys struct {
	SRTPCipher, SRTPAuth, SRTPSalt    []byte
	SRTCPCipher, SRTCPAuth, SRTCPSalt []byte
}

// hkdfSHA256 is RFC 5869 HKDF with SHA-256. A nil salt becomes HashLen zeros.
func hkdfSHA256(ikm, salt []byte, info string, length int) []byte {
	if salt == nil {
		salt = make([]byte, sha256.Size)
	}
	// Extract: PRK = HMAC(salt, IKM).
	ext := hmac.New(sha256.New, salt)
	ext.Write(ikm)
	prk := ext.Sum(nil)
	// Expand.
	out := make([]byte, 0, length)
	var t []byte
	for i := byte(1); len(out) < length; i++ {
		exp := hmac.New(sha256.New, prk)
		exp.Write(t)
		exp.Write([]byte(info))
		exp.Write([]byte{i})
		t = exp.Sum(nil)
		out = append(out, t...)
	}
	return out[:length]
}

// DeriveMaster runs WAHKDF (Layer 1): expand the 32-byte call key, keyed by the
// participant LID, into the SRTP master key and salt. See the package doc.
func DeriveMaster(callKey []byte, participantLID string) (*Master, error) {
	if len(callKey) == 0 {
		return nil, errors.New("keying: empty call key")
	}
	if participantLID == "" {
		return nil, errors.New("keying: empty participant LID")
	}
	out := hkdfSHA256(callKey, nil, participantLID, wahkdfLen)
	return &Master{Key: out[:MasterKeyLen], Salt: out[MasterKeyLen : MasterKeyLen+MasterSaltLen]}, nil
}

// ParseHBHKey reads a 30-byte hop-by-hop key (masterKey(16) || masterSalt(14))
// that the relay supplies directly, skipping Layer 1.
func ParseHBHKey(b []byte) (*Master, error) {
	if len(b) < MasterKeyLen+MasterSaltLen {
		return nil, errors.New("keying: HBH key too short")
	}
	return &Master{Key: b[:MasterKeyLen], Salt: b[MasterKeyLen : MasterKeyLen+MasterSaltLen]}, nil
}

// kdf is the RFC 3711 PRF: AES-128-CM(masterKey, IV) with IV = salt, iv[7]^=label,
// 16-bit block counter in iv[14..15].
func (m *Master) kdf(label byte, n int) ([]byte, error) {
	block, err := aes.NewCipher(m.Key)
	if err != nil {
		return nil, err
	}
	iv := make([]byte, 16)
	copy(iv, m.Salt)
	iv[7] ^= label
	out := make([]byte, 0, n)
	enc := make([]byte, 16)
	for ctr := 0; len(out) < n; ctr++ {
		blk := make([]byte, 16)
		copy(blk, iv)
		blk[14] = byte(ctr >> 8)
		blk[15] = byte(ctr)
		block.Encrypt(enc, blk)
		out = append(out, enc...)
	}
	return out[:n], nil
}

// Session derives all SRTP and SRTCP session keys (RFC 3711, labels 0x00-0x05).
func (m *Master) Session() (*SessionKeys, error) {
	var s SessionKeys
	var err error
	pick := func(label byte, n int) []byte {
		if err != nil {
			return nil
		}
		var k []byte
		k, err = m.kdf(label, n)
		return k
	}
	s.SRTPCipher = pick(LabelSRTPCipher, srtpKeyLen)
	s.SRTPAuth = pick(LabelSRTPAuth, srtpAuthLen)
	s.SRTPSalt = pick(LabelSRTPSalt, srtpSaltLen)
	s.SRTCPCipher = pick(LabelSRTCPCipher, srtpKeyLen)
	s.SRTCPAuth = pick(LabelSRTCPAuth, srtpAuthLen)
	s.SRTCPSalt = pick(LabelSRTCPSalt, srtpSaltLen)
	if err != nil {
		return nil, err
	}
	return &s, nil
}
