<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# WARP relay framing

_Relay · `warp`_

_status: draft · audio, video, group_

WARP frames wrap SRTP-protected RTP for forwarding through the relay.

After the STUN relay handshake (see [stun-relay](../relay/stun-relay.md)), media MUST be
carried in WARP frames between client and relay.

- A WARP frame wraps the hop-by-hop-protected RTP payload with the relay
  forwarding header.
- The relay forwards frames between participants and MUST NOT terminate the
  end-to-end SFrame layer (see [sframe-media](../crypto/sframe-media.md)).

Parent: [`stun-relay`](../relay/stun-relay.md)  
Requires: [`stun-relay`](../relay/stun-relay.md), [`srtp-hop-by-hop`](../crypto/srtp-hop-by-hop.md)  
Breakdown: [`call-key`](../crypto/call-key.md), [`media-loop`](../relay/media-loop.md), [`rtp-framing`](../relay/rtp-framing.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | — | — |
| `zapo-caller` | working | — | — |

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/relay/warp.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/relay/warp.yaml)

**Open questions**
- WARP header field widths, endianness, and the relay control messages.

---

[← in the full RFC](../../../index.md#warp)
