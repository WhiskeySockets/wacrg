<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call pre-accept (ringing)

_Signalling · `call-preaccept`_

_status: review · audio, video_

Optional <preaccept> stanza a callee sends to signal "ringing" before answering with <accept>.

A callee MAY send `<preaccept>` to signal that an incoming `<offer>`
([call-offer](../signalling/call-offer.md)) is ringing, before the user answers. It does not
accept the call and MUST be followed by `<accept>` ([call-accept](../signalling/call-accept.md))
or a terminating action ([call-reject](../signalling/call-reject.md) /
[call-terminate](../signalling/call-terminate.md)).

Wire format — top-level `<call>` wrapper with a `<preaccept>` action child:

    <call to="<caller>" id="<wrapper-id>">
      <preaccept call-id="<call-id>" call-creator="<creator>">
        <audio enc="opus" rate="..."/>     ; one or more, preference order
        <encopt keygen="2"/>
        <capability ver="1">01 05 f7 09 e4 bb 07</capability>
      </preaccept>
    </call>

- `<call>` MUST carry `to` (the caller) and `id` (stanza id correlating the
  server `<ack>`, generated from random bytes).
- `<preaccept>` MUST carry `call-id` (echoed unchanged from the offer) and
  `call-creator`.
- `<preaccept>` children MUST appear in order: `audio(+) → encopt → capability`.
- Media MUST be one or more `<audio enc="opus" rate="...">`, in preference order.
  `rate="8000"` steers to Opus narrowband; `rate="16000"` selects wideband.
- `<encopt keygen="2">` MUST be present (v2 SRTP key path).
- `<capability ver="1">` MUST carry the fixed 7-byte blob `01 05 f7 09 e4 bb 07`
  (differs from the offer/accept blob `01 05 f7 09 e4 bb 13` only in the final
  byte).
- A receiver MUST read `call-id` and `call-creator` to correlate with the
  in-flight call. No `<receipt>` ack is expected; the generic server `<ack>` for
  the `<call>` stanza suffices.

Requires: [`call-offer`](../signalling/call-offer.md), [`call-accept`](../signalling/call-accept.md)  
Breakdown: [`call-accept`](../signalling/call-accept.md), [`flow-call-missed`](../signalling/flow-call-missed.md), [`flow-call-rejected`](../signalling/flow-call-rejected.md), [`flow-incoming-1to1`](../signalling/flow-incoming-1to1.md), [`flow-outgoing-1to1`](../signalling/flow-outgoing-1to1.md), [`video-call`](../signalling/video-call.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | — | — |
| `zapo-caller` | working | — | — |

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/signalling/call-preaccept.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/signalling/call-preaccept.yaml)

**Open questions**
- Whether the server or peer behaves differently when <preaccept> is omitted versus sent (e.g. caller-side ringing UI/timeout), and whether it is ever mandatory.
- Whether <preaccept> may carry additional children (e.g. <video>, <net>) for video calls, as its <audio>-only shape is observed for audio calls.
- Full meaning of the packed <capability> bitfield and the significance of the differing final byte.

---

[← in the full RFC](../../../index.md#call-preaccept)
