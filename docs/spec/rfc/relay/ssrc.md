<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# SSRC allocation

**Category:** [Relay](../index.md#relay)  
**Part id:** `ssrc`

**`ssrc`** · status: review · features: audio, video, group, screen-share · since: 0.1.0

How RTP synchronization-source identifiers (SSRCs) are deterministically derived for each participant and each relay media stream from the call id and the participant LID, and how the nine relay stream slots are ordered.

**Normative**

SSRCs are not negotiated or randomly chosen: every SSRC is **derived
deterministically** so that all peers and the relay independently compute the
same value for a given participant and stream slot.

**Per-stream SSRC derivation.** Each SSRC MUST be derived with HKDF-SHA256:

    salt = slotWord                   ; the slot index as a little-endian u32 (4 bytes)
    IKM  = callId                     ; the call id bytes
    info = participantLID             ; the participant's LID bytes
    L    = 4
    SSRC = u32_from_le_bytes(OKM)     ; the 4-byte OKM read back as a little-endian u32

The `slotWord` is the 4-byte little-endian encoding of the slot index used as
the HKDF salt. The 4-byte HKDF output MUST be interpreted as a little-endian
`u32` to obtain the 32-bit SSRC.

**Slot allocation.** A participant occupies a fixed plan of **nine** relay
stream slots. The slot words, in stream order, MUST be:

    [0, 1, 4, 2, 3, 5, 7, 8, 6]

An implementation that needs all nine of a participant's relay stream SSRCs
MUST derive them by applying the per-stream derivation above with each of the
nine slot words in this exact order; the resulting array index is the stream
index and the value at that index is the slot word fed to HKDF as the salt.

**Participant mapping.** Because `info = participantLID`, every participant's
SSRCs are distinct from every other participant's, and because `IKM = callId`,
SSRCs do not collide across unrelated calls. The same `participantLID` byte
string MUST be used for SSRC derivation as is used elsewhere as the HKDF
`info` for that participant (see [srtp-master-key](../crypto/srtp-master-key.md)).

**Participant LID formatting.** The participant LID used as `info` is the
device-qualified LID. A bare `@lid` JID (no device suffix) MUST be qualified
to device `0` — i.e. `<user>@lid` becomes `<user>:0@lid` — before use. A LID
that already carries a `:N@lid` device suffix MUST be passed through
unchanged. JIDs whose domain is not `lid` MUST be passed through unchanged.
Any resource part (after `/`) MUST be stripped first. On the receive path an
implementation MAY try the device-qualified `:0@lid` form and the bare
`@lid` form as candidate `info` values when matching a peer sender.

**Findings**

The nine-slot plan and the `[0, 1, 4, 2, 3, 5, 7, 8, 6]` slot-word ordering
come from the relay's stream-allocate plan: the array index is the position
in the relay's stream list, and the value is the salt word fed to HKDF, so the
on-wire stream order is a permutation of the natural slot indices. The
derivation is keyed only on `callId`, `participantLID`, and the slot word, so
no round-trip with the relay is required to learn a peer's SSRCs — a receiver
can precompute every expected SSRC for every known participant.

**Requires:** [`srtp-master-key`](../crypto/srtp-master-key.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working | original derivation ported from src/media/voip-crypto.ts |
| [`meowcaller`](../../flavors.md) | planned | relay path is planned |

**Open questions**

- Semantic meaning of each of the nine slots (which slot carries audio vs. video vs. screen-share, and primary vs. RTX/FEC) is not pinned by the source.
- Whether the slot-word permutation is fixed for all client versions or negotiated/versioned.

**References**

- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)
- [RFC 3550 — RTP (SSRC)](https://www.rfc-editor.org/rfc/rfc3550)

---

[in the full RFC →](../index.md#ssrc) · [RFC contents](../index.md#contents)
