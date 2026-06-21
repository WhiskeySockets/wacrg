<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# SRTP master key and salt derivation

_Crypto · `srtp-master-key`_

`CRY-02` · _status: review · audio, video, group_

Derive the per-participant SRTP master key/salt from the call key, then expand the six SRTP/SRTCP session keys.

The call's shared `callKey` is delivered per recipient device in the offer's
`<enc>` payload (see [call-offer](../signalling/call-offer.md)). Derive in two layers.

**Layer 1 — WAHKDF (per participant).** HKDF-SHA256:

    IKM  = callKey
    salt = (none)
    info = participantLID            ; the participant's LID bytes
    L    = 46
    OKM  = masterKey(16) || masterSalt(14) || unused(16)

The trailing 16 bytes of OKM MUST be discarded.

**Layer 2 — RFC 3711 key derivation.** Expand the six session keys from
`masterKey`/`masterSalt` with AES-128-CM per RFC 3711 §4.3, using `masterSalt`
as the IV and XORing the label into `iv[7]`:

    key_i = AES-128-CM(masterKey, IV = masterSalt with iv[7] ^= label_i)

Labels `0x00`–`0x05` MUST produce, in order: SRTP cipher key (16), SRTP auth
key (20), SRTP salt (14), SRTCP cipher key (16), SRTCP auth key (20), SRTCP
salt (14). Negotiated suite: `AES_CM_128_HMAC_SHA1_80`.

Hop-by-hop SRTP (see [srtp-hop-by-hop](../crypto/srtp-hop-by-hop.md)) MUST skip Layer 1: the
relay supplies 30 bytes of `masterKey || masterSalt` directly; apply only Layer 2.

Requires: [`call-offer`](../signalling/call-offer.md)  
Breakdown: [`call-key`](../crypto/call-key.md), [`group-call-crypto`](../crypto/group-call-crypto.md), [`sframe-media`](../crypto/sframe-media.md), [`srtp-e2e`](../crypto/srtp-e2e.md), [`srtp-hop-by-hop`](../crypto/srtp-hop-by-hop.md), [`video-packetization`](../encodings/video-packetization.md), [`media-loop`](../relay/media-loop.md), [`ssrc`](../relay/ssrc.md), [`call-accept`](../signalling/call-accept.md), [`flow-outgoing-1to1`](../signalling/flow-outgoing-1to1.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `zapo-caller` | working | — | — |
| `meowcaller` | planned | — | util/hkdf + srtp/e2e are planned modules |

**Annotation** `wacrg:CRY-02` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/crypto/srtp-master-key.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/crypto/srtp-master-key.yaml)

**Open questions**
- Exact byte layout of participantLID used as HKDF info across all client versions.

**References**
- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)

---

[← in the full RFC](../../../index.md#srtp-master-key)
