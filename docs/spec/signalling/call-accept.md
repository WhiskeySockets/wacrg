<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call accept stanza

_Signalling - `call-accept`_

`SIG-03` - _status: review - audio, video_

The callee answers an offer with a <call> stanza whose <accept> child selects the media format and commits the call to the v2 SRTP key path.

The `<call>` wrapper MUST carry `to` (the offering peer); it MAY omit `id`.
The `<accept>` child MUST carry `call-id` and `call-creator`, both echoed verbatim
from the offer.

`<accept>` children MUST appear in this order:

    audio(rate)… → [te(priority=2)] → net(medium=2) → encopt(keygen=2)
                 → [capability] → [rte] → [voip_settings]

Required children:

- One `<audio enc="opus" rate="…">` per accepted rate, in preference order, no body.
  `rate="8000"` selects 8 kHz narrowband Opus; `rate="16000"` selects 16 kHz.
- `<net medium="2">` — selects the relay transport medium (offer advertises
  `medium="3"`; accept commits to `medium="2"`).
- `<encopt keygen="2">` — pins the v2 SRTP key derivation path
  (see [srtp-master-key](../crypto/srtp-master-key.md)), matching the offer's `encopt`.

Optional children:

- `<te priority="2">` — relay transport-endpoint blob; MUST be placed immediately
  after the `<audio>` nodes.
- `<capability ver="1">` — body is the fixed 7-byte blob `01 05 f7 09 e4 bb 13`.
- `<rte>` — relay-token-extension blob, no attributes.
- `<voip_settings uncompressed="1">` — VoIP settings blob; MUST be the last child.

Requires: [`call-offer`](../signalling/call-offer.md), [`call-preaccept`](../signalling/call-preaccept.md), [`srtp-master-key`](../crypto/srtp-master-key.md)  
Breakdown: [`call-preaccept`](../signalling/call-preaccept.md), [`flow-call-missed`](../signalling/flow-call-missed.md), [`flow-call-rejected`](../signalling/flow-call-rejected.md), [`flow-incoming-1to1`](../signalling/flow-incoming-1to1.md), [`flow-outgoing-1to1`](../signalling/flow-outgoing-1to1.md), [`video-call`](../signalling/video-call.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [:material-github: history](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stanza.rs) - [:material-github: blame](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stanza.rs) - commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `zapo-caller` | working | — | — |

**Annotation** `wacrg:SIG-03` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

**Contributors** [![Rajeh Taher](https://github.com/purpshell.png?size=20) Rajeh Taher](../contributors.md#purpshell) (wrote initial spec)

[:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/call-accept.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/call-accept.yaml)

**Open questions**
- Byte layout and semantics of the <te priority=2> relay transport-endpoint blob.
- Contents of the <rte> relay-token-extension blob and the <voip_settings uncompressed=1> body.
- Whether the server enforces the <accept> child order with a 439-style rejection as it does for <offer>.

**References**
- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#call-accept)
