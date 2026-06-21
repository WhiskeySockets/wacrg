<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# In-call emoji reactions

_Signalling - `reactions`_

`SIG-10` - _status: draft - reactions, group_

A participant broadcasts a transient emoji reaction during a call.

NOT YET SPECIFIED. Carrying stanza, attributes, and emoji encoding are
unknown (not reverse-engineered to wire level).

Parent: [`group-call`](../signalling/group-call.md)  
Requires: [`group-call`](../signalling/group-call.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | unknown | — | — |

**Annotation** `wacrg:SIG-10` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

**Contributors**

| Contributor | Role |
| --- | --- |
| [<img src="https://github.com/purpshell.png?size=20" alt="Rajeh Taher" width="20" height="20" style="border-radius:50%;vertical-align:middle"> Rajeh Taher](../contributors.md#purpshell) | wrote initial spec |

[:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/reactions.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/reactions.yaml)

**Open questions**
- Stanza/attribute and emoji encoding for an in-call reaction; TTL/debounce behaviour.

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#reactions)
