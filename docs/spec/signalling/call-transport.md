<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Transport stanza

_Signalling - `call-transport`_

`SIG-05` - _status: review - audio, video_

The <transport> action of the <call> stanza negotiates ICE/relay candidates after the offer, carrying the relay token and network medium.

Wire format. Send a top-level `<call to="<peer>">` wrapping a `<transport>`
action child:

    <call to="<peer>">
      <transport call-id="<call-id>" call-creator="<creator-jid>"
                 [p2p-cand-round="<n>"]
                 [transport-message-type="<t>"]>
        [ <te priority="1">…relay-token-bytes…</te> ]
        <net medium="2" [protocol="0"]/>
      </transport>
    </call>

Identity (both required, echoed unchanged from the offer):
- `call-id` MUST equal the offer's `call-id`.
- `call-creator` MUST identify the call creator.

Children and order:
- The action MUST contain a `<net>` child.
- When a relay token is conveyed, a `<te priority="1">` child (binary body =
  relay token blob) MUST precede `<net>`.
- When no relay token is conveyed, `<te>` is omitted and `<net>` is the sole child.

`<net>` attributes:
- MUST carry `medium="2"`.
- MUST carry `protocol="0"` unless `transport-message-type="9"`; when
  `transport-message-type="9"`, `protocol` MUST be omitted.

`transport-message-type` (optional) selects the exchange role:

    "1"  relay candidate
    "3"  peer (ICE) candidate    ; callee replies with type "9"
    "9"  keepalive / reply       ; <net> omits protocol

`p2p-cand-round` (optional): round number as a decimal string for round-based
peer-to-peer candidate exchange.

Receiver: MUST read `call-id` and `call-creator`; MAY read `p2p-cand-round`
and `transport-message-type`. A receiver that does not recognise the action
MUST ignore the stanza rather than fail the call (forward-compatibility for
future transport-message-type values).

**Notes.** The same `<te>` relay-token carrier appears in the accept (`priority="2"`) and
relaylatency exchanges, indicating a shared relay-token element across call actions.

Requires: [`call-offer`](../signalling/call-offer.md), [`stun-relay`](../relay/stun-relay.md)  
Breakdown: [`media-loop`](../relay/media-loop.md), [`call-mute`](../signalling/call-mute.md), [`flow-outgoing-1to1`](../signalling/flow-outgoing-1to1.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [:material-github: history](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stanza.rs) - [:material-github: blame](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/stanza.rs) - commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `zapo-caller` | working | — | — |

**Annotation** `wacrg:SIG-05` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

**Contributors** [![Rajeh Taher](https://github.com/purpshell.png?size=20) Rajeh Taher](../contributors.md#purpshell) (wrote initial spec)

[:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/call-transport.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/call-transport.yaml)

**Open questions**
- Exact internal structure of the <te> relay-token blob (token bytes vs. framed structure).
- Full enumeration of transport-message-type values beyond 1 (relay candidate), 3 (peer ICE), and 9 (keepalive/reply).
- Whether <net medium> takes values other than 2 in the transport exchange, and the meaning of the medium scale.
- Semantics of p2p-cand-round rounds and the termination condition for candidate-exchange rounds.

**References**
- [RFC 8445 — Interactive Connectivity Establishment (ICE)](https://www.rfc-editor.org/rfc/rfc8445)
- [RFC 7675 — STUN Usage for Consent Freshness](https://www.rfc-editor.org/rfc/rfc7675)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#call-transport)
