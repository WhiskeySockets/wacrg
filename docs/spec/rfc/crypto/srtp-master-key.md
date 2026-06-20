<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# SRTP master key and salt derivation

**Category:** [Crypto](../index.md#crypto)  
**Part id:** `srtp-master-key`

**`srtp-master-key`** · status: review · features: audio, video, group · since: 0.1.0

How the per-participant SRTP master key and salt are derived from the call key, and how the six SRTP/SRTCP session keys are expanded from them.

**Normative**

A call establishes a shared **call key** (`callKey`), delivered to each recipient
device in the offer's `<enc>` payload (see [call-offer](../signalling/call-offer.md)). Each
participant MUST derive its end-to-end SRTP master key and salt in two layers.

**Layer 1 — WAHKDF (per participant).** The master secret MUST be derived with
HKDF-SHA256:

    IKM  = callKey
    salt = (none)
    info = participantLID            ; the participant's LID bytes
    L    = 46
    OKM  = masterKey(16) || masterSalt(14) || unused(16)

The trailing 16 bytes of OKM MUST be discarded.

**Layer 2 — RFC 3711 key derivation.** The six session keys MUST be expanded from
`masterKey`/`masterSalt` with AES-128 in counter mode per RFC 3711 §4.3, using the
master salt as the IV and XORing the key-derivation label into `iv[7]`:

    key_i = AES-128-CM(masterKey, IV = masterSalt with iv[7] ^= label_i)

Labels `0x00`–`0x05` MUST produce, in order: SRTP cipher key (16), SRTP auth key
(20), SRTP salt (14), SRTCP cipher key (16), SRTCP auth key (20), SRTCP salt (14).
The negotiated suite is `AES_CM_128_HMAC_SHA1_80`.

Hop-by-hop SRTP (see [srtp-hop-by-hop](../crypto/srtp-hop-by-hop.md)) MUST skip Layer 1: the
relay supplies 30 bytes of `masterKey || masterSalt` directly, and only Layer 2 is
applied.

**Findings**

HKDF here rests on a proven primitive — the Layer-1 derivation is verified against
the RFC 5869 Appendix A known-answer test in at least one implementation. All
derived keys are distinct per participant LID, so each peer's media is keyed
independently.

**Requires:** [`call-offer`](../signalling/call-offer.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working |  |
| [`meowmeow`](../../flavors.md) | working |  |
| [`meowcaller`](../../flavors.md) | planned | util/hkdf + srtp/e2e are planned modules |

**Open questions**

- Exact byte layout of participantLID used as HKDF info across all client versions.

**References**

- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)

---

[in the full RFC →](../index.md#srtp-master-key) · [RFC contents](../index.md#contents)
