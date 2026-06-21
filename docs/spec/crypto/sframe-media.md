<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# SFrame media end-to-end encryption

_Crypto · `sframe-media`_

`CRY-04` · _status: draft · audio, video, group_

Per-frame end-to-end AEAD sealing of media payloads, applied above SRTP so the relay only forwards ciphertext.

- Each media frame MUST be sealed with an SFrame-style AEAD before transport.
- The sealed frame carries an authenticated header (key id + monotonic frame
  counter) over a payload encrypted under a per-participant SFrame key derived
  from the call key.
- The frame counter MUST NOT repeat under a given key.
- The relay MUST be unable to recover plaintext; it only forwards sealed frames.
- Group calls use per-sender keys.

Requires: [`srtp-master-key`](../crypto/srtp-master-key.md)  
Breakdown: [`call-key`](../crypto/call-key.md), [`group-call-crypto`](../crypto/group-call-crypto.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `zapo-caller` | working | — | — |

**Annotation** `wacrg:CRY-04` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/crypto/sframe-media.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/crypto/sframe-media.yaml)

**Open questions**
- Exact AEAD suite, nonce construction, and header varint layout.
- Group-call key distribution and rotation.

---

[← in the full spec](../../index.md#sframe-media)
