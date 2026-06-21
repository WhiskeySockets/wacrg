<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# WARP key wrap

_Crypto · `warp-crypto`_

`CRY-07` · _status: review · audio, video_

WARP adds a per-call authentication key and a truncated per-packet MESSAGE-INTEGRITY tag, carried by the audio-piggyback RTP extension word.

WARP adds a per-call **authentication key** and a per-packet
**MESSAGE-INTEGRITY (MI)** tag on top of the E2E SRTP payload cipher
([srtp-e2e](../crypto/srtp-e2e.md)). RTP extension profile: `0xDEBE`.

**WARP auth key.** Derive from the 32-byte call key (`callKey`, see
[call-offer](../signalling/call-offer.md)) with HKDF-SHA256:

    IKM  = callKey                   ; full 32 bytes
    salt = (empty)                   ; zero-length
    info = "warp auth key"           ; ASCII, no NUL terminator
    L    = 32
    authKey = OKM(32)

Derivation MUST NOT run unless `callKey` is exactly 32 bytes.

**MI tag.** First 4 bytes of HMAC-SHA1 over the protected packet bytes
(everything preceding the tag) concatenated with the 32-bit ROC in big-endian:

    tag  = HMAC-SHA1(authKey, packet_without_tag || ROC_be32)[0..4]
    wire = packet_without_tag || tag(4)

`ROC_be32` is the 4-byte big-endian encoding of the same ROC used to build the
E2E SRTP packet index. The sender MUST append the 4-byte tag to every
protected packet.

**Audio piggyback extension.** The MI tag is carried via a WARP RTP extension,
selected by 0-based packet index:

    packet_index 0, 1  -> no piggyback word (empty extension)
    packet_index >= 2  -> piggyback word 0x30010000

The piggyback word MUST be emitted as a big-endian 32-bit value
(`0x30 0x01 0x00 0x00`).

**Notes.** The MI tag is present on the wire but the receiver does not re-verify it; the
payload cipher's correctness gates a valid frame.

Requires: [`srtp-e2e`](../crypto/srtp-e2e.md), [`call-offer`](../signalling/call-offer.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [history ↗](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/warp.rs) · [blame ↗](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/warp.rs) · commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `zapo-caller` | working | — | — |
| `meowcaller` | planned | — | — |

**Annotation** `wacrg:CRY-07` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/crypto/warp-crypto.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/crypto/warp-crypto.yaml)

**Open questions**
- Whether the receiver is ever required to verify the WARP MI tag, and what action a mismatch triggers.
- The full meaning of the 0x30010000 piggyback word beyond signalling MI presence, and the video-stream piggyback schedule (only the audio schedule is pinned).
- Whether the empty-extension-then-piggyback start offset (index >= 2) is fixed on the wire or negotiable.

**References**
- [RFC 2104 — HMAC](https://www.rfc-editor.org/rfc/rfc2104)
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)
- [RFC 8285 — A General Mechanism for RTP Header Extensions](https://www.rfc-editor.org/rfc/rfc8285)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[← in the full spec](../../index.md#warp-crypto)
