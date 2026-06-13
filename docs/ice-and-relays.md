<!-- Hand-written narrative. Complements the generated docs under docs/spec/. -->

# ICE, relays, and transport endpoints

For the [media plane](media-srtp.md) to come up, the two devices have to agree on
a network path. WhatsApp calls negotiate this during [signaling](signaling.md):
the offer (and later `<transport>` updates) carry **transport endpoints** —
candidate addresses, many of them WhatsApp **relay** servers — and both sides
probe and select among them.

> Confidence: that calls use candidate transport endpoints with relay fallback
> and latency probing is `probable`, because the offer carries a `<destination>`
> with `<te>`/`<endpoint>` children and latency hints, and because NAT traversal
> demands it. The precise candidate-selection algorithm and the exact STUN/TURN
> semantics are `speculative`. Hedge accordingly.

## Where endpoints come from

The `<offer>` includes a `<destination>` child listing transport endpoints:

```xml
<destination>
  <te latency="42">…relay candidate…</te>
  <te latency="88">…relay candidate…</te>
</destination>
```

- `<te>` / `<endpoint>` elements are **relay candidates** — places the peer can
  send media to. Each commonly carries a **latency** hint.
- These are how WhatsApp handles NAT/firewall traversal without requiring a
  direct peer-to-peer path: media can be relayed through WA infrastructure when
  needed.

## ICE-style negotiation (model)

The selection process resembles **ICE** (Interactive Connectivity
Establishment), the standard WebRTC mechanism:

1. **Gather candidates.** Each side knows reachable transport endpoints, heavily
   weighted toward WA relays. STUN-like probing may discover the device's
   server-reflexive address.
2. **Exchange candidates.** Candidates ride the signaling plane — in the offer's
   `<destination>` and in subsequent `<transport>` updates as conditions change.
3. **Probe.** `<relaylatency>` stanzas appear to carry the results of latency
   probes against relay candidates, informing which path is best.
4. **Select.** The endpoints converge on a working path — ideally the
   lowest-latency relay (or a direct path where possible) — and media flows over
   it.
5. **Adapt.** If the network changes (Wi-Fi ↔ cellular, relay degradation),
   `<transport>` updates renegotiate the path mid-call.

We describe this as *ICE-style* deliberately: WhatsApp's mechanism is
proprietary and **not assumed to be standards-compliant ICE/STUN/TURN**. The
shape rhymes with ICE, but field-level details are unverified.

## What we believe vs. don't

**Believed (`probable`):**

- The offer carries relay candidates in `<destination>` with per-candidate
  latency hints.
- `<transport>` updates and `<relaylatency>` probes exist and adjust the path.
- Relays forward **encrypted** media; they are not decryption points (the keys
  stay end-to-end — see [keying](encryption-keying.md)).

**Not known (`speculative`):**

- The exact candidate encoding inside `<te>`/`<endpoint>` (address format, ports,
  priorities, transport protocols).
- Whether direct peer-to-peer is ever used for 1:1, or whether 1:1 media is
  always relayed.
- The precise selection/priority algorithm and how ties are broken.
- The probing protocol details (is it STUN, a WA-specific keepalive, or both?).
- How `<net>`/`<net medium>` in the offer influences candidate choice.

## Why this plane is under-observed

Like [media](media-srtp.md), the transport plane is hard to see from the cheap
signaling-only techniques: you can read the **candidate list** in the offer from a
[WebSocket capture](spec/techniques.md), but you cannot see the **actual UDP
probing and media path** without observing the network or hooking the media
engine. So the *advertised* candidates are better understood than the *runtime
selection*.

## Open questions (tracked)

- Decode the `<te>`/`<endpoint>` candidate format.
- Determine whether 1:1 calls ever go peer-to-peer or are always relayed.
- Pin down the `<relaylatency>` probe/response semantics.
- Map `<net medium>` values to network types and their effect on selection.

These are recorded as `open_questions` on the transport-related
[stanza entries](spec/stanzas/index.md).
