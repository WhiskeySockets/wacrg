<!-- Hand-written narrative. Companion to srtp-key-schedule.md; the per-frame layer.
     Honest about the function-level uncertainty (agent crypto names are unreliable here). -->

# SFrame: per-frame media E2EE

Alongside [SRTP](srtp-key-schedule.md), the binary carries a second media-crypto
layer: **SFrame** (Secure Frames), which encrypts each media frame's content end
to end. This page records what is verified about it and is explicit about what is
not, because the function-level naming here is unreliable (see the caveat).

> **Confidence.** The *layer* and its *cipher suites* are `probable` (recovered
> from the binary's own RTTI and cipher-suite strings). The *key schedule*, the
> *frame header*, and *how SFrame composes with E2E SRTP* are `speculative` /
> open. One technique (static `wasm-analysis`), so `probable` at most.
>
> **Provenance.** Module `wa.wasm` SHA-1 `3638a50…`. Technique `wasm-analysis` ·
> tool `warden` · contributor `purpshell` · sources: commit history. No key
> material in the repo.

## What is verified

- **The layer exists and is WhatsApp-wrapped.** The binary contains Meta's
  `facebook::sframe` (`SFrameKeyProvider`, `ISFrameKeyProvider`, `Key`,
  `CipherInterface`, `KeyCryptoInterface`) and a WhatsApp wrapper
  `wa::sframe` - `wa::sframe::cipher::WASframeAESCipher`,
  `wa::sframe::cipher::WASframeCipherFactory`, `wa::sframe::crypto::WASframeKeyCrypto`.
- **Cipher suites: AES-CTR, 128 and 256-bit.** The data section holds the literal
  suite names `"AES-128 integer counter mode"` and `"AES-256 integer counter mode"`
  (addresses 80 and 160). "Integer counter mode" is CTR. Authentication is
  **HMAC-SHA1** (the binary's only HMAC string is `"hmac sha-1 authentication
  function"`, shared with SRTP). So the suite is an **AES-CTR + HMAC-SHA1** SFrame
  profile, in 128 and 256-bit key variants.
- **Per-frame keying by key id.** `SFrameKeyProvider` looks keys up by a **KID**
  (key index), with a bound of 64 slots - consistent with SFrame's per-sender /
  per-epoch key identification.
- **It covers audio and video.** A key-provider decrypt path references
  `webrtc_shim::VideoFrameBuffer`, so SFrame protects media frames generally, not
  just audio.

## What is NOT recovered (and why)

- **The key schedule.** Standard SFrame (RFC 9605) derives the per-frame key/salt/
  auth key from a base secret with `HKDF` and labels like
  `"SFrame 1.0 AES CM AEAD Key"`. **Those labels are absent** from this binary, so
  `wa::sframe` uses a **custom** derivation. The base-key source (does it chain
  from the call key? a separate ratchet?) and the exact HKDF inputs are unmapped.
- **The frame header format** (config byte, KID, counter encoding) - unread.
- **Composition with E2E SRTP.** Whether SFrame *is* the end-to-end layer (with
  SRTP only hop-by-hop), or whether E2E SRTP and SFrame are **stacked**, is an
  open question. The [SRTP page](srtp-key-schedule.md) documents an E2E SRTP
  derived from the call key; reconciling that with this per-frame SFrame layer is
  the key unknown.

> **Caveat - function names here are unreliable.** The deep-analysis pass named
> several functions in this cluster for crypto they do not perform.
> `sframe_aes256_ctr_crypt_blocks` (#1522), for instance, is **float vector math**
> (`vector_divide_f32`, `memf32` multiply), not AES - it merely references the
> `"AES-256 integer counter mode"` string via an `i32.const` address collision
> (the same trap as the H.264 false positives #7466/#7952). So the *suite strings*
> and *RTTI classes* are trustworthy anchors; the *agent crypto names*
> (`sframe_encrypt_counter`, `sframe_key_provider_compute`, …) are not, and the
> real cipher backend is most likely the shared `aes_*_ctr` primitives (#430/#465/
> #468/#514) rather than the sframe-named functions. Mapping the true
> implementation needs body-by-body reads.

## Open questions

- The `wa::sframe` key derivation: base secret, KDF, and labels.
- The SFrame frame header byte layout and the KID/counter encoding.
- E2E SRTP vs SFrame: one layer or two, and in what order relative to HBH SRTP.
- Which functions actually implement the AES-CTR + HMAC cipher (vs the
  mislabelled DSP/utility functions in this cluster).

## See also

[SRTP key schedule](srtp-key-schedule.md) · [encryption-keying](../encryption-keying.md)
· [media-srtp](../media-srtp.md) · [reconstruction](../reconstruction.md).
