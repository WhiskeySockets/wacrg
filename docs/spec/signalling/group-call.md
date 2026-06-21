<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Group call setup

_Signalling - `group-call`_

`SIG-06` - _status: draft - group, audio, video_

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

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | unknown | — | — |

**Annotation** `wacrg:SIG-06` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

**Contributors**

| Contributor | Role |
| --- | --- |
| [<img src="https://github.com/purpshell.png?size=20" alt="Rajeh Taher" width="20" height="20" style="border-radius:50%;vertical-align:middle"> Rajeh Taher](../contributors.md#purpshell) | wrote initial spec |

[:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/group-call.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/group-call.yaml)

**Open questions**
- Group session creation, the participant roster stanza, and join/leave signalling.
- Per-sender SFrame key distribution and rotation on join/leave.

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#group-call)
