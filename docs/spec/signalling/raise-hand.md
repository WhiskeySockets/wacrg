<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Raise hand

_Signalling - `raise-hand`_

`SIG-09` - _status: draft - group, raise-hand_

In-call signal a participant sends to raise or lower their hand in a group call.

A participant signals raise/lower-hand state to other participants in-band over
the call signalling channel.

TODO: the exact stanza/attribute carrying this state, and whether it is acked,
is not yet specified.

Parent: [`group-call`](../signalling/group-call.md)  
Requires: [`group-call`](../signalling/group-call.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | unknown | — | — |

**Annotation** `wacrg:SIG-09` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

**Contributors**

| Contributor | Role |
| --- | --- |
| [<img src="https://github.com/purpshell.png?size=20" alt="Rajeh Taher" width="20" height="20" style="border-radius:50%;vertical-align:middle"> Rajeh Taher](../contributors.md#purpshell) | wrote initial spec |

[:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/raise-hand.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/raise-hand.yaml)

**Open questions**
- Which stanza/attribute carries raise-hand state, and whether it is acked.

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#raise-hand)
