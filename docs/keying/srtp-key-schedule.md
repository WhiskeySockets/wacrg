<!-- Hand-written narrative. Detail page for docs/encryption-keying.md's SRTP section.
     Two observation modes (static wasm-analysis + a runtime WASM trace); graded accordingly. -->

# SRTP key schedule

[encryption-keying](../encryption-keying.md) calls the SRTP key derivation "the
most speculative part of the whole spec." This page resolves the structure of
it. The call/media key delivered via Signal `<enc>` is expanded into SRTP master
keys, then into SRTP/SRTCP session keys, in two layers.

> **Confidence: `confirmed`** for the E2E SRTP derivation. It is now agreed by
> multiple independent paths: static `wasm-analysis` of the binary (this
> page), a runtime WASM trace, and two
> independent reconstructions whose primitives are pinned to known-answer test
> vectors: [zapo-caller](../../spec/flavors.md) (TypeScript) and
> [whatsapp-rust](../../spec/flavors.md) (Rust). All derive byte-identical keys.
> The HBH two-stage schedule (below) is `probable` (recovered by the
> reconstructions; one technique class). Rekey policy stays `speculative`.
>
> **Provenance.** Technique `wasm-analysis` · flavors
> `zapo-caller`, `whatsapp-rust` · contributors `purpshell`, `jlucaso1`,
> `auties`, `sheiitear`, `edgard` · sources: `wacore/src/voip/e2e_srtp.rs:55`,
> `hbh_srtp.rs:51`, the trace-verified Go reference, commit history. **No key
> material is in this repo**: structure only.

## Layer 1: WAHKDF (call key to SRTP master)

```
masterKey(16) || masterSalt(14) || unused(16)
    = HKDF-SHA256(IKM = callKey, salt = nil, info = participantLID, L = 46)
```

- **IKM** is the 32-byte call/media key (the secret unwrapped from the Signal
  `<enc>` offer; see [encryption-keying](../encryption-keying.md)).
- **info** is the participant's LID (the per-participant identifier), so each
  participant gets distinct master keying from the same call key.
- The first 16 bytes are the SRTP **master key**, the next 14 the master **salt**;
  the trailing 16 are unused.

**Static evidence (new):** HKDF-SHA256 requires SHA-256, which is present and
named in the binary: `sha256_transform_blocks` (#1226, identified by the inline
round constants `0x428a2f98`/`0x71374491` and the full K[0..63] table at data
address `978512`), with `sha256_update` (#1224) and `sha256_finalize` (#1223). A
runtime trace matched this HKDF step exactly.

## Layer 2: RFC 3711 KDF (master to session keys)

Standard SRTP key derivation (RFC 3711 section 4.3): an AES-128 counter-mode PRF
keyed by the master key, with the master salt and a one-byte **label** building
the IV.

```
rfc3711kdf(label, L):
    iv      = masterSalt (14 bytes), zero-padded to 16
    iv[7]  ^= label
    stream  = AES-128-CM(masterKey, iv)         # counter in iv[14..15]
    return stream[:L]
```

| label | output | length | use |
| --- | --- | --- | --- |
| `0x00` | SRTP cipher key | 16 | media encryption |
| `0x01` | SRTP auth key | 20 | media auth (HMAC-SHA1) |
| `0x02` | SRTP salt | 14 | media IV salt |
| `0x03` | SRTCP cipher key | 16 | RTCP encryption |
| `0x04` | SRTCP auth key | 20 | RTCP auth |
| `0x05` | SRTCP salt | 14 | RTCP IV salt |

The 20-byte auth keys imply **HMAC-SHA1**; the 16-byte cipher keys and AES-CM PRF
imply **AES-128-CM**. So the suite is **`AES_CM_128_HMAC_SHA1_80`** (the common
SRTP profile).

**Static evidence (new):** AES-128 counter mode is present and named:
`aes_128_ctr_init` (#430), `configure_aes128_counter_mode` (#459),
`aes_ctr_init_context` (#465), `aes_ctr_cipher_stream_copy` (#514). The
per-participant derivation is anchored by a log string in #11407:
`"stored E2E key and derived SRTP/P2P for extension jid=%s"`.

## Two SRTP layers: end-to-end and hop-by-hop

WhatsApp protects media twice (see [media-srtp](../media-srtp.md)):

- **End-to-end (E2E) SRTP** uses the master derived above (Layer 1+2), so relays
  forward ciphertext they cannot read.
- **Hop-by-hop (HBH) SRTP** is keyed by a 30-byte key the relay supplies
  (`<hbh_key>`, base64 in the offer/accept), packed as
  `masterKey(16) || masterSalt(14)`. Unlike E2E it does **not** start from the
  call key; instead the 30-byte relay key runs through a **two-stage HKDF-SHA256**
  (`wa_sfu_kdf`) with directional string labels:

  ```
  stage 1:  srtcp_salt = HKDF-SHA256(salt = zeros(32), ikm = masterSalt,
                                     info = "uplink hbh srtcp salt", L = 32)
  stage 2:  crypto_key = HKDF-SHA256(salt = srtcp_salt, ikm = masterKey,
                                     info = "uplink hbh srtcp key",  L = 30)
              -> crypto_key(16) || crypto_salt(14)
  ```

  with a matching `downlink hbh srtcp salt` / `downlink hbh srtcp key` pair for
  the other direction. The binary references `hbh_srtp_key` / `hbh_srtcp_key`;
  the labels and two-stage chain are recovered from the reconstructions
  (`wacore/src/voip/hbh_srtp.rs:51`).

A frame is encrypted E2E first, then HBH on transmit; the reverse on receive.

## Relationship to SFrame

Distinct from SRTP, the binary also carries `facebook::sframe` /
`wa::sframe`, a per-frame media-encryption layer using **AES-128-GCM** (keyed by
a separate HKDF label `e2e sframe key`). See
[SFrame: per-frame media E2EE](sframe-media-e2ee.md); whether SFrame and the E2E
SRTP are one layer or two stacked layers is an open question.

## Open questions

- The exact HKDF `info` beyond the participant LID (any fixed label/context
  prefix?), and the `<encopt keygen>` / `<enc v>` values that select it.
- Whether/when SRTP keys rotate during a long call.
- The SFrame key schedule and how it composes with E2E SRTP.
- Formalizing the runtime trace as a recorded capture to reach `confirmed`.

## See also

[encryption-keying](../encryption-keying.md) · [media-srtp](../media-srtp.md) ·
[reconstruction](../reconstruction.md).
