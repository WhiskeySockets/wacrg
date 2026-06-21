<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# SSRC allocation

_Relay · `ssrc`_

_status: review · audio, video, group, screen-share_

RTP SSRCs are deterministically derived per participant and stream slot via HKDF-SHA256 over the call id, participant LID, and slot index.

Every SSRC is derived deterministically; none are negotiated or random.

**Per-stream SSRC derivation.** Each SSRC MUST be HKDF-SHA256:

    salt = slotWord            ; slot index as little-endian u32 (4 bytes)
    IKM  = callId              ; call id bytes
    info = participantLID      ; participant LID bytes
    L    = 4
    SSRC = u32_from_le_bytes(OKM)   ; 4-byte OKM read as little-endian u32

**Slot allocation.** A participant occupies nine relay stream slots. The slot
words, in stream order, MUST be:

    [0, 1, 4, 2, 3, 5, 7, 8, 6]

The array index is the stream index; the value at that index is the slot word
fed to HKDF as the salt. To derive all nine SSRCs, apply the per-stream
derivation with each slot word in this exact order.

**Participant mapping.** The same `participantLID` byte string MUST be used
here as is used for the HKDF `info` elsewhere for that participant (see
[srtp-master-key](../crypto/srtp-master-key.md)).

**Participant LID formatting.** `info` is the device-qualified LID:
- Strip any resource part (after `/`) first.
- A bare `<user>@lid` (no device suffix) MUST be qualified to device `0`:
  `<user>@lid` becomes `<user>:0@lid`.
- A LID already carrying a `:N@lid` device suffix MUST pass through unchanged.
- JIDs whose domain is not `lid` MUST pass through unchanged.
- On receive, an implementation MAY try both the `:0@lid` and bare `@lid`
  forms as candidate `info` values when matching a peer sender.

Requires: [`srtp-master-key`](../crypto/srtp-master-key.md)  
Breakdown: [`video-packetization`](../encodings/video-packetization.md), [`media-loop`](../relay/media-loop.md), [`rtcp`](../relay/rtcp.md), [`rtp-framing`](../relay/rtp-framing.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | — | — |
| `zapo-caller` | working | — | original derivation ported from src/media/voip-crypto.ts |

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/relay/ssrc.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/relay/ssrc.yaml)

**Open questions**
- Semantic meaning of each of the nine slots (which slot carries audio vs. video vs. screen-share, and primary vs. RTX/FEC) is not pinned by the source.
- Whether the slot-word permutation is fixed for all client versions or negotiated/versioned.

**References**
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)
- [RFC 3550 — RTP (SSRC)](https://www.rfc-editor.org/rfc/rfc3550)

---

[← in the full RFC](../../../index.md#ssrc)
