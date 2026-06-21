<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Incoming 1:1 call flow

_Signalling · `flow-incoming-1to1`_

_status: review · audio, video_

Receiver-side stanza sequence for an incoming 1:1 call: parse `<call><offer>`, send an offer receipt, then either ring-and-accept (`<preaccept>` then `<accept>`) or `<reject>`, all addressed to the caller.

An incoming 1:1 call arrives as a top-level `<call>` whose action child is
`<offer>` (see [call-offer](../signalling/call-offer.md)).

## 1. Parse the inbound `<call>`

Treat a stanza as an incoming call only when its tag is `call`:

    <call from   = <caller JID, LID or PN>     ; REQUIRED
          id     = <stanza id>                 ; REQUIRED
          t      = <unix seconds>              ; REQUIRED
          e      = "1"                         ; OPTIONAL, "1" => offline/queued delivery
          notify = <caller display name>       ; OPTIONAL
          platform = <caller platform>         ; OPTIONAL
          version  = <caller app version> >    ; OPTIONAL
      <offer call-id call-creator …>…</offer>
    </call>

- Locate the action child by tag, accepting one of: `offer`, `offer_notice`,
  `preaccept`, `accept`, `reject`, `terminate`, `transport`, `relaylatency`.
- A `<call>` whose only children are unrecognized tags MUST be ignored (no
  error, no receipt).
- A `<call>` missing `from`, `id`, or a valid `t` MUST be rejected (parse error).

The `<offer>` action element:

    <offer call-id      = <call id, distinct from the stanza id>   ; REQUIRED
           call-creator = <caller JID>                             ; REQUIRED
           caller_pn            = <caller phone-number JID>         ; OPTIONAL
           caller_country_code  = <ISO country>                    ; OPTIONAL
           device_class         = <string>                         ; OPTIONAL
           joinable             = "1"                               ; OPTIONAL
           group-jid            = <group JID> >                     ; OPTIONAL (group call)
      <audio enc="opus" rate=<8000|16000>/> …   ; zero or more, preference order
      <video/>                                  ; present => video call
      <enc .../> | <destination><to><enc/></to></destination>
    </offer>

- `call-id` and stanza `id` are distinct; both MUST be retained.
- A `<video>` child => video offer; otherwise audio-only.
- Each `<audio>` MUST have `enc` and a numeric `rate`; a malformed `<audio>`
  MUST cause the offer to be rejected.

## 2. Acknowledge the offer

On a valid `<offer>`, send an offer receipt before (or concurrently with) any
answer action:

    <receipt to   = <call 'from'>
             id   = <call stanza id>
             from = <own addressing JID> >     ; OPTIONAL; present when known
      <offer call-id      = <offer call-id>
             call-creator = <offer call-creator>/>
    </receipt>

- `to` MUST equal the originating `<call from>`.
- `id` MUST equal the `<call id>` stanza id (NOT the `call-id`).
- When the receiver advertises its own device address, `from` SHOULD be that
  JID; its server (LID vs PN) SHOULD match the caller's `from` server.
- This is in addition to the generic `<ack>` (see [call-ack](../signalling/call-ack.md)), and is
  sent only for `<offer>`, not for `offer_notice` or other actions.

## 3a. Decline the call

    <call to=<caller JID>>
      <reject call-id=<offer call-id> call-creator=<offer call-creator>/>
    </call>

No `<preaccept>`/`<accept>` is sent. See [call-reject](../signalling/call-reject.md).

## 3b. Answer the call

Ring with `<preaccept>` first, then commit with `<accept>`, both addressed to
the caller and both echoing the offer's `call-id` and `call-creator`.

    <call to=<caller JID> id=<random wrapper id>>
      <preaccept call-id call-creator>
        <audio enc="opus" rate=…/> …     ; advertised formats, preference order
        <encopt keygen="2"/>
        <capability ver="1">…</capability>
      </preaccept>
    </call>

    <call to=<caller JID>>
      <accept call-id call-creator>
        <audio enc="opus" rate=…/> …     ; advertised formats, preference order
        [<te priority="2">…</te>]        ; relay token entry, when present
        <net medium="2"/>
        <encopt keygen="2"/>
        [<capability ver="1">…</capability>]
        [<rte>…</rte>]
        [<voip_settings uncompressed="1">…</voip_settings>]
      </accept>
    </call>

- Child order inside `<preaccept>` and `<accept>` is significant and MUST be
  emitted as shown.
- The `<audio>` formats advertised in the answer determine the negotiated
  codec/sample rate; the receiver MAY advertise a subset of offered rates (e.g.
  only `8000`) to steer negotiation.
- `call-id` and `call-creator` in `<preaccept>`, `<accept>`, and `<reject>`
  MUST be copied verbatim from the inbound `<offer>`.

See [call-preaccept](../signalling/call-preaccept.md) and [call-accept](../signalling/call-accept.md).

**Notes.** `offer_notice` is the group fan-out notification and expects no offer receipt
(the generic call ack suffices); a 1:1 incoming call always arrives as `<offer>`.

Requires: [`call-offer`](../signalling/call-offer.md), [`call-ack`](../signalling/call-ack.md), [`call-preaccept`](../signalling/call-preaccept.md), [`call-accept`](../signalling/call-accept.md), [`call-reject`](../signalling/call-reject.md)  
Breakdown: [`flow-call-missed`](../signalling/flow-call-missed.md), [`flow-call-rejected`](../signalling/flow-call-rejected.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | — | parses <call><offer>, sends the <receipt><offer/></receipt> ack, and drives preaccept→accept / reject |
| `zapo-caller` | working | — | signalling answer sequence implemented |

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/signalling/flow-incoming-1to1.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/signalling/flow-incoming-1to1.yaml)

**Open questions**
- Whether a 1:1 receiver ever omits <preaccept> and answers with <accept> alone (e.g. auto-answer), or always rings first.
- Exact conditions under which <te>, <rte>, and <voip_settings> are required vs optional in the <accept>, and where their byte payloads originate.
- Whether the offer receipt <from> must always be set on multi-device accounts, and the precise rule selecting LID vs PN addressing.

**References**
- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)

---

[← in the full RFC](../../../index.md#flow-incoming-1to1)
