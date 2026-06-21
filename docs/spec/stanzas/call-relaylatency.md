<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Relay Latency Probe / Report

**Tag:** `<call>`  
**Category:** transport  
**Status:** draft  
**Spec version:** 0.1.0  
**Direction:** outgoing, incoming

## Summary

A call-routed stanza used to probe and report round-trip latency to candidate WhatsApp voip relay servers. Before (and sometimes during) a call, a device measures how fast each relay candidate responds and either reports those measurements to the peer/server or requests fresh probes, so that the lowest-latency relay can be chosen for the SRTP media path. The stanza is believed to carry a <relaylatency> node listing per-relay latency samples, each keyed by a relay identifier or address. Exact framing, units, and whether the server or the peer consumes the report are still being reconstructed; confidence is low across the board.

## Attributes

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `from` | `jid` | yes | probable | Sender device JID of the latency report. | techniques: websocket-capture; sources: none |
| `to` | `jid` | no | speculative | Destination JID. May be absent when the report is consumed by the server itself (for relay selection) rather than routed to the peer. | techniques: websocket-capture; sources: none |
| `id` | `string` | yes | probable | Stanza id used to correlate the report with its server <ack>. | techniques: websocket-capture; sources: none |

## Children

### `<relaylatency>`

**occurrence:** 1 - **confidence:** speculative

Wrapper carrying one or more relay latency samples. Hypothesised to be emitted periodically while candidates are being evaluated, and again if the active relay degrades mid-call.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `call-id` | `string` | no | speculative | Call this latency report is associated with, when measured in the context of an active or ringing call. May be omitted for pre-call relay warm-up probes. | techniques: websocket-capture; sources: none |

#### `<relay>`

**occurrence:** 1..n - **confidence:** speculative

A single relay's latency sample. The element name is uncertain; <relay>, <te>, or a bare latency entry are all plausible.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `ip` | `string` | no | speculative | Address of the probed relay candidate. <br/>_observed:_ `203.0.113.10` | techniques: websocket-capture; sources: none |
| `token` | `string` | no | speculative | Opaque server-assigned relay token/identifier the candidate was advertised under, used instead of (or alongside) a raw address. | techniques: websocket-capture; sources: none |
| `latency` | `int` | yes | speculative | Measured round-trip latency to this relay. Units assumed to be milliseconds but not confirmed; could be a raw probe RTT in another unit. <br/>_observed:_ `28`, `64`, `150` | techniques: websocket-capture; sources: none |
| `jitter` | `int` | no | speculative | Optional jitter estimate accompanying the latency sample. | techniques: websocket-capture; sources: none |

## Examples

### Illustrative relay latency report for two candidates (synthetic)

> Synthetic and sanitized, not a real capture. Field names are a working hypothesis.

```xml
<call from="A.1@s.whatsapp.net" id="RL-0007">
  <relaylatency call-id="9f86d081">
    <relay ip="203.0.113.10" latency="28" jitter="3"/>
    <relay ip="198.51.100.5" latency="64" jitter="11"/>
  </relaylatency>
</call>
```

## Notes

Latency probing is a transport-layer concern that feeds relay/candidate selection carried by <call-transport>. The two are closely related: relaylatency supplies the measurements, the transport update applies the resulting choice. Whether probing uses STUN-style binding requests over UDP (out of band of the WebSocket) and only the summary is reported here is unconfirmed.

## Open questions

- Is the round-trip measured out-of-band over UDP, with only a summary reported in this stanza?
- What units does the latency attribute use (milliseconds assumed)?
- Does the server or the peer device consume the report for relay selection?
- Are relays identified by raw address, by an opaque server token, or both?
- How often is the report emitted, once pre-call, periodically, or only on degradation?

## References

- [RFC 8489, Session Traversal Utilities for NAT (STUN)](https://www.rfc-editor.org/rfc/rfc8489)

---

[Back to stanza catalog](./index.md) - [Spec overview](../index.md)
