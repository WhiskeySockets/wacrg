<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Raise hand

_Signalling · `raise-hand`_

_status: draft · group, raise-hand_

In-call signal a participant sends to raise or lower their hand in a group call.

A participant signals raise/lower-hand state to other participants in-band over
the call signalling channel.

TODO: the exact stanza/attribute carrying this state, and whether it is acked,
is not yet specified.

Parent: [`group-call`](../signalling/group-call.md)  
Requires: [`group-call`](../signalling/group-call.md)

**Implemented by**
- **whatsapp-rust** — unknown · [commits ↗](https://github.com/oxidezap/whatsapp-rust/commits)

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/signalling/raise-hand.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/signalling/raise-hand.yaml)

**Open questions**
- Which stanza/attribute carries raise-hand state, and whether it is acked.

---

[← in the full RFC](../../../index.md#raise-hand)
