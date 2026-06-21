<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Hop-by-hop SRTP

_Crypto · `srtp-hop-by-hop`_

_status: draft · audio, video, group_

Relay-facing SRTP layer protecting each client↔relay hop, independent of the end-to-end layer.

- Client↔relay media MUST use a hop-by-hop SRTP context independent of the end-to-end context.
- Suite: `AES_CM_128_HMAC_SHA1_80`.
- The relay supplies 30 bytes of `masterKey || masterSalt` directly. Hop-by-hop keying
  MUST skip the WAHKDF layer and apply only the RFC 3711 expansion (see
  [srtp-master-key](../crypto/srtp-master-key.md)).

Parent: [`srtp-master-key`](../crypto/srtp-master-key.md)  
Requires: [`srtp-master-key`](../crypto/srtp-master-key.md)  
Breakdown: [`srtp-e2e`](../crypto/srtp-e2e.md), [`video-packetization`](../encodings/video-packetization.md), [`relay-candidates`](../relay/relay-candidates.md), [`rtcp`](../relay/rtcp.md), [`rtp-framing`](../relay/rtp-framing.md), [`warp`](../relay/warp.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `zapo-caller` | working | — | — |

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/crypto/srtp-hop-by-hop.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/crypto/srtp-hop-by-hop.yaml)

---

[← in the full RFC](../../../index.md#srtp-hop-by-hop)
