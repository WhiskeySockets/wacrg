<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Group call setup

_Signalling · `group-call`_

_status: draft · group, audio, video_

A multi-party call extends the 1:1 offer/accept flow with a joinable group session, a participant roster, and per-sender media keying.

TODO — not yet fully specified.

- The creator establishes a group call session that additional participants join.
- Each participant is keyed independently; see [srtp-master-key](../crypto/srtp-master-key.md).
- Media uses per-sender SFrame keys; see [sframe-media](../crypto/sframe-media.md).
- Unspecified: the participant roster stanza, join/leave signalling, and group
  key distribution/rotation on join/leave.

Requires: [`call-offer`](../signalling/call-offer.md)  
Breakdown: [`group-call-crypto`](../crypto/group-call-crypto.md), [`raise-hand`](../signalling/raise-hand.md), [`reactions`](../signalling/reactions.md), [`screen-share`](../signalling/screen-share.md), [`video-call`](../signalling/video-call.md)

**Implemented by**
- **whatsapp-rust** — unknown · [commits ↗](https://github.com/oxidezap/whatsapp-rust/commits)

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/signalling/group-call.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/signalling/group-call.yaml)

**Open questions**
- Group session creation, the participant roster stanza, and join/leave signalling.
- Per-sender SFrame key distribution and rotation on join/leave.

---

[← in the full RFC](../../../index.md#group-call)
