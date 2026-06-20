<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Group call setup

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `group-call`

**`group-call`** · status: draft · features: group, audio, video · since: 0.1.0

How a multi-party call is created and how participants join, leave, and are tracked, extending the 1:1 offer/accept flow.

**Normative**

TODO. A group call extends the 1:1 flow: the creator establishes a group call
session that additional participants join, each keyed independently (see
[srtp-master-key](../crypto/srtp-master-key.md)) with per-sender media keys for SFrame (see
[sframe-media](../crypto/sframe-media.md)). The participant roster, join/leave stanzas, and
group key distribution are not yet fully specified.

**Findings**

Group calls reuse the 1:1 keying and media planes with per-sender key separation.

**Requires:** [`call-offer`](../signalling/call-offer.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | unknown |  |

**Open questions**

- Group session creation, the participant roster stanza, and join/leave signalling.
- Per-sender SFrame key distribution and rotation on join/leave.

---

[in the full RFC →](../index.md#group-call) · [RFC contents](../index.md#contents)
