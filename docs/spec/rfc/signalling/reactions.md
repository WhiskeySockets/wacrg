<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# In-call emoji reactions

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `reactions`

**`reactions`** · status: draft · features: reactions, group · since: 0.1.0

The signal a participant sends to broadcast an emoji reaction during a call.

**Normative**

TODO. A participant broadcasts a transient emoji reaction to other participants
over the call signalling channel. The carrying stanza and the emoji encoding are
not yet specified.

**Findings**

An in-call UX feature. Not yet reverse-engineered to wire level.

**Requires:** [`group-call`](../signalling/group-call.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | unknown |  |

**Open questions**

- Stanza/attribute and emoji encoding for an in-call reaction; TTL/debounce behaviour.

---

[in the full RFC →](../index.md#reactions) · [RFC contents](../index.md#contents)
