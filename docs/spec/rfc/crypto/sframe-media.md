<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# SFrame media end-to-end encryption

**Category:** [Crypto](../index.md#crypto)  
**Part id:** `sframe-media`

**`sframe-media`** · status: draft · features: audio, video, group · since: 0.1.0

Per-frame end-to-end encryption of media payloads (SFrame-style), applied above the SRTP layers so the relay never sees plaintext media.

**Normative**

Each media frame MUST be sealed end-to-end before transport with an SFrame-style
AEAD: an authenticated header carrying a key id and a monotonic frame counter,
with the payload encrypted under a per-participant SFrame key derived from the
call key. The frame counter MUST NOT repeat under a given key. The relay MUST be
unable to recover plaintext media; it only forwards sealed frames.

**Findings**

Recovered in the WhatsApp Web engine as `facebook::rtc::e2ee::FrameDataHandler*`
classes. Group calls extend this with per-sender keys.

**Requires:** [`srtp-master-key`](../crypto/srtp-master-key.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working |  |
| [`meowcaller`](../../flavors.md) | planned |  |

**Open questions**

- Exact AEAD suite, nonce construction, and header varint layout.
- Group-call key distribution and rotation.

---

[in the full RFC →](../index.md#sframe-media) · [RFC contents](../index.md#contents)
