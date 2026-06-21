<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Relay latency reporting

_Signalling · `call-relaylatency`_

`SIG-15` · _status: draft · audio, video, group_

A client reports a measured relay round-trip time via a `<relaylatency>` call action whose `<te>` element names the relay and carries an offset-encoded latency.

Send a `<call>` stanza carrying a `<relaylatency>` action child. The action MUST
carry the `call-id` and `call-creator` attributes used by the rest of the call's
signalling (see [call-offer](../signalling/call-offer.md)):

    <call to="{peer-jid}">
      <relaylatency call-id="{call-id}" call-creator="{call-creator-jid}">
        <te latency="{encoded}" relay_name="{relay}">{address-bytes}</te>
        <destination>
          <to jid="{peer-device-jid}"/>
          ...
        </destination>
      </relaylatency>
    </call>

- The `<call>` wrapper MUST set `to` to the peer JID and MUST NOT carry an `id`
  attribute on the action.
- The action MUST contain exactly one `<te>` child. The `<te>` element MUST carry
  a `latency` attribute (encoding below), a `relay_name` attribute naming the relay
  (e.g. `gru1c02`), and the relay's binary address as the element's raw byte content.

**Latency encoding.** `latency` MUST be the decimal string of the RTT in
milliseconds added to the fixed 32-bit offset `0x02000000` (33554432), in unsigned
32-bit arithmetic:

    latency = decimal_string( 0x02000000 + rtt_ms )

RTT 45 ms encodes as `"33554477"`.

**Destination.** When targeting specific peer devices, the action SHOULD include a
`<destination>` child with one `<to jid="..."/>` per target device. `<destination>`
MUST be omitted when there are no target devices (e.g. an inbound callee reporting
to the call creator).

**Receiving.** A `<call>` whose action child tag is `relaylatency` MUST be treated
as a relay-latency report keyed by `call-id` and `call-creator`. A receiver MUST NOT
reject the signalling when the action carries no `<te>` or `<destination>` children.

**Notes.** `relaylatency` is a recognised call action alongside `offer`, `offer_notice`,
`preaccept`, `accept`, `reject`, `terminate`, and `transport`; parsers omitting it
from their known-action set silently drop the stanza.

Requires: [`call-offer`](../signalling/call-offer.md), [`stun-relay`](../relay/stun-relay.md)  
Breakdown: [`relay-candidates`](../relay/relay-candidates.md), [`flow-outgoing-1to1`](../signalling/flow-outgoing-1to1.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [history ↗](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stanza.rs) · [blame ↗](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stanza.rs) · commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | build_relay_latency + encode_latency in wacore voip::stanza; parsed as CallAction::RelayLatency |
| `zapo-caller` | working | — | ported from src/signaling.ts; relay path covered |

**Annotation** `wacrg:SIG-15` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/call-relaylatency.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/call-relaylatency.yaml)

**Open questions**
- Exact byte layout of the relay address carried as <te> content, and whether it matches the relay-candidate address format.
- The set of valid relay_name values and how a client selects which relay(s) to report.
- Whether the receiver (server or peer) sends any acknowledgement specific to relaylatency, and the cadence/trigger for emitting reports.
- Whether group calls report latency per relay for multiple relays in a single action or one action per relay.

**References**
- [RFC 5245 — ICE (relay/RTT context)](https://www.rfc-editor.org/rfc/rfc5245)

## Changelog
- **2026-06-21** · v0.1.0 — Initial spec entry.

---

[← in the full spec](../../index.md#call-relaylatency)
