# keying - reference SRTP key schedule

A clean-room, standard-library-only reference for WhatsApp's call SRTP key
derivation, the executable companion to
[`docs/keying/srtp-key-schedule.md`](../../docs/keying/srtp-key-schedule.md),
which is the source of truth.

Two layers:

```
Layer 1 (WAHKDF):  HKDF-SHA256(IKM=callKey, salt=nil, info=participantLID, L=46)
                   -> masterKey(16) || masterSalt(14) || unused(16)
Layer 2 (RFC3711): AES-128-CM(masterKey, IV = salt with iv[7]^=label)
                   -> SRTP/SRTCP cipher (16) / auth (20) / salt (14), labels 0x00-0x05
```

Hop-by-hop SRTP skips Layer 1 (`ParseHBHKey`: the relay supplies 30 bytes of
`masterKey||masterSalt` directly). Suite: `AES_CM_128_HMAC_SHA1_80`.

## Validation

- `TestHKDFSHA256_RFC5869` checks the HKDF layer against the RFC 5869 Appendix A
  known-answer test, so WAHKDF rests on a proven primitive.
- The rest assert sizes, determinism, per-participant separation (different LID ->
  different master), and that all six session keys are distinct.

All inputs are synthetic; no key material ships here. Callers pass secrets in.

## Provenance

Recovered by static `wasm-analysis` (tool `warden`, contributor `purpshell`):
the binary statically contains SHA-256 (`sha256_transform_blocks` #1226, K-table
@`978512`) and AES-128-CTR (`aes_128_ctr_init` #430 ...), and #11407 logs
"stored E2E key and derived SRTP/P2P ...". The exact two-layer wiring was
recovered by a runtime WASM trace and is `probable`. See the doc for the full
confidence/provenance model.

## Build

```bash
cd impl/keying
go test ./...
```
