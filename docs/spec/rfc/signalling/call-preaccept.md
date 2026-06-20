<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call pre-accept (ringing)

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `call-preaccept`

**`call-preaccept`** · status: review · features: audio, video · since: 0.1.0

The optional <preaccept> stanza a callee sends to signal "ringing" — that the offer reached a device and the call is alerting the user — before the user actually answers with <accept>.

**Normative**

A callee device MAY send a `<preaccept>` to indicate that an incoming `<offer>`
(see [call-offer](../signalling/call-offer.md)) was received and the call is now ringing, before
the user answers. It is a non-committal ringing signal: it does not accept the
call and MUST be followed by an `<accept>` ([call-accept](../signalling/call-accept.md)) or a
terminating action ([call-reject](../signalling/call-reject.md) / [call-terminate](../signalling/call-terminate.md))
to resolve the call.

The stanza is a top-level `<call>` wrapper carrying a `<preaccept>` action child:

    <call to="<caller>" id="<wrapper-id>">
      <preaccept call-id="<call-id>" call-creator="<creator>">
        <audio enc="opus" rate="..."/>     ; one or more, preference order
        <encopt keygen="2"/>
        <capability ver="1">01 05 f7 09 e4 bb 07</capability>
      </preaccept>
    </call>

Requirements:

- The `<call>` wrapper MUST carry a `to` set to the caller and an `id` (the
  stanza id used to correlate the server `<ack>`). Implementations generate this
  `id` from random bytes.
- The `<preaccept>` action MUST carry `call-id` (the logical call identifier from
  the offer, echoed unchanged) and `call-creator`.
- The `<preaccept>` children MUST appear in this exact order:

      audio(+) → encopt → capability

- Media MUST be advertised as one or more `<audio enc="opus" rate="...">`
  children, in preference order. Advertising only `rate="8000"` steers the caller
  onto RFC Opus narrowband; advertising `rate="16000"` selects the wideband codec.
- `<encopt keygen="2">` MUST be present, selecting the v2 SRTP key path
  (consistent with the offer and accept).
- `<capability ver="1">` MUST carry the fixed 7-byte pre-accept blob
  `01 05 f7 09 e4 bb 07`. This differs from the offer/accept capability blob
  (`01 05 f7 09 e4 bb 13`) only in the final byte.

A receiver of a `<preaccept>` MUST read `call-id` and `call-creator` from the
action child to correlate it with the in-flight call. No offer-style `<receipt>`
ack is expected for `<preaccept>`; the generic server `<ack>` for the `<call>`
stanza suffices.

**Findings**

In the callee response flow, `<preaccept>` is sent first (immediately on
deciding to answer), then `<accept>`. The `<preaccept>` and `<accept>` advertise
the same set of audio rates. The capability blob shares its first six bytes with
the offer/accept blob and differs only in the trailing byte (`0x07` vs `0x13`).

**Requires:** [`call-offer`](../signalling/call-offer.md), [`call-accept`](../signalling/call-accept.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working |  |
| [`meowcaller`](../../flavors.md) | planned |  |

**Open questions**

- Whether the server or peer behaves differently when <preaccept> is omitted versus sent (e.g. caller-side ringing UI/timeout), and whether it is ever mandatory.
- Whether <preaccept> may carry additional children (e.g. <video>, <net>) for video calls, as its <audio>-only shape is observed for audio calls.
- Full meaning of the packed <capability> bitfield and the significance of the differing final byte.

---

[in the full RFC →](../index.md#call-preaccept) · [RFC contents](../index.md#contents)
