<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Mute signalling

_Signalling - `call-mute`_

`SIG-13` - _status: draft - audio, video_

A participant signals an in-call mute state change by sending a `<call>` stanza wrapping a `<mute_v2>` action.

On a local microphone mute state change, a participant MUST send:

```
<call to="{peer}">
  <mute_v2 call-id="{call-id}"
           call-creator="{call-creator}"
           mute-state="{state}"/>
</call>
```

- `to` on `<call>` MUST be the peer JID. No `id` attribute is set on this action.
- `call-id` MUST equal the offer's `call-id` (see [call-offer](../signalling/call-offer.md)).
- `call-creator` MUST equal the call's `call-creator` JID and MUST be
  byte-identical to the value on every other action of the same call.
- `mute-state` MUST carry the new mute state as a string attribute value.
- The tag MUST be `mute_v2` (sent verbatim on the wire). `<mute_v2>` MUST have
  no child elements; all state is in attributes.
- A fresh `<mute_v2>` MUST be sent on each transition; it expresses the new
  absolute state, not a toggle.
- This is informational signalling only: the sender MUST NOT renegotiate
  transport, codecs, or keys (see [call-transport](../signalling/call-transport.md)). Muting is
  realised on the media stream independently (e.g. ceasing audio or sending
  silence).

Requires: [`call-offer`](../signalling/call-offer.md), [`call-transport`](../signalling/call-transport.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [:material-github: history](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stanza.rs) - [:material-github: blame](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stanza.rs) - commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | build_mute_v2 in wacore/src/voip/stanza.rs constructs the outbound stanza; no inbound parser yet (mute_v2 is not in the <call> action allow-list). |
| `zapo-caller` | planned | — | — |

**Annotation** `wacrg:SIG-13` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

**Contributors**

| Contributor | Role |
| --- | --- |
| [<img src="https://github.com/purpshell.png?size=20" alt="Rajeh Taher" width="20" height="20" style="border-radius:50%;vertical-align:middle"> Rajeh Taher](../contributors.md#purpshell) | wrote initial spec |

[:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/call-mute.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/call-mute.yaml)

**Open questions**
- The set of valid mute-state values is not pinned by the source; the builder accepts an arbitrary string. The on-wire encoding (e.g. "muted"/"unmuted" vs a numeric flag) is unconfirmed.
- Whether video mute is signalled by the same mute_v2 action (e.g. an additional video-state attribute) or by a separate action is unknown.
- Whether the receiver acknowledges <mute_v2> (with a generic <ack> or a dedicated receipt) is not established; the inbound side does not yet parse this action.
- Whether a v1 <mute> action precedes mute_v2 on older clients, and how versions interoperate, is unknown.

**References**
- [WhatsApp call signalling — mute_v2 builder](https://github.com/WhiskeySockets)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#call-mute)
