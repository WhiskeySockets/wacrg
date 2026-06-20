<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# WARP key wrap

**Category:** [Crypto](../index.md#crypto)  
**Part id:** `warp-crypto`

**`warp-crypto`** · status: review · features: audio, video · since: 0.1.0

The WARP authentication key derived from the call key and the truncated WARP MESSAGE-INTEGRITY tag that authenticates each protected RTP packet, together with the audio-piggyback RTP extension word that carries it.

**Normative**

WARP adds a per-call **authentication key** and a per-packet
**MESSAGE-INTEGRITY (MI)** tag on top of the end-to-end SRTP payload cipher
(see [srtp-e2e](../crypto/srtp-e2e.md)). It uses the RTP extension profile `0xDEBE`.

**WARP auth key.** Each participant MUST derive the WARP auth key from the
32-byte call key (`callKey`, see [call-offer](../signalling/call-offer.md)) with HKDF-SHA256:

    IKM  = callKey                   ; the full 32 bytes
    salt = (empty)                   ; zero-length salt
    info = "warp auth key"           ; ASCII, no NUL terminator
    L    = 32
    authKey = OKM(32)

The derivation MUST NOT be performed unless `callKey` is exactly 32 bytes.

**WARP MESSAGE-INTEGRITY tag.** The MI tag MUST be computed as the first
4 bytes of HMAC-SHA1 over the protected packet bytes (everything that
precedes the tag) concatenated with the 32-bit rollover counter (ROC) in
big-endian byte order:

    tag = HMAC-SHA1(authKey, packet_without_tag || ROC_be32)[0..4]

where `ROC_be32` is the 4-byte big-endian encoding of the same ROC used to
build the E2E SRTP packet index. The 4-byte tag MUST be appended to the end
of the protected packet:

    wire = packet_without_tag || tag(4)

The sender MUST append this tag to every protected packet.

**Audio piggyback extension.** The MI tag is carried via a WARP RTP
extension. For audio, the per-packet extension word is selected by 0-based
packet index:

    packet_index 0, 1  -> no piggyback word (empty extension)
    packet_index >= 2  -> piggyback word 0x30010000

i.e. the first two packets of a stream carry an empty WARP extension and
every subsequent packet carries the 4-byte extension word `0x30 0x01 0x00
0x00`. The piggyback word MUST be emitted as a big-endian 32-bit value.

**Findings**

HMAC-SHA1, AES-128-CTR and HKDF-SHA256 are proven primitives. The auth key is
derived once per call from the full 32-byte call key (unlike the per-participant
E2E SRTP keys, which mix in the participant LID). The MI tag is present on the
wire but the receiver does not re-verify it; the payload cipher's correctness
is what gates a valid frame.

**Requires:** [`srtp-e2e`](../crypto/srtp-e2e.md), [`call-offer`](../signalling/call-offer.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working |  |
| [`meowmeow`](../../flavors.md) | working |  |
| [`meowcaller`](../../flavors.md) | planned |  |

**Open questions**

- Whether the receiver is ever required to verify the WARP MI tag, and what action a mismatch triggers.
- The full meaning of the 0x30010000 piggyback word beyond signalling MI presence, and the video-stream piggyback schedule (only the audio schedule is pinned).
- Whether the empty-extension-then-piggyback start offset (index >= 2) is fixed on the wire or negotiable.

**References**

- [RFC 2104 — HMAC](https://www.rfc-editor.org/rfc/rfc2104)
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)
- [RFC 8285 — A General Mechanism for RTP Header Extensions](https://www.rfc-editor.org/rfc/rfc8285)

---

[in the full RFC →](../index.md#warp-crypto) · [RFC contents](../index.md#contents)
