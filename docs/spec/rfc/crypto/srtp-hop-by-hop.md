<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Hop-by-hop SRTP

**Category:** [Crypto](../index.md#crypto)  
**Part id:** `srtp-hop-by-hop`

**`srtp-hop-by-hop`** · status: draft · features: audio, video, group · since: 0.1.0

The relay-facing SRTP layer that protects media on each hop between a client and the relay, distinct from the end-to-end layer.

**Normative**

Media between a client and the relay MUST be protected with a hop-by-hop SRTP
context that is independent of the end-to-end context. The relay supplies 30 bytes
of `masterKey || masterSalt` directly, so hop-by-hop keying MUST skip the WAHKDF
layer and apply only the RFC 3711 expansion (see
[srtp-master-key](../crypto/srtp-master-key.md)). The suite is `AES_CM_128_HMAC_SHA1_80`.

**Findings**

This is the outer of two nested SRTP layers: end-to-end protects media across the
whole path; hop-by-hop protects each client↔relay hop and is terminated at the relay.

**Requires:** [`srtp-master-key`](../crypto/srtp-master-key.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working |  |
| [`meowcaller`](../../flavors.md) | planned |  |

---

[in the full RFC →](../index.md#srtp-hop-by-hop) · [RFC contents](../index.md#contents)
