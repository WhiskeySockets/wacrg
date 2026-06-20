<!-- Hand-written narrative. Companion to srtp-key-schedule.md; the per-frame layer.
     CORRECTED 2026-06 from two independent reconstructions (KAT-pinned): the cipher
     is AES-128-GCM (not AES-CTR), and the key schedule is now known. -->

# SFrame: per-frame media E2EE

Alongside [SRTP](srtp-key-schedule.md), the binary carries a second media-crypto
layer: **SFrame** (Secure Frames), which encrypts each media frame's content end
to end. An earlier version of this page (from a single static `wasm-analysis`
read) reported the cipher as AES-CTR with an unknown key schedule. Two
independent reconstructions corrected that: the cipher is AES-128-GCM, and
the key schedule is now fully recovered.

> **Confidence.** The key schedule and GCM framing are `probable`: recovered
> by `wasm-analysis` and corroborated by two reconstructions
> ([zapo-caller](../../spec/tools.md) in TypeScript and
> [whatsapp-rust](../../spec/tools.md) in Rust) whose primitives are pinned to
> known-answer test vectors. Promoting to `confirmed` wants a recorded live
> capture as a third, independent technique.
>
> **Provenance.** Technique `wasm-analysis` · tools `warden`, `zapo-caller`,
> `whatsapp-rust` · contributors `purpshell`, `jlucaso1`, `auties`, `sheiitear`,
> `edgard` · sources: `wacore/src/voip/sframe.rs` (Rust, ported from
> `zapo-caller src/media/sframe.ts`), commit history. No key material in the repo.

## Correction: AES-128-GCM, not AES-CTR

The prior AES-CTR reading was string-based and weak (it leaned on the data
strings `"AES-128/256 integer counter mode"`, which in fact describe the SRTP
cipher, plus a function the deep pass mislabeled `sframe_aes256_ctr` that is
actually float DSP). Both reconstructions implement SFrame as AES-128-GCM, and
their GCM round-trips are KAT-validated. The CTR strings belong to the
[SRTP layer](srtp-key-schedule.md), not SFrame.

## Key derivation (recovered)

A per-participant key is derived from the 32-byte `callKey` with HKDF-SHA256,
splitting the call key into the HKDF salt and IKM:

```
sframe_key(participant) =
    HKDF-SHA256( salt = callKey[0:16],
                 ikm  = callKey[16:32],
                 info = "e2e sframe key" + participantID,
                 L    = 32 )
```

- The `info` label is the literal string **`e2e sframe key`** concatenated with
  the participant's formatted id, e.g. `e2e sframe key1234567890:0@lid`.
- **Participant id formatting:** a bare `@lid` jid with no device suffix gets a
  `:0` device, i.e. `user@lid` -> `user:0@lid`. The label must match
  byte-for-byte or the key is wrong, so the `:0` convention matters.
- **Direction:** the sender derives the key for the *peer* id, the receiver for
  *self* - the opposite convention to E2E SRTP (which uses self for send).

The related **WARP authentication key** (the media MESSAGE-INTEGRITY tag key) is a
separate HKDF with an empty salt:

```
warp_auth_key = HKDF-SHA256( salt = "", ikm = callKey, info = "warp auth key", L = 32 )
```

## Cipher and nonce

SFrame uses AES-128-GCM with a non-standard 16-byte nonce (not the RFC 5116
12-byte nonce). These three details are each pinned by KATs in the
reconstructions:

1. **Nonce** = `8 zero bytes || counter` where the counter is a little-endian
   u64, producing a 16-byte value used as the GCM nonce (GHASH-derived J0).
2. The SFrame header is appended *after* the ciphertext+tag and is *not* GCM
   AAD.
3. **Wire layout:** `[ ciphertext || 16-byte GCM tag || varint-header ]`. The
   header is a varint-encoded `(counter, key_id, ...)` trailer.

## Per-frame keying by key id

Keys are looked up by a **KID** (key index), consistent with SFrame's
per-sender / per-epoch identification. The class set in the binary
(`facebook::sframe::SFrameKeyProvider` + a WhatsApp wrapper `wa::sframe`) backs
this; the reconstructions implement the single-key path used by 1:1 calls.

## Composition with E2E SRTP

A 1:1 call therefore has two end-to-end media-crypto layers over the relay:
the [E2E SRTP](srtp-key-schedule.md) cipher (AES-CM) *and* SFrame (AES-GCM),
both keyed from the same `callKey` by different HKDF labels. Plus the relay's
hop-by-hop SRTP. The exact order in which they apply on the wire (SFrame
inside SRTP vs. alongside) is tracked below.

## Open questions

- The precise on-wire ordering of SFrame, E2E SRTP, and HBH SRTP for one
  media packet.
- The KID / epoch semantics for rekeying (the multi-key path beyond 1:1).
- The exact `key_id` and length fields inside the varint header.
- Whether a recorded live capture confirms GCM end-to-end (to reach `confirmed`).

## See also

[SRTP key schedule](srtp-key-schedule.md) · [encryption-keying](../encryption-keying.md)
· [media-srtp](../media-srtp.md) · [reconstruction](../reconstruction.md).
