<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# STUN relay handshake

**Category:** [Relay](../index.md#relay)  
**Part id:** `stun-relay`

**`stun-relay`** · status: draft · features: audio, video, group · since: 0.1.0

The STUN dialect WhatsApp uses to bind to a relay and select transport candidates before media flows.

**Normative**

Before media flows, a client MUST complete a STUN-based handshake against the
relay candidates carried in the offer's `<destination>` (see
[call-offer](../signalling/call-offer.md)), establishing the client↔relay binding that WARP frames
ride over. Candidates are annotated with measured latency so the lowest-latency
relay can be chosen.

**Findings**

A STUN dialect rather than full ICE; the candidate list and latency hints come
from the signalling plane.

**Requires:** [`call-offer`](../signalling/call-offer.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working |  |
| [`meowcaller`](../../flavors.md) | planned |  |

---

[in the full RFC →](../index.md#stun-relay) · [RFC contents](../index.md#contents)
