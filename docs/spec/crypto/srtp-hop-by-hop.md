<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Hop-by-hop SRTP

_Crypto - `srtp-hop-by-hop`_

`CRY-03` - _status: draft - audio, video, group_

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

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [:material-github: history](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/hbh_srtp.rs) - [:material-github: blame](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/hbh_srtp.rs) - commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `zapo-caller` | working | — | — |

**Annotation** `wacrg:CRY-03` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

**Contributors** [![Rajeh Taher](https://github.com/purpshell.png?size=20) Rajeh Taher](../contributors.md#purpshell) (wrote initial spec)

[:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/crypto/srtp-hop-by-hop.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/crypto/srtp-hop-by-hop.yaml)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#srtp-hop-by-hop)
