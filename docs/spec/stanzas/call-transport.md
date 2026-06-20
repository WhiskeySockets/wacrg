<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call Transport Update

**Tag:** `<call>`  
**Category:** transport  
**Status:** draft  
**Spec version:** 0.1.0  
**Direction:** outgoing, incoming

## Summary

A call-routed stanza carrying ICE/relay transport information used to establish and update the media path between peers. It conveys candidate transport endpoints (<te>/<endpoint>) describing WhatsApp voip relay (TURN-like) hosts, their IP/port, protocol, priority, and measured latency. Both the initiating offer and subsequent standalone transport updates can carry this <transport>/<destination> material so that each side can pick the lowest-latency relay candidate and react to network changes (e.g. Wi-Fi to cellular handover) during an active call. The exact framing is still being reconstructed; treat candidate encoding and attribute names as a working model rather than confirmed fact.

## Attributes

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `from` | `jid` | yes | probable | Sender device JID of the transport update. For server-routed stanzas this is rewritten by the server to the originating peer device address. | techniques: websocket-capture; sources: none |
| `to` | `jid` | yes | probable | Destination device JID the transport update is routed to. | techniques: websocket-capture; sources: none |
| `id` | `string` | yes | probable | Stanza id used to correlate the transport update with its server <ack>. Mirrors the id-handling of other call stanzas. | techniques: websocket-capture; sources: none |

## Children

### `<transport>`

**occurrence:** 0..1 · **confidence:** speculative

Wrapper for an in-call transport/ICE update sent outside the initial offer. Carries an updated set of relay/candidate endpoints when the network path changes. We are not yet certain whether updates reuse the <transport> tag or are folded into a fresh <offer>/<destination>; both shapes have been hypothesised.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `call-id` | `string` | yes | probable | Identifier of the call this transport update belongs to. | techniques: websocket-capture; sources: none |
| `call-creator` | `jid` | no | probable | JID of the device that created the call, used (with call-id) to uniquely key the call across both peers and the server. | techniques: websocket-capture; sources: none |
| `ver` | `int` | no | speculative | Monotonic version/sequence number letting the peer discard stale transport updates and apply only the newest candidate set. Presence and naming unconfirmed. | techniques: websocket-capture; sources: none |

#### `<destination>`

**occurrence:** 0..1 · **confidence:** probable

Container for one or more candidate transport endpoints describing relay servers the media stream can be sent to.

##### `<te>`

**occurrence:** 0..n · **confidence:** speculative

A single transport-endpoint candidate (abbreviation believed to stand for "transport endpoint"). Encodes a relay host address plus selection metadata. May appear as <te> or as <endpoint>; the two are treated as the same concept here pending confirmation.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `ip` | `string` | no | speculative | IPv4/IPv6 address of the relay candidate. May instead be carried as a raw bytes blob rather than a string attribute. <br/>_observed:_ `203.0.113.10`, `2001:db8::8a2e:370:7334` | techniques: websocket-capture; sources: none |
| `port` | `int` | no | speculative | UDP port for the relay candidate. <br/>_observed:_ `3478`, `50000` | techniques: websocket-capture; sources: none |
| `priority` | `int` | no | speculative | ICE-style priority used to order candidates; higher generally preferred. Whether this follows RFC 8445 priority math is unverified. | techniques: websocket-capture; sources: none |
| `proto` | `string` | no | speculative | Transport protocol hint for the candidate (e.g. udp). <br/>_observed:_ `udp` | techniques: websocket-capture; sources: none |
| `latency` | `int` | no | speculative | Last measured round-trip latency (milliseconds) to this relay, likely populated from <relaylatency> probes to inform candidate selection. <br/>_observed:_ `28`, `64` | techniques: websocket-capture; sources: none |

##### `<endpoint>`

**occurrence:** 0..n · **confidence:** speculative

Alternate/observed spelling of a relay candidate entry. Listed separately because some decodes show <endpoint> rather than <te>; they are believed to be the same structure. Resolving which tag is canonical is an open question.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `ip` | `string` | no | speculative | Relay candidate address. | techniques: websocket-capture; sources: none |
| `port` | `int` | no | speculative | Relay candidate UDP port. | techniques: websocket-capture; sources: none |

## Examples

### Illustrative in-call transport update with two relay candidates (synthetic)

> Synthetic and sanitized, not a real capture. Candidate encoding is a working hypothesis.

```xml
<call from="A.1@s.whatsapp.net" to="B.2@s.whatsapp.net" id="TR-0001">
  <transport call-id="9f86d081" call-creator="A@s.whatsapp.net" ver="3">
    <destination>
      <te ip="203.0.113.10" port="3478" proto="udp" priority="65535" latency="28"/>
      <te ip="198.51.100.5" port="50000" proto="udp" priority="32768" latency="64"/>
    </destination>
  </transport>
</call>
```

## Notes

Media itself is SRTP over UDP and never traverses the signaling WebSocket; only the relay/candidate metadata to set up that media path is carried here. The relationship between these transport endpoints and the <net> block inside the initial offer is not fully mapped.

## Open questions

- Is the canonical child tag <te>, <endpoint>, or both depending on context?
- Are candidate IP/port encoded as string attributes or as a packed binary blob?
- Do in-call updates reuse <transport>, or are they re-sent as a fresh <offer>/<destination>?
- How does candidate priority relate (if at all) to standard ICE priority computation?
- Where is the SRTP keying material relative to transport selection, fixed at offer time or renegotiated?

## References

- [RFC 8445, Interactive Connectivity Establishment (ICE)](https://www.rfc-editor.org/rfc/rfc8445)
- [RFC 8656, Traversal Using Relays around NAT (TURN)](https://www.rfc-editor.org/rfc/rfc8656)

---

[Back to stanza catalog](./index.md) · [Spec overview](../index.md)
