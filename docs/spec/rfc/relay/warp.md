<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# WARP relay framing

**Category:** [Relay](../index.md#relay)  
**Part id:** `warp`

**`warp`** · status: draft · features: audio, video, group · since: 0.1.0

The framing WhatsApp media uses across its relay, wrapping SRTP-protected RTP for forwarding through the relay infrastructure.

**Normative**

After the STUN-based relay handshake (see [stun-relay](../relay/stun-relay.md)), media MUST be
carried in WARP frames between client and relay. A WARP frame wraps the
hop-by-hop-protected RTP payload with the relay's forwarding header; the relay
forwards frames between participants without terminating the end-to-end SFrame
layer (see [sframe-media](../crypto/sframe-media.md)).

**Findings**

WARP sits between the SRTP layers and the relay transport. Exact header field
widths and the relay control sub-protocol are still being pinned.

**Requires:** [`stun-relay`](../relay/stun-relay.md), [`srtp-hop-by-hop`](../crypto/srtp-hop-by-hop.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working |  |
| [`meowcaller`](../../flavors.md) | planned |  |

**Open questions**

- WARP header field widths, endianness, and the relay control messages.

---

[in the full RFC →](../index.md#warp) · [RFC contents](../index.md#contents)
