<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call terminate stanza

_Signalling · `call-terminate`_

_status: draft · audio, video, group_

The <terminate> action stanza that ends a call, its reason attribute, destination fan-out, and inbound duration counters.

Wire shape:

    <call to="{peer-jid}">
      <terminate call-id="{call-id}" call-creator="{call-creator-jid}"
                 [reason="{reason}"]>
        [<destination>
           <to jid="{device-jid}"/>...
         </destination>]
      </terminate>
    </call>

`<call>` wrapper:

- MUST carry `to` (peer JID).
- MUST NOT carry a builder-supplied `id` (unlike `<preaccept>`/`<heartbeat>`).

`<terminate>` action element:

- MUST carry `call-id` — the call identifier from the offer
  (see [call-offer](../signalling/call-offer.md)), not the stanza id.
- MUST carry `call-creator` — JID of the call's creator.
- MAY carry `reason` (free-form string). When absent, the attribute MUST be
  omitted entirely (no empty `reason=""`).
- MAY contain a single `<destination>` child, which MUST then contain one
  `<to jid="..."/>` per target device. When there are no extra devices,
  `<destination>` MUST be omitted.

Reason `accepted_elsewhere` is sent to a peer's other devices once the call is
accepted on one device; it pairs with the `<destination>` list of devices to
hang up. An ordinary hang-up MAY send no `reason`.

Inbound `<terminate>`:

- MUST be parsed for `call-id` and `call-creator` (both required).
- MAY carry `duration` — total call duration in seconds, non-negative integer
  fitting an unsigned 32-bit value.
- MAY carry `audio_duration` — audio-only duration, same encoding/range.
- Both counters optional; a parser MUST treat absence as "not reported", not 0.

A receiver that does not recognize a `<call>` action child MUST ignore the
stanza rather than error.

**Notes.** The inbound parser reads `duration`/`audio_duration` but does not consume
`reason`, so a peer-sent reason is on the wire but not surfaced.

Requires: [`call-offer`](../signalling/call-offer.md)  
Breakdown: [`flow-call-missed`](../signalling/flow-call-missed.md), [`flow-call-rejected`](../signalling/flow-call-rejected.md), [`flow-outgoing-1to1`](../signalling/flow-outgoing-1to1.md)

**Implemented by**
- **whatsapp-rust** — working — build_terminate emits the action; the inbound parser decodes duration/audio_duration. · [commits ↗](https://github.com/oxidezap/whatsapp-rust/commits)
- **zapo-caller** — working — signalling builder ported from this flavor's signaling.ts.

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/signalling/call-terminate.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/signalling/call-terminate.yaml)

**Open questions**
- Full enumeration of reason values the server and clients emit; only accepted_elsewhere is confirmed from source.
- Whether duration/audio_duration are ever sent on outbound terminates or only received.
- Whether reason is expected (or validated) on inbound terminates, given the parser ignores it today.

**References**
- wacore voip signaling builders (build_terminate)
- wacore call stanza parser (terminate action)

---

[← in the full RFC](../../../index.md#call-terminate)
