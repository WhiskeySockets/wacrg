<!-- Hand-written narrative. Detail page for transport-noise.md + ice-and-relays.md.
     New findings from the VoIP reconstructions (zapo-caller, whatsapp-rust). -->

# WARP, STUN, and relay media transport

[media-srtp](../media-srtp.md) and [ice-and-relays](../ice-and-relays.md) note
that media flows as SRTP/UDP to WhatsApp relays over a STUN-like dialect, but the
packet formats were unmapped. The VoIP reconstructions fill that in: the media
transport is **WARP** (WhatsApp's RTP profile) carried over a custom **STUN**
framing to the relay.

> **Confidence.** `probable` - recovered from two reconstructions
> ([zapo-caller](../../spec/tools.md) TS, [whatsapp-rust](../../spec/tools.md)
> Rust) whose framing is pinned to captured packets, and consistent with the
> `wasm-analysis` view of the relay code. `confirmed` wants a fresh on-wire
> capture decoded against these formats.
>
> **Provenance.** Technique `wasm-analysis` · tools `warden`, `zapo-caller`,
> `whatsapp-rust` · contributors `purpshell`, `jlucaso1`, `auties`, `sheiitear`,
> `edgard` · sources: `wacore/src/voip/{stun,rtp,rtcp,relay_parse,ssrc,warp}.rs`,
> commit history. Synthetic examples only; no captured packets in the repo.

## Relay STUN dialect

The relay is reached with **RFC 5389 STUN** framing (20-byte header, TLV
attributes) plus WhatsApp-specific message types and attributes:

| field | value |
| --- | --- |
| magic cookie | `0x2112A442` (standard) |
| keepalive ping | message type **`0x0801`** |
| keepalive pong | message type **`0x0802`** |
| allocate | message type **`0x0003`** |
| FINGERPRINT | IEEE CRC-32 (poly `0xEDB88320`) **XOR `0x5354554E`** ("STUN") |
| MESSAGE-INTEGRITY | HMAC-SHA1 keyed by the **relay key** |

Allocate carries **custom attributes** in the `0x4000` range (e.g. `0x4000`,
`0x4024`, `0x4025`) whose values are **protobuf**-encoded - the relay token /
routing descriptors. (This corrects earlier capture-only guesses that mislabeled
the allocate type; the reconstructions send `0x0003`.)

## WARP RTP

Media rides a WhatsApp RTP profile, **WARP**:

- **First byte `0x90`** - RTP version 2 with the extension bit set (`X=1`).
- **Payload type 120 / 121** - the MLow audio payload types.
- **Header extension profile `0xDEBE`** - a 16-byte header when there is no
  extra extension, or **20 bytes** when DTX / piggyback-audio fields are present.
- The reconstructions also note fixed **priming frames** at stream start
  (an 18-byte frame, a 24-byte WASM variant, a 5-byte form).

## WARP MESSAGE-INTEGRITY (media auth tag)

Each media packet carries a short authentication tag:

```
warp_mi = HMAC-SHA1( warp_auth_key, packet_bytes || ROC_be32 )[:4]
```

- The key is `warp_auth_key` = `HKDF-SHA256("", callKey, "warp auth key", 32)`
  (see [SFrame](../keying/sframe-media-e2ee.md)).
- The tag is the **first 4 bytes** of the HMAC over the packet concatenated with
  the 32-bit roll-over counter (big-endian). The reconstructions note it is
  appended on send but **not verified on receive** in the 1:1 path.

## SSRC derivation

The RTP SSRC is **derived**, not random, so both ends agree without negotiation:

```
ssrc = HKDF-SHA256( salt = slot_word_LE32, ikm = call_id, info = LID, L = 4 )
       interpreted as a little-endian u32
```

where `slot_word` selects the media slot (audio vs. RTCP, direction). This lets a
receiver predict the peer's SSRC from the call id and participant LID.

## Where this sits

- The **Noise WebSocket** carries call *signaling* only (see
  [transport-noise](../transport-noise.md)).
- This page is the **media plane** transport: WARP/RTP inside the relay's STUN
  framing, authenticated hop-by-hop by [HBH SRTP](../keying/srtp-key-schedule.md)
  and end-to-end by [E2E SRTP + SFrame](../keying/sframe-media-e2ee.md).

## Open questions

- The full protobuf schema of the `0x40xx` allocate attributes (relay token).
- Exact RTCP (compound) layout and the `slot_word` values for each media slot.
- The role of each priming-frame variant and when each is sent.
- A fresh capture to move these from `probable` to `confirmed`.

## See also

[ice-and-relays](../ice-and-relays.md) · [media-srtp](../media-srtp.md) ·
[SRTP key schedule](../keying/srtp-key-schedule.md) ·
[reconstruction](../reconstruction.md).
