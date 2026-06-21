<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Missed / timed-out call flow

_Signalling · `flow-call-missed`_

`SIG-12` · _status: draft · audio, video_

Stanza sequence for a 1:1 call offered but never answered: offer, per-device offer-receipt, no preaccept/accept, then a timeout-driven terminate.

Opens like any 1:1 call (see [flow-incoming-1to1](../signalling/flow-incoming-1to1.md),
[call-offer](../signalling/call-offer.md)) but never reaches accept.

1. **Offer.** Caller sends `<call to="{callee}" id="{stanza-id}">` wrapping
   `<offer call-id call-creator>` (see [call-offer](../signalling/call-offer.md)). Server `<ack>`s
   and fans out to each callee device.

2. **Offer-receipt (per device).** Each callee device receiving the offer MUST
   send a `<receipt>` in addition to the transport `<ack>`:

       <receipt to="{caller}" id="{offer-stanza-id}" [from="{own-device-jid}"]>
         <offer call-id="{call-id}" call-creator="{call-creator}"/>
       </receipt>

   - `id` MUST equal the inbound `<call>` stanza `id` (NOT `call-id`).
   - `from`, when present, MUST be the acknowledging device's own addressable
     JID: its LID if the offer arrived addressed to a LID, otherwise its PN.
   - This is NOT an accept and MUST NOT be treated as one.

3. **No answer.** No callee device sends `<preaccept>` (see
   [call-preaccept](../signalling/call-preaccept.md)) or `<accept>` (see [call-accept](../signalling/call-accept.md)).
   Call stays ringing for the offer/ring timeout window.

4. **Terminate.** On ring timeout with no answer, the call MUST be ended with a
   `<terminate>` inside the `<call>` wrapper (see [call-terminate](../signalling/call-terminate.md)):

       <call to="{peer-jid}">
         <terminate call-id="{call-id}" call-creator="{call-creator}"
                    [reason="{reason}"]>
           [<destination><to jid="{device-jid}"/>...</destination>]
         </terminate>
       </call>

   - `<terminate>` MUST carry the same `call-id`/`call-creator` as the offer.
   - When targeting a peer's other ringing devices, it MAY carry a single
     `<destination>` enumerating them with one `<to jid="..."/>` per device;
     otherwise `<destination>` MUST be omitted.
   - `reason`, when unspecified, MUST be omitted entirely (never sent empty).

A `<terminate>` for an unanswered call MAY carry `duration`/`audio_duration`
counters; expected zero/absent for a missed call. A receiver MUST treat their
absence as "not reported", not infer a value.

A receiver that does not recognize a `<call>` action child MUST ignore the
stanza rather than error.

Requires: [`call-offer`](../signalling/call-offer.md), [`call-accept`](../signalling/call-accept.md), [`call-preaccept`](../signalling/call-preaccept.md), [`call-terminate`](../signalling/call-terminate.md), [`flow-incoming-1to1`](../signalling/flow-incoming-1to1.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [`d68af6c`](https://github.com/oxidezap/whatsapp-rust-private/commit/d68af6c608297c864669850b9bc05d4a54410d15) | Parses inbound <call>/<offer>, auto-emits the <receipt><offer/></receipt> ack, and builds <terminate>; example bot rejects/accepts rather than ringing out, so the timeout-driven terminate is not exercised end-to-end. |
| `zapo-caller` | working | — | Signalling builders (offer/accept/terminate) ported from this flavor's signaling.ts. |

**Annotation** `wacrg:SIG-12` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/flow-call-missed.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/flow-call-missed.yaml)

**Open questions**
- The ring/offer timeout duration and which side (caller, callee, or server) drives the terminate when a call goes unanswered.
- Whether a distinct reason value (e.g. a 'timeout'/'no_answer' code) marks a missed-call terminate, or whether the reason is simply omitted; the source only confirms accepted_elsewhere.
- Whether the server emits its own terminate/notification for a timed-out call independent of the caller's terminate, and how a missed call is recorded in chat history.
- Exact values of duration/audio_duration on a missed-call terminate (expected zero/absent but not confirmed from source).

**References**
- wacore voip signaling builders (build_offer, build_terminate)
- wacore call stanza parser and build_offer_ack_receipt

---

[← in the full spec](../../index.md#flow-call-missed)
