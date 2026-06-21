<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# WhatsApp Calls — the spec

The normative spec of the WhatsApp 1:1 and group call stack. Implement to these sections to interoperate; each is citable by its stable id and has its own details page. Libraries follow changes via the [feed](spec/feed.json) ([updates](spec/updates.md)).

[Signalling](#signalling) - [Encodings](#encodings) - [Crypto](#crypto) - [Relay](#relay)

<a id="signalling"></a>

## Signalling

Call control over the WABinary/XMPP transport: the <call> stanza family and feature signalling.

| # | Section | Summary |
| --- | --- | --- |
| 1 | [Call offer stanza](#call-offer) | A caller opens a 1:1 call with a <call> stanza whose <offer> child proposes the session, carries per-device media keys, and seeds transport negotiation. |
| 2 | [Video call negotiation](#video-call) | A call is video-capable iff its `<offer>` carries a `<video>` child; the group fan-out notice signals video via `media="video"`. |
| 3 | [Call accept stanza](#call-accept) | The callee answers an offer with a <call> stanza whose <accept> child selects the media format and commits the call to the v2 SRTP key path. |
| 4 | [Call pre-accept (ringing)](#call-preaccept) | Optional <preaccept> stanza a callee sends to signal "ringing" before answering with <accept>. |
| 5 | [Transport stanza](#call-transport) | The <transport> action of the <call> stanza negotiates ICE/relay candidates after the offer, carrying the relay token and network medium. |
| 6 | [Group call setup](#group-call) | A multi-party call extends the 1:1 offer/accept flow with a joinable group session, a participant roster, and per-sender media keying. |
| 7 | [Call stanza acknowledgement](#call-ack) | Acknowledging an inbound `<call>` stanza: a generic `<ack>` for every `<call>`, plus an `<offer>`-only `<receipt><offer/></receipt>`. |
| 8 | [Call reject stanza](#call-reject) | The `<reject>` action stanza declines an incoming call offer before the media phase, naming the call by `call-id`/`call-creator` with no child elements. |
| 9 | [Missed / timed-out call flow](#flow-call-missed) | Stanza sequence for a 1:1 call offered but never answered: offer, per-device offer-receipt, no preaccept/accept, then a timeout-driven terminate. |
| 10 | [Mute signalling](#call-mute) | A participant signals an in-call mute state change by sending a `<call>` stanza wrapping a `<mute_v2>` action. |
| 11 | [Call terminate stanza](#call-terminate) | The <terminate> action stanza that ends a call, its reason attribute, destination fan-out, and inbound duration counters. |
| 12 | [Relay latency reporting](#call-relaylatency) | A client reports a measured relay round-trip time via a `<relaylatency>` call action whose `<te>` element names the relay and carries an offset-encoded latency. |
| 13 | [Incoming 1:1 call flow](#flow-incoming-1to1) | Receiver-side stanza sequence for an incoming 1:1 call: parse `<call><offer>`, send an offer receipt, then either ring-and-accept (`<preaccept>` then `<accept>`) or `<reject>`, all addressed to the caller. |
| 14 | [Outgoing 1:1 call flow](#flow-outgoing-1to1) | Caller-side stanza sequence for a 1:1 call: key delivery, offer, ack, receipts, preaccept/accept, transport, media, and terminate, with the ordering and correlation rules between them. |
| 15 | [Rejected call flow](#flow-call-rejected) | Callee-decline flow: acknowledge the `<offer>`, then emit a single `<reject>` without entering preaccept, accept, media-keying, relay, or transport. |

<a id="call-offer"></a>

### 1. Call offer stanza

[View details](spec/signalling/call-offer.md)

`SIG-01` - _status: review - audio, video_

A caller opens a 1:1 call with a <call> stanza whose <offer> child proposes the session, carries per-device media keys, and seeds transport negotiation.

Send a top-level `<call>` stanza with `id` (stanza id, correlates the server
`<ack>`), `from`, and `to`. Its `<offer>` child MUST carry `call-id` (opaque
logical call identifier, echoed in every later stanza for this call) and
`call-creator`.

`<offer>` children MUST appear in this exact order; a mis-ordered offer is
rejected by the server with error **439**:

    privacy → audio(8000) → audio(16000) → net(medium) → capability
            → (destination | enc) → encopt(keygen) → device-identity

- Media: two nodes `<audio enc="opus" rate="8000">` and `<audio enc="opus" rate="16000">`.
- `<capability ver="1">` body MUST be the fixed 7-byte blob `01 05 f7 09 e4 bb 13`.
- `<encopt keygen="2">` selects the v2 SRTP key path.
- Each recipient device MUST receive its own `<enc>` node carrying the call key
  encrypted to that device's Signal session: `type="pkmsg"` to establish,
  `type="msg"` to reuse. A multi-device callee receives several `<enc>` nodes.

---

<a id="video-call"></a>

### 2. Video call negotiation

[View details](spec/signalling/video-call.md)

`SIG-02` - _status: draft - audio, video_

A call is video-capable iff its `<offer>` carries a `<video>` child; the group fan-out notice signals video via `media="video"`.

**1:1 offer.** A video-capable `<offer>` MUST carry a `<video>` child in addition
to its `<audio enc="opus" rate="…">` advertisements (see [call-offer](#call-offer)).
The `<video>` marker is additive: the `<audio>` advertisements are identical in the
audio-only and video cases.

    <offer call-id call-creator>
      <audio enc="opus" rate="8000"/>
      <audio enc="opus" rate="16000"/>
      <video/>                          <!-- present ⇒ video call -->
    </offer>

- A receiver MUST treat the call as video iff the `<offer>` contains at least one
  `<video>` child, audio-only otherwise (`is_video = any child tag == "video"`).
- A receiver MUST NOT require any attribute on `<video>`; element presence is the signal.
- A receiver MUST parse and honour the `<audio>` advertisements of a video offer
  exactly as for an audio-only offer.

**Group fan-out notice.** A video call announced via `<offer_notice>`
(see [group-call](#group-call)) carries `media="video"` as an attribute (not a child;
audio uses `media="audio"`). A receiver MUST treat the call as video iff
`media == "video"`. `type == "group"` independently marks it a group call.

**Answering.** The callee answers a video offer with the same `<preaccept>` /
`<accept>` handshake as audio-only (see [call-accept](#call-accept),
[call-preaccept](#call-preaccept)); the accept negotiates the `<audio>` rate as usual.
No video-specific child in `<accept>` is required to accept the audio portion.

---

<a id="call-accept"></a>

### 3. Call accept stanza

[View details](spec/signalling/call-accept.md)

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
  (see [srtp-master-key](#srtp-master-key)), matching the offer's `encopt`.

Optional children:

- `<te priority="2">` — relay transport-endpoint blob; MUST be placed immediately
  after the `<audio>` nodes.
- `<capability ver="1">` — body is the fixed 7-byte blob `01 05 f7 09 e4 bb 13`.
- `<rte>` — relay-token-extension blob, no attributes.
- `<voip_settings uncompressed="1">` — VoIP settings blob; MUST be the last child.

---

<a id="call-preaccept"></a>

### 4. Call pre-accept (ringing)

[View details](spec/signalling/call-preaccept.md)

`SIG-04` - _status: review - audio, video_

Optional <preaccept> stanza a callee sends to signal "ringing" before answering with <accept>.

A callee MAY send `<preaccept>` to signal that an incoming `<offer>`
([call-offer](#call-offer)) is ringing, before the user answers. It does not
accept the call and MUST be followed by `<accept>` ([call-accept](#call-accept))
or a terminating action ([call-reject](#call-reject) /
[call-terminate](#call-terminate)).

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

---

<a id="call-transport"></a>

### 5. Transport stanza

[View details](spec/signalling/call-transport.md)

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

---

<a id="group-call"></a>

### 6. Group call setup

[View details](spec/signalling/group-call.md)

`SIG-06` - _status: draft - group, audio, video_

A multi-party call extends the 1:1 offer/accept flow with a joinable group session, a participant roster, and per-sender media keying.

TODO — not yet fully specified.

- The creator establishes a group call session that additional participants join.
- Each participant is keyed independently; see [srtp-master-key](#srtp-master-key).
- Media uses per-sender SFrame keys; see [sframe-media](#sframe-media).
- Unspecified: the participant roster stanza, join/leave signalling, and group
  key distribution/rotation on join/leave.

<a id="raise-hand"></a>

#### 6.1 Raise hand

[View details](spec/signalling/raise-hand.md)

`SIG-09` - _status: draft - group, raise-hand_

In-call signal a participant sends to raise or lower their hand in a group call.

A participant signals raise/lower-hand state to other participants in-band over
the call signalling channel.

TODO: the exact stanza/attribute carrying this state, and whether it is acked,
is not yet specified.

<a id="reactions"></a>

#### 6.2 In-call emoji reactions

[View details](spec/signalling/reactions.md)

`SIG-10` - _status: draft - reactions, group_

A participant broadcasts a transient emoji reaction during a call.

NOT YET SPECIFIED. Carrying stanza, attributes, and emoji encoding are
unknown (not reverse-engineered to wire level).

<a id="screen-share"></a>

#### 6.3 Screen sharing

[View details](spec/signalling/screen-share.md)

`SIG-11` - _status: draft - screen-share, video, group_

Start and stop a screen-share track within a call.

TODO. A participant starts a screen-share by adding a video track flagged as
screen content; the receiver renders it distinctly from the camera track. The
track flag and start/stop stanzas are not yet specified.

---

<a id="call-ack"></a>

### 7. Call stanza acknowledgement

[View details](spec/signalling/call-ack.md)

`SIG-07` - _status: review - audio, video, group_

Acknowledging an inbound `<call>` stanza: a generic `<ack>` for every `<call>`, plus an `<offer>`-only `<receipt><offer/></receipt>`.

A `<call>` carries exactly one action child: `<offer>`, `<offer_notice>`,
`<preaccept>`, `<accept>`, `<reject>`, `<terminate>`, `<transport>`, or
`<relaylatency>`.

**Level 1 — generic ack.** Every received `<call>` MUST be acknowledged with a
generic `<ack>` correlated by the stanza `id` attribute (distinct from the
action's `call-id`), for all action types including `<offer_notice>`.

**Level 2 — offer receipt.** When and only when the action child is `<offer>`,
the device MUST additionally send:

    <receipt to="{caller}" id="{stanza_id}" from="{own_addressable_id}">
      <offer call-id="{call-id}" call-creator="{call-creator}"/>
    </receipt>

- `to` MUST equal the `from` JID of the inbound `<call>`.
- `id` MUST equal the stanza `id` of the `<call>`, NOT the action's `call-id`.
- `from` SHOULD be the device's own addressable id, chosen to match the address
  space of the inbound `from` JID: if `from` is a LID use the own LID, else the
  own phone-number JID. If no own addressable id exists, omit `from`.
- The `<offer>` child MUST carry exactly two attributes copied verbatim from the
  inbound offer: `call-id` and `call-creator`. It MUST NOT echo the offer's media
  or capability children.

An offer receipt MUST NOT be sent for any non-`<offer>` action; `<offer_notice>`
gets the Level-1 ack only.

An unrecognised action child MUST NOT fail the stanza and MUST NOT emit an offer
receipt; it gets the Level-1 ack only.

---

<a id="call-reject"></a>

### 8. Call reject stanza

[View details](spec/signalling/call-reject.md)

`SIG-08` - _status: review - audio, video_

The `<reject>` action stanza declines an incoming call offer before the media phase, naming the call by `call-id`/`call-creator` with no child elements.

Wire layout:

    <call to="{caller-jid}">
      <reject call-id="{call-id}" call-creator="{call-creator-jid}"/>
    </call>

**Construction.**

- The outer `<call>` MUST carry `to` = the JID the offer was received from
  (the caller). The builder MUST NOT add an `id` attribute to `<call>`; the
  I/O layer's stanza id applies.
- `<reject>` MUST carry exactly two attributes:
  - `call-id` — copied verbatim from the declined `<offer>` (see
    [call-offer](#call-offer)).
  - `call-creator` — `call-creator` JID copied verbatim from that `<offer>`.
- `<reject>` MUST be empty: no child elements, no content bytes.

**Semantics.**

- Send `<reject>` only to decline an offer not yet accepted; distinct from
  `<terminate>` (see [call-terminate](#call-terminate)), which ends a call past
  offer.
- `<reject>` MUST NOT be preceded by `<preaccept>` or `<accept>` for the same
  call from the same device; it is the terminal action for that offer.
- No media keying, relay allocation, or transport negotiation occurs on the
  reject path.

**Receiving.**

- A `<reject>` arrives in an inbound `<call>` stanza with the standard
  envelope attributes (`from`, `id`, `t`, optionally `notify`, `platform`,
  `version`, `e`). A receiver MUST treat `call-id` and `call-creator` as
  required; a `<reject>` missing either MUST be rejected as malformed.
- The generic `<call>` acknowledgement covers receipt; no `<receipt>`-style
  ack-of-offer is emitted (that is specific to `<offer>`).

Unlike `<terminate>`, `<reject>` carries no `reason`, `duration`, or
`audio_duration` attributes and no `<destination>` child.

---

<a id="flow-call-missed"></a>

### 9. Missed / timed-out call flow

[View details](spec/signalling/flow-call-missed.md)

`SIG-12` - _status: draft - audio, video_

Stanza sequence for a 1:1 call offered but never answered: offer, per-device offer-receipt, no preaccept/accept, then a timeout-driven terminate.

Opens like any 1:1 call (see [flow-incoming-1to1](#flow-incoming-1to1),
[call-offer](#call-offer)) but never reaches accept.

1. **Offer.** Caller sends `<call to="{callee}" id="{stanza-id}">` wrapping
   `<offer call-id call-creator>` (see [call-offer](#call-offer)). Server `<ack>`s
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
   [call-preaccept](#call-preaccept)) or `<accept>` (see [call-accept](#call-accept)).
   Call stays ringing for the offer/ring timeout window.

4. **Terminate.** On ring timeout with no answer, the call MUST be ended with a
   `<terminate>` inside the `<call>` wrapper (see [call-terminate](#call-terminate)):

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

---

<a id="call-mute"></a>

### 10. Mute signalling

[View details](spec/signalling/call-mute.md)

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
- `call-id` MUST equal the offer's `call-id` (see [call-offer](#call-offer)).
- `call-creator` MUST equal the call's `call-creator` JID and MUST be
  byte-identical to the value on every other action of the same call.
- `mute-state` MUST carry the new mute state as a string attribute value.
- The tag MUST be `mute_v2` (sent verbatim on the wire). `<mute_v2>` MUST have
  no child elements; all state is in attributes.
- A fresh `<mute_v2>` MUST be sent on each transition; it expresses the new
  absolute state, not a toggle.
- This is informational signalling only: the sender MUST NOT renegotiate
  transport, codecs, or keys (see [call-transport](#call-transport)). Muting is
  realised on the media stream independently (e.g. ceasing audio or sending
  silence).

---

<a id="call-terminate"></a>

### 11. Call terminate stanza

[View details](spec/signalling/call-terminate.md)

`SIG-14` - _status: draft - audio, video, group_

The <terminate> action stanza that ends a call, its reason attribute, destination fan-out, and inbound duration counters.

Wire shape:

    <call to="{peer-jid}">
      <terminate call-id="{call-id}" call-creator="{call-creator-jid}"
                 [reason="{reason}"]>
        [<destination>
           <to jid="{device-jid}"/>...
         </destination>]
      </terminate>
    </call>

`<call>` wrapper:

- MUST carry `to` (peer JID).
- MUST NOT carry a builder-supplied `id` (unlike `<preaccept>`/`<heartbeat>`).

`<terminate>` action element:

- MUST carry `call-id` — the call identifier from the offer
  (see [call-offer](#call-offer)), not the stanza id.
- MUST carry `call-creator` — JID of the call's creator.
- MAY carry `reason` (free-form string). When absent, the attribute MUST be
  omitted entirely (no empty `reason=""`).
- MAY contain a single `<destination>` child, which MUST then contain one
  `<to jid="..."/>` per target device. When there are no extra devices,
  `<destination>` MUST be omitted.

Reason `accepted_elsewhere` is sent to a peer's other devices once the call is
accepted on one device; it pairs with the `<destination>` list of devices to
hang up. An ordinary hang-up MAY send no `reason`.

Inbound `<terminate>`:

- MUST be parsed for `call-id` and `call-creator` (both required).
- MAY carry `duration` — total call duration in seconds, non-negative integer
  fitting an unsigned 32-bit value.
- MAY carry `audio_duration` — audio-only duration, same encoding/range.
- Both counters optional; a parser MUST treat absence as "not reported", not 0.

A receiver that does not recognize a `<call>` action child MUST ignore the
stanza rather than error.

---

<a id="call-relaylatency"></a>

### 12. Relay latency reporting

[View details](spec/signalling/call-relaylatency.md)

`SIG-15` - _status: draft - audio, video, group_

A client reports a measured relay round-trip time via a `<relaylatency>` call action whose `<te>` element names the relay and carries an offset-encoded latency.

Send a `<call>` stanza carrying a `<relaylatency>` action child. The action MUST
carry the `call-id` and `call-creator` attributes used by the rest of the call's
signalling (see [call-offer](#call-offer)):

    <call to="{peer-jid}">
      <relaylatency call-id="{call-id}" call-creator="{call-creator-jid}">
        <te latency="{encoded}" relay_name="{relay}">{address-bytes}</te>
        <destination>
          <to jid="{peer-device-jid}"/>
          ...
        </destination>
      </relaylatency>
    </call>

- The `<call>` wrapper MUST set `to` to the peer JID and MUST NOT carry an `id`
  attribute on the action.
- The action MUST contain exactly one `<te>` child. The `<te>` element MUST carry
  a `latency` attribute (encoding below), a `relay_name` attribute naming the relay
  (e.g. `gru1c02`), and the relay's binary address as the element's raw byte content.

**Latency encoding.** `latency` MUST be the decimal string of the RTT in
milliseconds added to the fixed 32-bit offset `0x02000000` (33554432), in unsigned
32-bit arithmetic:

    latency = decimal_string( 0x02000000 + rtt_ms )

RTT 45 ms encodes as `"33554477"`.

**Destination.** When targeting specific peer devices, the action SHOULD include a
`<destination>` child with one `<to jid="..."/>` per target device. `<destination>`
MUST be omitted when there are no target devices (e.g. an inbound callee reporting
to the call creator).

**Receiving.** A `<call>` whose action child tag is `relaylatency` MUST be treated
as a relay-latency report keyed by `call-id` and `call-creator`. A receiver MUST NOT
reject the signalling when the action carries no `<te>` or `<destination>` children.

---

<a id="flow-incoming-1to1"></a>

### 13. Incoming 1:1 call flow

[View details](spec/signalling/flow-incoming-1to1.md)

`SIG-16` - _status: review - audio, video_

Receiver-side stanza sequence for an incoming 1:1 call: parse `<call><offer>`, send an offer receipt, then either ring-and-accept (`<preaccept>` then `<accept>`) or `<reject>`, all addressed to the caller.

An incoming 1:1 call arrives as a top-level `<call>` whose action child is
`<offer>` (see [call-offer](#call-offer)).

**1. Parse the inbound `<call>`**

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

**2. Acknowledge the offer**

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
- This is in addition to the generic `<ack>` (see [call-ack](#call-ack)), and is
  sent only for `<offer>`, not for `offer_notice` or other actions.

**3a. Decline the call**

    <call to=<caller JID>>
      <reject call-id=<offer call-id> call-creator=<offer call-creator>/>
    </call>

No `<preaccept>`/`<accept>` is sent. See [call-reject](#call-reject).

**3b. Answer the call**

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

See [call-preaccept](#call-preaccept) and [call-accept](#call-accept).

---

<a id="flow-outgoing-1to1"></a>

### 14. Outgoing 1:1 call flow

[View details](spec/signalling/flow-outgoing-1to1.md)

`SIG-17` - _status: draft - audio, video_

Caller-side stanza sequence for a 1:1 call: key delivery, offer, ack, receipts, preaccept/accept, transport, media, and terminate, with the ordering and correlation rules between them.

This part governs ordering, correlation, and state transitions. Each step's
stanza wire format is normative in its own part.

**Identifiers.**
- The caller MUST generate a `call-id` (opaque logical call identifier; observed
  as a short hex-like token) before sending the offer, and MUST echo `call-id`
  + `call-creator` in every subsequent stanza for this call.
- `call-id` is distinct from the per-stanza `id` used for server acks.
- `call-creator` MUST be the caller's own addressable id (in practice its
  phone-number JID) and MUST remain constant for the call's lifetime.

**Step 1 — Device discovery / key delivery (before the offer).**
- MUST enumerate the callee's devices and MUST establish a Signal session with
  each target device.
- MUST generate one random 32-byte call key for the call and MUST encrypt it
  once per target device to that device's session (`type="pkmsg"` to establish,
  `type="msg"` to reuse). All target devices receive the same call key; each
  peer derives its own SRTP keys from it, keyed by participant id.

**Step 2 — Offer.** MUST send top-level `<call to="{callee}" id="{stanza-id}">`
whose `<offer>` carries `call-id`, `call-creator`, the advertised `<audio>`
formats, the `<capability>` blob, and the per-device encrypted call key (single
`<enc>` for one device, or `<destination>` of `<to><enc/></to>` entries for
several). Layout and child order are normative in [call-offer](#call-offer).

**Step 3 — Server ack.** MUST treat the call as pending until acked. The server
`<ack>` correlates by the `<call>` stanza `id`, NOT by `call-id`
(see [call-ack](#call-ack)).

**Step 4 — Offer receipts (ringing).** Per ringing callee device the caller
receives a `<receipt>` whose `<offer call-id call-creator/>` echoes the call
(see [call-ack](#call-ack)). At least one receipt indicates the offer reached a
ringing device. MUST correlate by `call-id` + `call-creator`.

**Step 5 — Preaccept (optional, early-media).** A callee device MAY send
`<preaccept>` before accepting (see [call-preaccept](#call-preaccept)). The caller
MUST treat it as a ringing/early-media signal only; MUST NOT begin protected
media or tear down the offer on a preaccept alone.

**Step 6 — Accept.** On accept the caller receives an `<accept>` for this
`call-id` selecting the answering device (see [call-accept](#call-accept)). From
this point the caller MUST direct subsequent signalling to the accepting device
and MUST consider the call answered.

**Step 7 — Transport / relay negotiation.** See [call-transport](#call-transport)
and [stun-relay](#stun-relay). MUST be prepared to send and receive `<transport>`
stanzas (relay candidates, peer ICE, keepalive/reply) carrying `call-id` +
`call-creator`, and MAY report per-relay RTT via `<relaylatency>`
(see [call-relaylatency](#call-relaylatency)). MAY begin once relay data is
available and MAY overlap with steps 4–6.

**Step 8 — Media.** On an established path, protect/exchange RTP using SRTP keys
derived from the call key (see [srtp-master-key](#srtp-master-key)); the
negotiated `<audio>` format governs the codec. While connected the caller MUST
keep the path alive with consent-freshness traffic; absence of it causes the
relay to drop the stream and the call to fail (see [stun-relay](#stun-relay)).

**Step 9 — Terminate.** Either party ends the call with `<terminate>` carrying
`call-id` + `call-creator` (see [call-terminate](#call-terminate)). After sending
or receiving `<terminate>` the caller MUST stop media, consider the `call-id`
closed, and MUST NOT reuse that `call-id`.

**Cancellation.** Before an `<accept>`, the caller MAY cancel a pending call by
sending `<terminate>` for the `call-id`.

**Multi-device fan-in.** When the offer reached several callee devices and one
answers, the call is bound to that device. The caller MUST address later
signalling to the answering device and MUST NOT continue to treat the other
callee devices as live participants.

**Correlation summary.** Offer↔ack and offer receipt correlate on the `<call>`
stanza `id`; `accept`, `transport`, `relaylatency`, and `terminate` correlate on
`call-id` + `call-creator`.

---

<a id="flow-call-rejected"></a>

### 15. Rejected call flow

[View details](spec/signalling/flow-call-rejected.md)

`SIG-18` - _status: draft - audio, video_

Callee-decline flow: acknowledge the `<offer>`, then emit a single `<reject>` without entering preaccept, accept, media-keying, relay, or transport.

Composes [call-offer](#call-offer), [call-ack](#call-ack), and
[call-reject](#call-reject) into a terminal sequence. Per-stanza wire layouts
are defined by those parts.

**Callee side — on inbound `<offer>`, to decline, in order:**

1. Acknowledge per [call-ack](#call-ack): send the generic transport `<ack>`
   keyed to the `<call>` stanza `id`, and the offer `<receipt>` echoing
   `<offer call-id call-creator/>`. Both MUST be sent regardless of the
   decision to reject.

2. Send a `<call>` stanza whose single action child is `<reject>` per
   [call-reject](#call-reject):

       <call to="{caller-jid}">
         <reject call-id="{call-id}" call-creator="{call-creator-jid}"/>
       </call>

   - `to` MUST be the JID the `<offer>` was received from.
   - `call-id` and `call-creator` MUST be copied verbatim from the `<offer>`.
   - `<reject>` MUST be empty.

**MUST NOT on this path:**

- MUST NOT send `<preaccept>` or `<accept>` for the same `call-id`; `<reject>`
  is terminal for that offer from that device.
- MUST NOT decrypt or derive media keys from the offer's `<enc>` callKey, and
  MUST NOT perform relay allocation, candidate exchange (`<transport>`), or
  relay-latency probing (`<relaylatency>`).
- MUST NOT send `<terminate>` for a call that never progressed past the offer.

**Caller side.** The caller MUST treat a received `<reject>` for an outstanding
offer as a decline by that device. The `<reject>` arrives wrapped in an inbound
`<call>` and is acknowledged by the generic `<call>` ack only; no offer receipt
is emitted in response to a `<reject>`.

**Multi-device.** Each offered device decides independently and MAY emit its own
`<reject>` carrying the same `call-id`/`call-creator`. Cross-device fan-out is
unspecified.

---

<a id="encodings"></a>

## Encodings

Media codecs and payload formats: MLow, Opus, and video.

| # | Section | Summary |
| --- | --- | --- |
| 1 | [MLow audio codec](#mlow) | WhatsApp's low-bitrate split-band CELP speech codec ("SMPL") that reuses the Opus/CELT range coder for entropy coding. |
| 2 | [Opus codec](#opus) | Standard Opus and MLow payloads share one RTP audio stream; the receiver routes each frame to a decoder by the top two bits of its first payload byte. |
| 3 | [Video codec](#video) | Video and screen-share tracks are carried as H.264; profile/level negotiation and packetization mode are not yet specified. |

<a id="mlow"></a>

### 1. MLow audio codec

[View details](spec/encodings/mlow.md)

`ENC-01` - _status: review - audio_

WhatsApp's low-bitrate split-band CELP speech codec ("SMPL") that reuses the Opus/CELT range coder for entropy coding.

- Decode an MLow payload as split-band CELP. Output is 16 kHz PCM.
- Entropy layer is the Opus/CELT range coder verbatim: read symbols from the
  front of the buffer, raw bits from the back.
- Run the decode schedule in this order: TOC/frame parse; RED de-packetization;
  range-coded LSF -> LPC; excitation pulses; gains; pitch/LTP; CELP synthesis;
  harmonic and HP post-filters; comfort-noise generation.
- MLow is a registered decoder alongside Opus; codec selection is signalled in
  the offer (see [call-offer](#call-offer)).
- The neural companion post-filter is OPTIONAL; not required for intelligible audio.

<a id="mlow-red-fec"></a>

#### 1.1 MLow RED and Reed-Solomon FEC

[View details](spec/encodings/mlow-red-fec.md)

`ENC-02` - _status: draft - audio_

The optional "SplitRed" redundancy envelope wrapping an MLow RTP audio payload: one main frame plus zero or more time-shifted redundant copies of earlier frames, recoverable without retransmission.

**Applicability**

SplitRed is the OUTERMOST layer of an MLow RTP audio payload. It MUST be
applied only when `mlow_red_redundancy_level > 0`. Otherwise the RTP payload is
a single bare MLow frame (see [mlow-frame](#mlow-frame)) with no wrapper and the
SplitRed parse MUST NOT be applied.

A decoder MUST choose between SplitRed and bare-frame based on the negotiated
redundancy level, NOT by sniffing the first byte (a bare frame's first byte has
its high bit set and is misread as a redundant block header). Feeding a bare
frame to the SplitRed parser is malformed and MUST be rejected.

**Wire layout**

With `N` = number of redundant blocks in the packet:

```
[ red_hdr[0] (2B) ] ... [ red_hdr[N-1] (2B) ]   ; N redundant-block headers
[ main_marker     (1B) ]                         ; terminates the header run
[ red_payload[0] ] ... [ red_payload[N-1] ]      ; redundant bodies, in header order
[ main_payload ]                                 ; main frame body, last
```

**Redundant block header (`red_hdr[i]`, 2 bytes)**

```
byte 0:  1 t t t t t t t      ; high bit MUST be 1; low 7 bits = time_code
byte 1:  s s s s s s s s      ; size = byte length of red_payload[i]
```

- `byte0` MUST have `0x80` set; `byte0 & 0x7f` is `time_code`.
- `byte1` is the unsigned byte length of the redundant body (max 255 bytes).

**Main marker (`main_marker`, 1 byte)**

```
byte 0:  0 t t t t t t t      ; high bit MUST be 0; low 7 bits = main time_code
```

`0x80` MUST be clear; the parser detects end-of-header-run by a byte with the
high bit clear. `byte & 0x7f` is the main frame's `time_code`. The main payload
length is NOT in the header; it is whatever bytes remain after the header run
and all redundant payloads.

**Parse procedure**

Let `p` be the payload, `n = len(p)`. A decoder MUST parse as follows and MUST
reject on each error condition:

1. If `n == 0`, reject (`PktSizeZero`).
2. Walk the header run from `cur = 0`, tracking `rem` = bytes from `cur` to end
   (`rem` starts at `n`):
   - If `rem == 0` before a main marker is seen, reject (`HeaderTooShort`).
   - Read `b0 = p[cur]`.
   - If `b0 < 0x80`, this is the main marker: if `rem <= 1`, reject
     (`MainTooShort`); otherwise stop the walk.
   - Else redundant header: if `rem <= 2`, reject (`RedundantTooShort`). Read
     `size = p[cur+1]`. If `size + 2 >= rem`, reject (`RedundantTooShort`).
     Record `{ code: b0 & 0x7f, size }`. Advance `cur += 2`; `rem -= size + 2`.
3. Read main marker: `main_code = p[cur] & 0x7f`; advance `cur += 1`.
4. For each recorded redundant block `r`, in header order, the next `r.size`
   bytes at `cur` are its body (`is_main = false`, `time_code = r.code`);
   advance `cur += r.size`.
5. The remaining `main_size = rem - 1` bytes are the main body (`is_main = true`,
   `time_code = main_code`).

Redundant frames are yielded first in header order, main frame last. Each body
is a complete MLow frame (TOC plus body), decoded per [mlow-frame](#mlow-frame).
A decoder SHOULD use a redundant copy only when the main frame for that
`time_code` was lost.

**Reed-Solomon FEC**

A Reed-Solomon FEC tier exists alongside the RED envelope. Its on-wire
encoding, generator polynomial, symbol size, and negotiation are not specified
here.

<a id="mlow-frame"></a>

#### 1.2 MLow frame and TOC

[View details](spec/encodings/mlow-frame.md)

`ENC-03` - _status: review - audio_

The leading "smpl" TOC byte of an MLow payload routes the frame (standard Opus vs. MLow), carries DTX/VAD flags, internal sample rate, and frame duration, and governs the three-chained-20 ms-subframe layout of an active MLow frame.

An MLow RTP payload begins with a single TOC byte `b`, followed by the
range-coded body. The TOC MUST be parsed first; it selects the decode path and
supplies the output length even when no body is decoded.

**Routing.** Inspect the top two bits first:

    (b & 0xC0) == 0xC0   →  standard Opus/CELT TOC (decode with stock Opus)
    (b & 0xC0) != 0xC0   →  smpl MLow TOC (decode with the MLow path)

When `(b & 0xC0) == 0xC0`, the remaining bits MUST be interpreted as a standard
Opus TOC per RFC 6716 §3.1; the frame is NOT MLow. Internal sample rate is fixed
at 16 kHz; frame duration comes from the Opus config `config = b >> 3` (RFC 6716
Table 2): configs < 12 SILK {10, 20, 40, 60} ms; 12–15 Hybrid {10, 20} ms;
≥ 16 CELT {2.5, 5, 10, 20} ms (round 2.5 ms up to 3 ms).

**smpl TOC bit layout** (bit 0 = LSB), used when `(b & 0xC0) != 0xC0`:

    bit 7  SID        comfort-noise / DTX (silence-insertion descriptor)
    bit 6  VAD        voice-activity flag
    bit 5  rate       internal sample rate: 0 → 16000 Hz, 1 → 32000 Hz
    bits 4:3  size    frame-duration index into {10, 20, 60, 120} ms
    bit 2  flag2      low-rate / config flag (selects active-frame config)
    bit 1  enable     voiced-enable bit
    bit 0  flag0      reserved flag

Derived fields MUST be computed as:

    sample_rate = (b & 0x20) ? 32000 : 16000
    frame_ms    = {10, 20, 60, 120}[(b >> 3) & 3]
    sid         = (b >> 7) & 1
    vad         = (b >> 6) & 1
    voiced      = vad AND ((b >> 1) & 1)
    active      = vad OR  ((b >> 1) & 1)

**Output length.** MUST be `sample_rate / 1000 * frame_ms` for an MLow frame, and
`16000 / 1000 * frame_ms` for a standard-Opus-routed frame.

**Inactive frames.** If `sid` is set or `active` is false, the frame carries no
excitation: the decoder MUST emit `output_length` samples of silence (or comfort
noise) and MUST NOT decode an active body. A standard-Opus TOC MUST be routed
away from the MLow active-frame decoder.

**Active-frame layout.** An active MLow frame (typically 60 ms) MUST be decoded as
three chained 20 ms internal frames over a single range-coded body beginning at
byte offset 1. For each internal frame, the body MUST be read in order: LSF/LPC
indices, excitation pulses, then either the pitch/LTP block (voiced, i.e. LSF
stage-1 index == 1) or the unvoiced gains block. Each internal frame divides into
4 subframes; the voiced pitch block carries one lag per 40-sample block (8 per
internal frame, 24 per packet). `flag2` (`(b >> 2) & 1`) selects active-frame
config 0 or 1, applied uniformly across all three internal frames. Cross-frame
predictor and synthesis history MUST persist across packets (the stream is
continuous); a decoder MUST reset this state only at a stream discontinuity.

<a id="mlow-rangecoder"></a>

#### 1.3 MLow range coder

[View details](spec/encodings/mlow-rangecoder.md)

`ENC-04` - _status: review - audio_

The Opus/CELT range entropy coder (RFC 6716 §4.1), reused verbatim by MLow: range-coded symbols packed from the buffer front, raw uniform bits from the back, sharing one byte buffer.

An MLow payload is one byte buffer carrying two interleaved bit streams from a
single Opus/CELT range coder: **range-coded symbols** from the **front** (low
offsets, ascending) and **raw uniform bits** from the **back** (high offsets,
descending). A decoder MUST consume both streams from the same buffer with the
algorithms below; the two cursors MUST NOT overlap in a well-formed payload.

All arithmetic is unsigned 32-bit with modular (wrapping) semantics where noted.

**Constants**

```
EC_SYM_BITS   = 8                         ; bits per renormalisation byte
EC_CODE_BITS  = 32                        ; range register width
EC_SYM_MAX    = (1 << EC_SYM_BITS) - 1    ; 255
EC_CODE_TOP   = 1 << (EC_CODE_BITS - 1)   ; 0x80000000
EC_CODE_BOT   = EC_CODE_TOP >> EC_SYM_BITS ; 0x00800000
EC_CODE_EXTRA = (EC_CODE_BITS - 2) % EC_SYM_BITS + 1   ; 7
EC_WINDOW_SIZE = 32                       ; raw-bit window width
EC_UINT_BITS  = 8                         ; uint split threshold
EC_CODE_SHIFT = EC_CODE_BITS - EC_SYM_BITS - 1   ; 23
```

The helper `ilog(x)` MUST return `floor(log2(x)) + 1` for `x > 0` and `0` for
`x == 0` (equivalently `32 - clz(x)`). `ec_mini(a, b)` MUST return the smaller
of `a` and `b`.

**Decoder**

**Initialisation (`ec_dec_init`)**

```
offs       = 0                ; front cursor (range bytes)
end_offs   = 0                ; back cursor (raw bytes, counts from buffer end)
end_window = 0 ; nend_bits = 0
rng        = 1 << EC_CODE_EXTRA          ; 0x80
nbits_total = EC_CODE_BITS + 1
            - ((EC_CODE_BITS - EC_CODE_EXTRA) / EC_SYM_BITS) * EC_SYM_BITS
rem        = read_byte()
val        = rng - 1 - (rem >> (EC_SYM_BITS - EC_CODE_EXTRA))
normalize()
```

`read_byte()` MUST return `buf[offs]` and advance `offs` while `offs <
len(buf)`, and MUST return `0` once the front cursor reaches the end of the
buffer (reading past the end yields zero bytes, it is not an error).

**Normalisation**

After every symbol the decoder MUST renormalise so that `rng > EC_CODE_BOT`.
All `val` updates here MUST use wrapping 32-bit arithmetic.

```
while rng <= EC_CODE_BOT:
    nbits_total += EC_SYM_BITS
    rng <<= EC_SYM_BITS
    sym0 = rem
    rem  = read_byte()
    sym  = (sym0 << EC_SYM_BITS | rem) >> (EC_SYM_BITS - EC_CODE_EXTRA)
    val  = ((val << EC_SYM_BITS) + (EC_SYM_MAX & ~sym)) & (EC_CODE_TOP - 1)
```

**Decoding a symbol**

`decode(ft)` MUST return a value in `[0, ft)`:

```
if ft == 0:               err = 1; ext = 1; return 0
ext = rng / ft
if ext == 0:              err = 1; ext = 1; return 0
s = val / ext
return ft - ec_mini(s + 1, ft)
```

After the caller locates the symbol whose cumulative range is `[fl, fh)` out of
`ft`, it MUST call `update(fl, fh, ft)`:

```
s = ext * (ft - fh)               ; wrapping
val = val - s                     ; wrapping
if fl > 0:  rng = ext * (fh - fl) ; wrapping
else:       rng = rng - s         ; wrapping
normalize()
```

**CDF table decode**

A symbol against a **u16 cumulative CDF table** `cdf` (length `n >= 2`) MUST be
decoded as follows. Base `cdf[0]` is subtracted from every entry; effective
total is `cdf[n-1] - cdf[0]`:

```
if n < 2:                     err = 1; return 0
base = cdf[0]
if cdf[n-1] <= base:          err = 1; return 0
ft = cdf[n-1] - base
fs = decode(ft)
target = base + fs
k = 0
while k < n-1 and cdf[k+1] <= target:  k += 1
update(cdf[k] - base, cdf[k+1] - base, ft)
return k
```

**Inverse-CDF table decode**

A symbol against a **u8 inverse-CDF table** `icdf` with `ftb = log2(ft)`
(RFC 6716 `ec_dec_icdf`) MUST be decoded as:

```
if icdf is empty:  err = 1; return 0
r = rng >> ftb
ret = -1 ; s = rng
repeat:
    t = s
    ret += 1
    s = r * icdf[ret]
until val >= s or ret == len(icdf) - 1
val = val - s
rng = t - s
normalize()
return ret
```

**Binary / logp decode**

A single bit with probability `P(0) = 1 / 2^logp` (`ec_dec_bit_logp`) MUST be
decoded as:

```
s = rng >> logp
ret = (val < s) ? 1 : 0
if ret == 0:  val = val - s ; rng = rng - s
else:         rng = s
normalize()
return ret
```

A uniform `bits_n`-bit symbol read directly off the range stream
(`decode_raw_symbol`) MUST be decoded by first computing
`ext = rng >> bits_n` (on `ext == 0`, set `err = 1`, `ext = 1`, return `0`),
then `s = val / ext`, `ft = 1 << bits_n`, `sym = ft - ec_mini(s + 1, ft)`, and
finally `update(sym, sym + 1, ft)`, returning `sym`.

**Uniform integer decode**

An integer uniformly distributed in `[0, ft0)` for `ft0 > 1`
(`ec_dec_uint`) MUST be decoded as:

```
ft  = ft0 - 1
ftb = ilog(ft)
if ftb > EC_UINT_BITS:
    ftb -= EC_UINT_BITS
    t = (ft >> ftb) + 1
    s = decode(t) ; update(s, s+1, t)
    v = (s << ftb) | bits_n(ftb)
    if v <= ft:  return v
    err = 1 ; return ft
else:
    s = decode(ft + 1) ; update(s, s+1, ft + 1)
    return s
```

**64-symbol fine-lag decode (`decode_64_fine_sym`)**

```
ext = rng >> 6
if ext == 0:  err = 1; ext = 1; return 0
s = val / ext
sym = clamp(63 - s, 0, 64)
update(sym, sym + 1, 64)
return sym
```

**Raw bits from the back**

Raw bits are pulled from the **back**, LSB-first, through a 32-bit window.
`bits_n(n)` MUST:

```
window = end_window ; available = nend_bits
if available < n:
    repeat:
        window |= read_byte_from_end() << available
        available += EC_SYM_BITS
    until available > EC_WINDOW_SIZE - EC_SYM_BITS
ret = window & ((1 << n) - 1)
window >>= n
available -= n
end_window = window ; nend_bits = available
nbits_total += n
return ret
```

`read_byte_from_end()` MUST return `buf[storage - 1 - end_offs]` (where
`storage = len(buf)`) and then increment `end_offs`, while `end_offs <
storage`; it MUST return `0` once exhausted.

**Error state and tell**

Any operation that detects a degenerate or exhausted input (zero `ft`, zero
`ext`, empty/invalid table) MUST set the sticky error flag `err = 1`. A
consumer SHOULD treat a set `err` as a hard decode failure rather than using
the synthesised values. `ec_tell` MUST be `nbits_total - ilog(rng)`.

**Encoder**

The encoder is the exact inverse and produces a byte-identical buffer. It MUST
initialise: `rng = EC_CODE_TOP`, `val = 0`, `rem = -1`, `offs = 0`,
`end_offs = 0`, `nbits_total = EC_CODE_BITS + 1`, fixed-`size` output buffer.

**Renormalisation and carry**

```
normalize():
    while rng <= EC_CODE_BOT:
        carry_out(val >> EC_CODE_SHIFT)
        val = (val << EC_SYM_BITS) & (EC_CODE_TOP - 1)   ; wrapping
        rng <<= EC_SYM_BITS
        nbits_total += EC_SYM_BITS

carry_out(c):
    if c != EC_SYM_MAX:
        carry = c >> EC_SYM_BITS
        if rem >= 0:  write_byte(rem + carry)
        while ext > 0:
            write_byte((EC_SYM_MAX + carry) & EC_SYM_MAX)
            ext -= 1
        rem = c & EC_SYM_MAX
    else:
        ext += 1
```

`write_byte(b)` MUST store `b` at `buf[offs]` and advance `offs` while
`offs + end_offs < storage`, otherwise set `err = -1`. `write_byte_at_end(b)`
MUST store `b` at `buf[storage - 1 - end_offs]` and increment `end_offs` under
the same bound, otherwise set `err = -1`.

**Encoding primitives**

`encode(fl, fh, ft)` (the inverse of `decode`/`update`) MUST, with `err = -1`
on `ft == 0`:

```
r = rng / ft
if fl > 0:
    val = val + (rng - r * (ft - fl))   ; wrapping
    rng = r * (fh - fl)                 ; wrapping
else:
    rng = rng - r * (ft - fh)           ; wrapping
normalize()
```

The encoder MUST provide the matching inverses of every decode primitive:
`bit_logp(val, logp)`, `encode_icdf(s, icdf, ftb)`, `encode_cdf(s, cdf)`
(with the same `cdf[0]` base subtraction and validity checks as the decoder),
`encode_uint(fl, ft0)`, `encode_raw_symbol(sym, nbits)` =
`encode(sym, sym+1, 1 << nbits)`, and `encode_64_fine_sym(sym)` =
`encode(sym, sym+1, 64)`. Raw bits are written toward the back with
`bits_n(fl, n)` through the same 32-bit window, flushing full bytes with
`write_byte_at_end` when the window would exceed `EC_WINDOW_SIZE`.

**Flush**

After all symbols are written the encoder MUST flush (`ec_enc_done`) to emit
the final range bytes, drain the back raw-bit window, and merge the two
streams into the single buffer:

```
l   = EC_CODE_BITS - ilog(rng)
msk = (EC_CODE_TOP - 1) >> l
end = (val + msk) & ~msk
if (end | msk) >= val + rng:
    l += 1 ; msk >>= 1 ; end = (val + msk) & ~msk
while l > 0:
    carry_out(end >> EC_CODE_SHIFT)
    end = (end << EC_SYM_BITS) & (EC_CODE_TOP - 1)
    l -= EC_SYM_BITS
if rem >= 0 or ext > 0:  carry_out(0)
; drain back window
while nend_bits >= EC_SYM_BITS:
    write_byte_at_end(end_window & EC_SYM_MAX)
    end_window >>= EC_SYM_BITS ; nend_bits -= EC_SYM_BITS
if err == 0:
    zero-fill buf[offs .. storage - end_offs)
    if remaining bits:
        if end_offs >= storage - offs:  err = -1
        else:  buf[storage - end_offs - 1] |= end_window
```

The finished payload is `buf`; the meaningful body length is `offs + end_offs`
bytes (front range bytes plus back raw-bit bytes), and the gap between the two
cursors MUST be zero-fill padding written by the flush. A successful flush MUST
have `err == 0`; a non-zero `err` means the buffer was too small and the output
MUST be discarded.

<a id="mlow-lsf-lpc"></a>

#### 1.4 MLow LSF and LPC

[View details](spec/encodings/mlow-lsf-lpc.md)

`ENC-08` - _status: review - audio_

MLow carries an internal frame's spectral envelope as range-coded LSF indices, reconstructed into an order-16 quantized NLSF vector and interpolated per-subframe to LPC coefficients.

LSF coding is MLow-specific, NOT stock SILK codebook coding. Order is **16**. All
symbols are read with the cumulative-CDF primitive (`decode_cdf`, u16 cumulative
tables), not the ICDF path. Symbols are read from the range coder (see
[mlow-rangecoder](#mlow-rangecoder)).

**Wire read order (per internal frame).**

    1. stage-1 selector   ; 1 symbol, CDF = lsf_sel[sel]
    2. stage-1 grid        ; 1 symbol, CDF chosen by (match, stage1)
    3. stage-2 residuals   ; 16 symbols, coeff k from lsf_stage2[stage1][config][grid][k]
    4. extra               ; 1 symbol, 3-symbol static CDF lsf_extra

**Stage-1 selector.** Row index `sel`:

    sel = 0   if intf == 0          (first internal frame)
    sel = 2   if prev_stage1 != 0
    sel = 1   otherwise

`intf` is the internal-frame index (0,1,2) within the 60 ms packet; `prev_stage1`
is the stage-1 value of the previous internal frame. Decoded value is `stage1`.

**Match / predictor reset.**

    match = (intf != 0) AND (stage1 == prev_stage1)

When `match` is false, the cross-frame pitch/LTP predictor state (gain index,
filter index, lag, fractional lag) MUST be reset to -1 before decoding the rest of
the frame. `prev_stage1` MUST then be set to the current `stage1`.

**Stage-1 grid.** CDF selected as:

    match  && stage1 != 0   -> lsf_grid.match1
    match  && stage1 == 0   -> lsf_grid.match1_alt
    !match && stage1 != 0   -> lsf_grid.match0_alt
    !match && stage1 == 0   -> lsf_grid.match0

**Stage-2 residuals.** Exactly 16 symbols, coefficient `k` using CDF
`lsf_stage2[stage1][config][grid][k]`, where `config` is the MLow config (0/1). Per
coefficient, raw-symbol count `nraw = len(CDF) - 2`.

**Extra read.** One `extra` symbol from the 3-symbol static CDF `lsf_extra`. Always
fires on the standard decode path (num_subfr >= 2).

**NLSF reconstruction.** Map `(stage1, grid, stage2[16])` plus the previous internal
frame's NLSF to `qlsf[0..16]` (radians, 0..PI). The wire `grid` is the stage-1
codebook index; value 16 denotes the conditional ("cond") centroid derived from the
previous frame:

    qlsf = 2*cbhalf[grid] + we^T * qlvls(stage2)

i.e. twice the selected stage-1 half-centroid plus the weighted stage-2 levels, with
conditional prediction from the previous NLSF when the cond centroid is selected.

**LSF -> LPC interpolation.** For each of the 4 subframes interpolate between the
previous frame's NLSF (`prev`) and current `qlsf` using interpolation row 0:

    w = [0.55, 0.88, 1.0, 1.0]   (per subframe j)
    ilsf[k] = (1-w[j]) * prev[k] + w[j] * qlsf[k]   ; ilsf = qlsf when w == 1.0

On reset (no valid previous NLSF) `prev` MUST be initialized from current `qlsf`.
Each interpolated NLSF MUST be converted to monic LPC coefficients `A[0..16]`
(`A[0] = 1`) via the NLSF->A transform, then bandwidth-expanded until it forms a
stable all-pole filter (chirp factor `1 - iter*0.001` per iteration; stability bound
`|reflection| <= 0.9995`).

**Encoder side (LSF quantization).** Select wire indices so the decoder reconstructs
the same `qlsf` the encoder synthesizes with. Compute the analysis NLSF (forward
A->NLSF) from the analysis LPC, then run the LSF vector quantizer:

  - RD weights per LSF are the inverse spectral-envelope magnitude
    `1/sqrt(|A(e^jw)|^2 * scale)`, `scale = 1/min`.
  - A Mahalanobis shortlist (`VQ_temp`) over the stage-1 centroids (plus the cond
    centroid for conditional coding) selects `surv` survivors.
  - Per survivor, stage-2 residuals `qerr = wie^T*(lsf - 2*cbhalf[qi1]) / qstep`,
    rounded and per-coefficient clamped to `[min_qi, max_qi]`; an RD beam then
    refines one coefficient at a time minimizing `0.5*order*log2(werr)*RDw_adj + bits`.
  - Reconstructed LSFs MUST be spaced so consecutive distances exceed the
    per-coefficient `min_dist` table before the RD metric is evaluated.

The chosen `qi[0]` is the wire `grid` (stage-1 index, or 16 for the cond centroid);
`qi[1..16]` are the 16 stage-2 indices.

<a id="mlow-encoder"></a>

#### 1.5 MLow encode pipeline

[View details](spec/encodings/mlow-encoder.md)

`ENC-09` - _status: draft - audio_

Encode one 60 ms PCM frame into a wire MLow frame: LPC analysis, bit-exact LSF VQ, voicing classification, CELP excitation, per-subframe rate control, DTX, and range-coder serialization in the inverse of the decoder read order.

**Input/output.** Consume exactly **960 samples** (60 ms @ 16 kHz, f32 nominally
in `[-1, 1]`) per call; emit one MLow frame = one TOC byte + range-coded body (see
[mlow-frame](#mlow-frame), [mlow-rangecoder](#mlow-rangecoder)). Active config-0
TOC byte is `0x50`.

Process as **3 chained 20 ms internal frames** (320 samples each), each split into
**4 subframes** of 80 samples. Cross-frame analysis history (LPC window history,
high-pass state, CELP excitation state, perceptual-model state, pitch-estimator
predictor state, LSF predictor) MUST persist across packets; clear only at a stream
discontinuity.

**Input sanitization.** Before analysis, replace any non-finite (NaN) sample with 0
and clamp every sample to `[-1, 1]`.

**Stage order (per packet), in order:**
    1. SILK VAD over int16-scaled input PCM (before the high-pass), yielding a
       per-internal-frame speech-activity probability and the packet-level
       coded-as-active-voice flag (see [mlow-vad](#mlow-vad)).
    2. Encoder input high-pass: 2nd-order ARMA, 35 Hz 3 dB corner, applied to the
       whole packet, state carried across packets.
    3. For each of the 3 internal frames: LPC analysis, LSF quant, voicing
       classification, CELP excitation, rate control, entropy serialization.

**LPC front-end analysis.** Per internal frame: window the high-pass-domain LPC
buffer (starts 96 samples before the internal frame, 448 samples long, up to 144
samples previous-packet history), FFT-autocorrelate, derive bandwidth-expanded
order-16 LPC coefficients `A` (`A[0] = 1`), convert forward A->NLSF (radians 0..PI).
Use a long analysis window for internal frames 0 and 1, a short window for the last.

**LSF quantization.** Run the bit-exact LSF VQ on the analysis NLSF; select wire
`(grid, stage2[16])` (see [mlow-lsf-lpc](#mlow-lsf-lpc)). Use conditional ("cond")
coding against the previous internal frame's committed NLSF when `intf > 0` AND the
previous internal frame's voiced flag equals the current frame's; otherwise use the
unconditional quantizer. Driver params: RD weights = inverse spectral-envelope
magnitude; `RDw_adj = sqrt(mainBitRate/14000)` (= 1.1952286 at 20 kbps); `surv = 6`
survivors (complexity 8). Wire `grid` = `qi[0]` (stage-1 index, or 16 for the cond
centroid); `qi[1..16]` = the 16 stage-2 indices. Reconstruct the committed NLSF from
the chosen indices and carry it as the previous-NLSF input for the next frame.

**Per-subframe LPC interpolation.** Per subframe: interpolate between the previous
frame's committed NLSF and this frame's, convert to monic LPC, compute LPC residual.
Evaluate interpolation index 0 and index 1; select index 1 only when it lowers the
summed per-subframe residual RMS below `0.998 ×` the index-0 RMS. Write the chosen
`lsf_interpol_idx` as the unvoiced LSF `extra` symbol. On the voiced path the LSF
`extra` symbol is 0.

**Voicing classification.** Per internal frame run the perceptually-weighted pitch
estimator (over the persistent perceptually-weighted speech buffer) and the
signal-mode classifier (see [mlow-vad](#mlow-vad)). Fold five strengths into one
`voicing_strength`:

    voicing_strength = ( w0*corr + w1*vad + w2*tilt + w3*harm + w4*lag )
                       / sum(w) + bias   (+ hysteresis term)
    w    = [1.0, 0.5, 0.5, 0.7, 0.3]
    bias = -0.1038
    corr = inv_sigmoid(0.1 + 0.75 * clamp(pitchcorr, 0, 1))
    vad  = 0.04 * (1 - 1.04 / (sp_act_prob + 0.04))
    tilt = t^3   where t is the background-subtracted low/high spectral-tilt ratio
    lag  = -sigmoid(0.25 * (38 - avg_lag))
    harm = spectral harmonicity (peak/valley energy ratio) at avg_lag

Add per-stream hysteresis `+= voicing_prev * 0.05`; update `voicing_prev`, the
low/high background-tilt energies, and the previous last-lag each internal frame.
Smooth the spectral-tilt background energies toward the current low/high band
energies only when the VAD strength is below `-0.1`. Encode an internal frame
**voiced** (LSF stage-1 index = 1, pitch/LTP block) when `voicing_strength > 0` AND
the packet is coded-as-active-voice; otherwise **unvoiced** (stage-1 index = 0,
gains block).

**Unvoiced excitation (gains block).** Run the CELP excitation encoder per subframe,
mapping each CELP pulse to a per-position pulse train (`sign = 1 + 2*(v>>15)`,
`pos = v*sign - 1`, `pulse[pos] += sign`). The wire gains block IS the
quantized-residual-energy (`nrg_res`) layout: `gain_main` = frame-level nrgres index,
`gain_delta` = shape index, both from bit-exact `quant_nrg_res` over the per-subframe
residual energy (`sum(res^2)/80`, normalized domain). Write the per-subframe `nrg_res`
symbol only for subframes that carry pulses, as the CELP FCB gain index for that
subframe; mark subframes with no pulses `-1` (not written).

**Voiced excitation (pitch/LTP block).** Derive per-40-sample-block pitch lags from
the estimator contour (`blockseg_idx` + 8 `laginds`); decoder maps
`lag = laginds*0.5 + 32` clamped to <= 320. Build the CELP adaptive-codebook
(ACB/LTP) basis from the decoder-reconstructed lags. Wire pitch block:
`acb_idx` (clamped to `[0, 15]`) -> LTP gain index `gain_idx`; FCB `gain_idx` ->
`filt_idx` (written only where pulses exist, else `-1`); MAIN-rate pulses -> pulse
train. Write the lag contour as `blockseg_idx` + per-block `laginds`, with delta-lag
prediction `mode`:

    mode = 0   if avg_gain < 10007
    mode = 1   if avg_gain < 14085
    mode = 2   otherwise

where `avg_gain = sum_over_subframes(w0 + 2*w2) / 4` from the per-subframe LTP gain
weights. Advance the cross-packet lag predictor (`prev_lagblk`/`prev_lagidx`) from the
committed contour. Reset the lag-block predictor after the last internal frame of each
packet and after any unvoiced internal frame.

**Rate control.** Per subframe, drive a bitrate controller to get a maximum pulse
count (`max_pulses`) and an importance weight, using: assumed main bitrate
(20000 bps for active 1:1 config), complexity 8, 60 ms payload, 16 kHz, the
subframe's weighted target energy, `voicing_strength`, and the VAD inputs. Distribute
FCB pulse survivors across pulse counts from the 20 ms survivor budget
(`tot_surv = 1000 * 100 * 80 / (20*16000)`). Select the unvoiced per-subframe gain so
its linear reconstructed gain is closest to the target residual level over the same
`(gain_main, gain_delta)` codebook the decoder uses.

**DTX / inactive frames.** When a frame is inactive (VAD/coded-as-active-voice false)
or carries no excitation, signal via TOC SID/VAD/enable bits (see
[mlow-frame](#mlow-frame)). A silent internal frame (autocorrelation lag-0 energy <= 0)
MUST still advance the CELP excitation state with zeros; encode it as unvoiced with the
lowest-energy gains block and no pulses.

**Entropy serialization.** Serialize each internal frame, in order, as: LSF block,
pulses block, then EITHER the pitch block (voiced) OR the gains block (unvoiced) —
never both. The range-coder symbol stream MUST be the exact inverse of the decoder
read order and use the same CDF tables in the same field order. After the three
internal frames, finalize the range coder, prepend the TOC byte, and treat a
range-coder buffer overflow as an encode error.

<a id="mlow-excitation"></a>

#### 1.6 MLow CELP excitation

[View details](spec/encodings/mlow-excitation.md)

`ENC-10` - _status: draft - audio_

Decode the range-coded CELP excitation of one MLow internal frame: per-subframe pulse counts and positions/signs, plus the gains block (unvoiced) or pitch/LTP block (voiced).

Decode the excitation of one internal frame (320 samples at 16 kHz, `p3 = 4`
subframes) from the range coder immediately after the LSF/LPC parameters
([mlow-lsf-lpc](#mlow-lsf-lpc)) and before synthesis
([mlow-synthesis](#mlow-synthesis)). All reads use the Opus/CELT range coder
([mlow-rangecoder](#mlow-rangecoder)): CDF symbols from the front, raw uniform
bits from the back.

The LSF stage-1 selector `s1` selects the mode (mutually exclusive per frame):
`s1 == 1` (voiced) MUST decode the pitch/LTP block; `s1 == 0` (unvoiced) MUST
decode the gains block.

**Pulses (algebraic codebook)**

Establish the frame pulse budget. Let `config` be the band/config flag (`p6`;
`0` = narrowband) and `idx = p4 + s1` (`p4` = regular-frame flag). Look up:

    SMPL_PULSE_COUNT_BYTE = [80, 160, 160, 16, 32, 32, 0, 0]   ; index = config*3 + idx

Then `frame_budget = budget_byte * p2 / 320`, `subfr_budget = frame_budget / p3`.

**Total pulse count.** For `config != 0`, read the total with a config-indexed
CDF. For `config == 0`, draw the total from a triangular prior over
`[0, frame_budget]`: with `L = frame_budget`,

    T(k) = ( (k+2)*(L+1) - ((k-1)*(k+131070) >> 1) ) & 0xffff

`ft = max(T(L), 1)`. Read `val = range_decode(ft)`, scan `k = 0,1,2,...` up to
`frame_budget`, select the first `k` with `T(k-1) <= val < T(k)`, and finalise
the symbol over that interval. Result = total pulse count.

**Split.** With `p3 == 4`, split the total into four per-subframe counts by two
binary-split levels. Top level: read a bias-corrected CDF (when the constrained
interval is non-empty) for the first-half sum. Then split each half with
`smpl_split`: for a half carrying `count` pulses over `granularity` positions,
`min_split = max(count - granularity, 0)`, `lo = min(count, granularity)`; when
`min_split < lo` read a CDF symbol over `lo - min_split + 2` entries and add to
`min_split`, else count = `min_split`. Four results = `subfr[0..4]`.

**Positions and magnitudes.** For each subframe with `cnt > 0`, read run-length
pulse positions over the `p2/p3` positions. Repeatedly read a position-delta CDF
of length `pos + 1` (remaining positions). A non-zero delta (or the subframe's
first read) starts a new magnitude-1 pulse at the advanced position; a zero
delta on a subsequent read increments the current pulse's magnitude (stacked).

**Signs.** After all positions, read one sign bit per pulse position as raw
uniform bits, batched at most 15 bits per read. Sign is `+1` when set, `-1`
otherwise, applied to that position's magnitude. Scatter signed magnitudes into
the excitation vector at their sample positions; all others are 0.

**Gains (unvoiced frames)**

Read a main log-gain (CDF, 85 entries) and a delta log-gain (CDF, 99 entries),
then reconstruct per-subframe quantized log-gain:

    base = gain_main * gain_scale[cfg] - 0x154000
    gain_q[sf] = base + (gain_cb[sf + p3*gain_delta] << 4)

`gain_scale` and `gain_cb` are config-selected tables. For each subframe with
`cnt > 0`, read an energy-residual symbol from a bucketed CDF (92 entries):
bucket = `min(cnt/10, 3)` (i.e. `3` for `cnt >= 30`); the CDF base is shifted by
`-2 * min(g, 0)` where `g = clamp((gain_q[sf] + 8192) >> 14, >= -85)`. Subframes
with no pulses produce no read and residual 0.

**Pitch / LTP (voiced frames)**

Decode in order: LTP gains-and-filters, then the pitch lag.

**LTP gains and filters.** For each of `p3` subframes, read a gain index from a
17-entry CDF whose row is selected by the previous subframe's gain index (decoder
state). Using a config-selected gain-weight table, the running accumulator adds
`w0 + 2*w2` per subframe; `avg_gain = gain_accum / p3` is retained for
fractional-lag selection. For each subframe with pulses, read a 35-entry filter
index: from the base CDF when no previous filter index exists (state `== -1`),
else from a CDF row offset by the previous filter index. Gain and filter indices
update decoder state.

**Lag.** A pitch-configuration block supplies the contour count, lag CDF, contour
map, fractional-lag table, and delta CDF. Read the primary lag absolutely (CDF
over `num_contours + 1`) when no previous lag exists, else as a delta: a 10-entry
delta CDF selects an interval `[lo, hi]`, and lag = `lo + symbol` read from the
lag CDF over `hi - lo + 2` entries. Search the contour map for `i` where
`contour_map[i] == lag + 1`; if none or out of range, the pitch block ends.

From the selected contour, read a contour base lag. Unless a previous lag exists
with `-1 <= (base_lag - prev_lag) < 3`, read a 64-symbol fine lag and combine as
`cur_lag = (base_lag << 6) + fine` (Q6, 1/64-sample, first contour segment). For
each remaining segment, read a 65-entry fractional CDF (segment selected by
`avg_gain`: `0` for `< 10007`, `1` for `< 14085`, else `2`) and accumulate into
the running Q6 lag. Replicate each segment's Q6 lag across the contour-defined
number of 40-sample blocks to produce per-block pitch lags
(`lag = block_lag * 0.5 + SMPL_MIN_PITCH_LAG`). Decoder state MUST retain the
previous gain index, filter index, integer lag, and fractional lag.

<a id="mlow-decoder"></a>

#### 1.7 MLow decode pipeline

[View details](spec/encodings/mlow-decoder.md)

`ENC-11` - _status: draft - audio_

Decode one RTP MLow payload into a 16 kHz PCM frame: strip RED, route on the TOC byte, and for an active frame run three chained 20 ms internal frames through a per-packet harmonic post-filter while carrying predictor and synthesis state.

An MLow decoder consumes one RTP MLow payload per call and produces one PCM frame
of 32-bit floats in `[-1.0, 1.0]` at the TOC-derived output length.

The same instance MUST be reused for the lifetime of a continuous stream: the
cross-frame predictor (`prev_nlsf`), the CELP/LTP synthesis history, the HP
post-filter state, and the harmonic post-filter state all persist across packets.
The decoder MUST expose a reset that clears all carried state. A caller MUST reset
at a stream discontinuity (new SSRC or detected gap) and MUST NOT reset between
consecutive packets of one stream.

**Stage 0 — empty payload.** If the payload is empty, emit one silence frame of
`OPUS_FRAME_SAMPS = 960` samples (60 ms at 16 kHz) and MUST NOT advance state.

**Stage 1 — RED strip.** With negotiated RED level `n > 0`, de-packetize the
SplitRED container (see [mlow-red-fec](#mlow-red-fec)). The main frame is the LAST
element of the recovered list; extract it and decode as a bare MLow frame (Stage 2
on). If de-packetization fails, emit `OPUS_FRAME_SAMPS` (960) samples of silence
and MUST NOT advance state. When `n == 0`, the payload is already a bare frame and
goes directly to Stage 2.

**Stage 2 — TOC routing.** Parse the first byte as the smpl TOC (see
[mlow-frame](#mlow-frame)) and compute:

    output_length = std_opus ? (16000 / 1000 * frame_ms)
                             : (sample_rate / 1000 * frame_ms)

Route in this order, emitting exactly `output_length` samples of `0.0` for each
silence case:

    std_opus == true   →  silence
    sid == true        →  silence
    active == false    →  silence
    otherwise          →  decode active frame (Stage 3)

**Stage 3 — active-frame decode.** The body begins at byte offset 1 and is a single
range-coded bitstream (see [mlow-rangecoder](#mlow-rangecoder)) covering all three
internal frames.

  1. Read from the TOC byte `b`:

         config   = (b >> 2) & 1
         low_rate = ((b >> 2) & 1) != 0

     Initialise a range decoder over `frame[1..]`.

  2. For each internal frame `f` in `0, 1, 2`, read from the SAME range decoder in
     this exact order:

       a. LSF/LPC indices (see [mlow-lsf-lpc](#mlow-lsf-lpc)). Voiced iff the decoded
          LSF stage-1 index `== 1`.
       b. Excitation pulses (see [mlow-excitation](#mlow-excitation)) over
          `SMPL_INTF_LEN = 320` samples with 4 subframes.
       c. If voiced: the pitch/LTP block (see [mlow-lsf-lpc](#mlow-lsf-lpc)).
          Per-40-sample-block lags reconstructed as
          `lag = clamp(block_lag * 0.5 + 32.0, .., 320.0)` (8 lags per internal
          frame); ACB gain indices per subframe; voiced FCB gain index from the
          pitch block's `filt_idx` (floored at 0).
          If unvoiced: the gains block; decoded `gain_q` → `nrgres_dbq_q14` and
          `nrg_res` → `fcbg_idx`.
       d. Reconstruct the NLSF vector from the LSF stage indices, `config`, the grid
          index, the stage-2 residual, and carried `prev_nlsf`; then update
          `prev_nlsf` for the next internal frame/packet.
       e. Run CELP synthesis (see [mlow-synthesis](#mlow-synthesis)) over
          `SMPL_INTF_LEN = 320` samples, gated on `low_rate`, into a 320-sample
          signal, and append to the packet output.

     Across the three frames, accumulate the full per-40-block lag list (8 per
     frame, 24 per packet) and the sum of per-frame normalized bitrate (from total
     pulse count and 320).

  3. Run the per-packet harmonic post-filter (see [mlow-postfilter](#mlow-postfilter))
     ONCE over the full `3 * 320 = 960` sample buffer, passing the 24 accumulated
     lags and the average normalized bitrate (`accumulated_sum / 3.0`). It
     introduces `SMPL_TOT_POSTFILT_DELAY = 48` samples of group delay; emitted PCM
     is aligned at lag 0.

  4. Clamp each output sample to `[-1.0, 1.0]`. If `output_length` is nonzero and
     differs from the produced length, resize the buffer to `output_length`
     (truncate or zero-pad the tail).

A range-coder error flag set after the active-frame decode indicates TOC/body
desync; a decoder SHOULD surface it (it does not change emitted samples).

<a id="mlow-noise"></a>

#### 1.8 MLow comfort noise

[View details](spec/encodings/mlow-noise.md)

`ENC-12` - _status: review - audio_

Per-subframe shaped comfort noise the MLow decoder adds into the LPC excitation before CELP synthesis, with separate voiced/unvoiced branches.

Run the comfort-noise generator once per subframe of length `L` (`L <= 160`,
`fs = 16 kHz`) and add its output into the LPC excitation *before* CELP synthesis
(see [mlow-synthesis](#mlow-synthesis)). Output MUST be bit-identical for identical
inputs and state. All arithmetic is single-precision; accumulation order is fixed
(4-wide envelope and pulse loops). `pi` is the literal `3.1415926535897`. `sigmoid`
clamps its argument to `[-80, 80]`.

**Persistent state.** Keep across subframes, zero-initialised at decoder start:

    env_smth        : f32        ; running envelope smoother
    env_last        : f32        ; last subframe envelope value
    out_state_uv[2] : f32        ; ARMA1 output filter state (unvoiced)
    out_state_v[2]  : f32        ; MA2 output filter state (voiced)
    corr_smth[3]    : f32        ; smoothed autocorrelation (voiced)
    shape_state[2]  : f32        ; MA2 shaping-filter state (voiced)
    prev_voiced     : bool       ; voicing of the previous subframe
    since_unvoiced  : i32        ; subframes since the last unvoiced subframe
    rand_seed       : i32        ; PRNG seed

**PRNG.** LCG, wrapping i32 arithmetic:

    seed' = 907633515 + (u32)seed * 196314165

Pulses are drawn four at a time: each new `seed` yields four samples by
reinterpreting the seed left-shifted by 0, 8, 16, 24 bits as a signed i32 scaled by
`8.1e-10`. A trailing tail of fewer than four samples MUST draw one fresh `seed` per
sample (no bit-rotation). The shared seed MUST advance for every pulse buffer drawn
in a subframe (call count and ordering is observable in the output seed).

**Voiced branch** (`voiced = true`):

1. Compute 3-tap autocorrelation `corrs[0..2]` of `exc_lpc`; bias `corrs[0] += 1e-12`.
2. Smooth into `corr_smth` with coef `0.4` if `L == 160` else `0.16`:
   `corr_smth[i] += coef * (corrs[i] - corr_smth[i])`.
3. `c = corr_smth * (0.35^2 * corrs[0] / corr_smth[0])`; then double `c[1]` and `c[2]`.
4. Map `c` through the noise DCT (`3 x 16` cosine matrix, scale `1/sqrt(16)`, `omega`
   step `(0.5 + i) * pi / 16`) to a 16-bin spectrum `f2`; set
   `f2_tgt = max(f2) * 1.5 - f2`; map back via DCT transpose to `ctgt`.
5. Draw white pulses; reset `env_smth` to `env_last` if previous subframe was
   unvoiced; apply squared-signal envelope (smoothing coef `0.95`); normalise `ctgt`
   by `1/(noise energy + 1e-12)`.
6. Spectrally factor `ctgt` into a 3-tap MA filter; filter the noise through it
   (`shape_state`).
7. On a voiced subframe immediately following an unvoiced one, seed an unvoiced
   cross-fade noise with a decaying `0.99` envelope; else zero it when
   `since_unvoiced < 2`.

**Unvoiced branch** (`voiced = false`). Clear `corr_smth` and `shape_state`, zero the
voiced noise, then:

- If `num_pulses > 0`: `nrg_ratio = energy(exc_lpc) / (nrgres + 1e-20)`;
  `hardness = 10 + 20 * normalized_bitrate`;
  `nrg_tgt = nrgres * ln(exp(hardness * (1 - nrg_ratio)) + 1) / hardness`; take the
  excitation envelope with smoothing coef `0.995`.
- Else: `nrg_ratio = 0`, `nrg_tgt = nrgres`; take the decaying no-excitation
  envelope `env0` (coef `0.995`).

Solve for affine envelope gain `(f, g)` so generated noise hits `nrg_tgt` while
matching `env_last` at the subframe boundary (quadratic with `f = 0` / `g = 0`
degenerate branches per the energy-matching solver). Draw white pulses; scale by
`f + g * env[i]`. When `num_pulses > 0` the scaled value MUST be clamped to
`fcbgains_uv[fcbg_idx] * 0.5` and applied only where `exc_lpc[i] == 0` (pulse
positions left at zero); `env_last` MUST be updated to the clamped final gain.
Unvoiced gain table: `fcbgains_uv[ix] = 10^(0.05 * (ix - 90))`, `ix` in `0..=90`.

**Output mixing.**

- If `prev_voiced || voiced`: pass voiced noise through fixed MA2 filter
  `[0.25, -0.496, 0.25]` (`out_state_v`) into the output; else zero the output.
- If `since_unvoiced < 2 || !voiced`: high-pass shape unvoiced noise via
  `add_noise_uv` (ARMA1, corner freq from `lsf[0]`, `lsf[1]`, `nrg_ratio`, base
  corner `800 Hz`, clamped to `1500 Hz`, gain `0.8`) and add into output; else reset
  `out_state_uv` to `[0, 0]`.

Finally set `prev_voiced = voiced`; increment `since_unvoiced` on a voiced subframe,
reset it to `0` on an unvoiced subframe.

**Inputs.** Decode residual energy from the per-subframe Q14 value:
`nrgres = max(0, 10^(0.1 * q14 / 2^14) - 3.1622776e-9) * fcb_subfrlen`.
`normalized_bitrate = sigmoid(1.4 * log2(pulses_per_20ms + 1) - 6.5)` with
`pulses_per_20ms = num_pulses * frame_length_16 / 320`.

<a id="mlow-postfilter"></a>

#### 1.9 MLow post-filters

[View details](spec/encodings/mlow-postfilter.md)

`ENC-13` - _status: draft - audio_

The three deterministic decoder-side DSP post-filters MLow runs after range decoding: excitation harmonic comb, HP pitch comb, and harmonic post-filter.

Three enhancement filters run during decode. They consume no bits and have no wire
format. A decoder MUST run them in the order and with the constants below. All math is
single-precision (`f32`) with fast (non-strict-IEEE) arithmetic; a strict-IEEE decoder
reproduces output to within the i16 quantization step (1/32768), not bit-for-bit.

**1. Excitation harmonic comb post-filter**

Applied per subframe to the low-band excitation BEFORE LPC synthesis; output is ADDED
back into the excitation. Derives a 2nd-order pitch-resonant filter from the
excitation's own 3-lag autocorrelation (NOT the pitch lag). Subframe length `N` is 80
or 160.

Active-subframe path:

1. Compute 3-lag autocorrelation `auto[0..2]` of input, then
   `auto[0] += 9.999999960041972e-13`.
2. Smooth into persistent `smoothed_c[i]` with `coef = 0.4` when `N == 160` else
   `coef = 0.16`: `smoothed_c[i] = coef*(auto[i] - smoothed_c[i]) + smoothed_c[i]`.
3. `local5 = auto[0] * 0.1224999949336052 / smoothed_c[0]`; scaled vector
   `{local5*smoothed_c[0], 2*local5*smoothed_c[1], 2*local5*smoothed_c[2]}` (lags 1,2
   doubled).
4. Project through fixed `G_PITCH` 3x16 basis: `proj[j] = sum_r scaled[r]*G_PITCH[r][j]`,
   `peak = max_j proj[j]`, `scale = 1.5*peak`, `refl[i] = scale - proj[i]`,
   `comb_c[r] = sum_i G_PITCH[r][i]*refl[i]`.
5. Fill `N` samples of LCG noise (below), seed `pitch_gain` from `env_state` on first
   call, RMS-envelope-smooth input with coef `0.95`, multiply noise by envelope.
6. `local5 /= (sum(noise^2) + 9.999999960041972e-13)`, then `comb_c[i] *= local5`.

Inactive-subframe path resets `smoothed_c` and LCG state and derives a single scalar
gain from the band-energy ratio; it builds no comb coefficients.

Resonator: if `comb_c[0] >= 0`, add `1.0000000031710769e-30`, run the 2-iteration
Levinson-style solve (returns `r5`, `r8`, `denom`). On success `g = sqrt(comb_c[0]/denom)`
and resonator FIR `{g, r8*g, r5*g}`; on failure `{sqrt(comb_c[0]), 0, 0}`; if
`comb_c[0] < 0` resonator is zeroed. Run the 3-tap resonator FIR over env-shaped noise,
then static de-emphasis FIR `{0.25, -0.49599999, 0.25}` to produce the additive output.
A trailing AR1/MA1 biquad (corner from band energy, sigmoid trailing-pole
`g5 = sigmoid(0.2*(nrgEnv[1]-nrgEnv[0]+1e-30) - 3)`) is added UNLESS the subframe is
active with `call_count > 1`.

LCG noise fill: `s = 196314165*s + 907633515` (wrapping i32), output
`s * 8.100000115085493e-10`, emitting byte-shifted views `s<<8`, `s<<16`, `s<<24` in the
4-wide block; `state` persists across calls.

`G_PITCH` rows (16 columns each):

    row0: 0.25 x16
    row1: 0.24879618 0.23923509 0.22048031 0.19325261 0.15859832 0.11784916
          0.07257116 0.02450428 -0.02450431 -0.07257118 -0.11784921 -0.15859832
          -0.19325262 -0.22048034 -0.23923509 -0.24879618
    row2: 0.24519631 0.20786740 0.13889255 0.04877256 -0.04877258 -0.13889259
          -0.20786741 -0.24519633 -0.24519631 -0.20786738 -0.13889250 -0.04877260
          0.04877260 0.13889261 0.20786740 0.24519633

**2. HP (pitch) post-filter**

Applied to one frame (`FRAME_LEN = 320`) of post-LPC-synthesis output. Chain:

    de-emphasis (AR1 leaky integrator, coef {1, -0.995})
      -> ARMA2 comb (MA2 numerator, AR2 denominator)
      -> companion pre-emphasis (MA1 differentiator, coef {1, -0.995})

Comb keys on frame average pitch lag `lag = sum(l^2)/sum(l)` over subframe lags
(0 -> unvoiced). The ARMA2 biquad is built by `smpl_calc_hp_coefs` with `f = 1/lag`
(voiced) or `f = 50/16000` (50 Hz corner) when `lag <= 0`:

    cos_approx(x) = 1 - 0.5*x^2
    coef_ma = { 1, -2*cos_approx(2*pi*maf*f), 1 }
    far = arf[0]*f + arf[1]*f^2
    rar = arr[0]*f + arr[1]*f^2
    coef_ar = { 1, -2*cos_approx(2*pi*far)*(1+rar), 1 + (2*rar + rar^2) }
    sc = (1 - coef_ar[1] + coef_ar[2]) / (1 - coef_ma[1] + coef_ma[2])
    coef_ma *= sc                                   ; unity DC gain

AR denominator is a resonance at angle `2*pi*far`, radius `1+rar` (`rar` negative for a
stable pole). Voiced curve: `maf = 0.1`, `arf = {0.608057355, 0.070939485}`,
`arr = {-2.187380512, 2.291030664}`. Default curve: `maf = 0.1`,
`arf = {0.728508218, 0.476039848}`, `arr = {-4.363803713, 8.441854006}`.

When `lag > 1.25*lag_old` or `1.25*lag < lag_old`, the decoder MUST run OLD and NEW
coefficients over the frame and overlap-add with the `cos(omega)^2` down-ramp table
(`HP_POSTF_TRANSITION_SPEED = 2`, `d_omega = pi/(2*(FRAME_LEN+1))`, omega by repeated
addition) before the companion pre-emphasis. `lag_old < 0` marks a fresh/reset filter.

**3. Harmonic post-filter**

Final per-packet stage; runs on the full low-band output after the HP filter. Mixes
`x[-lag] + x[+lag]`, low-pass filtered by a lag-dependent kernel, and introduces total
group delay `SMPL_TOT_POSTFILT_DELAY = 48` (8 feedback + 40 lag-subframe). Constants:

    FRAME_LEN = 320            LAG_SUBFR_LEN = 40       FB_DELAY = 8
    MIN_PITCH_LAG = 32         MAX_PITCH_LAG = 320      MAXPITCH_LEN = 320
    FB_STRENGTH = 0.4734       STRENGTH = 0.6438        CUTOFF_HZ = 4000
    NHARM_CUTOFF = 6.3         REDUCTION_FAC = 0.0579   LP_FILT_RES = 2500
    PITCH_NUM_SUBFRAMES = 8

Operates per 40-sample lag block. Packet is appended to a persistent StateComb buffer at
offset `MAX_PITCH_LAG + HARM_DELAY`; reads index back into history. Per-packet feedback
strength `fb_strength = 1 - FB_STRENGTH*normalized_bitrate`. For a block with `lag > 0`:

    y_harm[i] = comb[x+i-lag] + comb[x+i+lag]        ; (lookforward-clamped at packet edge)
    xy = dot(comb[x..], y_harm)
    if xy > 0:
      xx = nrg(comb[x..], L);  yy = 0.25*nrg(y_harm, L)
      strength = 0.5*xy / max(yy, xx)
      high_lag_reduction = 1 - REDUCTION_FAC*((lag-MIN_PITCH_LAG)/(MAX_PITCH_LAG-MIN_PITCH_LAG))
      strength *= high_lag_reduction * STRENGTH
      y_harm *= 0.5*strength
      diff = y_harm - strength*comb[x..]
      lpcoefs = lp_filter(lag) * fb_strength            ; 17-tap symmetric kernel
      y_harm = MA17(diff) + comb[x - FB_DELAY ..]       ; 48-delayed base, recursive

When `xy <= 0` (or `lag <= 0`) the block copies the 48-delayed base; if the previous
block filtered, the first `2*FB_DELAY` samples carry the previous kernel's zero-input
response. Per-bucket LP kernel is built by `create_lp_filter` from a cosine window
`filt_win[i] = cos(omega)/(i+1)` (`omega` stepping `0.5*pi/(FB_DELAY+1)`), cutoff
`omega_c = min(omega0*NHARM_CUTOFF, CUTOFF_HZ/16000*pi)` with `omega0 = 2*pi/lag`, scaled
to unity sum; bucket index `LP_FILT_RES/max(lag+30,80) - LP_FILT_RES/MAX_PITCH_LAG`. After
processing, StateComb is shifted left by the packet length. Block lag for iteration `k` is
`round(lags[k])`; `prev_lag` carries across packets.

<a id="mlow-synthesis"></a>

#### 1.10 MLow CELP synthesis

[View details](spec/encodings/mlow-synthesis.md)

`ENC-14` - _status: draft - audio_

Synthesize one MLow 20 ms internal frame from its decoded parameters into excitation and run the order-16 CELP synthesis filter to produce 16 kHz PCM.

Each 20 ms internal frame is four 80-sample (5 ms) subframes at 16 kHz; LPC
order is 16. Per subframe, in order: LPC interpolation, FCB pulse excitation,
ACB/LTP addition (voiced), residual-energy floor decode + shaped-noise
addition, order-16 AR synthesis filter. All arithmetic is single-precision
float; NLSF→LPC polynomial recursions accumulate in double precision.

**Per-subframe LPC interpolation**

The decoder reconstructs one order-16 NLSF vector per frame (see
[mlow-lsf-lpc](#mlow-lsf-lpc)). It MUST interpolate, per subframe `sf`, between
the previous frame's final interpolated NLSF (`prev`) and this frame's NLSF
(`lsf`) using `f = interp[idx][sf]`:

    ilsf[k] = prev[k] * (1 - f) + lsf[k] * f     (f != 1.0)
    ilsf    = lsf                                 (f == 1.0)

The interpolation tables (4 factors each, selected by a 1-bit index) are:

    idx 0: [0.55, 0.88, 1.00, 1.00]
    idx 1: [0.30, 0.65, 0.95, 1.00]

If a subframe's factor equals the previous subframe's factor, the decoder MAY
reuse the previous subframe's LPC coefficients. If `prev` is uninitialised
(its last element is exactly 0.0), it MUST be seeded from `lsf` before
interpolation. After the four subframes, `prev` MUST be set to the last
interpolated NLSF (`ilsf` of subframe 3) for the next frame.

Each per-subframe interpolated NLSF MUST be converted to LPC coefficients
`a[0..16]` with the NLSF→LPC procedure: build the order/2 sum and difference
polynomials from the cosines of the NLSF angles and combine them so that
`a[0] = 1.0` and

    a[k+1]       = 0.5 * (P[k+1] + P[k] + Q[k+1] - Q[k])
    a[order-k]   = 0.5 * (P[k+1] + P[k] - Q[k+1] + Q[k])     for k in 0..8

where `P`/`Q` are the parity-0/parity-1 polynomials of the NLSF cosines.

**Fixed-codebook (FCB) excitation**

The decoder MUST scale the sparse signed FCB pulses (320 positions per frame;
see [mlow-excitation](#mlow-excitation)) by a per-subframe fixed-codebook gain:

    res[pos] = pulses[pos] * fcbgain[ fcbg_idx[sf] ]     for pos in subframe sf

Two gain magnitude tables MUST be used, selected by whether the frame is voiced:

    voiced (34 entries):    fcbgain_v[i]  = 10 ^ (0.05 * (i*3.0 + (-100.0)))
    unvoiced (91 entries):  fcbgain_uv[i] = 10 ^ (0.05 * (i*1.0 + ( -90.0)))

i.e. voiced gains step 3 dB from -100 dB, unvoiced gains step 1 dB from -90 dB.

**Adaptive-codebook (ACB / LTP) contribution — voiced only**

For voiced frames the decoder MUST add the ACB (long-term prediction)
contribution into the residual before noise and synthesis. Each 80-sample
subframe carries two 40-sample lag sub-blocks (`lags_per_subframe == 2`); each
block lag = `intLagQ6*0.5 + 32`, clamped to a maximum of 320.

The decoder maintains an ACB state buffer of length
`subfrlen + 2*MAX_PITCH_LAG + LTP_INTERPOL_DELAY` = `80 + 640 + 8 = 728`
samples. For each 40-sample sub-block it MUST build a two-component basis from
the pitch-extended excitation history:

- **Integer lag** (`floor(lag) == lag`): copy `state[p+i] = state[p+i-lag]`;
  `basis0[i] = state[p+i]`; `basis1[i] = state[p+i-lag-1] + state[p+i-lag+1]`.
- **Fractional lag**: interpolate the history with the 16-tap symmetric kernel

      K = [-6.3925986e-6, 0.00011064114, -0.0009153038, 0.00484772,
           -0.018698348, 0.05759091, -0.15997477, 0.6170455,
            0.61704546, -0.15997475, 0.057590906, -0.018698348,
            0.00484772, -0.0009153038, 0.000110641144, -6.392598e-6]

  to produce `basis0`, and form `basis1[i] = state[p+i-1] + state[p+i+1]`
  (with the kernel-interpolated end taps at i=0 and i=39).

The two-component ACB gain MUST be dequantized from the per-subframe ACB gain
index against the high-rate (or, when the low-rate TOC bit is set, low-rate)
Q14 gain codebook, then a high-boost MUST be applied before synthesis:

    high_boost = 0.35 + (0.18 - 0.35) * normalized_bitrate
    f0 = g[0] + 2*g[1]
    f1 = g[0] - g[1]
    f1 *= min(|f1| + high_boost, |f0|) / (|f1| + 1e-12)
    g[0] = (f0 + 2*f1) / 3
    g[1] = (f0 - f1) / 3

The ACB signal `acb[i] = g[0]*basis0[i] + g[1]*basis1[i]` MUST be added into the
subframe residual. When the low-rate path is active the decoder MUST also apply
pitch sharpening to the residual before building the basis:
`res[i] += res[i-lag] * 0.9881` for `i >= lag`.

After processing each subframe the decoder MUST update the ACB state by shifting
it left by `subfrlen` (80) samples and appending the subframe's (post-ACB)
excitation. For unvoiced frames the ACB contribution is omitted but the state
MUST still be updated with the excitation.

**Residual-energy floor and shaped noise**

The unvoiced excitation level is the per-subframe quantized residual-energy
floor `nrgres_dbq_Q14` (an unvoiced frame's wire "gain" block IS this
quantizer layout; see [mlow-noise](#mlow-noise)). The decoder MUST decode this
floor to a linear residual energy and add environment-shaped pseudo-random
noise into the residual after the ACB step and before LPC synthesis.

The floor MUST be reconstructed as a frame-mean scalar plus a 4-vector shape
codebook entry:

    frame_dbq_Q14 = frame_qi * 16686 + (-85) * 2^14
    nrgres_dbq_Q14[sf] = frame_dbq_Q14 + shape_cb_Q10[shape_qi][sf] * 16

where `16686` is the 4-subframe dB step (Q14), `-85` dB is the residual-energy
floor minimum (the maximum is 0 dB), and `shape_cb_Q10` is the 98-vector ×
4-subframe Q10 shape codebook. The dB-domain residual energy used by the
quantizer is `10*log10(nrg/subfrlen + 3.1622776e-9)` clamped to a 0 dB ceiling.

**Order-16 AR synthesis filter**

The decoder MUST run the order-16 all-pole filter over the combined residual
(FCB + ACB + noise), per subframe, with the interpolated LPC coefficients `a`
(`a[0] == 1.0`):

    y[n] = res[n] - sum_{i=1..16} a[i] * y[n-i]

Synthesis MUST flow contiguously across subframes and across frames: the filter
state is the previous 16 output samples, carried into the next subframe and the
next frame. The 320 output samples of the frame are the synthesis-filter output.

After the four subframes, the decoder applies the post-LPC pitch-harmonic HP
post-filter to the 320-sample frame (see [mlow-postfilter](#mlow-postfilter));
its comb lag is the energy-weighted mean of the eight per-40-block pitch lags
(0 for unvoiced).

<a id="mlow-vad"></a>

#### 1.11 MLow voice activity detection

[View details](spec/encodings/mlow-vad.md)

`ENC-15` - _status: draft - audio_

Fixed-point SILK VAD over a four-band allpass filterbank that produces a per-internal-frame speech-activity probability and a packet-level coded_as_active_voice flag.

Run the VAD on the raw int16 input PCM, **before** any encoder high-pass
stage, at 16 kHz. Internal frame = 320 samples (20 ms). A media packet = 60 ms
= 3 internal frames (960 samples).

Persistent state across packets: three two-element allpass-filterbank states,
per-band carried subframe energy (`xnrg_subfr`), four per-band noise levels
and their reciprocals, per-band noise-level bias, frame counter, high-pass
filter state, DTX hangover counter.

Default tuning: `noise_lvl_update_speed`, `non_binariness`,
`highpass_sharpness` all 0.

**Per-internal-frame speech_activity_Q8 (range 0..=255, reported /256)**

**1. Four-band split** (`ana_filt_bank_1`) into 0–1, 1–2, 2–4, 4–8 kHz via
three cascaded first-order allpass splits:
- 0–8 kHz → 0–4 (low) + 4–8 (high);
- 0–4 → 0–2 + 2–4;
- 0–2 → 0–1 + 1–2.

Coefficients: `A_FB1_20 = 3894 << 1`, `A_FB1_21 = -29322`. Even-indexed input
samples go through the `A_FB1_21` branch (`x = SMLAWB(y, y, A_FB1_21)`),
odd-indexed through `A_FB1_20` (`x = SMULWB(y, A_FB1_20)`). Low output =
`RSHIFT_ROUND(out_2 + out_1, 11)`, high output = `RSHIFT_ROUND(out_2 - out_1, 11)`,
both saturated to int16. Each split carries its own two-element state.

**2. Lowest-band high-pass.** First-order ARMA (zero at DC, −3 dB @ 66 Hz) on
the lowest band: `a_neg_Q16 = 53084` (scaled by `(100 - highpass_sharpness)/100`),
`b_Q16 = (65536 + a_neg_Q16) / 2`, carrying `hp_state`.

**3. Per-band energy.** Sum over four internal subframes; each sample
right-shifted by 3 before squaring (`SMLABB`), accumulated with saturating
positive adds. Carry the last subframe's energy of each band into the next
frame (`xnrg_subfr`); running total adds the final subframe's energy at half
weight (`sum_squared >> 1`).

**4. Noise-level update** (`GetNoiseLevels`), before SNR:
- smoothing coef `VAD_NOISE_LEVEL_SMOOTH_COEF_Q16 = 1024`, reduced to `>> 3`
  when band energy > `8 * nl`, full when < `nl`, interpolated between;
- while `counter < 1000`, floor coef at `min_coef = INT16_MAX / ((counter >> 4) + 1)`
  and increment `counter`;
- bias each band energy by `noise_level_bias[b]`; clamp `nl[b]` to ≤ `0x00FF_FFFF`.

Init: `bias[b] = max(VAD_NOISE_LEVELS_BIAS / (b+1), 1)` with
`VAD_NOISE_LEVELS_BIAS = 50`; `nl[b] = 100 * bias[b]`;
`inv_nl[b] = INT32_MAX / nl[b]`; `counter = 15`.

**5. SNR and activity.** Per band, speech energy = `xnrg[b] - nl[b]`. For
positive speech energy: form a Q8 ratio, convert to Q7 SNR via `lin2log` minus
`8 * 128`, accumulate squared SNR, weight a tilt accumulator by
`TILT_WEIGHTS = [30000, 6000, -12000, -12000]`. Square-root the mean squared
SNR (`SQRT_APPROX`), scale by 3 → `p_SNR_dB_Q7`. Then:

    sa_Q15 = sigm_Q15(SMULWB(vad_snr_factor_Q16, p_SNR_dB_Q7) - VAD_NEGATIVE_OFFSET_Q5)
    speech_activity_Q8 = min(sa_Q15 >> 7, 255)

with `VAD_SNR_FACTOR_Q16 = 45000` (scaled by `(150 - non_binariness)/150`) and
`VAD_NEGATIVE_OFFSET_Q5 = 128`.

This path MUST be bit-exact with reference fixed-point SILK
`smpl_VAD_GetSA_Q8_c`; use SILK fixed-point primitives (`SMULWB`, `SMLAWB`,
`SMULWW`, `SMULBB`, `SMLABB`, saturating adds, `lin2log`, `sqrt_approx`,
`sigm_Q15`, `RSHIFT_ROUND`).

**Packet-level activity and DTX hangover**

Per 60 ms packet, classify each of the 3 internal frames as `Active` when
`speech_activity_Q8 > SPEECH_ACTIVITY_DTX_THRES_Q8` (= `round(0.05*256)` = 12),
else `Inactive`, then apply hangover:
- `Active` frame: reset `remaining_dtx_hangover` to `hangover_ms` (default 60);
- non-`Active` frame while `remaining_dtx_hangover > 0`: reclassify as
  `Hangover`, decrement by `PACKET_MS / FRAMES_PER_PACKET` (= 60/3 = 20).

Set `coded_as_active_voice` true if any frame is `Active` or `Hangover`, false
only if all three are `Inactive`. Use this flag for the DTX / comfort-noise
decision; use per-frame `speech_activity` for bitrate control and
voiced/unvoiced classification.

This reflects the `activity == NO_DECISION` path; the input-tilt value from the
SNR pass is not consumed downstream in this configuration.

---

<a id="opus"></a>

### 2. Opus codec

[View details](spec/encodings/opus.md)

`ENC-05` - _status: draft - audio_

Standard Opus and MLow payloads share one RTP audio stream; the receiver routes each frame to a decoder by the top two bits of its first payload byte.

MLow ([mlow](#mlow)) and standard Opus (RFC 6716) are interleaved on the same
SRTP-protected RTP audio stream and the same SSRC. MLow is the default for 1:1
calls; standard Opus frames MAY appear on the same stream. A receiver MUST decode
both.

Codec selection is per-frame, by the first payload byte; there is no negotiation,
no RTP header field, no payload-type split. A receiver MUST branch on the top two
bits of the first byte, on every frame:

    (firstByte & 0xC0) == 0xC0   →  standard Opus packet, decode with RFC 6716 decoder
    (firstByte & 0xC0) != 0xC0   →  MLow "smpl" frame, route to MLow decoder ([mlow](#mlow))

For a standard Opus packet, read frame duration from `config = firstByte >> 3`
(RFC 6716 Table 2). Call-audio output sample rate is 16 kHz; decoded length =
`16 * frameMs` samples.

    config <  12          →  SILK,   frameMs ∈ {10, 20, 40, 60} = [config & 3]
    config 12..15         →  Hybrid, frameMs ∈ {10, 20}         = [(config-12) & 1]
    config >= 16          →  CELT,   frameMs ∈ {2.5, 5, 10, 20} = [config & 3]

---

<a id="video"></a>

### 3. Video codec

[View details](spec/encodings/video.md)

`ENC-06` - _status: draft - video, screen-share_

Video and screen-share tracks are carried as H.264; profile/level negotiation and packetization mode are not yet specified.

Video tracks MUST be H.264. The engine exposes an H.26x
passthrough/packetizer path (`wa_h26x_passthrough`, `h26x_packetizer`)
operating on H.264 NAL units.

TODO: H.264 profile/level negotiation, packetization mode, and how a
screen-content track is distinguished from a camera track.

<a id="video-packetization"></a>

#### 3.1 Video packetization

[View details](spec/encodings/video-packetization.md)

`ENC-07` - _status: draft - video, screen-share_

Signals, keys, and carries an H.264 video track over the call's RTP transport, mapping each access unit onto RFC 6184 NAL-unit RTP payloads.

**Signalling.** A call is a video call iff its `<offer>` carries a `<video>` child
alongside the `<audio>` advertisements (see [call-offer](#call-offer)); its absence
means audio-only. For group calls the intent is the `media="video"` attribute on
`<offer_notice>`. A client without video support MUST still parse the offer and MAY
accept it as audio-only.

    <offer call-id=… call-creator=…>
      <audio enc="opus" rate="16000"/>
      <video/>                         <!-- present iff video call -->
      …
    </offer>

**Carriage.**
- The video track MUST be carried over the same per-call media transport as audio:
  RTP multiplexed onto the relay DataChannel, protected with the call's SRTP keys
  (see [srtp-master-key](#srtp-master-key)) and hop-by-hop SRTP on the relay leg (see
  [srtp-hop-by-hop](#srtp-hop-by-hop)).
- The video track MUST use a distinct SSRC from audio (see [ssrc](#ssrc)) and a
  distinct RTP payload type, so a receiver demultiplexes by payload type / SSRC.
- Audio uses RTP payload type 120 (and 121); the video payload type MUST NOT collide
  with those.

**Packetization (RFC 6184).** An encoded H.264 access unit MUST be split into one or
more NAL units and mapped onto RTP payloads:
- A NAL unit that fits the path MTU (after RTP header and SRTP auth tag) MUST be sent
  as a single-NAL-unit payload: the NAL unit placed directly in the RTP payload, its
  first byte being the NAL header.
- A NAL unit too large MUST be fragmented across consecutive RTP packets using FU-A
  units; start/middle/end fragments MUST set the FU header start/end bits accordingly,
  and all fragments of one NAL unit MUST share the same RTP timestamp.
- All RTP packets of one access unit (one frame) MUST share the same RTP timestamp,
  and the last RTP packet of an access unit MUST set the RTP marker bit.
- The 90 kHz RTP clock SHOULD be used for the video timestamp.

The negotiated H.264 profile/level, packetization mode, concrete video payload-type
value, and whether STAP-A aggregation is used are not established by this revision; an
implementation MUST NOT assume a fixed value until they are pinned (see open_questions).

---

<a id="crypto"></a>

## Crypto

Keying and media protection: SRTP (hop-by-hop and end-to-end), SFrame, WARP, group-call crypto.

| # | Section | Summary |
| --- | --- | --- |
| 1 | [Call key establishment](#call-key) | The 32-byte call key is the root secret for all per-call media keying, delivered to each recipient device inside the offer's per-device Signal-encrypted <enc> payload. |
| 2 | [SRTP master key and salt derivation](#srtp-master-key) | Derive the per-participant SRTP master key/salt from the call key, then expand the six SRTP/SRTCP session keys. |
| 3 | [SFrame media end-to-end encryption](#sframe-media) | Per-frame end-to-end AEAD sealing of media payloads, applied above SRTP so the relay only forwards ciphertext. |
| 4 | [Group call crypto](#group-call-crypto) | A single 32-byte call key is shared with every group-call participant, and each participant derives one SFrame key per sender keyed by that sender's participant id. |
| 5 | [WARP key wrap](#warp-crypto) | WARP adds a per-call authentication key and a truncated per-packet MESSAGE-INTEGRITY tag, carried by the audio-piggyback RTP extension word. |

<a id="call-key"></a>

### 1. Call key establishment

[View details](spec/crypto/call-key.md)

`CRY-01` - _status: draft - audio, video, group_

The 32-byte call key is the root secret for all per-call media keying, delivered to each recipient device inside the offer's per-device Signal-encrypted <enc> payload.

The **call key** (`callKey`) is a 32-byte shared secret per 1:1 call. It is the
input keying material for all per-call media keys.

**Length.** The call key MUST be exactly 32 bytes. A call key shorter than 32 bytes
MUST be rejected. Downstream derivations consume the full 32 bytes:

    derive_e2e_keys      : HKDF IKM  = callKey[0..32]
    derive_e2e_sframe_key: salt      = callKey[0..16], IKM = callKey[16..32]
    derive_warp_auth_key : HKDF IKM  = callKey[0..32]

**Delivery.** The caller MUST encrypt the call key to each recipient device's Signal
session and place the ciphertext in an `<enc>` node (see [call-offer](#call-offer)):

    <enc v="2" type="pkmsg|msg" count="0">CIPHERTEXT</enc>

- `type="pkmsg"` MUST be used when establishing the Signal session (PreKeySignalMessage).
- `type="msg"` MUST be used when reusing an existing session.
- Single-device callee: the `<enc>` node is placed directly in `<offer>`.
- Multi-device callee: each device's `<enc>` MUST be wrapped in its own
  `<to jid="...">` under a `<destination>` node, one per device. Every device
  receives the same call key under its own Signal session and derives identical
  per-participant keys.

**Key generation path (keygen=2).** `<encopt keygen="2">` selects the v2 keying path.
The Signal-delivered secret is then carried in a `<raw_e2e>` field that replaces the
call key as the HKDF IKM for end-to-end SRTP derivation. It MUST be at least 32 bytes;
only its first 32 bytes are consumed as IKM.

**Plaintext format.** The decrypted Signal plaintext yields the call key (and, under
keygen=2, the `raw_e2e` material). Its serialization is not pinned by this section.

---

<a id="srtp-master-key"></a>

### 2. SRTP master key and salt derivation

[View details](spec/crypto/srtp-master-key.md)

`CRY-02` - _status: review - audio, video, group_

Derive the per-participant SRTP master key/salt from the call key, then expand the six SRTP/SRTCP session keys.

The call's shared `callKey` is delivered per recipient device in the offer's
`<enc>` payload (see [call-offer](#call-offer)). Derive in two layers.

**Layer 1 — WAHKDF (per participant).** HKDF-SHA256:

    IKM  = callKey
    salt = (none)
    info = participantLID            ; the participant's LID bytes
    L    = 46
    OKM  = masterKey(16) || masterSalt(14) || unused(16)

The trailing 16 bytes of OKM MUST be discarded.

**Layer 2 — RFC 3711 key derivation.** Expand the six session keys from
`masterKey`/`masterSalt` with AES-128-CM per RFC 3711 §4.3, using `masterSalt`
as the IV and XORing the label into `iv[7]`:

    key_i = AES-128-CM(masterKey, IV = masterSalt with iv[7] ^= label_i)

Labels `0x00`–`0x05` MUST produce, in order: SRTP cipher key (16), SRTP auth
key (20), SRTP salt (14), SRTCP cipher key (16), SRTCP auth key (20), SRTCP
salt (14). Negotiated suite: `AES_CM_128_HMAC_SHA1_80`.

Hop-by-hop SRTP (see [srtp-hop-by-hop](#srtp-hop-by-hop)) MUST skip Layer 1: the
relay supplies 30 bytes of `masterKey || masterSalt` directly; apply only Layer 2.

<a id="srtp-hop-by-hop"></a>

#### 2.1 Hop-by-hop SRTP

[View details](spec/crypto/srtp-hop-by-hop.md)

`CRY-03` - _status: draft - audio, video, group_

Relay-facing SRTP layer protecting each client↔relay hop, independent of the end-to-end layer.

- Client↔relay media MUST use a hop-by-hop SRTP context independent of the end-to-end context.
- Suite: `AES_CM_128_HMAC_SHA1_80`.
- The relay supplies 30 bytes of `masterKey || masterSalt` directly. Hop-by-hop keying
  MUST skip the WAHKDF layer and apply only the RFC 3711 expansion (see
  [srtp-master-key](#srtp-master-key)).

<a id="srtp-e2e"></a>

#### 2.2 End-to-end SRTP

[View details](spec/crypto/srtp-e2e.md)

`CRY-05` - _status: review - audio, video_

The end-to-end AES-128-CTR SRTP context for 1:1 calls, keyed per participant from the call key and carried unchanged through the relay inside the hop-by-hop SRTP.

A 1:1 call nests two SRTP contexts: the **E2E** context specified here and a
**hop-by-hop (HBH)** context (see [srtp-hop-by-hop](#srtp-hop-by-hop)) applied per
leg. A sender MUST apply the E2E transform to the payload first; those bytes are
carried inside the RTP packet that the HBH transform encrypts on the wire. The
relay decrypts HBH but not E2E, so E2E ciphertext transits the relay unchanged.

**Layer 1 — master secret.** Derive the 30-byte E2E master secret with HKDF-SHA256
(see [srtp-master-key](#srtp-master-key)):

    IKM  = callKey[0..32]             ; the 32-byte call key
    salt = 32 zero bytes
    info = participantLID             ; participant LID bytes, UTF-8
    L    = 46
    OKM  = masterKey(16) || masterSalt(14) || unused(16)

The trailing 16 bytes MUST be discarded. A device derives **send** keys from its
own LID and **receive** keys from the peer LID.

**Layer 2 — session keys.** Expand three values from `masterKey`/`masterSalt` with
the AES-CM KDF (RFC 3711 §4.3). Per label, the IV is the 14-byte master salt
zero-padded to 16 bytes with the label XORed into byte 7; output is the
AES-128-CTR keystream over `L` zero bytes under `masterKey`:

    cipherKey(16) = AES-128-CM(masterKey, IV = pad16(masterSalt), iv[7] ^= 0x00)
    authKey(20)   = AES-128-CM(masterKey, IV = pad16(masterSalt), iv[7] ^= 0x01)
    salt(14)      = AES-128-CM(masterKey, IV = pad16(masterSalt), iv[7] ^= 0x02)

**Per-packet IV.** Build the 16-byte IV by right-aligning the 14-byte `salt` into a
16-byte buffer, then XORing in the SSRC and the 48-bit packet index:

    iv[0..2]  = 0
    iv[2..16] = salt                          ; salt right-aligned (offset = 14 - len)
    iv[4..8]  ^= ssrc                          ; 32-bit, big-endian
    packetIndex = ROC * 2^16 + seq             ; 48-bit
    iv[8..14] ^= packetIndex                    ; 48-bit, big-endian

`seq` is the 16-bit RTP sequence number; `ROC` is the 32-bit rollover counter. The
packet index's top 16 bits land in `iv[8..10]`, low 32 bits in `iv[10..14]`. A
sender MUST increment `ROC` whenever `seq` wraps (signed 16-bit `(seq - lastSeq)
< -32768`).

**Payload transform.** MUST be AES-128-CTR (full 128-bit counter) over the RTP
payload under `cipherKey` and the per-packet IV; decryption applies the identical
keystream. The RTP header is not encrypted.

**Authentication tag.** A 4-byte WARP MESSAGE-INTEGRITY tag (HMAC-SHA1 truncated to
4 bytes, keyed by the WARP auth key — see [warp-crypto](#warp-crypto)) MAY be
appended. A receiver is not required to verify it.

An implementation MUST NOT reuse HBH session keys, salt, or IV construction for E2E:
the contexts differ in KDF, IV layout (E2E XORs a 48-bit packet index into
`iv[8..14]`; HBH places `packetIndex << 16` into `iv[8..16]`), and counter mode
(E2E full 128-bit CTR; HBH libsrtp 2-byte-carry AES-ICM).

---

<a id="sframe-media"></a>

### 3. SFrame media end-to-end encryption

[View details](spec/crypto/sframe-media.md)

`CRY-04` - _status: draft - audio, video, group_

Per-frame end-to-end AEAD sealing of media payloads, applied above SRTP so the relay only forwards ciphertext.

- Each media frame MUST be sealed with an SFrame-style AEAD before transport.
- The sealed frame carries an authenticated header (key id + monotonic frame
  counter) over a payload encrypted under a per-participant SFrame key derived
  from the call key.
- The frame counter MUST NOT repeat under a given key.
- The relay MUST be unable to recover plaintext; it only forwards sealed frames.
- Group calls use per-sender keys.

---

<a id="group-call-crypto"></a>

### 4. Group call crypto

[View details](spec/crypto/group-call-crypto.md)

`CRY-06` - _status: draft - audio, video, group, screen-share_

A single 32-byte call key is shared with every group-call participant, and each participant derives one SFrame key per sender keyed by that sender's participant id.

**Call key.** A group call MUST share one 32-byte `callKey` among all participants,
delivered to each recipient device in the offer's `<enc>` payload (see
[call-offer](#call-offer)). The same `callKey` is used by every member; there is no
per-pair key. A `callKey` not exactly 32 bytes MUST fail key derivation (no key produced).

**Per-sender SFrame key derivation.** Derive with HKDF-SHA256 (expand):

    salt = callKey[0..16]
    ikm  = callKey[16..32]
    info = "e2e sframe key" || participantId
    L    = 32
    OKM  = HKDF-SHA256(salt, ikm, info, 32)

The SFrame AEAD (AES-128-GCM) MUST use `OKM[0..16]` as the key; `OKM[16..32]` is unused.

**Participant id normalization.** `participantId` MUST be the sender's normalized
participant JID:

1. Strip any device/resource suffix after `/`; trim surrounding whitespace.
2. If there is no `@`, or `@` is the first character, use the bare string unchanged.
3. Split into `user@domain`. If `user` already contains `:`, keep `user@domain` unchanged.
4. If `domain` is `lid` and `user` has no `:` suffix, address the primary device as `:0`,
   yielding `user:0@lid`.
5. Otherwise use `user@domain`.

**Direction.** The info label always carries the **sender's** participant id, so producer
and consumer derive an identical key. Each participant MUST derive its *send* key from its
own normalized id and seal outgoing frames under it; to receive, it MUST derive a peer's
key from that peer's normalized id.

**Counters.** Each sender MUST maintain a monotonic per-frame counter seeding the GCM
nonce, carried in the SFrame header (see [sframe-media](#sframe-media)). The counter MUST
NOT repeat under a given sender key.

---

<a id="warp-crypto"></a>

### 5. WARP key wrap

[View details](spec/crypto/warp-crypto.md)

`CRY-07` - _status: review - audio, video_

WARP adds a per-call authentication key and a truncated per-packet MESSAGE-INTEGRITY tag, carried by the audio-piggyback RTP extension word.

WARP adds a per-call **authentication key** and a per-packet
**MESSAGE-INTEGRITY (MI)** tag on top of the E2E SRTP payload cipher
([srtp-e2e](#srtp-e2e)). RTP extension profile: `0xDEBE`.

**WARP auth key.** Derive from the 32-byte call key (`callKey`, see
[call-offer](#call-offer)) with HKDF-SHA256:

    IKM  = callKey                   ; full 32 bytes
    salt = (empty)                   ; zero-length
    info = "warp auth key"           ; ASCII, no NUL terminator
    L    = 32
    authKey = OKM(32)

Derivation MUST NOT run unless `callKey` is exactly 32 bytes.

**MI tag.** First 4 bytes of HMAC-SHA1 over the protected packet bytes
(everything preceding the tag) concatenated with the 32-bit ROC in big-endian:

    tag  = HMAC-SHA1(authKey, packet_without_tag || ROC_be32)[0..4]
    wire = packet_without_tag || tag(4)

`ROC_be32` is the 4-byte big-endian encoding of the same ROC used to build the
E2E SRTP packet index. The sender MUST append the 4-byte tag to every
protected packet.

**Audio piggyback extension.** The MI tag is carried via a WARP RTP extension,
selected by 0-based packet index:

    packet_index 0, 1  -> no piggyback word (empty extension)
    packet_index >= 2  -> piggyback word 0x30010000

The piggyback word MUST be emitted as a big-endian 32-bit value
(`0x30 0x01 0x00 0x00`).

---

<a id="relay"></a>

## Relay

The media transport and relay stack: STUN, the relay handshake, RTP/RTCP framing, and the media loop.

| # | Section | Summary |
| --- | --- | --- |
| 1 | [Transport candidates](#relay-candidates) | Parse the `<relay>` block of a call ack into relay endpoints (`<te2>` packed addresses), keying material, and indexed token tables, then select which endpoint to probe for latency versus connect media to. |
| 2 | [STUN relay handshake](#stun-relay) | A STUN-dialect handshake binds the client to a relay candidate before WARP media frames flow. |
| 3 | [RTCP control](#rtcp) | RTCP feedback/control packets on the call media path: a standard Sender Report (PT 200) plus two WhatsApp compact reports (PT 208, PT 209), and the rule for classifying a received packet as RTP or RTCP on a shared port. |
| 4 | [RTP framing](#rtp-framing) | RTP framing for SRTP-protected Opus media: the 16-byte speech and 20-byte DTX/piggyback headers (ext profile 0xdebe), payload classification, and send-side sequencing. |
| 5 | [SSRC allocation](#ssrc) | RTP SSRCs are deterministically derived per participant and stream slot via HKDF-SHA256 over the call id, participant LID, and slot index. |
| 6 | [Media loop and session](#media-loop) | Per-call session state machine plus the outbound (protect) and inbound (unprotect) audio frame pipelines: RTP framing, E2E-SRTP, and WARP tagging. |

<a id="relay-candidates"></a>

### 1. Transport candidates

[View details](spec/relay/relay-candidates.md)

`REL-01` - _status: draft - audio, video, group_

Parse the `<relay>` block of a call ack into relay endpoints (`<te2>` packed addresses), keying material, and indexed token tables, then select which endpoint to probe for latency versus connect media to.

**`<relay>` element**

    <relay uuid=… self_pid=… peer_pid=…>
      <key>…</key>                 ; relay key (base64 ASCII), 16 bytes decoded
      <hbh_key>…</hbh_key>         ; hop-by-hop key (base64 ASCII), 30 bytes decoded
      <warp_mi_tag_len>…</warp_mi_tag_len>  ; optional decimal, > 0
      <token id="N">…</token>      ; indexed relay tokens (0-based)
      <auth_token id="N">…</auth_token>     ; indexed auth tokens (0-based)
      <te2 …>…</te2>               ; one or more transport endpoints
    </relay>

`uuid` is an opaque string. `self_pid`/`peer_pid` are decimal participant ids.
Node content MAY be raw bytes or UTF-8 text.

**`<key>` and `<hbh_key>`**

`<key>`: base64-decode (standard alphabet, no-padding fallback) to the raw relay
key (16 bytes observed); if content is not base64, use verbatim. The pre-decode
ASCII is the STUN message-integrity key and MUST be retained.

`<hbh_key>`: MUST decode to exactly 30 bytes (`masterKey(16) || masterSalt(14)`)
for hop-by-hop SRTP (see [srtp-hop-by-hop](#srtp-hop-by-hop)). Handle a single
base64 layer; if the first decode is not 30 bytes, retry a second base64 decode
(double-base64). Content not yielding 30 bytes is treated as absent.

`<warp_mi_tag_len>`: decimal; MUST be ignored unless it parses and is > 0.

**Token tables**

`<token>` and `<auth_token>` are two independent 0-based indexed tables. Place each
element's decoded content at the slot given by its `id`, growing the table with
empty entries as needed; when `id` is absent use the next free slot. `<te2>`
references these via `token_id` / `auth_token_id`.

**`<te2>` endpoint**

Content is the packed address:

    6 bytes  → IPv4 : a.b.c.d + port (u16 big-endian, bytes[4..6])
    18 bytes → IPv6 : 8 × u16 groups (big-endian) + port (u16, bytes[16..18])

Any other content length MUST be skipped. Default relay port is 3478 (packed
`0x0D 0x96`).

Attributes:

- `relay_id` — decimal, default 0.
- `relay_name` — string, default empty.
- `token_id` — decimal index into `<token>` table, default 0.
- `auth_token_id` — decimal index into `<auth_token>` table, default 0.
- `is_fna` — `"1"` marks a fallback (inbound-only) relay; absent/other = false.
- `protocol` — decimal, default 0; carried onto the parsed address.
- `c2r_rtt` — optional decimal client→relay RTT in milliseconds.

Multiple `<te2>` sharing the same `relay_id` and `relay_name` MUST be merged into
one endpoint accumulating all addresses (e.g. one IPv4 + one IPv6). The endpoint's
`c2r_rtt` is taken from the latest `<te2>` supplying one. A client MUST retain the
verbatim 6-byte IPv4:port content of the first IPv4 `<te2>`; this exact byte string
is echoed in the `<te>` of a `<relaylatency>` stanza (see
[call-relaylatency](#call-relaylatency)).

**Endpoint selection**

An endpoint is an **outbound (latency) candidate** iff `is_fna` is false AND
`auth_token_id` is non-zero. FNA relays (`is_fna=1`, `auth_token_id=0`) are
inbound-only and MUST NOT be probed for outbound latency.

- **relaylatency probing**: use only outbound candidates, deduped by `relay_name`,
  ordered by ascending `relay_id`.
- **media transport**: select in order: (1) first outbound candidate; else (2)
  first non-FNA endpoint; else (3) first endpoint. An offer whose endpoints all
  have `auth_token_id=0` has no latency candidate but MUST still connect media to a
  chosen endpoint rather than drop the call.

When merging a patch relay block (e.g. accept ack supplies a fresh `hbh_key`) over
an existing block, a client MUST prefer each present patch field, and MUST treat
empty token tables / empty endpoint lists in the patch as "unset" so base values
are retained.

**Synthetic ICE credentials**

For WebRTC stacks: ICE ufrag = base64 of the raw selected `auth_token` bytes; ICE
pwd = base64 of the decoded relay key. An empty token or key yields an empty string.

---

<a id="stun-relay"></a>

### 2. STUN relay handshake

[View details](spec/relay/stun-relay.md)

`REL-02` - _status: draft - audio, video, group_

A STUN-dialect handshake binds the client to a relay candidate before WARP media frames flow.

- Candidates come from the offer's `<destination>` (see [call-offer](#call-offer)),
  each annotated with measured latency.
- The client MUST complete the STUN handshake against these candidates to establish
  the client↔relay binding that WARP frames ride over.
- The client SHOULD select the lowest-latency candidate.

<a id="warp"></a>

#### 2.1 WARP relay framing

[View details](spec/relay/warp.md)

`REL-03` - _status: draft - audio, video, group_

WARP frames wrap SRTP-protected RTP for forwarding through the relay.

After the STUN relay handshake (see [stun-relay](#stun-relay)), media MUST be
carried in WARP frames between client and relay.

- A WARP frame wraps the hop-by-hop-protected RTP payload with the relay
  forwarding header.
- The relay forwards frames between participants and MUST NOT terminate the
  end-to-end SFrame layer (see [sframe-media](#sframe-media)).

---

<a id="rtcp"></a>

### 3. RTCP control

[View details](spec/relay/rtcp.md)

`REL-04` - _status: review - audio, video_

RTCP feedback/control packets on the call media path: a standard Sender Report (PT 200) plus two WhatsApp compact reports (PT 208, PT 209), and the rule for classifying a received packet as RTP or RTCP on a shared port.

RTCP shares the media 5-tuple with RTP and is protected as SRTCP (see
[srtp-hop-by-hop](#srtp-hop-by-hop)). Every packet uses RTP version 2 (top two
bits of byte 0 = `0b10`) and an 8-byte fixed header: `version/padding/count`,
`payload type`, big-endian 16-bit `length`. `length` MUST be packet size in
32-bit words minus one. All multi-byte integers are big-endian.

**Sender Report (PT 200).** 28-byte cleartext. RC MUST be 0 (no reception
report blocks). Layout:

```
 0               1               2               3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|1 0|0|0 0 0 0 0|   PT = 200    |        length = 6             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        sender SSRC                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|              NTP timestamp, seconds (since 1900)              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|              NTP timestamp, fraction                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        RTP timestamp                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    sender's packet count                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    sender's octet count                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- byte 0 MUST be `0x80`; byte 1 MUST be `200`; `length` MUST be `6`.
- `sender SSRC` MUST be the sender's own SSRC (see [ssrc](#ssrc)).
- NTP timestamp encodes wall-clock send time as 64-bit NTP: high 32 bits =
  `(floor(now_ms / 1000) + 2208988800) mod 2^32`; low 32 bits =
  `floor((now_ms mod 1000) / 1000 * 2^32)`.
- `RTP timestamp` MUST correspond to the same instant as the NTP timestamp, in
  the sender stream's clock units.
- `sender's packet count` / `sender's octet count` MUST be the total RTP data
  packets / payload octets transmitted since stream start.

**Compact report (PT 208).** 12-byte cleartext binding local to remote source:

```
 0               1               2               3
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|1 0|0|0 0 0 0 1|   PT = 208    |        length = 2             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        local SSRC                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        remote SSRC                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- byte 0 MUST be `0x81`; byte 1 MUST be `208`; `length` MUST be `2`.
- First SSRC word MUST be local source; second MUST be remote source.

**Compact report (PT 209).** 8-byte cleartext, local source only, pre-speech:

```
 0               1               2               3
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|1 0|0|0 0 0 0 1|   PT = 209    |        length = 1             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        local SSRC                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- byte 0 MUST be `0x81`; byte 1 MUST be `209`; `length` MUST be `1`.

**On-the-wire size with SRTCP.** SRTCP appends a 14-byte authenticated trailer
(E-flag/index word plus auth tag): PT 208 = 26 bytes, PT 209 = 22 bytes,
Sender Report = 42 bytes on the wire.

**Classification (RTP vs. RTCP).** On a shared port, a receiver MUST treat a
packet as RTCP only if ALL hold, else as RTP:

- length >= 22 bytes (8-byte header + 14-byte SRTCP trailer);
- version bits (top two bits of byte 0) == 2;
- byte 1 as unsigned 8-bit >= 64.

WhatsApp RTP sets the extension bit (`X=1`, byte 0 `0x90`) and a 7-bit payload
type in the low bits of byte 1: a receiver MUST NOT classify a packet as RTCP
when byte 0's extension bit is set and the low 7 bits of byte 1 equal the Opus
RTP payload type. The RTCP payload type is the full byte 1; sender SSRC is
bytes 4..8.

---

<a id="rtp-framing"></a>

### 4. RTP framing

[View details](spec/relay/rtp-framing.md)

`REL-05` - _status: review - audio, video_

RTP framing for SRTP-protected Opus media: the 16-byte speech and 20-byte DTX/piggyback headers (ext profile 0xdebe), payload classification, and send-side sequencing.

Protected media MUST use RTP version 2. Audio payload type is **120** (Opus); a
receiver MUST also accept **121**. Byte 1 = `marker << 7 | (payloadType & 0x7f)`.
CC MUST be 0; P MUST be 0. All multi-byte fields MUST be big-endian.

**Header shape.** Every packet MUST carry exactly one of two headers. Speech uses
the 16-byte header (`X=0`); DTX or warp-piggyback uses the 20-byte header (`X=1`).
The 0xdebe extension profile tag MUST be emitted on every header; the 16-byte form
has extension length 0 (no extension block), the 20-byte form has length 1 word.

16-byte speech header:

    0               1               2               3
    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |V=2|P|X=0| CC=0  |M|     PT      |       sequence number       |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                           timestamp                          |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                             SSRC                             |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |       0xdebe (ext profile)    |     ext length = 0 words      |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

20-byte DTX / piggyback header (16-byte header with ext length = 1 word, then one
32-bit extension word):

    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |       0xdebe (ext profile)    |     ext length = 1 word       |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                       extension word                         |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

**Extension word** (20-byte header only):
- DTX (comfort-noise): MUST be `0x30010000`.
- Warp-piggyback: MUST be the piggyback word for that packet (see [warp](#warp)).

**Payload classification.** Select header shape and marker from the Opus payload:
- **DTX/comfort-noise** when: single byte `0x10`, `0x88`, or `0x90`; or 2–15 bytes
  with first byte `b0` where `(b0 & 0xf8) == 0x08` or `b0 == 0x0a`; or ≤ 6 bytes
  with `(b0 & 0xf0) == 0x30`. MUST use the 20-byte header.
- **Opus priming frame** when it equals one of the fixed priming frames.
- All other payloads are **speech** and MUST use the 16-byte header.
- Priming and DTX payloads MUST NOT latch the speech marker.

**Sequencing (send side).** A stream MUST start sequence number at **1** and
timestamp at **0**. Each packet MUST advance the sequence number by 1 (mod 2^16)
and the timestamp by `samplesPerPacket` (mod 2^32). The marker bit MUST be set on
the first speech packet (speech onset); priming/DTX packets before speech MUST NOT
set the marker or latch the onset. Subsequent speech packets MUST NOT set the
marker unless the caller explicitly requests it.

**Wire-size estimation.** Implementations MAY estimate on-wire SRTP size as
`headerSize + payloadLength + authTagLength`, where `headerSize` is 16 (speech) or
20 (DTX), and `authTagLength` (see [srtp-hop-by-hop](#srtp-hop-by-hop)) is the
short 4-byte tag for DTX and short speech packets (priming frames or payloads
≤ 18 bytes), else the full 10-byte tag.

---

<a id="ssrc"></a>

### 5. SSRC allocation

[View details](spec/relay/ssrc.md)

`REL-06` - _status: review - audio, video, group, screen-share_

RTP SSRCs are deterministically derived per participant and stream slot via HKDF-SHA256 over the call id, participant LID, and slot index.

Every SSRC is derived deterministically; none are negotiated or random.

**Per-stream SSRC derivation.** Each SSRC MUST be HKDF-SHA256:

    salt = slotWord            ; slot index as little-endian u32 (4 bytes)
    IKM  = callId              ; call id bytes
    info = participantLID      ; participant LID bytes
    L    = 4
    SSRC = u32_from_le_bytes(OKM)   ; 4-byte OKM read as little-endian u32

**Slot allocation.** A participant occupies nine relay stream slots. The slot
words, in stream order, MUST be:

    [0, 1, 4, 2, 3, 5, 7, 8, 6]

The array index is the stream index; the value at that index is the slot word
fed to HKDF as the salt. To derive all nine SSRCs, apply the per-stream
derivation with each slot word in this exact order.

**Participant mapping.** The same `participantLID` byte string MUST be used
here as is used for the HKDF `info` elsewhere for that participant (see
[srtp-master-key](#srtp-master-key)).

**Participant LID formatting.** `info` is the device-qualified LID:
- Strip any resource part (after `/`) first.
- A bare `<user>@lid` (no device suffix) MUST be qualified to device `0`:
  `<user>@lid` becomes `<user>:0@lid`.
- A LID already carrying a `:N@lid` device suffix MUST pass through unchanged.
- JIDs whose domain is not `lid` MUST pass through unchanged.
- On receive, an implementation MAY try both the `:0@lid` and bare `@lid`
  forms as candidate `info` values when matching a peer sender.

---

<a id="media-loop"></a>

### 6. Media loop and session

[View details](spec/relay/media-loop.md)

`REL-07` - _status: draft - audio, video_

Per-call session state machine plus the outbound (protect) and inbound (unprotect) audio frame pipelines: RTP framing, E2E-SRTP, and WARP tagging.

**Session state**

A session MUST hold at minimum: call id, peer JID, call-creator JID, direction
(outgoing | incoming), and current **phase**. Phase MUST be one of:

    Idle | Calling | Ringing | Connecting | Active | Ended

Outgoing sessions MUST start in `Idle`; incoming sessions MUST start in `Ringing`.
The idempotent self-transition `x → x` MUST be accepted. The only other legal
transitions are:

    Idle       → Calling      ; outgoing only
    Calling    → Ringing
    Ringing    → Connecting
    Connecting → Active
    <any phase except Ended> → Ended

All other transitions MUST be rejected as a no-op. `Ended` MUST be terminal. An
incoming session MUST NOT transition to `Calling`. Media MAY flow only in `Active`.

**Media pipeline keying**

Derive two independent E2E-SRTP key sets from the call key (see
[srtp-master-key](#srtp-master-key)): **send** keys keyed by the sender's own
participant id, **recv** keys keyed by the peer's participant id. The HKDF `info`
for the send direction MUST be the sender's own participant id (the peer derives
its recv keys from that id). Both JIDs MUST be normalized with the E2E-SRTP
participant-id rule (see [ssrc](#ssrc)) before derivation. The two directions MUST
NOT be inverted.

**Outbound loop (protect)**

For each audio frame to send, in order:

1. Obtain the next RTP header from the send sequencer. RTP sequence number starts
   at 1 and increments by 1 per packet; RTP timestamp advances by
   `samples_per_packet` (960 for a 60 ms frame at 16 kHz); payload type MUST be
   `120` (Opus).
2. Advance the rollover counter (ROC) for the new sequence number.
3. Encode the RTP header bytes.
4. E2E-SRTP encrypt the Opus payload under the **send** keys, using the header SSRC,
   sequence number and ROC as keystream inputs (see [srtp-e2e](#srtp-e2e)).
5. Concatenate `rtp_header || encrypted_payload`.
6. Append the 4-byte WARP message-integrity tag, computed over that concatenation
   under the send auth key with the ROC (see [warp](#warp)).

Send the result as one binary message on the relay media channel (see
[stun-relay](#stun-relay), [call-transport](#call-transport)).

**Inbound loop (unprotect)**

For each relay packet classified as RTP (see [rtp-framing](#rtp-framing)):

1. Reject if shorter than `12 + 4` bytes (min RTP header + WARP MI tag).
2. Strip the trailing 4-byte WARP MI tag.
3. Parse the RTP header, compute its byte length; reject if no payload follows.
4. E2E-SRTP decrypt the remaining payload under the **recv** keys, using the parsed
   SSRC, sequence number and ROC.

The decrypted result is the Opus payload for the decoder (see [opus](#opus)).

**Codec parameters**

Audio MUST be Opus, mono, 16 kHz, 60 ms frames (`960` samples per packet), VoIP
application mode. Reference encode: 25 kbps, complexity 9. Payload type 120 on
send; 120 and 121 both recognized as Opus on the inbound path. Priming frames are
fixed constant payloads and MUST bypass the encoder (see [rtp-framing](#rtp-framing)).

---

## Acknowledgements

This spec exists because of the people who reverse-engineered, implemented, and documented the WhatsApp call stack. Thank you:

[Auties](https://github.com/Auties00) - [Edgard](https://github.com/edgardmessias) - [João Lucas](https://github.com/jlucaso1) - [Rajeh Taher](https://github.com/purpshell) - [Shelltear](https://github.com/sheiitear) - [Vini](https://github.com/vinikjkkj)
