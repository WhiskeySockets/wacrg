<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Raise hand

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `raise-hand`

**`raise-hand`** · status: draft · features: group, raise-hand · since: 0.1.0

The in-call signal a participant sends to raise or lower their hand in a group call.

**Normative**

TODO. A participant signals raise/lower-hand state to the other participants
in-band over the call signalling channel. The exact stanza/attribute carrying this
state is not yet specified.

**Findings**

A group-call UX feature. Not yet reverse-engineered to wire level.

**Requires:** [`group-call`](../signalling/group-call.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | unknown |  |

**Open questions**

- Which stanza/attribute carries raise-hand state, and whether it is acked.

---

[in the full RFC →](../index.md#raise-hand) · [RFC contents](../index.md#contents)
