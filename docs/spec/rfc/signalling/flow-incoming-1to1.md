<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Incoming 1:1 call flow

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `flow-incoming-1to1`

**`flow-incoming-1to1`** · status: review · features: audio, video · since: 0.1.0

The receiver-side stanza sequence for answering an incoming 1:1 call: parsing the inbound `<call><offer>`, acknowledging it with an offer receipt, and then either ringing and accepting (`<preaccept>` then `<accept>`) or declining (`<reject>`), all addressed back to the caller.

**Normative**

An incoming 1:1 call is delivered as a top-level `<call>` stanza whose action
child is `<offer>` (see [call-offer](../signalling/call-offer.md)). The receiver processes it as
follows.

## 1. Parse the inbound `<call>`

The receiver MUST treat a stanza as an incoming call only when its tag is
`call`. The `<call>` element carries the routing/identity attributes:

    <call from   = <caller JID, LID or PN>     ; REQUIRED
          id     = <stanza id>                 ; REQUIRED
          t      = <unix seconds>              ; REQUIRED
          e      = "1"                         ; OPTIONAL, "1" => offline/queued delivery
          notify = <caller display name>       ; OPTIONAL
          platform = <caller platform>         ; OPTIONAL
          version  = <caller app version> >    ; OPTIONAL
      <offer call-id call-creator …>…</offer>
    </call>

The receiver MUST locate the action child by tag, accepting one of:
`offer`, `offer_notice`, `preaccept`, `accept`, `reject`, `terminate`,
`transport`, `relaylatency`. A `<call>` whose only children are unrecognized
tags MUST be ignored (no error, no receipt) so that future server-side action
types do not break processing. The receiver MUST reject (parse error) a
`<call>` missing `from`, `id`, or a valid `t`.

The `<offer>` action element MUST carry:

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

`call-id` and the stanza `id` are distinct identifiers; both MUST be retained.
The presence of a `<video>` child indicates a video offer; otherwise the call
is audio-only. Each `<audio>` child MUST have `enc` and a numeric `rate`; a
malformed `<audio>` MUST cause the offer to be rejected.

## 2. Acknowledge the offer

On receiving a valid `<offer>`, the receiver MUST send an offer receipt back to
the caller before (or concurrently with) any answer action:

    <receipt to   = <call 'from'>
             id   = <call stanza id>
             from = <own addressing JID> >     ; OPTIONAL; present when known
      <offer call-id      = <offer call-id>
             call-creator = <offer call-creator>/>
    </receipt>

The `to` attribute MUST equal the originating `<call from>`, and the receipt
`id` MUST equal the `<call id>` stanza id (NOT the `call-id`). When the receiver
advertises its own device address, the `from` attribute SHOULD be set to that
JID; the JID server (LID vs PN) SHOULD match the server of the caller's `from`.
This offer receipt is in addition to the generic `<ack>` for the call stanza
(see [call-ack](../signalling/call-ack.md)); the offer receipt is sent only for the `<offer>`
action, not for `offer_notice` or other actions.

## 3a. Decline the call

To reject the incoming call, the receiver MUST send:

    <call to=<caller JID>>
      <reject call-id=<offer call-id> call-creator=<offer call-creator>/>
    </call>

See [call-reject](../signalling/call-reject.md). No `<preaccept>`/`<accept>` is sent.

## 3b. Answer the call

To answer, the receiver MUST first ring with a `<preaccept>` and then commit
with an `<accept>`, both addressed to the caller's JID and both echoing the
offer's `call-id` and `call-creator`. The `<preaccept>` is sent first:

    <call to=<caller JID> id=<random wrapper id>>
      <preaccept call-id call-creator>
        <audio enc="opus" rate=…/> …     ; advertised formats, preference order
        <encopt keygen="2"/>
        <capability ver="1">…</capability>
      </preaccept>
    </call>

followed by the `<accept>`:

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

The child order inside `<preaccept>` and `<accept>` is significant and MUST be
emitted as shown. The `<audio>` formats advertised in the answer determine the
negotiated codec/sample rate; the receiver MAY advertise a subset of the
offered rates (e.g. only `8000`) to steer the negotiated audio format. See
[call-preaccept](../signalling/call-preaccept.md) and [call-accept](../signalling/call-accept.md).

The `call-id` and `call-creator` carried in `<preaccept>`, `<accept>`, and
`<reject>` MUST be copied verbatim from the inbound `<offer>`.

**Findings**

The receiver derives its own SRTP keying material once the call key is
recovered from the offer's `<enc>` payload, but key recovery and media setup
are independent of the signalling answer: the `<preaccept>`/`<accept>` pair can
be emitted from the offer attributes alone. In observed flows the answer is
driven directly off the parsed `<offer>` event: ack receipt first, then
`<preaccept>` (with a fresh random wrapper id) immediately followed by
`<accept>`. The `<reject>` path emits no audio/codec negotiation children.

`offer_notice` is the group fan-out notification and does not expect an offer
receipt (the generic call ack suffices); a 1:1 incoming call always arrives as
`<offer>`.

**Requires:** [`call-offer`](../signalling/call-offer.md), [`call-ack`](../signalling/call-ack.md), [`call-preaccept`](../signalling/call-preaccept.md), [`call-accept`](../signalling/call-accept.md), [`call-reject`](../signalling/call-reject.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working | parses <call><offer>, sends the <receipt><offer/></receipt> ack, and drives preaccept→accept / reject |
| [`zapo-caller`](../../flavors.md) | working | signalling answer sequence implemented |
| [`meowcaller`](../../flavors.md) | planned | signalling is a planned module |

**Open questions**

- Whether a 1:1 receiver ever omits <preaccept> and answers with <accept> alone (e.g. auto-answer), or always rings first.
- Exact conditions under which <te>, <rte>, and <voip_settings> are required vs optional in the <accept>, and where their byte payloads originate.
- Whether the offer receipt <from> must always be set on multi-device accounts, and the precise rule selecting LID vs PN addressing.

**References**

- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)

---

[in the full RFC →](../index.md#flow-incoming-1to1) · [RFC contents](../index.md#contents)
