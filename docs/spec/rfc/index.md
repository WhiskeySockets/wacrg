<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# WhatsApp Calls — the RFC

The normative specification of the WhatsApp call stack, compiled from `spec/rfc/`. Each section is citable by its stable id (e.g. `call-offer`); implement to these descriptions to interoperate. Every section also has its own lookup page, and libraries follow changes via the [feed](./feed.json) (see [updates](./updates.md)).

!!! warning "Work in progress"
    Sections marked `draft`, or carrying open questions, are not yet pinned to the wire. Trust the status badge and the `Implemented by` table over the prose.

## Contents

- **[Signalling](#signalling)**
    - [Call offer stanza](#call-offer) · `call-offer`
    - [Video call negotiation](#video-call) · `video-call`
    - [Call accept stanza](#call-accept) · `call-accept`
    - [Call pre-accept (ringing)](#call-preaccept) · `call-preaccept`
    - [Transport stanza](#call-transport) · `call-transport`
    - [Group call setup](#group-call) · `group-call`
    - [Call stanza acknowledgement](#call-ack) · `call-ack`
    - [Call reject stanza](#call-reject) · `call-reject`
    - [Raise hand](#raise-hand) · `raise-hand`
    - [In-call emoji reactions](#reactions) · `reactions`
    - [Screen sharing](#screen-share) · `screen-share`
    - [Missed / timed-out call flow](#flow-call-missed) · `flow-call-missed`
    - [Mute signalling](#call-mute) · `call-mute`
    - [Call terminate stanza](#call-terminate) · `call-terminate`
    - [Relay latency reporting](#call-relaylatency) · `call-relaylatency`
    - [Incoming 1:1 call flow](#flow-incoming-1to1) · `flow-incoming-1to1`
    - [Outgoing 1:1 call flow](#flow-outgoing-1to1) · `flow-outgoing-1to1`
    - [Rejected call flow](#flow-call-rejected) · `flow-call-rejected`
- **[Encodings](#encodings)**
    - [MLow audio codec](#mlow) · `mlow`
    - [MLow RED and Reed-Solomon FEC](#mlow-red-fec) · `mlow-red-fec`
    - [MLow frame and TOC](#mlow-frame) · `mlow-frame`
    - [MLow range coder](#mlow-rangecoder) · `mlow-rangecoder`
    - [Opus codec](#opus) · `opus`
    - [Video codec](#video) · `video`
    - [Video packetization](#video-packetization) · `video-packetization`
    - [MLow LSF and LPC](#mlow-lsf-lpc) · `mlow-lsf-lpc`
    - [MLow encode pipeline](#mlow-encoder) · `mlow-encoder`
    - [MLow CELP excitation](#mlow-excitation) · `mlow-excitation`
    - [MLow decode pipeline](#mlow-decoder) · `mlow-decoder`
    - [MLow comfort noise](#mlow-noise) · `mlow-noise`
    - [MLow post-filters](#mlow-postfilter) · `mlow-postfilter`
    - [MLow CELP synthesis](#mlow-synthesis) · `mlow-synthesis`
    - [MLow voice activity detection](#mlow-vad) · `mlow-vad`
- **[Crypto](#crypto)**
    - [Call key establishment](#call-key) · `call-key`
    - [SRTP master key and salt derivation](#srtp-master-key) · `srtp-master-key`
    - [Hop-by-hop SRTP](#srtp-hop-by-hop) · `srtp-hop-by-hop`
    - [SFrame media end-to-end encryption](#sframe-media) · `sframe-media`
    - [End-to-end SRTP](#srtp-e2e) · `srtp-e2e`
    - [Group call crypto](#group-call-crypto) · `group-call-crypto`
    - [WARP key wrap](#warp-crypto) · `warp-crypto`
- **[Relay](#relay)**
    - [Transport candidates](#relay-candidates) · `relay-candidates`
    - [STUN relay handshake](#stun-relay) · `stun-relay`
    - [WARP relay framing](#warp) · `warp`
    - [RTCP control](#rtcp) · `rtcp`
    - [RTP framing](#rtp-framing) · `rtp-framing`
    - [SSRC allocation](#ssrc) · `ssrc`
    - [Media loop and session](#media-loop) · `media-loop`

<a id="signalling"></a>

## Signalling

Call control over the WABinary/XMPP transport: the <call> stanza family and feature signalling.

<a id="call-offer"></a>

### Call offer stanza

**`call-offer`** · status: review · features: audio, video · since: 0.1.0

The opening stanza of a 1:1 call: a <call> node whose <offer> child proposes the session, delivers the per-device media key, and seeds transport negotiation.

**Normative**

A caller device MUST open a call by sending a top-level `<call>` stanza with an
`id` (the stanza id used to correlate the server `<ack>`), a `from`, and a `to`.
Its `<offer>` child MUST carry `call-id` (the opaque logical call identifier,
echoed in every later stanza for this call) and `call-creator`.

The `<offer>` children MUST appear in this exact order; a mis-ordered offer is
rejected by the server with error **439**:

    privacy → audio(8000) → audio(16000) → net(medium) → capability
            → (destination | enc) → encopt(keygen) → device-identity

Media is advertised as two `<audio enc="opus" rate="8000|16000">` nodes. The
`<capability ver="1">` body MUST be the fixed 7-byte blob
`01 05 f7 09 e4 bb 13`. `<encopt keygen="2">` selects the v2 SRTP key path. Each
recipient device MUST receive its own `<enc>` node carrying the call key encrypted
to that device's Signal session (`type="pkmsg"` to establish, `type="msg"` to
reuse); a multi-device callee therefore receives several `<enc>` nodes.

**Findings**

The structure and the load-bearing details (child order, the 439 rejection, the
fixed capability blob, the keygen=2 path) are corroborated by independent working
reconstructions that place real calls.

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Full meaning of the packed <capability> bitfield.
- Whether an explicit media-key length/salt is carried, or all is derived from the Signal plaintext.

**References**

- [Signal Protocol (X3DH + Double Ratchet)](https://signal.org/docs/)

[lookup page →](./signalling/call-offer.md) · [↑ contents](#contents)

---

<a id="video-call"></a>

### Video call negotiation

**`video-call`** · status: draft · features: audio, video · since: 0.1.0

How a call is signalled as video-capable rather than audio-only: the offer carries a video marker alongside its audio advertisements, and the group fan-out notification carries the equivalent media flag.

**Normative**

A call is signalled as video-capable, rather than audio-only, by the presence of
a video marker inside the offer; the marker is additive and does not replace the
audio advertisement.

**1:1 offer.** A video-capable `<offer>` MUST carry a `<video>` child element in
addition to its `<audio enc="opus" rate="…">` advertisements
(see [call-offer](#call-offer)). A receiver MUST treat the call as a video call
if and only if the `<offer>` contains at least one `<video>` child, and as
audio-only otherwise. The audio `<audio>` advertisements are present in both the
audio-only and the video case; video is signalled purely by the extra `<video>`
element:

    <offer call-id call-creator>
      …
      <audio enc="opus" rate="8000"/>
      <audio enc="opus" rate="16000"/>
      <video/>                          <!-- present ⇒ video call -->
      …
    </offer>

A receiver MUST NOT require any attribute on `<video>` to recognise the call as
video; element presence is the signal. A receiver MUST still parse and honour the
`<audio>` advertisements of a video offer exactly as for an audio-only offer.

**Group fan-out notification.** When a video call is announced to group members
via an `<offer_notice>` (see [group-call](#group-call)), the video signal is
carried as the attribute `media="video"` on the `<offer_notice>` element, not as a
child element. A receiver MUST treat the notified call as video if and only if
`media == "video"`. (`type == "group"` independently marks the call as a group
call.)

**Answering.** The callee answers a video offer with the same `<preaccept>` /
`<accept>` handshake used for audio-only calls (see [call-accept](#call-accept) and
[call-preaccept](#call-preaccept)); the accept negotiates the `<audio>` rate as
usual. No additional video-specific child in the `<accept>` is required to accept
the audio portion of the call.

**Findings**

At the signalling layer the audio/video distinction for a 1:1 call is binary and
is decided entirely by whether the `<offer>` contains a `<video>` child: the field
is parsed as `is_video = any child tag == "video"`. The same `<offer>` always
advertises audio (`<audio enc="opus" rate="8000|16000">`), so a video offer is an
audio offer plus the `<video>` marker rather than a distinct stanza shape.

The group-call announcement path is separate: `<offer_notice>` does not nest media
elements and instead exposes `media="video"` (audio uses `media="audio"`) together
with `type="group"`. Both are simple attribute checks on the notice element.

**Requires:** [`call-offer`](#call-offer), [`group-call`](#group-call), [`call-accept`](#call-accept), [`call-preaccept`](#call-preaccept)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working | Parses the <video> child (is_video) on <offer> and media="video" on <offer_notice>; inbound recognition. |
| [`zapo-caller`](../flavors.md) | partial | Signalling/relay stack present; video-offer construction not covered. |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Attributes (if any) carried on the <video> child of <offer> — e.g. codec, resolution, or orientation hints — and whether the server enforces them.
- Whether a video-capable <accept> carries a reciprocal <video> child or other video-specific element to confirm acceptance of the video track.
- How mid-call escalation from audio-only to video is signalled (e.g. a renegotiation stanza vs. a fresh offer).
- Whether the offer's child-order rule (439 on mis-order) fixes the position of the <video> element relative to the <audio> nodes.

**References**

- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)

[lookup page →](./signalling/video-call.md) · [↑ contents](#contents)

---

<a id="call-accept"></a>

### Call accept stanza

**`call-accept`** · status: review · features: audio, video · since: 0.1.0

The callee's answer to an offer: a <call> node whose <accept> child confirms the selected media format, pins the relay-token endpoint, and commits the call to the v2 SRTP key path so media can flow.

**Normative**

A callee device answers an offer by sending a top-level `<call>` stanza whose
`<accept>` child confirms the session. The `<call>` wrapper MUST carry a `to`
addressing the offering peer; it MAY omit the `id` attribute (the accept does not
require a caller-chosen wrapper id). The `<accept>` child MUST carry `call-id` and
`call-creator`, both echoed verbatim from the offer being answered.

The `<accept>` children MUST appear in this order:

    audio(rate)… → [te(priority=2)] → net(medium=2) → encopt(keygen=2)
                 → [capability] → [rte] → [voip_settings]

Media selection: the callee MUST emit one `<audio enc="opus" rate="…">` node per
advertised rate it accepts, in preference order. Emitting only `<audio rate="8000">`
selects 8 kHz narrowband Opus; emitting `<audio rate="16000">` selects the 16 kHz
path. The `<audio>` nodes carry no body.

`<net medium="2">` MUST be present and selects the relay transport medium (the
offer advertises `medium="3"`; the accept commits to `medium="2"`). `<encopt
keygen="2">` MUST be present and pins the v2 SRTP key derivation path
(see [srtp-master-key](#srtp-master-key)), matching the offer's `encopt`.

Optional children:

- `<te priority="2">` — when present, carries the relay transport-endpoint blob and
  MUST be placed immediately after the `<audio>` nodes with `priority="2"`.
- `<capability ver="1">` — when present, its body is the fixed 7-byte blob
  `01 05 f7 09 e4 bb 13` (the same `ver="1"` capability blob used in `<offer>`).
- `<rte>` — when present, carries the relay-token-extension blob with no attributes.
- `<voip_settings uncompressed="1">` — when present, carries the VoIP settings blob
  and MUST be the last child.

**Findings**

The accept stanza is the second half of the callee handshake; a callee SHOULD send
a `<preaccept>` (see [call-preaccept](#call-preaccept)) before the `<accept>`. The
`<accept>` and `<offer>` share the `call-id`/`call-creator` correlation and the
`encopt keygen="2"` key path, so both ends agree on v2 SRTP keying before media
starts. The audio-rate selection in the accept is the lever that steers the
negotiated codec: advertising only 8 kHz keeps the peer on RFC narrowband Opus,
while 16 kHz selects the wideband path. The relay `<te>`, `<rte>`, and
`<voip_settings>` children are optional and are populated once the callee has
resolved its relay allocation.

**Requires:** [`call-offer`](#call-offer), [`call-preaccept`](#call-preaccept), [`srtp-master-key`](#srtp-master-key)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Byte layout and semantics of the <te priority=2> relay transport-endpoint blob.
- Contents of the <rte> relay-token-extension blob and the <voip_settings uncompressed=1> body.
- Whether the server enforces the <accept> child order with a 439-style rejection as it does for <offer>.

**References**

- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)

[lookup page →](./signalling/call-accept.md) · [↑ contents](#contents)

---

<a id="call-preaccept"></a>

### Call pre-accept (ringing)

**`call-preaccept`** · status: review · features: audio, video · since: 0.1.0

The optional <preaccept> stanza a callee sends to signal "ringing" — that the offer reached a device and the call is alerting the user — before the user actually answers with <accept>.

**Normative**

A callee device MAY send a `<preaccept>` to indicate that an incoming `<offer>`
(see [call-offer](#call-offer)) was received and the call is now ringing, before
the user answers. It is a non-committal ringing signal: it does not accept the
call and MUST be followed by an `<accept>` ([call-accept](#call-accept)) or a
terminating action ([call-reject](#call-reject) / [call-terminate](#call-terminate))
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

**Requires:** [`call-offer`](#call-offer), [`call-accept`](#call-accept)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Whether the server or peer behaves differently when <preaccept> is omitted versus sent (e.g. caller-side ringing UI/timeout), and whether it is ever mandatory.
- Whether <preaccept> may carry additional children (e.g. <video>, <net>) for video calls, as its <audio>-only shape is observed for audio calls.
- Full meaning of the packed <capability> bitfield and the significance of the differing final byte.

[lookup page →](./signalling/call-preaccept.md) · [↑ contents](#contents)

---

<a id="call-transport"></a>

### Transport stanza

**`call-transport`** · status: review · features: audio, video · since: 0.1.0

The <transport> action of the <call> stanza, exchanged after the offer to negotiate ICE/relay candidates: it carries the relay token, advertises the network medium, and is typed by a transport-message-type that distinguishes relay candidates, peer ICE candidates, and keepalive replies.

**Normative**

After the offer, each side exchanges transport (candidate) information by sending
a top-level `<call>` stanza whose action child is `<transport>`. The action node
MUST carry the call identity:

    <transport call-id="<call-id>" call-creator="<creator-jid>"
               [p2p-cand-round="<n>"]
               [transport-message-type="<t>"]>
      [ <te priority="1">…relay-token-bytes…</te> ]
      <net medium="2" [protocol="0"]/>
    </transport>

The `<transport>` node MUST appear inside a `<call to="<peer>">` wrapper. The
`call-id` MUST equal the `call-id` established in the offer, and `call-creator`
MUST identify the call creator; both are echoed unchanged from the offer.

**Children and their order.** The transport action MUST contain a `<net>` child.
When a relay token is being conveyed, the action MUST place a `<te priority="1">`
child, whose binary body is the relay token blob, **before** the `<net>` child.
When no relay token is conveyed, the `<te>` child is omitted and `<net>` is the
sole child.

**`<net>` attributes.** `<net>` MUST carry `medium="2"`. It MUST additionally
carry `protocol="0"` unless `transport-message-type` is `"9"`; when
`transport-message-type` is `"9"`, the `protocol` attribute MUST be omitted.

**`transport-message-type`.** When present this attribute selects the role of the
exchange:

    "1"  relay candidate
    "3"  peer (ICE) candidate    ; the callee replies with type "9"
    "9"  keepalive / reply      ; <net> omits protocol

**`p2p-cand-round`.** When peer-to-peer candidates are exchanged in rounds, the
sender MAY include `p2p-cand-round` carrying the round number as a decimal string.

**Receiver behaviour.** A receiver MUST treat `<transport>` as a known call
action: it MUST read `call-id` and `call-creator` (both required) and MAY read the
optional `p2p-cand-round` and `transport-message-type` attributes. A receiver that
does not recognise the action MUST ignore the stanza rather than fail the call, so
that future transport-message-type values remain forward-compatible.

**Findings**

The transport exchange reuses the same `<call>` wrapper and `call-id` /
`call-creator` identity as the offer, so it correlates to the in-progress call
without a separate handshake. The `<te>` (transport-endpoint) child carries the
opaque relay token as its binary body; the same `<te>` element, with a different
`priority`, appears in the accept (`priority="2"`) and relaylatency exchanges,
indicating a shared relay-token carrier across call actions. The `protocol="0"`
vs. omitted distinction is keyed entirely on `transport-message-type == "9"`,
tying the network descriptor's shape to the message role.

**Requires:** [`call-offer`](#call-offer), [`stun-relay`](#stun-relay)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Exact internal structure of the <te> relay-token blob (token bytes vs. framed structure).
- Full enumeration of transport-message-type values beyond 1 (relay candidate), 3 (peer ICE), and 9 (keepalive/reply).
- Whether <net medium> takes values other than 2 in the transport exchange, and the meaning of the medium scale.
- Semantics of p2p-cand-round rounds and the termination condition for candidate-exchange rounds.

**References**

- [RFC 8445 — Interactive Connectivity Establishment (ICE)](https://www.rfc-editor.org/rfc/rfc8445)
- [RFC 7675 — STUN Usage for Consent Freshness](https://www.rfc-editor.org/rfc/rfc7675)

[lookup page →](./signalling/call-transport.md) · [↑ contents](#contents)

---

<a id="group-call"></a>

### Group call setup

**`group-call`** · status: draft · features: group, audio, video · since: 0.1.0

How a multi-party call is created and how participants join, leave, and are tracked, extending the 1:1 offer/accept flow.

**Normative**

TODO. A group call extends the 1:1 flow: the creator establishes a group call
session that additional participants join, each keyed independently (see
[srtp-master-key](#srtp-master-key)) with per-sender media keys for SFrame (see
[sframe-media](#sframe-media)). The participant roster, join/leave stanzas, and
group key distribution are not yet fully specified.

**Findings**

Group calls reuse the 1:1 keying and media planes with per-sender key separation.

**Requires:** [`call-offer`](#call-offer)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | unknown |  |

**Open questions**

- Group session creation, the participant roster stanza, and join/leave signalling.
- Per-sender SFrame key distribution and rotation on join/leave.

[lookup page →](./signalling/group-call.md) · [↑ contents](#contents)

---

<a id="call-ack"></a>

### Call stanza acknowledgement

**`call-ack`** · status: review · features: audio, video, group · since: 0.1.0

How a client acknowledges an inbound `<call>` stanza: the generic transport `<ack>` that every `<call>` receives, and the additional `<receipt><offer/></receipt>` that an `<offer>` action specifically requires so the caller's signalling layer learns the ringing device received the offer.

**Normative**

A `<call>` stanza carries exactly one action child (`<offer>`, `<offer_notice>`,
`<preaccept>`, `<accept>`, `<reject>`, `<terminate>`, `<transport>`, or
`<relaylatency>`). Acknowledgement happens at two levels.

**Level 1 — generic transport ack.** Every received `<call>` stanza MUST be
acknowledged with a generic `<ack>` keyed to the stanza envelope, exactly as for
any other top-level server stanza. The `<ack>` correlates to the `<call>` by its
`id` attribute (the *stanza id*, distinct from the action's `call-id`). This ack is
independent of the action child and is sent for all action types, including
`<offer_notice>`.

**Level 2 — offer receipt.** When and only when the action child is `<offer>`, the
receiving device MUST additionally send a `<receipt>` that echoes the offer back to
the caller, so the caller's signalling layer learns the device received the ring:

    <receipt to="{caller}" id="{stanza_id}" from="{own_addressable_id}">
      <offer call-id="{call-id}" call-creator="{call-creator}"/>
    </receipt>

The `<receipt>` attributes MUST be set as follows:

- `to` MUST equal the `from` JID of the originating `<call>` stanza (the caller).
- `id` MUST equal the *stanza id* — the `id` attribute of the `<call>` stanza,
  NOT the action's `call-id`.
- `from` SHOULD be set to the acknowledging device's own addressable id. The id
  MUST be chosen to match the address space of the inbound `<call>`'s `from` JID:
  when `from` is a LID, the device's own LID is used; otherwise its own phone-number
  JID is used. If no own addressable id is available the `from` attribute MUST be
  omitted.

The single child `<offer>` MUST carry exactly two attributes copied verbatim from
the inbound offer action: `call-id` and `call-creator`. It MUST NOT echo the offer's
media or capability children.

An offer receipt MUST NOT be sent for any non-`<offer>` action. In particular,
`<offer_notice>` (the group-call fan-out notification) is acknowledged by the
generic Level-1 ack only and MUST NOT produce an offer receipt.

A receiver MUST treat an action child whose tag it does not recognise as a no-op
for acknowledgement purposes beyond the generic Level-1 ack: it MUST NOT fail the
stanza and MUST NOT emit an offer receipt.

**Findings**

The inbound `<call>` envelope carries `from`, `id` (stanza id), `t` (unix time),
and optionally `notify`, `platform`, `version`, and `e` (`e == "1"` marks offline
delivery). The action's `call-id` is a separate identifier from the stanza `id`;
the offer receipt correlates on the stanza `id` while later signalling (accept,
transport, terminate) correlates on `call-id` + `call-creator`.

The generic ack is emitted by the stanza router's should-ack path, so the call
handler itself only adds the offer receipt. The receipt mirrors the WhatsApp Web
shape: a `<receipt>` whose lone `<offer>` child repeats just `call-id` and
`call-creator`.

**Requires:** [`call-offer`](#call-offer)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working | signalling layer consumes/produces the offer receipt |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Whether the server expects (or rejects) an offer receipt that omits the `from` attribute when an own addressable id exists.
- Whether any action other than `<offer>` (e.g. video offers carrying a `<video>` child) triggers an additional receipt beyond the generic ack.

**References**

- [RFC 6120 — XMPP Core (stanza acknowledgement model)](https://www.rfc-editor.org/rfc/rfc6120)

[lookup page →](./signalling/call-ack.md) · [↑ contents](#contents)

---

<a id="call-reject"></a>

### Call reject stanza

**`call-reject`** · status: review · features: audio, video · since: 0.1.0

The `<reject>` action stanza, sent by a callee device to decline an incoming call offer without ever entering the media phase. It names the call by its `call-id`/`call-creator` and carries no child elements.

**Normative**

A callee device declines a ringing call by sending a `<call>` stanza whose
single action child is `<reject>`. The wire layout is:

    <call to="{caller-jid}">
      <reject call-id="{call-id}" call-creator="{call-creator-jid}"/>
    </call>

**Construction.**

- The outer `<call>` element MUST carry a `to` attribute set to the JID the
  offer was received from (the caller). The reject builder MUST NOT add an
  `id` attribute to the `<call>` wrapper; the I/O layer's stanza id applies.
- The `<reject>` action element MUST carry exactly two attributes:
  - `call-id` — the `call-id` copied verbatim from the `<offer>` being
    declined (see [call-offer](#call-offer)).
  - `call-creator` — the `call-creator` JID copied verbatim from that
    `<offer>`.
- The `<reject>` element MUST be empty: it MUST NOT contain any child
  elements and carries no content bytes.

**Semantics.**

- A device MUST send `<reject>` only to decline an offer it has not accepted.
  It is distinct from `<terminate>` (see [call-terminate](#call-terminate)),
  which ends a call that has already progressed past offer.
- `<reject>` MUST NOT be preceded by `<preaccept>` or `<accept>` for the same
  call from the same device; rejecting is the terminal action for that offer.
- No media keying, relay allocation, or transport negotiation is performed on
  the reject path: a rejecting device skips the entire media stack.

**Receiving.**

- A `<reject>` arrives wrapped in an inbound `<call>` stanza alongside the
  standard call envelope attributes (`from`, `id`, `t`, and optionally
  `notify`, `platform`, `version`, `e`). A receiver MUST treat `call-id` and
  `call-creator` on the `<reject>` element as required; a `<reject>` missing
  either attribute MUST be rejected as malformed.
- The generic `<call>` acknowledgement covers receipt of a `<reject>`; no
  `<receipt>`-style ack-of-offer is emitted in response (that is specific to
  `<offer>`).

**Findings**

The `<reject>` action is symmetric on both directions of the stack: the
outbound builder emits `<call to=peer><reject call-id call-creator/></call>`
with no children, and the inbound parser recognises `reject` as a known action
carrying only `call-id` and `call-creator`, mapping it to a `Reject` call
action that mirrors the stanza one-to-one.

Unlike `<terminate>`, `<reject>` carries no `reason`, `duration`, or
`audio_duration` attributes and no `<destination>` child for fanning the
decline out to sibling devices — declining is expressed purely by the two
identifying attributes.

**Requires:** [`call-offer`](#call-offer)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working | ported from zapo-caller signaling.ts |
| [`meowcaller`](../flavors.md) | planned | signalling is a planned module |

**Open questions**

- Whether any client emits an optional <reject> attribute (e.g. a reason or media-type hint) under newer protocol versions; none is observed in the current builders or parser.
- Whether the caller forwards a reject-derived terminate to other callee devices, or whether each device rejects independently.

**References**

- [RFC 2119 — Key words for use in RFCs](https://www.rfc-editor.org/rfc/rfc2119)

[lookup page →](./signalling/call-reject.md) · [↑ contents](#contents)

---

<a id="raise-hand"></a>

### Raise hand

**`raise-hand`** · status: draft · features: group, raise-hand · since: 0.1.0

The in-call signal a participant sends to raise or lower their hand in a group call.

**Normative**

TODO. A participant signals raise/lower-hand state to the other participants
in-band over the call signalling channel. The exact stanza/attribute carrying this
state is not yet specified.

**Findings**

A group-call UX feature. Not yet reverse-engineered to wire level.

**Requires:** [`group-call`](#group-call)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | unknown |  |

**Open questions**

- Which stanza/attribute carries raise-hand state, and whether it is acked.

[lookup page →](./signalling/raise-hand.md) · [↑ contents](#contents)

---

<a id="reactions"></a>

### In-call emoji reactions

**`reactions`** · status: draft · features: reactions, group · since: 0.1.0

The signal a participant sends to broadcast an emoji reaction during a call.

**Normative**

TODO. A participant broadcasts a transient emoji reaction to other participants
over the call signalling channel. The carrying stanza and the emoji encoding are
not yet specified.

**Findings**

An in-call UX feature. Not yet reverse-engineered to wire level.

**Requires:** [`group-call`](#group-call)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | unknown |  |

**Open questions**

- Stanza/attribute and emoji encoding for an in-call reaction; TTL/debounce behaviour.

[lookup page →](./signalling/reactions.md) · [↑ contents](#contents)

---

<a id="screen-share"></a>

### Screen sharing

**`screen-share`** · status: draft · features: screen-share, video, group · since: 0.1.0

The signalling that starts and stops a screen-share track within a call.

**Normative**

TODO. A participant starts a screen-share by adding a video track flagged as
screen content and signalling it to the other participants; the receiver renders
it distinctly from the camera track. The track flag and start/stop stanzas are not
yet specified.

**Findings**

The WhatsApp Web engine carries a `ScreenContentDetector`, indicating screen
content is handled distinctly in the media path.

**Requires:** [`group-call`](#group-call)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | unknown |  |

**Open questions**

- How a screen-share track is flagged in signalling and in the RTP/encoding plane.

[lookup page →](./signalling/screen-share.md) · [↑ contents](#contents)

---

<a id="flow-call-missed"></a>

### Missed / timed-out call flow

**`flow-call-missed`** · status: draft · features: audio, video · since: 0.1.0

The stanza sequence for a 1:1 call that is offered but never answered: the caller's <offer>, each callee device's offer-receipt acknowledgement, the absence of any <preaccept>/<accept>, and the terminating <terminate> that ends the unanswered call once it times out.

**Normative**

A missed call follows the same opening as any 1:1 call (see
[flow-incoming-1to1](#flow-incoming-1to1) and [call-offer](#call-offer)) but never
reaches the accept stage. The full stanza sequence is:

1. **Offer.** The caller sends `<call to="{callee}" id="{stanza-id}">` wrapping an
   `<offer call-id call-creator>` (see [call-offer](#call-offer)). The server
   `<ack>`s the stanza and fans the offer out to each of the callee's devices.

2. **Offer-receipt (per device).** Each callee device that receives the offer
   MUST acknowledge it with a `<receipt>` echoing the offer, in addition to the
   transport-level `<ack>`:

       <receipt to="{caller}" id="{offer-stanza-id}" [from="{own-device-jid}"]>
         <offer call-id="{call-id}" call-creator="{call-creator}"/>
       </receipt>

   The `id` MUST equal the `id` of the inbound `<call>` stanza (not the
   `call-id`). The `from` attribute, when present, MUST be the acknowledging
   device's own addressable JID; it is set to the device's LID when the offer
   arrived addressed to a LID and to the device's PN otherwise. This receipt
   signals to the caller's signaling layer that the device received the ring;
   it is NOT an accept and MUST NOT be treated as one.

3. **No answer.** For a missed call no callee device sends `<preaccept>` (see
   [call-preaccept](#call-preaccept)) or `<accept>` (see [call-accept](#call-accept)).
   The call remains in the ringing state for the duration of the offer/ring
   timeout window.

4. **Terminate.** When the ring times out with no answer, the call MUST be ended
   with a `<terminate>` action inside the standard `<call>` wrapper (see
   [call-terminate](#call-terminate)):

       <call to="{peer-jid}">
         <terminate call-id="{call-id}" call-creator="{call-creator}"
                    [reason="{reason}"]>
           [<destination><to jid="{device-jid}"/>...</destination>]
         </terminate>
       </call>

   The `<terminate>` MUST carry the same `call-id` and `call-creator` that
   identified the offer. When the terminate targets a peer's other ringing
   devices, it MAY carry a single `<destination>` child enumerating those
   devices with one `<to jid="..."/>` per device; otherwise `<destination>`
   MUST be omitted. A `reason` attribute, when not specified, MUST be omitted
   entirely rather than sent empty.

A `<terminate>` received for an unanswered call MAY carry `duration` and
`audio_duration` counters; for a missed call these are expected to be zero or
absent, and a receiver MUST treat their absence as "not reported" rather than
inferring a value.

A receiver that does not recognize a `<call>` action child MUST ignore the
stanza rather than error, so future action additions do not break the handler.

**Findings**

The offer-receipt acknowledgement is emitted automatically on every inbound
`<offer>`; the builder echoes the offer's `call-id`/`call-creator` back inside a
`<receipt>` whose `id` is the inbound `<call>` stanza id, with `from` chosen by
the server of the inbound `from` JID (LID -> own LID, otherwise own PN). The
missed-call path is distinguished from the accepted path purely by the absence
of a `<preaccept>`/`<accept>` from any callee device before the call is torn
down with `<terminate>`. The terminate action, its optional `reason`, its
`<destination>` device fan-out, and the optional inbound `duration`/
`audio_duration` counters are the same machinery used for ordinary hang-ups.

**Requires:** [`call-offer`](#call-offer), [`call-accept`](#call-accept), [`call-preaccept`](#call-preaccept), [`call-terminate`](#call-terminate), [`flow-incoming-1to1`](#flow-incoming-1to1)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working | Parses the inbound <call>/<offer>, auto-emits the <receipt><offer/></receipt> ack, and builds <terminate>; the example bot rejects or accepts rather than letting a call ring out, so the timeout-driven terminate is not exercised end-to-end. |
| [`zapo-caller`](../flavors.md) | working | Signalling builders (offer/accept/terminate) ported from this flavor's signaling.ts. |
| [`meowcaller`](../flavors.md) | planned | Signalling is a planned module. |

**Open questions**

- The ring/offer timeout duration and which side (caller, callee, or server) drives the terminate when a call goes unanswered.
- Whether a distinct reason value (e.g. a 'timeout'/'no_answer' code) marks a missed-call terminate, or whether the reason is simply omitted; the source only confirms accepted_elsewhere.
- Whether the server emits its own terminate/notification for a timed-out call independent of the caller's terminate, and how a missed call is recorded in chat history.
- Exact values of duration/audio_duration on a missed-call terminate (expected zero/absent but not confirmed from source).

**References**

- wacore voip signaling builders (build_offer, build_terminate)
- wacore call stanza parser and build_offer_ack_receipt

[lookup page →](./signalling/flow-call-missed.md) · [↑ contents](#contents)

---

<a id="call-mute"></a>

### Mute signalling

**`call-mute`** · status: draft · features: audio, video · since: 0.1.0

How a participant signals an in-call audio mute/unmute state change to the peer over the call signalling channel, using a `<mute_v2>` action inside the shared `<call>` envelope.

**Normative**

In-call mute state is conveyed out of band from the media stream, as a
signalling stanza. A participant that changes its local microphone mute state
MUST send a `<call>` stanza wrapping a `<mute_v2>` action child:

```
<call to="{peer}">
  <mute_v2 call-id="{call-id}"
           call-creator="{call-creator}"
           mute-state="{state}"/>
</call>
```

Requirements on the action:

- The `to` attribute on the `<call>` wrapper MUST be the peer JID. The wrapper
  carries no `id` attribute on this action (the I/O layer does not assign one).
- `call-id` MUST equal the `call-id` of the call established by the offer (see
  [call-offer](#call-offer)).
- `call-creator` MUST equal the call's `call-creator` JID — the JID of the
  party that placed the call — and MUST be byte-identical to the value carried
  by every other action of the same call.
- `mute-state` MUST carry the new mute state as a string attribute value.
- The action tag MUST be `mute_v2`. The `<mute_v2>` element MUST have no child
  elements; all state is carried in attributes.

A participant MUST send a fresh `<mute_v2>` on each transition (mute → unmute
or unmute → mute); the stanza expresses the new absolute state, not a toggle.

This action is informational signalling: the sender continues to follow the
established media path and does not renegotiate transport, codecs, or keys
(see [call-transport](#call-transport)). Muting is expected to be realised on
the media stream independently (for example by ceasing to transmit audio or by
transmitting silence); the `<mute_v2>` stanza only advertises the state to the
peer so it can update its UI.

**Findings**

The `<mute_v2>` action shares the common call-action shape used by every other
action in the call envelope: a tag carrying `call-id` and `call-creator`
attributes, wrapped in a `<call to=…>` element. It differs only by adding the
`mute-state` attribute and by carrying no child elements.

The `_v2` suffix in the tag name indicates a versioned action; the tag name
is sent verbatim on the wire as `mute_v2`.

**Requires:** [`call-offer`](#call-offer), [`call-transport`](#call-transport)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working | build_mute_v2 in wacore/src/voip/stanza.rs constructs the outbound stanza; no inbound parser yet (mute_v2 is not in the <call> action allow-list). |
| [`zapo-caller`](../flavors.md) | planned |  |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- The set of valid mute-state values is not pinned by the source; the builder accepts an arbitrary string. The on-wire encoding (e.g. "muted"/"unmuted" vs a numeric flag) is unconfirmed.
- Whether video mute is signalled by the same mute_v2 action (e.g. an additional video-state attribute) or by a separate action is unknown.
- Whether the receiver acknowledges <mute_v2> (with a generic <ack> or a dedicated receipt) is not established; the inbound side does not yet parse this action.
- Whether a v1 <mute> action precedes mute_v2 on older clients, and how versions interoperate, is unknown.

**References**

- [WhatsApp call signalling — mute_v2 builder](https://github.com/WhiskeySockets)

[lookup page →](./signalling/call-mute.md) · [↑ contents](#contents)

---

<a id="call-terminate"></a>

### Call terminate stanza

**`call-terminate`** · status: draft · features: audio, video, group · since: 0.1.0

The <terminate> action stanza that ends a call: its wire shape, the optional reason attribute, the destination fan-out used to hang up a peer's other devices, and the duration counters carried on inbound terminates.

**Normative**

A call is ended by sending a `<terminate>` action inside the standard `<call>`
wrapper. The wrapper and action MUST be shaped as follows:

    <call to="{peer-jid}">
      <terminate call-id="{call-id}" call-creator="{call-creator-jid}"
                 [reason="{reason}"]>
        [<destination>
           <to jid="{device-jid}"/>...
         </destination>]
      </terminate>
    </call>

The `<call>` wrapper MUST carry a `to` attribute addressing the peer. Unlike
`<preaccept>` and `<heartbeat>`, the terminate wrapper does not carry an `id`
attribute supplied by the builder.

The `<terminate>` action element:

- MUST carry `call-id`, identifying the call being torn down. This is the
  call identifier established in the offer (see [call-offer](#call-offer)), not
  the stanza id.
- MUST carry `call-creator`, the JID of the participant that created the call.
- MAY carry `reason`, a string naming why the call ended. When the reason is
  not specified the attribute MUST be omitted entirely (no empty `reason=""`).
- MAY contain a single `<destination>` child enumerating other devices to hang
  up. When present, `<destination>` MUST contain one `<to jid="..."/>` child
  per target device. When there are no additional target devices the
  `<destination>` element MUST be omitted.

**Reason codes.** The `reason` attribute is a free-form string. The reason
`accepted_elsewhere` is sent to a peer's other devices when the call has been
accepted on one device, so the remaining devices stop ringing; this is the
case that pairs `reason="accepted_elsewhere"` with a `<destination>` list of
the devices to hang up. A terminate MAY also be sent with no `reason` at all
to signal an ordinary hang-up.

**Inbound terminates.** A received `<terminate>` MUST be parsed for its
`call-id` and `call-creator` (both required). It MAY additionally carry:

- `duration` — total call duration in seconds, a non-negative integer that
  MUST fit in an unsigned 32-bit value.
- `audio_duration` — the audio-only duration in seconds, with the same
  encoding and range as `duration`.

Both duration counters are optional; a parser MUST treat their absence as
"not reported" rather than zero.

A `<terminate>` is one of the recognized `<call>` action children. A receiver
that does not recognize an action child MUST ignore the stanza rather than
error, so that future action additions do not break the handler.

**Findings**

Outbound terminate construction sets `reason` only when supplied and attaches
the `<destination>` device list only when at least one target device is given;
the `accepted_elsewhere` reason is the observed pairing with that list. The
inbound parser reads `duration` and `audio_duration` as optional u32 seconds
but does not currently consume the `reason` attribute, so a peer-sent reason is
carried on the wire but not surfaced by the inbound model.

**Requires:** [`call-offer`](#call-offer)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working | build_terminate emits the action; the inbound parser decodes duration/audio_duration. |
| [`zapo-caller`](../flavors.md) | working | signalling builder ported from this flavor's signaling.ts. |
| [`meowcaller`](../flavors.md) | planned | signalling is a planned module. |

**Open questions**

- Full enumeration of reason values the server and clients emit; only accepted_elsewhere is confirmed from source.
- Whether duration/audio_duration are ever sent on outbound terminates or only received.
- Whether reason is expected (or validated) on inbound terminates, given the parser ignores it today.

**References**

- wacore voip signaling builders (build_terminate)
- wacore call stanza parser (terminate action)

[lookup page →](./signalling/call-terminate.md) · [↑ contents](#contents)

---

<a id="call-relaylatency"></a>

### Relay latency reporting

**`call-relaylatency`** · status: draft · features: audio, video, group · since: 0.1.0

How a client reports a measured round-trip latency to a relay server using the `<relaylatency>` call action, including the offset encoding of the latency value and the `<te>` element that names the relay and carries its address.

**Normative**

A client reports a measured relay round-trip time (RTT) by sending a `<call>`
stanza carrying a `<relaylatency>` action child. The action element MUST carry
the same `call-id` and `call-creator` attributes used by the rest of the call's
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

The outbound `<call>` wrapper MUST set `to` to the peer JID. It MUST NOT carry an
`id` attribute on this action.

**The `<te>` element.** A `<relaylatency>` action MUST contain exactly one `<te>`
child describing the relay that was probed. The `<te>` element:

- MUST carry a `latency` attribute encoding the measured RTT (see below).
- MUST carry a `relay_name` attribute naming the relay (e.g. `gru1c02`).
- MUST carry the relay's binary address as the element's raw byte content.

**Latency encoding.** The `latency` attribute value MUST be the decimal string of
the RTT in milliseconds added to the fixed 32-bit offset `0x02000000`
(33554432):

    latency = decimal_string( 0x02000000 + rtt_ms )

For example, an RTT of 45 ms MUST be encoded as `"33554477"`. The addition is
performed in unsigned 32-bit arithmetic.

**Destination.** When the report targets specific peer devices, the action SHOULD
include a `<destination>` child containing one `<to jid="..."/>` element per
target device. The `<destination>` element MUST be omitted when there are no
target devices (for example, an inbound callee reporting to the call creator).

**Receiving.** A client receiving a `<call>` whose action child tag is
`relaylatency` MUST treat it as a relay-latency report keyed by its `call-id` and
`call-creator`. A receiver MUST NOT reject the call signalling when the action
carries no `<te>` or `<destination>` children.

**Findings**

The `<relaylatency>` action shares the `offer`-style envelope used by other call
actions: a `<call>` wrapper around an action element that carries `call-id` and
`call-creator`. It is one of the recognised call actions alongside `offer`,
`offer_notice`, `preaccept`, `accept`, `reject`, `terminate`, and `transport`;
parsers that omit it from their known-action set silently drop the stanza.

The 32-bit offset `0x02000000` keeps the encoded value in a distinct numeric band
well above plausible raw millisecond RTTs, which lets a receiver recover the RTT
by subtracting the offset.

The `<te>` element carries the relay's address as raw element bytes rather than as
an attribute, mirroring how relay candidate addresses are carried elsewhere in the
call protocol.

**Requires:** [`call-offer`](#call-offer), [`stun-relay`](#stun-relay)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working | build_relay_latency + encode_latency in wacore voip::stanza; parsed as CallAction::RelayLatency |
| [`zapo-caller`](../flavors.md) | working | ported from src/signaling.ts; relay path covered |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Exact byte layout of the relay address carried as <te> content, and whether it matches the relay-candidate address format.
- The set of valid relay_name values and how a client selects which relay(s) to report.
- Whether the receiver (server or peer) sends any acknowledgement specific to relaylatency, and the cadence/trigger for emitting reports.
- Whether group calls report latency per relay for multiple relays in a single action or one action per relay.

**References**

- [RFC 5245 — ICE (relay/RTT context)](https://www.rfc-editor.org/rfc/rfc5245)

[lookup page →](./signalling/call-relaylatency.md) · [↑ contents](#contents)

---

<a id="flow-incoming-1to1"></a>

### Incoming 1:1 call flow

**`flow-incoming-1to1`** · status: review · features: audio, video · since: 0.1.0

The receiver-side stanza sequence for answering an incoming 1:1 call: parsing the inbound `<call><offer>`, acknowledging it with an offer receipt, and then either ringing and accepting (`<preaccept>` then `<accept>`) or declining (`<reject>`), all addressed back to the caller.

**Normative**

An incoming 1:1 call is delivered as a top-level `<call>` stanza whose action
child is `<offer>` (see [call-offer](#call-offer)). The receiver processes it as
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
(see [call-ack](#call-ack)); the offer receipt is sent only for the `<offer>`
action, not for `offer_notice` or other actions.

## 3a. Decline the call

To reject the incoming call, the receiver MUST send:

    <call to=<caller JID>>
      <reject call-id=<offer call-id> call-creator=<offer call-creator>/>
    </call>

See [call-reject](#call-reject). No `<preaccept>`/`<accept>` is sent.

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
[call-preaccept](#call-preaccept) and [call-accept](#call-accept).

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

**Requires:** [`call-offer`](#call-offer), [`call-ack`](#call-ack), [`call-preaccept`](#call-preaccept), [`call-accept`](#call-accept), [`call-reject`](#call-reject)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working | parses <call><offer>, sends the <receipt><offer/></receipt> ack, and drives preaccept→accept / reject |
| [`zapo-caller`](../flavors.md) | working | signalling answer sequence implemented |
| [`meowcaller`](../flavors.md) | planned | signalling is a planned module |

**Open questions**

- Whether a 1:1 receiver ever omits <preaccept> and answers with <accept> alone (e.g. auto-answer), or always rings first.
- Exact conditions under which <te>, <rte>, and <voip_settings> are required vs optional in the <accept>, and where their byte payloads originate.
- Whether the offer receipt <from> must always be set on multi-device accounts, and the precise rule selecting LID vs PN addressing.

**References**

- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)

[lookup page →](./signalling/flow-incoming-1to1.md) · [↑ contents](#contents)

---

<a id="flow-outgoing-1to1"></a>

### Outgoing 1:1 call flow

**`flow-outgoing-1to1`** · status: draft · features: audio, video · since: 0.1.0

The end-to-end stanza sequence a caller follows to place a 1:1 call: device discovery and key delivery in the offer, the server ack and per-device offer receipts, the callee's preaccept/accept, the transport (relay/ICE) exchange, the media phase, and termination. This part orders the individual call stanzas into the caller-side timeline; each stanza's wire format is normative in its own part.

**Normative**

This part specifies the caller's view of a 1:1 call. Each numbered step names
the stanza whose full wire format is normative elsewhere; the requirements here
govern ordering, correlation, and state transitions, not the byte layout of the
individual stanzas.

**Identifiers.** The caller MUST generate a `call-id` (the opaque logical call
identifier) before sending the offer and MUST echo it, together with
`call-creator`, in every subsequent stanza for this call. The `call-id` is
distinct from the per-stanza `id` used to correlate server acks. The
`call-creator` MUST be the caller's own addressable id and MUST remain constant
for the lifetime of the call.

**Step 1 — Device discovery and key delivery.** Before sending the offer the
caller MUST enumerate the callee's devices and MUST establish a Signal session
with each target device. The caller MUST generate one random call key for the
call and MUST encrypt it once per target device to that device's Signal session.

**Step 2 — Offer.** The caller MUST send a top-level `<call to="{callee}"
id="{stanza-id}">` whose `<offer>` child carries `call-id`, `call-creator`, the
advertised `<audio>` formats, the `<capability>` blob, and the per-device
encrypted call key (a single `<enc>` for one device, or a `<destination>` of
`<to><enc/></to>` entries for several). The full `<offer>` layout and its
load-bearing child order are normative in [call-offer](#call-offer).

**Step 3 — Server ack.** The caller MUST treat the call as pending until the
server acknowledges the offer stanza. The server `<ack>` correlates to the offer
by the `<call>` stanza `id`, NOT by `call-id` (see [call-ack](#call-ack)).

**Step 4 — Offer receipts (ringing).** For each ringing callee device, the
caller receives a `<receipt>` whose `<offer call-id call-creator/>` child echoes
the call (see [call-ack](#call-ack)). Receipt of at least one offer receipt
indicates the offer reached a device and it is ringing. The caller MUST correlate
these to the call by `call-id` + `call-creator`.

**Step 5 — Preaccept (optional, early-media).** A callee device MAY send a
`<preaccept>` before accepting (see [call-preaccept](#call-preaccept)). The caller
MUST treat `<preaccept>` as a ringing/early-media signal only; it MUST NOT begin
protected media or tear down the offer on the basis of a preaccept alone.

**Step 6 — Accept.** When a callee device accepts, the caller receives an
`<accept>` for this `call-id` (see [call-accept](#call-accept)). The `<accept>`
selects the answering device. From this point the caller MUST direct subsequent
signalling for the call to the accepting device, and MUST consider the call
answered.

**Step 7 — Transport / relay negotiation.** The caller and callee exchange
transport state to converge on a media path (see [call-transport](#call-transport)
and [stun-relay](#stun-relay)). The caller MUST be prepared to send and receive
`<transport>` stanzas (relay candidates, peer ICE, keepalive/reply) carrying the
`call-id` + `call-creator`, and MAY report measured per-relay round-trip time via
`<relaylatency>` (see [call-relaylatency](#call-relaylatency)). Transport
negotiation MAY begin as soon as relay data is available and MAY overlap with
steps 4–6.

**Step 8 — Media.** Once a media path is established, the caller protects and
exchanges RTP using the SRTP keys derived from the call key (see
[srtp-master-key](#srtp-master-key)). The negotiated `<audio>` format governs the
codec. While the call is connected the caller MUST keep the media path alive with
consent-freshness traffic; absence of such traffic causes the relay to drop the
stream and the call to fail (see [stun-relay](#stun-relay)).

**Step 9 — Terminate.** Either party ends the call by sending a `<terminate>`
carrying the `call-id` + `call-creator` (see [call-terminate](#call-terminate)).
After sending or receiving a `<terminate>` the caller MUST stop media and
consider the `call-id` closed; it MUST NOT reuse that `call-id` for a new call.

**Cancellation.** Before an `<accept>` is received, the caller MAY cancel the
pending call by sending a `<terminate>` for the `call-id`; this is the caller-side
equivalent of hanging up while ringing.

**Multi-device fan-in.** When the offer was delivered to several callee devices
and one device answers, the call is bound to that device. The caller MUST address
later signalling to the answering device and MUST NOT continue to treat the other
callee devices as live participants in this 1:1 call.

**Findings**

The caller generates the `call-id` as an opaque token (observed as a short
hex-like string) independent of the `<call>` stanza `id`. The caller's
`call-creator` is its own addressable id; outbound offers in practice set it to
the caller's phone-number JID.

Key delivery precedes the offer: the caller discovers the callee's device list,
asserts a Signal session per device, generates one random 32-byte call key, and
encrypts it per device (`type="pkmsg"` to establish a session, `type="msg"` to
reuse). All target devices receive the same call key; each peer then derives its
own SRTP keys from it keyed by participant id.

Correlation splits across two identifiers: the offer↔ack handshake and the
per-device offer receipt correlate on the `<call>` stanza `id`, while every later
action (`accept`, `transport`, `relaylatency`, `terminate`) correlates on
`call-id` + `call-creator`.

The signalling layer (offer → ack → receipts → preaccept/accept → transport →
terminate) is exercised by working callers. The boundary between signalling and
the live media phase — the precise trigger that promotes an accepted call into
active RTP, and the caller's exact transport-handshake message sequence — is the
least-pinned part of the outgoing timeline.

**Requires:** [`call-offer`](#call-offer), [`call-ack`](#call-ack), [`call-preaccept`](#call-preaccept), [`call-accept`](#call-accept), [`call-transport`](#call-transport), [`call-relaylatency`](#call-relaylatency), [`call-terminate`](#call-terminate), [`stun-relay`](#stun-relay), [`srtp-master-key`](#srtp-master-key)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | partial | device discovery, call-key encryption, and the offer/ack/receipt/preaccept/accept signalling are exercised; live caller-side media orchestration is still landing |
| [`zapo-caller`](../flavors.md) | working | outbound caller signalling + relay; not the codec |
| [`meowcaller`](../flavors.md) | planned | signalling/relay are planned modules |

**Open questions**

- Exact caller-side transport-message-type handshake sequence (which <transport> rounds the caller initiates vs. answers) to converge the media path.
- Precise trigger that promotes an accepted call into the active RTP/media phase on the caller side.
- Whether the caller must explicitly hang up the non-answering callee devices (e.g. a terminate with reason) once one device accepts a multi-device offer.
- Timeout/retry behaviour if no offer receipt, preaccept, or accept arrives within a ringing window.

**References**

- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)
- [RFC 6120 — XMPP Core (stanza acknowledgement model)](https://www.rfc-editor.org/rfc/rfc6120)
- [RFC 8445 — ICE](https://www.rfc-editor.org/rfc/rfc8445)

[lookup page →](./signalling/flow-outgoing-1to1.md) · [↑ contents](#contents)

---

<a id="flow-call-rejected"></a>

### Rejected call flow

**`flow-call-rejected`** · status: draft · features: audio, video · since: 0.1.0

The end-to-end stanza sequence when a callee device declines an incoming call: receiving the `<offer>`, acknowledging it, and emitting a single `<reject>` action without ever entering the preaccept, accept, media-keying, relay, or transport phases.

**Normative**

This flow specifies the ordered exchange between a caller and a callee device
when the callee declines the call. It composes the individual
[call-offer](#call-offer), [call-ack](#call-ack), and [call-reject](#call-reject)
actions into a terminal sequence; the per-stanza wire layouts are defined by
those parts and are not restated here except where ordering is load-bearing.

**Sequence (callee side).** On receiving an inbound `<offer>` and deciding to
decline, the callee device MUST perform the following steps, in order:

1. **Acknowledge the offer.** The device MUST send the two acknowledgements
   required for any `<offer>` per [call-ack](#call-ack): the generic transport
   `<ack>` keyed to the `<call>` stanza `id`, and the offer `<receipt>` that
   echoes `<offer call-id call-creator/>` back to the caller. These MUST be
   sent regardless of the decision to reject, so the caller learns the device
   received the ring.

2. **Send the reject.** The device MUST send a `<call>` stanza whose single
   action child is `<reject>`, as defined by [call-reject](#call-reject):

       <call to="{caller-jid}">
         <reject call-id="{call-id}" call-creator="{call-creator-jid}"/>
       </call>

   The `to` attribute MUST be the JID the `<offer>` was received from. The
   `call-id` and `call-creator` attributes MUST be copied verbatim from the
   `<offer>` being declined. The `<reject>` element MUST be empty.

**Steps that MUST NOT occur on this path.** A rejecting device:

- MUST NOT send `<preaccept>` (see [call-preaccept](#call-preaccept)) or
  `<accept>` (see [call-accept](#call-accept)) for the same call. `<reject>` is
  the terminal action for that offer from that device; once it has decided to
  reject, the device MUST NOT also advance the accept path for the same
  `call-id`.
- MUST NOT decrypt or derive media keys from the offer's `<enc>` callKey, and
  MUST NOT perform relay allocation, candidate exchange (`<transport>`), or
  relay-latency probing (`<relaylatency>`). The entire media stack is skipped.
- MUST NOT send `<terminate>` (see [call-terminate](#call-terminate)) for a
  call that never progressed past the offer; declining is expressed by
  `<reject>`, not `<terminate>`.

**Caller side.** The caller MUST treat a received `<reject>` for one of its
outstanding offers as a decline of the call by that device. The `<reject>`
arrives wrapped in an inbound `<call>` stanza and is acknowledged by the
generic `<call>` ack only; no offer receipt is emitted in response to a
`<reject>`.

**Multi-device offers.** When the caller offered to several callee devices,
each device decides independently and MAY emit its own `<reject>`. Each
`<reject>` carries the same `call-id`/`call-creator` and is sent from the
declining device. This part does not specify whether or how the caller fans a
decline out to the callee's sibling devices.

**Findings**

The reject path is a strict subset of the full incoming-call flow: it shares
the offer- acknowledgement (generic ack plus offer receipt) but branches at the
decision point, emitting `<reject>` instead of `<preaccept>`/`<accept>`. In the
reference flow the callee builds and sends the reject stanza directly from the
parsed offer's `call_id`/`call_creator` and the originating `from` JID, with no
intervening media work.

The inbound `<offer>` carries the caller's `call-id`, `call-creator`, optional
caller identity attributes, and one or more `<audio enc=opus rate=…>`
advertisements plus the per-device `<enc>` callKey; a rejecting device consumes
none of the codec or keying material. The `<reject>` it sends back carries only
the two identifying attributes and no children — symmetric on the outbound
builder and the inbound parser.

**Requires:** [`call-offer`](#call-offer), [`call-ack`](#call-ack), [`call-reject`](#call-reject), [`call-preaccept`](#call-preaccept), [`call-accept`](#call-accept), [`call-terminate`](#call-terminate), [`flow-incoming-1to1`](#flow-incoming-1to1)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working | listen mode default-rejects: acks the offer, then sends <reject> with no media work |
| [`zapo-caller`](../flavors.md) | working | reject builder ported from zapo-caller signaling.ts |
| [`meowcaller`](../flavors.md) | planned | signalling is a planned module |

**Open questions**

- Whether the caller emits a terminate or notice to the callee's sibling devices once one device rejects, or whether each device rejects independently with no cross-device fan-out.
- Whether a rejecting device must wait for the offer receipt to be sent before emitting <reject>, or whether the two may be pipelined.
- Whether the caller surfaces a distinct call-state (declined vs. unanswered) on receiving <reject> versus a missed-call timeout (see flow-call-missed).

**References**

- [RFC 2119 — Key words for use in RFCs](https://www.rfc-editor.org/rfc/rfc2119)

[lookup page →](./signalling/flow-call-rejected.md) · [↑ contents](#contents)

---

<a id="encodings"></a>

## Encodings

Media codecs and payload formats: MLow, Opus, and video.

<a id="mlow"></a>

### MLow audio codec

**`mlow`** · status: review · features: audio · since: 0.1.0

WhatsApp's low-bitrate speech codec (internally "SMPL"): a split-band CELP codec that reuses the Opus/CELT range coder for entropy coding.

**Normative**

An MLow payload MUST be decoded as split-band CELP. The entropy layer is the
Opus/CELT range coder verbatim; symbols are read from the front of the buffer and
raw bits from the back. The decode schedule MUST run, in order: TOC/frame parse,
RED de-packetization, range-coded LSF → LPC, excitation pulses, gains, pitch/LTP,
CELP synthesis, the harmonic and HP post-filters, and comfort-noise generation.
Decoded output is 16 kHz PCM.

MLow is one registered decoder alongside Opus; codec selection is signalled in the
offer (see [call-offer](#call-offer)). The neural companion post-filter is OPTIONAL
and not required for intelligible audio.

**Findings**

The receive (decode) path is the priority for a working
call; the encoder mirrors it plus rate control, DTX, and RED strength.

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | partial | receive DSP largely KAT-verified; CELP synth + decoder orchestration in progress |

**References**

- [RFC 6716 — Opus](https://www.rfc-editor.org/rfc/rfc6716)

[lookup page →](./encodings/mlow.md) · [↑ contents](#contents)

---

<a id="mlow-red-fec"></a>

### MLow RED and Reed-Solomon FEC

**`mlow-red-fec`** · status: draft · features: audio · since: 0.1.0

The optional "SplitRed" redundancy envelope that wraps an MLow RTP audio payload, carrying one main frame plus zero or more time-shifted redundant copies of earlier frames so a single lost packet can be recovered without retransmission. Specifies the on-wire layout, the header-run terminator, and the parse procedure; the Reed-Solomon forward-error-correction tier is named but not yet wire-specified.

**Normative**

## Applicability

The SplitRed RED envelope is the OUTERMOST layer of an MLow RTP audio payload.
It is OPTIONAL and MUST be applied only when the call negotiated a redundancy
level greater than zero (`mlow_red_redundancy_level > 0`). When redundancy is
not negotiated, the RTP payload is a single bare MLow frame (see
[mlow-frame](#mlow-frame)) with no wrapper, and the SplitRed parse MUST NOT be
applied.

A bare MLow frame begins with a TOC byte whose high bit is set. A SplitRed
envelope is self-distinguishing from a single-bare-frame stream only by
negotiation: a decoder MUST decide between the two based on the negotiated
redundancy level, NOT by sniffing the first byte. Feeding a bare frame to the
SplitRed parser is malformed and MUST be rejected (its high-bit-set first byte
is otherwise misread as a redundant block header).

## Wire layout

With `N` = the number of redundant blocks present in a given packet, the
payload is laid out as:

```
[ red_hdr[0] (2B) ] ... [ red_hdr[N-1] (2B) ]   ; N redundant-block headers
[ main_marker     (1B) ]                         ; terminates the header run
[ red_payload[0] ] ... [ red_payload[N-1] ]      ; redundant frame bodies, in header order
[ main_payload ]                                 ; the main frame body, last
```

### Redundant block header (`red_hdr[i]`, 2 bytes)

```
byte 0:  1 t t t t t t t      ; high bit MUST be 1; low 7 bits = time_code
byte 1:  s s s s s s s s      ; size = length in bytes of red_payload[i]
```

- `byte0` MUST have its high bit (`0x80`) set. The low 7 bits
  (`byte0 & 0x7f`) are the block's `time_code` (the frame's time offset).
- `byte1` is the unsigned byte length of the corresponding redundant payload
  body. A redundant payload is therefore at most 255 bytes.

### Main marker (`main_marker`, 1 byte)

```
byte 0:  0 t t t t t t t      ; high bit MUST be 0; low 7 bits = main time_code
```

The main marker terminates the run of redundant-block headers. Its high bit
(`0x80`) MUST be clear; the parser detects the end of the header run by
encountering a byte with the high bit clear. The low 7 bits
(`byte & 0x7f`) are the main frame's `time_code`. The length of the main
payload is NOT carried in the header; it is whatever bytes remain after the
header run and all redundant payloads.

## Parse procedure

Let `p` be the payload and `n = len(p)`. A decoder MUST parse as follows and
MUST reject the packet on each error condition below:

1. If `n == 0`, reject (`PktSizeZero`).
2. Walk the header run from offset `cur = 0`, tracking `rem` = bytes remaining
   from `cur` to end (`rem` starts at `n`):
   - If `rem == 0` before a main marker is seen, reject (`HeaderTooShort`).
   - Read `b0 = p[cur]`.
   - If `b0 < 0x80` (high bit clear), this is the main marker: if `rem <= 1`,
     reject (`MainTooShort`); otherwise stop the header walk.
   - Otherwise it is a redundant header: if `rem <= 2`, reject
     (`RedundantTooShort`). Read `size = p[cur+1]`. If
     `size + 2 >= rem`, reject (`RedundantTooShort`). Record
     `{ code: b0 & 0x7f, size }`. Advance `cur += 2` and decrease
     `rem -= size + 2`.
3. Read the main marker: `main_code = p[cur] & 0x7f`, then advance
   `cur += 1`.
4. For each recorded redundant block `r`, in header order, the next `r.size`
   bytes at `cur` are its frame body (`is_main = false`, `time_code = r.code`);
   advance `cur += r.size`.
5. The remaining `main_size = rem - 1` bytes are the main frame body
   (`is_main = true`, `time_code = main_code`).

The redundant frames are yielded first, in header order, and the main frame
last. Each yielded body is a complete MLow frame (TOC plus body) to be decoded
per [mlow-frame](#mlow-frame). A decoder SHOULD use a redundant copy only when
the corresponding original (main) frame for that `time_code` was lost.

## Reed-Solomon FEC

The MLow stack also defines a Reed-Solomon forward-error-correction tier
alongside the RED envelope. Its on-wire encoding, generator polynomial,
symbol size, and the negotiation that enables it are not specified here.

**Findings**

The SplitRed `time_code` is a 7-bit value (`byte & 0x7f`) on both the
redundant-block header byte0 and the main marker, representing the frame's
time offset; redundant blocks carry copies of earlier frames so that the loss
of one main packet can be repaired from a redundant copy in a later packet.

The header-run terminator is structural rather than counted: there is no count
field for `N`. The parser distinguishes a redundant header from the main
marker purely by the high bit of the leading byte (set = redundant, clear =
main), and the size validation `size + 2 >= rem` guarantees that at least the
one-byte main marker and a non-empty main payload remain after every redundant
block.

Worked example (one redundant block + main):

```
p = 85 03 00  AA BB CC  50 11 22 33
    |  |  |   \______/  \_________/
    |  |  |   red body  main body (4B)
    |  |  main_marker (time_code 0)
    |  size = 3
    red hdr byte0 = 0x85 -> high bit set, time_code = 5
```

yields a redundant frame `AA BB CC` (time_code 5) followed by the main frame
`50 11 22 33` (time_code 0). A header that is just a main marker (e.g.
`00 50 11 22`) yields a single main frame with no redundancy.

**Requires:** [`mlow`](#mlow), [`mlow-frame`](#mlow-frame)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working | depack_split_red parses the RED envelope; bare-frame streams bypass it |
| [`meowmeow`](../flavors.md) | partial | encodings codec; RED envelope coverage not confirmed |
| [`meowcaller`](../flavors.md) | partial | codec modules partial |

**Open questions**

- On-wire encoding of the Reed-Solomon FEC tier: generator polynomial, symbol/block size, and parity layout.
- Negotiation signalling that sets mlow_red_redundancy_level and enables Reed-Solomon FEC.
- Semantics of time_code relative to RTP timestamp / frame sequence, and the receiver's repair (jitter-buffer) policy for selecting a redundant copy.
- Encoder side: how many redundant copies are emitted per level and which past frames are chosen.

**References**

- [RFC 2198 — RTP Payload for Redundant Audio Data](https://www.rfc-editor.org/rfc/rfc2198)

[lookup page →](./encodings/mlow-red-fec.md) · [↑ contents](#contents)

---

<a id="mlow-frame"></a>

### MLow frame and TOC

**`mlow-frame`** · status: review · features: audio · since: 0.1.0

The first byte of a bare MLow payload — the "smpl" table-of-contents (TOC) — and how it routes the frame (standard Opus vs. MLow), carries the DTX/VAD flags, internal sample rate, and frame duration, and how an active 60 ms MLow frame is laid out as three chained 20 ms internal subframes.

**Normative**

An MLow RTP payload begins with a single TOC byte `b`, followed by the
range-coded body. The TOC MUST be parsed before anything else; it selects the
decode path and supplies the output length even when no body is decoded.

**Routing bit.** A decoder MUST inspect the top two bits first:

    (b & 0xC0) == 0xC0   →  standard Opus/CELT TOC (decode with stock Opus)
    (b & 0xC0) != 0xC0   →  smpl MLow TOC (decode with the MLow path)

When `(b & 0xC0) == 0xC0`, the remaining bits MUST be interpreted as a standard
Opus TOC per RFC 6716 §3.1; the frame is NOT an MLow frame. The MLow internal
sample rate in this case is fixed at 16 kHz, and the frame duration is taken from
the Opus config field `b >> 5` / `b >> 3` (see findings).

**smpl TOC bit layout.** When `(b & 0xC0) != 0xC0`, the byte MUST be decoded with
this layout (bit 0 = LSB):

    bit 7  SID        comfort-noise / DTX (silence-insertion descriptor)
    bit 6  VAD        voice-activity flag
    bit 5  rate       internal sample rate: 0 → 16000 Hz, 1 → 32000 Hz
    bits 4:3  size    frame-duration index into {10, 20, 60, 120} ms
    bit 2  flag2      low-rate / config flag (selects the active-frame config)
    bit 1  enable     voiced-enable bit
    bit 0  flag0      reserved flag

The decoder MUST compute the derived fields as:

    sample_rate = (b & 0x20) ? 32000 : 16000
    frame_ms    = {10, 20, 60, 120}[(b >> 3) & 3]
    sid         = (b >> 7) & 1
    vad         = (b >> 6) & 1
    voiced      = vad AND ((b >> 1) & 1)
    active      = vad OR  ((b >> 1) & 1)

**Output length.** The number of PCM samples a frame yields MUST be
`sample_rate / 1000 * frame_ms` for an MLow frame, and `16000 / 1000 * frame_ms`
for a standard-Opus-routed frame.

**Inactive frames.** If `sid` is set, or `active` is false, the frame carries no
excitation: the decoder MUST emit `output_length` samples of silence (or
comfort noise) and MUST NOT attempt to decode an active body. A standard-Opus
TOC MUST likewise be routed away from the MLow active-frame decoder.

**Active-frame layout.** An active MLow frame (typically 60 ms) MUST be decoded
as three chained 20 ms internal frames over a single range-coded body that begins
at byte offset 1 (the byte after the TOC). For each of the three internal frames,
the body MUST be read in order: LSF/LPC indices, excitation pulses, then either
the pitch/LTP block (when the frame is voiced, i.e. LSF stage-1 index == 1) or the
unvoiced gains block. Each internal frame is further divided into 4 subframes;
the voiced pitch block carries one lag per 40-sample block (8 per internal frame,
24 per packet). The `flag2` bit (`(b >> 2) & 1`) selects the active-frame config
(0 or 1) used uniformly across all three internal frames. Cross-frame predictor
and synthesis history MUST persist across packets because the stream is
continuous; a decoder MUST reset this state only at a stream discontinuity.

**Findings**

The routing test `(b & 0xC0) == 0xC0` is what distinguishes an MLow frame from a
standard Opus/CELT packet that has been multiplexed onto the same payload type.

For the standard-Opus-routed case the frame duration is recovered from the Opus
config `config = b >> 3` (RFC 6716 Table 2): configs < 12 are SILK at
{10, 20, 40, 60} ms, configs 12–15 are Hybrid at {10, 20} ms, and configs ≥ 16
are CELT at {2.5, 5, 10, 20} ms (2.5 ms is rounded up to 3 ms, as the MLow path
only needs an output length for these frames).

In captured traffic the internal rate bit is 0 (16 kHz) and `flag2` (low-rate) is
0. The active-frame body for a 60 ms frame produces 3 × 320 = 960 samples at
16 kHz before the per-packet harmonic post-filter, which is then resized to the
TOC-derived output length if they differ. A range-coder desync after the
active-frame decode indicates a TOC/body mismatch.

**Requires:** [`mlow`](#mlow), [`mlow-rangecoder`](#mlow-rangecoder), [`opus`](#opus)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | partial | TOC parse + routing present; active-frame orchestration in progress |

**Open questions**

- Semantics of flag0 (bit 0) — present in the TOC but not consumed by the decode path.
- Whether the 32 kHz internal rate (bit 5 = 1) and the 10/20/120 ms frame sizes occur in live calls, or are reserved; only 16 kHz / 60 ms active frames are seen in capture.
- Exact role of flag2 beyond selecting config 0 vs 1 for the active-frame decode.

**References**

- [RFC 6716 — Opus (TOC, §3.1, Table 2)](https://www.rfc-editor.org/rfc/rfc6716#section-3.1)

[lookup page →](./encodings/mlow-frame.md) · [↑ contents](#contents)

---

<a id="mlow-rangecoder"></a>

### MLow range coder

**`mlow-rangecoder`** · status: review · features: audio · since: 0.1.0

The Opus/CELT range entropy coder (RFC 6716 §4.1) that MLow reuses verbatim to pack a frame: range-coded symbols are read from the front of the payload and raw uniform bits from the back, sharing a single byte buffer. This part specifies the coder state, the constants, the symbol/raw-bit primitives, and the encoder flush that merges the two streams.

**Normative**

An MLow payload is a single byte buffer that carries two interleaved bit
streams produced by one Opus/CELT range coder: **range-coded symbols** packed
from the **front** (low offsets, ascending) and **raw uniform bits** packed
from the **back** (high offsets, descending). A decoder MUST consume both
streams from the same buffer with the algorithms below; the streams meet
somewhere in the middle and the two cursors never overlap in a well-formed
payload.

## Constants

All arithmetic is on unsigned 32-bit integers with modular (wrapping)
semantics wherever noted. The coder uses these fixed constants:

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

## Decoder

### Initialisation

A decoder MUST initialise its state as follows (RFC 6716 `ec_dec_init`):

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

### Normalisation

After every symbol the decoder MUST renormalise so that `rng > EC_CODE_BOT`:

```
while rng <= EC_CODE_BOT:
    nbits_total += EC_SYM_BITS
    rng <<= EC_SYM_BITS
    sym0 = rem
    rem  = read_byte()
    sym  = (sym0 << EC_SYM_BITS | rem) >> (EC_SYM_BITS - EC_CODE_EXTRA)
    val  = ((val << EC_SYM_BITS) + (EC_SYM_MAX & ~sym)) & (EC_CODE_TOP - 1)
```

All `val` updates here MUST use wrapping 32-bit arithmetic.

### Decoding a symbol

Decoding a symbol against a frequency table of total `ft` is two steps: read
the cumulative frequency, locate the symbol externally, then advance.

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

### CDF table decode

A symbol against a **u16 cumulative CDF table** `cdf` (length `n >= 2`) MUST be
decoded as follows. A non-zero base `cdf[0]` is subtracted from every entry, so
the effective total is `cdf[n-1] - cdf[0]`:

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

### Inverse-CDF table decode

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

### Binary / logp decode

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

### Uniform integer decode

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

### 64-symbol fine-lag decode

The MLow excitation parser reads a 64-value uniform fine-lag symbol
(`decode_64_fine_sym`) as:

```
ext = rng >> 6
if ext == 0:  err = 1; ext = 1; return 0
s = val / ext
sym = clamp(63 - s, 0, 64)
update(sym, sym + 1, 64)
return sym
```

### Raw bits from the back

Raw bits are pulled from the **back** of the buffer, LSB-first, through a
32-bit window. `bits_n(n)` MUST:

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

### Error state and tell

Any operation that detects a degenerate or exhausted input (zero `ft`, zero
`ext`, empty/invalid table) MUST set the sticky error flag `err = 1`. A
consumer SHOULD treat a set `err` as a hard decode failure rather than using
the synthesised values. `ec_tell` MUST be `nbits_total - ilog(rng)`.

## Encoder

The encoder is the exact inverse and produces a byte-identical buffer. It MUST
initialise with `rng = EC_CODE_TOP`, `val = 0`, `rem = -1`, `offs = 0`,
`end_offs = 0`, `nbits_total = EC_CODE_BITS + 1`, and an output buffer of fixed
`size` bytes.

### Renormalisation and carry

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

### Encoding primitives

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

### Flush

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

**Findings**

The coder is the standard Opus/CELT range coder of RFC 6716 §4.1 (libopus
`celt/entdec.c` / `celt/entenc.c`), used unchanged. Encoder and decoder are
exact inverses: encoding a script of mixed `icdf`, raw back-bits, `bit_logp`,
and `uint` operations and then decoding the result reproduces the original
values, and the encoded bytes are reproducible byte-for-byte from the same
script.

MLow exercises a specific subset of the primitives: the u16 cumulative-CDF
symbol coder (`decode_cdf`/`encode_cdf`), the uniform `nbits`-bit raw symbol,
and the 64-symbol fine-lag read used by the excitation/pitch-lag parser. The
generic `decode_uint`, `decode_icdf`, and `bit_logp` paths are part of the same
coder and remain available, but several are not on MLow's own decode path.

The split-stream layout is the key wire detail: range-coded symbols grow from
the front of the buffer and raw uniform bits grow from the back, both managed by
one coder, and `done()` is what stitches them together with zero padding in the
middle.

**Requires:** [`mlow`](#mlow)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working | full ec_dec + ec_enc port; round-trip vectors pass |
| [`meowmeow`](../flavors.md) | working | Go reference (voip/media/rangecoder.go) the Rust port matches bit-for-bit |
| [`meowcaller`](../flavors.md) | partial | encodings codec modules are partial |

**Open questions**

- Which exact subset of primitives the MLow frame parser invokes, and in what order, is defined by the frame/excitation parts rather than the coder itself.

**References**

- [RFC 6716 — Definition of the Opus Audio Codec, §4.1 (Range Decoder)](https://www.rfc-editor.org/rfc/rfc6716#section-4.1)
- [libopus — celt/entdec.c / celt/entenc.c](https://github.com/xiph/opus/blob/main/celt/entdec.c)

[lookup page →](./encodings/mlow-rangecoder.md) · [↑ contents](#contents)

---

<a id="opus"></a>

### Opus codec

**`opus`** · status: draft · features: audio · since: 0.1.0

When standard Opus (rather than MLow) carries call audio, how an Opus payload is distinguished from an MLow payload on the same RTP stream by its first byte, and how a receiver routes each frame to the correct decoder.

**Normative**

Call audio is carried as one of two interchangeable codecs on the same RTP audio
stream: WhatsApp's MLow speech codec (see [mlow](#mlow)) and standard Opus
(RFC 6716). MLow is the default for 1:1 calls; standard Opus frames MAY appear on
the same stream, and a receiver MUST be able to decode both.

**Per-frame codec selection.** The codec of each payload is determined by the
first payload byte, NOT by a per-call negotiation. A receiver MUST inspect the top
two bits of the first byte:

    (firstByte & 0xC0) == 0xC0   →  standard Opus / CELT TOC  (RFC 6716 §3.1)
    (firstByte & 0xC0) != 0xC0   →  MLow "smpl" TOC           (see [mlow](#mlow))

When the top two bits are both set the payload is a standard Opus packet and MUST
be decoded with an RFC 6716 Opus decoder. Otherwise the payload is an MLow frame
and MUST be routed to the MLow decoder. A receiver MUST perform this routing on
every frame; the two codecs may be interleaved within one stream.

**Standard Opus frame parameters.** For a standard Opus packet the frame duration
MUST be read from the TOC configuration field `config = firstByte >> 3` per
RFC 6716 Table 2. The decoded output sample rate for call audio is 16 kHz; the
decoded length in samples is `16 * frameMs` (16 samples per millisecond).

    config <  12   →  SILK NB/MB/WB,  frameMs ∈ {10, 20, 40, 60} = [config & 3]
    config == 12,13,14,15 → Hybrid,    frameMs ∈ {10, 20}        = [(config-12) & 1]
    config >= 16   →  CELT,            frameMs ∈ {2.5, 5, 10, 20} = [config & 3]

**Carriage.** Opus and MLow payloads share the same SRTP-protected RTP audio
stream and the same SSRC; codec selection adds no RTP header, payload-type split,
or signalling field. The first payload byte is the only discriminator.

**Findings**

In the receive path the inbound router branches on the first payload
byte: frames whose top two bits are `0b11` are handed to a stock RFC 6716 Opus
decoder, and all other frames are handed to the MLow decoder. The same predicate
is also applied inside the MLow TOC parser, which marks a frame `std_opus` when
`(b & 0xC0) == 0xC0` and otherwise decodes the byte as an MLow "smpl" TOC. This
makes the two codecs co-exist on one continuous stream with the MLow path as the
default carrier and standard Opus as the alternate.

**Requires:** [`mlow`](#mlow), [`call-offer`](#call-offer)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | partial | MLow path complete; standard-Opus frames are routed out to a stock RFC 6716 decoder rather than decoded in-codec |
| [`meowcaller`](../flavors.md) | partial | codec modules partial; first-byte routing present, Opus decode delegated to a stock libopus binding |

**Open questions**

- Conditions under which a sender emits standard-Opus frames instead of MLow on a live 1:1 call (e.g. interop, fallback, or capability gating) are unspecified.
- Whether group calls or any specific transport mode default to standard Opus rather than MLow is unspecified.
- Whether standard-Opus payloads use a wider band (full 48 kHz Opus) than the 16 kHz call-audio output, or are always decoded down to 16 kHz, is unspecified.

**References**

- [RFC 6716 — Definition of the Opus Audio Codec](https://www.rfc-editor.org/rfc/rfc6716)

[lookup page →](./encodings/opus.md) · [↑ contents](#contents)

---

<a id="video"></a>

### Video codec

**`video`** · status: draft · features: video, screen-share · since: 0.1.0

The video codec and packetization used for video calls and screen sharing.

**Normative**

TODO. Video tracks are carried as H.264 (and the engine contains an H.26x
passthrough/packetizer path). The exact profile negotiation, packetization mode,
and how a screen-content track is distinguished are not yet specified.

**Findings**

The WhatsApp Web engine contains H.264 NAL handling and an
`wa_h26x_passthrough` / `h26x_packetizer` path, plus screen-content and luma
histogram detectors.

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | unknown |  |

**Open questions**

- H.264 profile/level negotiation and packetization mode.
- Whether other video codecs are supported.

[lookup page →](./encodings/video.md) · [↑ contents](#contents)

---

<a id="video-packetization"></a>

### Video packetization

**`video-packetization`** · status: draft · features: video, screen-share · since: 0.1.0

How an H.264 video track is signalled, keyed, and carried over the call's RTP transport: the video capability advertisement, the RTP payload that distinguishes video from audio, and the NAL-unit packetization that maps an encoded H.264 access unit onto RTP payloads. The H.264 NAL framing rules themselves are not yet fully specified and are recorded as open questions.

**Normative**

**Signalling a video track.** A call is a video call when its `<offer>` carries a
`<video>` child element alongside the `<audio>` advertisements (see
[call-offer](#call-offer)). A receiver MUST treat the presence of `<video>` as the
signal that the caller intends to send (and is willing to receive) a video track;
its absence means an audio-only call. For group calls the same intent is carried as
the `media="video"` attribute on the `<offer_notice>` element. A client that does
not support video MUST still parse the offer and MAY accept it as audio-only.

    <offer call-id=… call-creator=…>
      <audio enc="opus" rate="16000"/>
      <video/>                         <!-- present iff this is a video call -->
      …
    </offer>

**Carriage.** The video track MUST be carried over the same per-call media
transport as audio: an RTP stream multiplexed onto the relay DataChannel,
protected end-to-end with the call's SRTP keys (see
[srtp-master-key](#srtp-master-key)) and, on the relay leg, hop-by-hop SRTP (see
[srtp-hop-by-hop](#srtp-hop-by-hop)). The video track MUST use a distinct SSRC from
the audio track (see [ssrc](#ssrc)) and a distinct RTP payload type, so a receiver
can demultiplex audio and video by payload type / SSRC. Audio uses RTP payload
type 120 (and 121); a video payload type MUST NOT collide with those.

**Packetization (general rules that any conforming implementation MUST follow).**
An encoded H.264 access unit MUST be split into one or more NAL units and mapped
onto RTP payloads following RFC 6184:

- A NAL unit that fits within the path MTU (after the RTP header and the SRTP auth
  tag are accounted for) MUST be sent as a single-NAL-unit RTP payload (the NAL
  unit placed directly in the RTP payload, its first byte being the NAL header).
- A NAL unit too large to fit MUST be fragmented across consecutive RTP packets
  using FU-A fragmentation units; the start, middle, and end fragments MUST set the
  FU header start/end bits accordingly, and all fragments of one NAL unit MUST
  share the same RTP timestamp.
- All RTP packets that belong to one access unit (one captured frame) MUST share
  the same RTP timestamp, and the last RTP packet of an access unit MUST set the
  RTP marker bit.
- The 90 kHz RTP clock SHOULD be used for the video timestamp.

The exact negotiated H.264 profile/level, the packetization mode, the concrete
video payload-type value, and whether aggregation packets (STAP-A) are used are not
established by this revision; an implementation MUST NOT assume a fixed value for
these until they are pinned (see open_questions).

**Findings**

The signalling surface for video is observable and stable: an inbound `<offer>` is
classified as a video call when it contains a `<video>` child, and a group
`<offer_notice>` carries `media="video"`. These map to the `is_video` flag the
client exposes on the parsed call action. The media transport, SRTP/SRTCP keying,
SSRC derivation, and RTP framing are shared with the audio path; a video track is an
additional RTP stream on the same DataChannel rather than a separate connection. The
video path uses H.264 NAL handling with a passthrough / packetizer stage (plus
screen-content and luma histogram detectors used to bias encoding for screen
sharing), which produces the RFC 6184-style single-NAL/FU-A behaviour described
above. The specifics of that packetizer — payload type, profile negotiation,
packetization mode — are not yet specified.

**Requires:** [`call-offer`](#call-offer), [`video`](#video), [`ssrc`](#ssrc), [`rtp-framing`](#rtp-framing), [`srtp-master-key`](#srtp-master-key), [`srtp-hop-by-hop`](#srtp-hop-by-hop)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | unknown | Audio media path is implemented; the H.264 video packetizer is not yet present. |
| [`meowmeow`](../flavors.md) | unknown | Covers the audio codec/keying; video packetization not yet addressed. |
| [`meowcaller`](../flavors.md) | planned | Encodings modules are partial; video packetization is a planned module. |

**Open questions**

- The concrete RTP payload type assigned to the H.264 video track.
- H.264 profile/level negotiation and the RFC 6184 packetization mode in use (mode 0/1, single-NAL vs FU-A vs STAP-A aggregation).
- Whether the video RTP clock is the standard 90 kHz and how the WhatsApp 0xdebe RTP header extension applies (or does not) to video packets.
- How a screen-share track is distinguished on the wire from a camera video track (separate SSRC, separate payload type, or signalling attribute).
- Whether any video codec other than H.264 is negotiated, and how keyframe/SPS/PPS delivery and resends are handled.

**References**

- [RFC 6184 — RTP Payload Format for H.264 Video](https://www.rfc-editor.org/rfc/rfc6184)
- [RFC 3550 — RTP: A Transport Protocol for Real-Time Applications](https://www.rfc-editor.org/rfc/rfc3550)

[lookup page →](./encodings/video-packetization.md) · [↑ contents](#contents)

---

<a id="mlow-lsf-lpc"></a>

### MLow LSF and LPC

**`mlow-lsf-lpc`** · status: review · features: audio · since: 0.1.0

How an MLow internal frame's spectral envelope is carried: the range-coded line-spectral-frequency (LSF) indices on the wire, their reconstruction into a quantized NLSF vector, the per-subframe interpolation to LPC coefficients, and the encoder-side LSF vector quantization that selects those indices.

**Normative**

Each MLow internal frame carries its short-term spectral envelope as a set of
range-coded LSF indices. The decoder MUST read them from the range coder (see
[mlow-rangecoder](#mlow-rangecoder)) in the following fixed order, then reconstruct
a quantized normalized-LSF (NLSF) vector of order 16 and interpolate it to LPC
coefficients for synthesis.

The LSF coding is MLow-specific and is NOT stock SILK codebook coding. The order
is **16**. All symbols below are read with the cumulative-CDF primitive
(`decode_cdf`, u16 cumulative tables), not the ICDF path.

**Wire read order (per internal frame).**

    1. stage-1 selector   ; 1 symbol, CDF = lsf_sel[sel]
    2. stage-1 grid        ; 1 symbol, CDF chosen by (match, stage1)
    3. stage-2 residuals   ; 16 symbols, coeff k from g_lsf[stage1][config][grid][k]
    4. extra               ; 1 symbol, 3-symbol static CDF lsf_extra

**Stage-1 selector.** The selector row index `sel` MUST be chosen as:

    sel = 0                       if intf == 0   (first internal frame)
    sel = 2                       if prev_stage1 != 0
    sel = 1                       otherwise

where `intf` is the internal-frame index (0,1,2) within the 60 ms packet and
`prev_stage1` is the stage-1 value decoded for the previous internal frame.
The decoded value is `stage1`.

**Match / predictor reset.** A predictor-continuity flag MUST be computed as:

    match = (intf != 0) AND (stage1 == prev_stage1)

When `match` is false, the cross-frame pitch/LTP predictor state (gain index,
filter index, lag, fractional lag) MUST be reset to -1 before decoding the rest of
the frame. `prev_stage1` MUST then be updated to the current `stage1`.

**Stage-1 grid.** The grid symbol MUST be decoded with the CDF selected as:

    match  && stage1 != 0   -> lsf_grid.match1
    match  && stage1 == 0   -> lsf_grid.match1_alt
    !match && stage1 != 0   -> lsf_grid.match0_alt
    !match && stage1 == 0   -> lsf_grid.match0

**Stage-2 residuals.** Exactly 16 stage-2 symbols MUST be decoded, coefficient `k`
using its own CDF `lsf_stage2[stage1][config][grid][k]`, where `config` is the
MLow config (0/1). For each coefficient the raw-symbol count `nraw` is
`len(CDF) - 2`.

**Extra read.** One final `extra` symbol MUST be decoded from the 3-symbol static
CDF `lsf_extra`. It always fires on the standard decode path (num_subfr >= 2).

**NLSF reconstruction.** The decoded `(stage1, grid, stage2[16])` plus the previous
internal frame's reconstructed NLSF MUST be mapped to a quantized NLSF vector
`qlsf[0..16]` (radians, range 0..PI). The wire `grid` is the stage-1 codebook
index; the value 16 denotes the conditional ("cond") centroid derived from the
previous frame. Reconstruction is `qlsf = 2*cbhalf[grid] + we^T * qlvls(stage2)`,
i.e. twice the selected stage-1 half-centroid plus the weighted stage-2
quantization levels, with conditional prediction from the previous NLSF when the
cond centroid is selected.

**LSF -> LPC interpolation.** For each of the 4 subframes the decoder MUST form an
interpolated NLSF between the previous frame's NLSF (`prev`) and the current
`qlsf`, using the weights for interpolation row 0:

    w = [0.55, 0.88, 1.0, 1.0]   (per subframe j)
    ilsf[k] = (1-w[j]) * prev[k] + w[j] * qlsf[k]   ; ilsf = qlsf when w == 1.0

On a reset (no valid previous NLSF) `prev` MUST be initialized from the current
`qlsf`. Each interpolated NLSF MUST be converted to monic LPC coefficients
`A[0..16]` (`A[0] = 1`) via the NLSF->A transform, and each subframe's `A` MUST be
bandwidth-expanded until it forms a stable all-pole filter (chirp factor
`1 - iter*0.001` per iteration; stability bound `|reflection| <= 0.9995`).

**Encoder side (LSF quantization).** An encoder MUST select the wire indices so the
decoder reconstructs the same `qlsf` it synthesizes with. From the analysis LPC the
encoder computes the analysis NLSF (forward A->NLSF), then runs the LSF vector
quantizer:

  - RD weights at each LSF are the inverse spectral-envelope magnitude
    `1/sqrt(|A(e^jw)|^2 * scale)`, `scale = 1/min`.
  - A Mahalanobis shortlist (`VQ_temp`) over the stage-1 centroids (plus the cond
    centroid for conditional coding) selects `surv` survivors.
  - For each survivor, stage-2 residuals are computed as
    `qerr = wie^T*(lsf - 2*cbhalf[qi1]) / qstep`, rounded and per-coefficient
    clamped to `[min_qi, max_qi]`, then an RD beam refines one coefficient at a
    time minimizing `0.5*order*log2(werr)*RDw_adj + bits`.
  - Reconstructed LSFs MUST be spaced so consecutive distances exceed the
    per-coefficient `min_dist` table before the RD metric is evaluated.

The chosen `qi[0]` is the wire `grid` (the stage-1 index, or 16 for the cond
centroid) and `qi[1..16]` are the 16 stage-2 indices.

**Findings**

The decode read order, selector/grid/stage-2/extra structure, and the
prev_stage1-driven CDF selection together define the LSF wire format. The stage-2,
selector and grid CDFs are runtime-built (not static rodata) and are carried as a
table blob alongside the decoder; the stage-2 CDF is indexed
[stage1][config][grid][coeff].

The NLSF reconstruction maps the wire `(grid, stage2)` directly onto the
quantizer's `(qi[0], qi[1..16])`, with grid value 16 denoting the conditional
centroid; the decoder rebuilds the same envelope the encoder synthesizes with, so
no separate synthesis-time NLSF stabilization step is required.

The forward A->NLSF is the fixed-point silk_A2NLSF transform (Q16 coefficients ->
Q15 NLSF, scaled to radians). The full analysis front end (FFT autocorrelation ->
reflection coefficients -> A -> bandwidth expansion by 0.9999^i) yields `A` to a
tight float tolerance (FFT-internal rounding only); the LSF quantizer index
selection and reconstructed `qlsf` are exact.

**Requires:** [`mlow`](#mlow), [`mlow-rangecoder`](#mlow-rangecoder), [`mlow-frame`](#mlow-frame)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | partial | LSF decode/reconstruction KAT-verified; encoder-side LSF VQ not in scope |

**Open questions**

- The selector/grid/stage-2 CDF tables and the stage-1/stage-2 codebooks (cbhalf, we, wie, qstep, min_qi/max_qi, min_dist, means, reg_cond) are carried as opaque table blobs; their generating procedure inside the codec is not specified here.
- Whether interpolation rows other than row 0 ([0.55,0.88,1.0,1.0]) are ever signalled/used on the decode path, or only chosen encoder-side.

**References**

- [RFC 6716 — Opus (SILK NLSF/LSF background)](https://www.rfc-editor.org/rfc/rfc6716)

[lookup page →](./encodings/mlow-lsf-lpc.md) · [↑ contents](#contents)

---

<a id="mlow-encoder"></a>

### MLow encode pipeline

**`mlow-encoder`** · status: draft · features: audio · since: 0.1.0

The MLow encode path that turns one 60 ms PCM frame into a wire MLow frame: the LPC front-end analysis, the bit-exact LSF vector quantization, the voiced/unvoiced classification, the CELP excitation encode (unvoiced gains block vs. voiced LTP/pitch block), the per-subframe rate control of pulse budget and gains, and DTX/inactivity handling. The entropy serialization of the resulting parameters is the inverse of the decoder read order.

**Normative**

An MLow encoder MUST consume exactly **960 samples** (60 ms at 16 kHz, one PCM
frame, nominally f32 in `[-1, 1]`) per call and MUST emit one MLow frame
consisting of a single TOC byte followed by the range-coded body (see
[mlow-frame](#mlow-frame) and [mlow-rangecoder](#mlow-rangecoder)). The active
config-0 frame carries TOC byte `0x50`.

The encoder MUST process the packet as **three chained 20 ms internal frames**
(320 samples each), each further divided into **4 subframes** of 80 samples.
Cross-frame analysis history (LPC window history, high-pass filter state, CELP
excitation state, perceptual-model state, pitch-estimator predictor state, and
the LSF predictor) MUST persist across packets, because the stream is
continuous; an encoder MUST clear this state only at a stream discontinuity.

**Input sanitization.** Before analysis the encoder MUST replace any non-finite
(NaN) input sample with 0 and clamp every sample to `[-1, 1]`. The LPC analysis
degenerates on non-finite input.

**Stage order (per packet).** The encoder MUST run, in order:

    1. SILK VAD over the int16-scaled input PCM (before the encoder high-pass),
       yielding a per-internal-frame speech-activity probability and the
       packet-level coded-as-active-voice flag (see [mlow-vad](#mlow-vad)).
    2. Encoder input high-pass: a 2nd-order ARMA filter with a 35 Hz 3 dB
       corner, applied to the whole packet, carrying filter state across packets.
    3. For each of the 3 internal frames: LPC front-end analysis, LSF quant,
       voicing classification, excitation (CELP) encode, rate control, then
       entropy serialization of that internal frame's parameters.

**LPC front-end analysis.** For each internal frame the encoder MUST window the
high-pass-domain LPC buffer (the buffer starting 96 samples before the internal
frame, 448 samples long, carrying up to 144 samples of previous-packet history),
FFT-autocorrelate it, derive the bandwidth-expanded order-16 LPC coefficients
`A` (`A[0] = 1`), and convert `A` to its analysis NLSF (forward A->NLSF, radians
0..PI). A long analysis window MUST be used for internal frames 0 and 1 and a
short window for the last internal frame.

**LSF quantization.** The encoder MUST run the bit-exact LSF vector quantizer on
the analysis NLSF and select the wire `(grid, stage2[16])` indices so the decoder
reconstructs the same quantized NLSF the encoder synthesizes with (see
[mlow-lsf-lpc](#mlow-lsf-lpc)). Conditional ("cond") coding against the previous
internal frame's committed NLSF MUST be used when `intf > 0` AND the previous
internal frame's voiced flag equals the current frame's voiced flag; otherwise the
unconditional quantizer MUST be used. The quantizer MUST be driven with: RD
weights = inverse spectral-envelope magnitude, `RDw_adj = sqrt(mainBitRate/14000)`
(= 1.1952286 at 20 kbps), and `surv = 6` survivors (complexity 8). The chosen
`qi[0]` is the wire `grid` (the stage-1 index, or 16 for the cond centroid) and
`qi[1..16]` are the 16 stage-2 indices. The encoder MUST then reconstruct the
committed NLSF from the chosen indices (the value the decoder rebuilds) and carry
it as the previous-NLSF input for the next internal frame.

**Per-subframe LPC interpolation.** For each subframe the encoder MUST interpolate
between the previous frame's committed NLSF and this frame's committed NLSF, convert
the result to monic LPC coefficients, and compute the LPC residual under those
coefficients. The encoder MUST evaluate interpolation index 0 and the alternative
index 1, and MUST select index 1 only when it lowers the summed per-subframe
residual RMS below `0.998 ×` the index-0 RMS. The chosen `lsf_interpol_idx` MUST be
written as the unvoiced LSF `extra` symbol so the decoder interpolates with the
same index. (On the voiced path the LSF `extra` symbol is 0.)

**Voicing classification.** Per internal frame the encoder MUST run the
perceptually-weighted pitch estimator (over the persistent perceptually-weighted
speech buffer) and the signal-mode classifier (see [mlow-vad](#mlow-vad)). The
classifier MUST fold five strengths into a single `voicing_strength`:

    voicing_strength = ( w0*corr + w1*vad + w2*tilt + w3*harm + w4*lag )
                       / sum(w) + bias   (+ hysteresis term)
    w    = [1.0, 0.5, 0.5, 0.7, 0.3]
    bias = -0.1038
    corr = inv_sigmoid(0.1 + 0.75 * clamp(pitchcorr, 0, 1))
    vad  = 0.04 * (1 - 1.04 / (sp_act_prob + 0.04))
    tilt = t^3   where t is the background-subtracted low/high spectral-tilt ratio
    lag  = -sigmoid(0.25 * (38 - avg_lag))
    harm = the spectral harmonicity (peak/valley energy ratio) at avg_lag

A per-stream hysteresis term (`+= voicing_prev * 0.05`) MUST be added, and
`voicing_prev`, the low/high background-tilt energies, and the previous last-lag
MUST be updated each internal frame. The spectral-tilt background energies MUST be
smoothed toward the current low/high band energies only when the VAD strength is
below `-0.1`. An internal frame MUST be encoded **voiced** (LSF stage-1 index = 1,
pitch/LTP block) when `voicing_strength > 0` AND the packet is coded-as-active-
voice; otherwise it MUST be encoded **unvoiced** (stage-1 index = 0, gains block).

**Unvoiced excitation (gains block).** For an unvoiced internal frame the encoder
MUST run the CELP excitation encoder per subframe, mapping each CELP pulse to a
per-position pulse train (`sign = 1 + 2*(v>>15)`, `pos = v*sign - 1`,
`pulse[pos] += sign`). The wire gains block IS the quantized-residual-energy
(`nrg_res`) layout: `gain_main` = the frame-level nrgres index, `gain_delta` = the
shape index, both from the bit-exact `quant_nrg_res` over the per-subframe residual
energy (`sum(res^2)/80`, normalized domain). The per-subframe `nrg_res` symbol MUST
be written only for subframes that carry pulses, and MUST be the CELP FCB gain index
for that subframe; subframes with no pulses MUST be marked `-1` (not written).

**Voiced excitation (pitch/LTP block).** For a voiced internal frame the encoder
MUST derive the per-40-sample-block pitch lags from the estimator contour
(`blockseg_idx` + 8 `laginds`), with the decoder mapping `lag = laginds*0.5 + 32`
clamped to <= 320, and MUST build the CELP adaptive-codebook (ACB/LTP) basis from
those decoder-reconstructed lags so encoder and decoder LTP contributions agree.
The voiced CELP outputs MUST drive the wire pitch block: `acb_idx` (clamped to
`[0, 15]`) -> the wire LTP gain index `gain_idx`, `gain_idx` (FCB gain) -> the wire
`filt_idx` (written only where pulses exist, else `-1`), and the MAIN-rate pulses ->
the pulse train. The wire lag contour MUST be written as `blockseg_idx` plus the
per-block `laginds`, with the delta-lag prediction `mode` selected from the mean ACB
gain:

    mode = 0   if avg_gain < 10007
    mode = 1   if avg_gain < 14085
    mode = 2   otherwise

where `avg_gain = sum_over_subframes(w0 + 2*w2) / 4` from the per-subframe LTP gain
weights. The cross-packet lag predictor (`prev_lagblk`/`prev_lagidx`) MUST be
advanced from the committed contour. The lag-block predictor MUST be reset after the
last internal frame of each packet and after any unvoiced internal frame, so
conditional lag coding restarts per packet.

**Rate control.** Per subframe the encoder MUST drive a bitrate controller to obtain
a maximum pulse count (`max_pulses`) and an importance weight, using the assumed main
bitrate (20000 bps for the active 1:1 config), complexity 8, 60 ms payload, 16 kHz,
the subframe's weighted target energy, the classifier `voicing_strength`, and the VAD
inputs. The FCB pulse survivors MUST be distributed across pulse counts from the
20 ms survivor budget (`tot_surv = 1000 * 100 * 80 / (20*16000)`). The unvoiced
per-subframe gain MUST be selected so its linear reconstructed gain is closest to the
target residual level over the same `(gain_main, gain_delta)` codebook the decoder
uses.

**DTX / inactive frames.** When a frame is inactive (VAD/coded-as-active-voice
false) or carries no excitation, the encoder MUST signal it via the TOC SID/VAD/
enable bits (see [mlow-frame](#mlow-frame)) so the decoder emits silence or comfort
noise and decodes no active body. A silent internal frame (autocorrelation lag-0
energy <= 0) MUST still advance the CELP excitation state with zeros so cross-frame
state stays in sync; it is encoded as unvoiced with the lowest-energy gains block and
no pulses.

**Entropy serialization.** The encoder MUST serialize each internal frame, in order,
as: LSF block, pulses block, then EITHER the pitch block (voiced) OR the gains block
(unvoiced) — never both. The range-coder symbol stream MUST be the exact inverse of
the decoder read order and use the same CDF tables in the same field order. After the
three internal frames the encoder MUST finalize the range coder, prepend the TOC byte,
and treat a range-coder buffer overflow as an encode error.

**Findings**

The encode path is the exact inverse of the decoder: given the analyzed
per-internal-frame parameters it produces the same range-coder symbol stream the
decoder consumes, against the same config-0 runtime tables in the same field order
(`p3 = 4`, `p4 = 1`). Voiced internal frames emit a pitch block and unvoiced internal
frames a gains block, never both. Decoding the encoded stream tracks the input
waveform shape, and the decoder reconstructs the encoded per-block lag contour from a
voiced pitch block.

The LPC front-end windows the high-pass-domain LPC buffer,
FFT-autocorrelates it, derives the bandwidth-expanded `A` and its NLSF, and feeds the
bit-exact LSF quantizer (with the conditional-coding path); the resulting grid/stage2
map directly onto the wire and the decoder reconstructs the same envelope. The
unvoiced level is the bit-exact `quant_nrg_res` floor (the wire gain block IS the
nrgres layout), with the per-subframe FCB gain index carried as `nrg_res`. The voiced
path runs the CELP ACB/LTP encode over the decoder-reconstructed per-block lags
so encode/decode LTP agree.

The classifier folds five strengths into a single `voicing_strength` that drives the
voiced decision. The spectral harmonicity is computed within a survivor-loop cache
keyed by a quantized harmonic bin, so harmonicity is bin-aliased to that resolution.

The encoder works in the normalized `[-1, 1]` domain for the CELP residual; the
int16-scaled domain is used only for the LPC autocorrelation lead history. The
internal-frame excitation leads the input by 32 samples (the analysis lookahead).

**Requires:** [`mlow`](#mlow), [`mlow-frame`](#mlow-frame), [`mlow-rangecoder`](#mlow-rangecoder), [`mlow-lsf-lpc`](#mlow-lsf-lpc), [`mlow-vad`](#mlow-vad), [`mlow-decoder`](#mlow-decoder)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | working | codec encode path; byte-exact with the reference full encoder on the active config-0 path |
| [`meowcaller`](../flavors.md) | partial | encode-path codec modules partial |

**Open questions**

- The assumed main bitrate (20000 bps) for the active 1:1 config is not recovered from the wire; it drives the per-subframe pulse budget and gain selection, so a different negotiated rate would change the chosen pulse counts and gains.
- The bitrate controller's per-subframe weighted target energy uses the residual energy as a proxy for the perceptually-weighted speech energy; the exact `wnrg` derivation is unspecified.
- Only the active config-0 (0x50) frame is specified; the encode path for config 1, the 32 kHz internal rate, and frame sizes other than 60 ms is not characterized.
- DTX/SID frame generation is described only at the TOC level here; the comfort-noise descriptor payload an MLow encoder emits during silence is not specified.

**References**

- [RFC 6716 — Opus (SILK LPC/LSF, LTP, pitch background)](https://www.rfc-editor.org/rfc/rfc6716)

[lookup page →](./encodings/mlow-encoder.md) · [↑ contents](#contents)

---

<a id="mlow-excitation"></a>

### MLow CELP excitation

**`mlow-excitation`** · status: draft · features: audio · since: 0.1.0

How the range-coded CELP excitation of one MLow internal (20 ms) frame is decoded: the per-subframe pulse counts and pulse positions/signs (the algebraic codebook), the quantized log-gains and energy residuals for unvoiced frames, and the pitch lag / LTP gains-and-filter for voiced frames.

**Normative**

The excitation of one MLow internal frame (320 samples at 16 kHz, split into
`p3 = 4` subframes) MUST be decoded from the range coder immediately after the
LSF/LPC parameters (see [mlow-lsf-lpc](#mlow-lsf-lpc)) and before CELP synthesis
(see [mlow-synthesis](#mlow-synthesis)). All reads use the Opus/CELT range coder
(see [mlow-rangecoder](#mlow-rangecoder)): CDF symbols are read from the front of
the buffer, raw uniform bits from the back.

The LSF stage-1 selector (`s1`) decoded with the LSF/LPC parameters selects the
excitation mode of the frame: a voiced frame (`s1 == 1`) MUST decode a
pitch/LTP block; an unvoiced frame (`s1 == 0`) MUST decode a gains block. The
two blocks are mutually exclusive within a frame.

## Pulses (algebraic codebook)

The decoder MUST first establish a frame pulse budget. Let `config` be the
band/config flag (`p6`; `0` for narrowband) and `idx = p4 + s1` where `p4` is
the regular-frame flag. A per-frame budget byte is looked up from the static
table

    SMPL_PULSE_COUNT_BYTE = [80, 160, 160, 16, 32, 32, 0, 0]   ; index = config*3 + idx

and scaled to the frame: `frame_budget = budget_byte * p2 / 320`,
`subfr_budget = frame_budget / p3`.

**Total pulse count.** For `config != 0` the total pulse count MUST be read with
a config-indexed CDF. For `config == 0` (narrowband) the total MUST be drawn
from a triangular prior over `[0, frame_budget]`: with `L = frame_budget`, the
cumulative function is

    T(k) = ( (k+2)*(L+1) - ((k-1)*(k+131070) >> 1) ) & 0xffff

The total range frequency is `ft = max(T(L), 1)`. The decoder reads a value
`val = range_decode(ft)`, then scans `k = 0,1,2,...` up to `frame_budget`,
selecting the first `k` with `T(k-1) <= val < T(k)` and finalising the symbol
over that interval. The result is the total pulse count.

**Split.** With `p3 == 4`, the total MUST be split into four per-subframe pulse
counts by two levels of binary split. The top-level split first reads a
bias-corrected CDF (when the constrained interval is non-empty) to obtain the
first-half sum, then each half is split again with the per-half split CDF
(`smpl_split`): for a half carrying `count` pulses over `granularity`
positions, `min_split = max(count - granularity, 0)`,
`lo = min(count, granularity)`; when `min_split < lo` a CDF symbol over
`lo - min_split + 2` entries is read and added to `min_split`, otherwise the
count is `min_split`. The four results are the per-subframe pulse counts
(`subfr[0..4]`).

**Positions and magnitudes.** For each subframe with `cnt > 0` pulses the
decoder MUST read run-length pulse positions over the `p2/p3` positions of that
subframe. Pulses are placed by repeatedly reading a position-delta CDF whose
length is `pos + 1` (the remaining positions). A non-zero delta (or the first
read of the subframe) starts a new pulse of magnitude 1 at the advanced
position; a zero delta on a subsequent read increments the magnitude of the
current pulse (stacked pulses at the same position).

**Signs.** After all positions are decoded, one sign bit per pulse position
MUST be read as raw uniform bits, batched at most 15 bits per read. For each
position the sign is `+1` when the bit is set and `-1` otherwise, and is applied
to that position's magnitude. The signed magnitudes are scattered into the
excitation vector at their absolute sample positions; all other positions are 0.

## Gains (unvoiced frames)

For an unvoiced frame the decoder MUST read a main log-gain (CDF, 85 entries)
and a delta log-gain (CDF, 99 entries), then reconstruct a per-subframe
quantized log-gain `gain_q[sf]`:

    base = gain_main * gain_scale[cfg] - 0x154000
    gain_q[sf] = base + (gain_cb[sf + p3*gain_delta] << 4)

where `gain_scale` and the gain codebook `gain_cb` are config-selected tables.
For each subframe that carries pulses (`cnt > 0`) the decoder MUST then read an
energy-residual symbol from a bucketed CDF (92 entries): the bucket is
`min(cnt/10, 3)` (i.e. `3` for `cnt >= 30`), and the CDF base is shifted by a
gain-derived offset `g = clamp((gain_q[sf] + 8192) >> 14, >= -85)` applied as
`-2 * min(g, 0)`. Subframes with no pulses produce no energy-residual read and
a residual of 0.

## Pitch / LTP (voiced frames)

For a voiced frame the decoder MUST decode, in order, the LTP gains-and-filters
and then the pitch lag.

**LTP gains and filters.** For each of the `p3` subframes a gain index MUST be
read from a 17-entry CDF whose row is selected by the previous subframe's gain
index (carried in decoder state). A gain-weight table is config-selected; the
running gain accumulator adds `w0 + 2*w2` from that table per subframe and the
frame average `avg_gain = gain_accum / p3` is retained for fractional-lag
selection. For each subframe that carries pulses a 35-entry filter index MUST
additionally be read: from the base CDF when no previous filter index exists
(state `== -1`), otherwise from a CDF row offset by the previous filter index.
Both the gain index and filter index update decoder state for the next frame.

**Lag.** A pitch-configuration block supplies the contour count, the lag CDF,
the contour map, the fractional-lag table and the delta CDF. The primary lag
MUST be read absolutely (CDF over `num_contours + 1`) when no previous lag
exists, otherwise as a delta: a 10-entry delta CDF selects an interval
`[lo, hi]`, and the lag is `lo + symbol` read from the lag CDF over
`hi - lo + 2` entries. The decoder then searches the contour map for the index
`i` where `contour_map[i] == lag + 1`; if no such index exists or it is out of
range the pitch block ends.

From the selected contour the decoder reads a contour base lag. Unless a
previous lag exists with `-1 <= (base_lag - prev_lag) < 3`, a 64-symbol fine
lag MUST be read and combined as `cur_lag = (base_lag << 6) + fine`, giving the
Q6 (1/64-sample) lag for the first contour segment. For each remaining contour
segment a 65-entry fractional CDF (from a segment selected by `avg_gain`:
`0` for `avg_gain < 10007`, `1` for `< 14085`, else `2`) MUST be read and
accumulated into the running Q6 lag. Each segment's Q6 lag is replicated across
the contour-defined number of 40-sample blocks to produce the per-block pitch
lags consumed by LTP synthesis (`lag = block_lag * 0.5 + SMPL_MIN_PITCH_LAG`).
The decoder state MUST retain the previous gain index, filter index, integer
lag and fractional lag for the next frame.

**Findings**

The active narrowband captures decode as voiced frames (`s1 == 1`), so the
pitch/LTP block is the live path and the gains block runs only on unvoiced
frames; synthesis uses `gain_q = 0` for voiced frames. Each block is consumed
bit-for-bit from the shared range coder, so any deviation desynchronises every
subsequent field of the frame.

Pulse magnitudes greater than 1 arise from repeated reads at the same position
(stacked pulses). Sign bits are read as raw uniform symbols from the back of the
range-coder buffer in batches of up to 15. The pitch lag is carried internally
in Q6 (1/64-sample) units; one 80-sample subframe spans two 40-sample blocks
that may carry different fractional lags.

**Requires:** [`mlow`](#mlow), [`mlow-rangecoder`](#mlow-rangecoder), [`mlow-lsf-lpc`](#mlow-lsf-lpc), [`mlow-synthesis`](#mlow-synthesis)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | partial | excitation decode KAT-verified against the Go reference; CELP synthesis wiring in progress |

**Open questions**

- Wideband (config != 0) total-pulse-count CDF table location is referenced but the active captures are all narrowband, so the WB path is not exercised by vectors.
- Exact contents and addressing of the config-selected gain-scale and gain-codebook tables beyond the heap window reproduced for the active config.
- Whether the gains block is reached on any real (unvoiced) capture frame; current vectors force-run it on voiced decoder state to validate the arithmetic.

**References**

- [RFC 6716 — Opus (range coder)](https://www.rfc-editor.org/rfc/rfc6716)

[lookup page →](./encodings/mlow-excitation.md) · [↑ contents](#contents)

---

<a id="mlow-decoder"></a>

### MLow decode pipeline

**`mlow-decoder`** · status: draft · features: audio · since: 0.1.0

The top-level MLow decode orchestration: how one RTP payload is turned into a 16 kHz PCM frame by stripping RED redundancy, routing on the TOC byte, and — for an active frame — running three chained 20 ms internal frames (LSF/LPC, pulses, pitch-or-gains, CELP synthesis) through the per-packet harmonic post-filter, while carrying the cross-frame predictor and synthesis history across packets.

**Normative**

An MLow decoder is a stateful object that consumes one RTP MLow payload per call
and produces one PCM frame of 32-bit floats in `[-1.0, 1.0]` at the TOC-derived
output length. The same decoder instance MUST be reused for the lifetime of a
continuous stream, because the cross-frame predictor (`prev_nlsf`), the CELP/LTP
synthesis history, the HP post-filter state, and the harmonic post-filter state
all persist from one packet to the next. The decoder MUST expose a reset operation
that clears all of this carried state, and a caller MUST invoke it at a stream
discontinuity (e.g. a new SSRC or a detected gap) and MUST NOT invoke it between
consecutive packets of one stream.

**Stage 0 — empty payload.** If the payload is empty, the decoder MUST emit one
full silence frame of `OPUS_FRAME_SAMPS = 960` samples (60 ms at 16 kHz) and MUST
NOT advance any decode state.

**Stage 1 — RED strip.** A decoder configured with a negotiated RED redundancy
level `n > 0` MUST first de-packetize the SplitRED container (see
[mlow-red-fec](#mlow-red-fec)). The main (current) frame is the LAST element of the
recovered frame list; the decoder MUST extract that frame's data and decode it as a
bare MLow frame (Stage 2 onward). If RED de-packetization fails, the decoder MUST
emit `OPUS_FRAME_SAMPS` (960) samples of silence and MUST NOT advance decode state.
When `n == 0` (the common case) the payload is already a bare MLow frame and is
passed directly to Stage 2.

**Stage 2 — TOC routing.** The decoder MUST parse the first byte as the smpl TOC
(see [mlow-frame](#mlow-frame)) and compute `output_length`:

    output_length = std_opus ? (16000 / 1000 * frame_ms)
                             : (sample_rate / 1000 * frame_ms)

The decoder MUST then route as follows, in this order:

    std_opus == true        →  emit output_length samples of silence
    sid == true             →  emit output_length samples of silence
    active == false         →  emit output_length samples of silence
    otherwise               →  decode the active frame (Stage 3)

A `std_opus` frame is a standard Opus/CELT packet and is not decoded by the MLow
active-frame path; an SID or inactive frame carries no excitation. In every
silence case the decoder MUST emit exactly `output_length` samples of `0.0`.

**Stage 3 — active-frame decode.** The active-frame body begins at byte offset 1
(immediately after the TOC) and is a single range-coded bitstream (see
[mlow-rangecoder](#mlow-rangecoder)) covering all three internal frames. The
decoder MUST:

  1. Read the active-frame config and low-rate flag from the TOC byte:

         config   = (b >> 2) & 1
         low_rate = ((b >> 2) & 1) != 0

     and initialise a range decoder over `frame[1..]`.

  2. For each internal frame `f` in `0, 1, 2`, read from the SAME range decoder, in
     this exact order:

       a. LSF/LPC indices (see [mlow-lsf-lpc](#mlow-lsf-lpc)). The frame is voiced
          iff the decoded LSF stage-1 index equals `1`.
       b. Excitation pulses (see [mlow-excitation](#mlow-excitation)), over
          `SMPL_INTF_LEN = 320` samples with 4 subframes.
       c. If voiced: the pitch/LTP block (see [mlow-lsf-lpc](#mlow-lsf-lpc) /
          pitch). The per-40-sample-block lags MUST be reconstructed as
          `lag = clamp(block_lag * 0.5 + 32.0, .., 320.0)` (8 lags per internal
          frame), the ACB gain indices taken per subframe, and the voiced FCB gain
          index taken from the pitch block's `filt_idx` (floored at 0).
          If unvoiced: the gains block, whose decoded `gain_q` and `nrg_res` map
          directly to the synthesis params `nrgres_dbq_q14` and `fcbg_idx`.
       d. Reconstruct the NLSF vector from the LSF stage indices, `config`, the grid
          index, the stage-2 residual, and the carried `prev_nlsf`, then update
          `prev_nlsf` with the result for the next internal frame/packet.
       e. Run CELP synthesis (see [mlow-synthesis](#mlow-synthesis)) over
          `SMPL_INTF_LEN = 320` samples, gated on `low_rate`, into a 320-sample
          signal, and append it to the packet output.

     The decoder MUST also accumulate, across the three internal frames, the full
     list of per-40-block lags (8 per frame, 24 per packet) and the sum of the
     per-frame normalized bitrate (computed from the total pulse count and 320).

  3. After all three internal frames, the decoder MUST run the per-packet harmonic
     post-filter (see [mlow-postfilter](#mlow-postfilter)) ONCE over the full
     `3 * 320 = 960` sample buffer, passing the 24 accumulated per-block lags and
     the average normalized bitrate (`accumulated_sum / 3.0`). This post-filter
     introduces the codec's `SMPL_TOT_POSTFILT_DELAY = 48` sample group delay, so
     the emitted PCM is aligned at lag 0 against the reference.

  4. Each output sample MUST be clamped to `[-1.0, 1.0]`. If `output_length` is
     nonzero and differs from the produced length, the buffer MUST be resized to
     `output_length` (truncating, or zero-padding the tail).

A range-coder error flag set after the active-frame decode indicates a TOC/body
desync; a decoder SHOULD surface this (it does not change the emitted samples).

**Findings**

The decode path is `RED strip → TOC route → 3 × (LSF → pulses → pitch|gains →
reconstruct NLSF → CELP synth) → per-packet harmonic post-filter → clamp/resize`.
The synthesis is a port of the `smpl_celpdec` decoder: excitation is built in the
codec's float domain together with generated shaped noise (`gen_noise`) and run
through LPC synthesis.

In captured 1-to-1 audio the TOC internal-rate bit is 0 (16 kHz) and the low-rate
flag (`(b >> 2) & 1`) is 0, so an active 60 ms frame yields 3 × 320 = 960 samples
before the harmonic post-filter, matching `OPUS_FRAME_SAMPS`. The end-to-end
decode of a full inbound capture aligns sample-for-sample at lag 0 with the
reference `useSmpl` (real `smpl_opus`) output, correlating > 0.95 once the
per-block voiced ACB/LTP lags, the HP post-filter, and the harmonic post-filter
(which contributes the 48-sample group delay) are all in place.

The voiced/unvoiced split is driven entirely by the LSF stage-1 index (`== 1`
means voiced), which gates whether the pitch block or the gains block follows the
pulses in the bitstream. The unvoiced gains decode reads the same bits as the C
`decode_lb_unvoiced`: the Rust `gain_q` is the C `nrgres_dbq_Q14` and the Rust
`nrg_res` is the C `fcbg_idx`.

**Requires:** [`mlow`](#mlow), [`mlow-frame`](#mlow-frame), [`mlow-rangecoder`](#mlow-rangecoder), [`mlow-red-fec`](#mlow-red-fec), [`mlow-lsf-lpc`](#mlow-lsf-lpc), [`mlow-excitation`](#mlow-excitation), [`mlow-synthesis`](#mlow-synthesis), [`mlow-postfilter`](#mlow-postfilter), [`mlow-noise`](#mlow-noise)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working | pure-Rust stateful MlowDecoder; e2e decode matches the smpl_opus useSmpl reference at lag 0 |
| [`meowmeow`](../flavors.md) | working | implements the codec/encodings stack |
| [`meowcaller`](../flavors.md) | partial | codec modules partial; full decode orchestration in progress |

**Open questions**

- Whether the 32 kHz internal rate and the 10/20/120 ms active frame sizes ever drive the active-frame decode in live calls, or only 16 kHz / 60 ms frames occur (only the latter is seen in capture).
- Comfort-noise generation for SID/inactive frames: the decoder currently emits pure silence rather than synthesizing comfort noise from the SID descriptor.
- Whether RED redundancy beyond the main (last) frame is ever used for loss concealment, or the older frames are always discarded after de-packetization.

**References**

- [RFC 6716 — Opus](https://www.rfc-editor.org/rfc/rfc6716)

[lookup page →](./encodings/mlow-decoder.md) · [↑ contents](#contents)

---

<a id="mlow-noise"></a>

### MLow comfort noise

**`mlow-noise`** · status: review · features: audio · since: 0.1.0

The MLow comfort-noise (generated-noise) stage: the per-subframe shaped residual noise the decoder adds into the LPC excitation before synthesis, with separate voiced and unvoiced shaping branches driven by a deterministic PRNG and persistent cross-subframe state.

**Normative**

The MLow decoder MUST run the comfort-noise generator once per subframe of length
`L` samples (`L <= 160`, `fs = 16 kHz`) and add its output into the LPC excitation
*before* CELP synthesis (see [mlow-synthesis](#mlow-synthesis)). The generator is
deterministic: given identical inputs and identical generator state it MUST produce
bit-identical output, so encoder and decoder remain phase-locked.

**Persistent state.** The generator MUST keep, across subframes, a state record
zero-initialised at decoder start:

    env_smth        : f32        ; running envelope smoother
    env_last        : f32        ; last subframe envelope value
    out_state_uv[2] : f32        ; ARMA1 output filter state (unvoiced)
    out_state_v[2]  : f32        ; MA2 output filter state (voiced)
    corr_smth[3]    : f32        ; smoothed autocorrelation (voiced)
    shape_state[2]  : f32        ; MA2 shaping-filter state (voiced)
    prev_voiced     : bool       ; voicing of the previous subframe
    since_unvoiced  : i32        ; subframes since the last unvoiced subframe
    rand_seed       : i32        ; PRNG seed

**PRNG.** Random pulses MUST be produced by the LCG

    seed' = 907633515 + (u32)seed * 196314165      ; computed in wrapping i32 arithmetic

Pulses are generated four at a time: each new `seed` yields four samples by
reinterpreting the seed left-shifted by 0, 8, 16, 24 bits as a signed i32 and
scaling by `8.1e-10`; a trailing tail of fewer than four samples MUST draw one fresh
`seed` per sample (no bit-rotation). The shared seed MUST advance for every pulse
buffer drawn in a subframe (this exact call count and ordering is observable in the
output seed).

**Voiced branch** (`voiced = true`). The generator MUST:

1. Compute the 3-tap autocorrelation `corrs[0..2]` of the LPC excitation `exc_lpc`,
   then bias `corrs[0] += 1e-12`.
2. Smooth it into `corr_smth` with coefficient `0.4` when `L == 160` else `0.16`:
   `corr_smth[i] += coef * (corrs[i] - corr_smth[i])`.
3. Form the target correlation `c = corr_smth * (0.35^2 * corrs[0] / corr_smth[0])`,
   then double `c[1]` and `c[2]`.
4. Map `c` through the noise DCT (a `3 x 16` cosine matrix, scale `1/sqrt(16)`,
   `omega` step `(0.5 + i) * pi / 16`) to a 16-bin spectrum `f2`, set the target
   `f2_tgt = max(f2) * 1.5 - f2`, and map back with the DCT transpose to `ctgt`.
5. Draw white pulses, reset `env_smth` to `env_last` if the previous subframe was
   unvoiced, apply the squared-signal envelope (smoothing coefficient `0.95`), then
   normalise `ctgt` by `1/(noise energy + 1e-12)`.
6. Spectrally factor `ctgt` into a 3-tap MA filter and filter the noise through it
   (`shape_state`).
7. On a voiced subframe immediately following an unvoiced one, seed an unvoiced
   cross-fade noise with a decaying `0.99` envelope; otherwise zero it when
   `since_unvoiced < 2`.

**Unvoiced branch** (`voiced = false`). The generator MUST clear `corr_smth` and
`shape_state` and zero the voiced noise, then:

- If `num_pulses > 0`: compute `nrg_ratio = energy(exc_lpc) / (nrgres + 1e-20)`,
  `hardness = 10 + 20 * normalized_bitrate`, and the softplus-limited target
  `nrg_tgt = nrgres * ln(exp(hardness * (1 - nrg_ratio)) + 1) / hardness`, then take
  the excitation envelope with smoothing coefficient `0.995`.
- Else (`num_pulses == 0`): set `nrg_ratio = 0`, `nrg_tgt = nrgres`, and take the
  decaying no-excitation envelope `env0` (coefficient `0.995`).

The generator MUST then solve for an affine envelope gain `(f, g)` such that the
generated noise hits `nrg_tgt` while matching `env_last` at the subframe boundary
(the quadratic with the `f = 0` / `g = 0` degenerate branches as specified by the
energy-matching solver), draw white pulses, and scale them by `f + g * env[i]`.
When `num_pulses > 0` the scaled value MUST be clamped to
`fcbgains_uv[fcbg_idx] * 0.5` and applied only where `exc_lpc[i] == 0`, leaving
pulse positions at zero; `env_last` MUST be updated to the clamped final gain. The
unvoiced gain table is `fcbgains_uv[ix] = 10^(0.05 * (ix - 90))`, `ix` in `0..=90`.

**Output mixing.** After the branch:

- If `prev_voiced || voiced`, the voiced noise MUST be passed through the fixed MA2
  filter `[0.25, -0.496, 0.25]` (`out_state_v`) into the output; otherwise the
  output MUST be zeroed.
- If `since_unvoiced < 2 || !voiced`, the unvoiced noise MUST be high-pass shaped by
  `add_noise_uv` (an ARMA1 whose corner frequency is derived from `lsf[0]`,
  `lsf[1]`, `nrg_ratio`, base corner `800 Hz`, clamped to `1500 Hz`, gain `0.8`) and
  added into the output; otherwise `out_state_uv` MUST be reset to `[0, 0]`.

Finally the generator MUST set `prev_voiced = voiced`, increment `since_unvoiced`
on a voiced subframe and reset it to `0` on an unvoiced subframe.

The residual energy `nrgres` consumed here MUST be decoded from the per-subframe
Q14 quantised value as
`nrgres = max(0, 10^(0.1 * q14 / 2^14) - 3.1622776e-9) * fcb_subfrlen`, and
`normalized_bitrate = sigmoid(1.4 * log2(pulses_per_20ms + 1) - 6.5)` with
`pulses_per_20ms = num_pulses * frame_length_16 / 320`.

**Findings**

The unvoiced branch is the dominant path; the voiced branch only adds a small
high-band noise floor. Without this stage the excitation is bare fixed-codebook
pulses, which sound buzzy/robotic with starved high frequencies. The float
constants are the codec's verbatim 32-bit literals, and `pi` is the exact literal
`3.1415926535897`; all arithmetic is single-precision and the accumulation order is
fixed (4-wide envelope and pulse loops) because the output is required to be
bit-exact. The `sigmoid` helper clamps its argument to `[-80, 80]`.

**Requires:** [`mlow`](#mlow), [`mlow-frame`](#mlow-frame), [`mlow-excitation`](#mlow-excitation), [`mlow-lsf-lpc`](#mlow-lsf-lpc), [`mlow-synthesis`](#mlow-synthesis), [`mlow-vad`](#mlow-vad)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | partial | encodings DSP modules are KAT-verified piecewise; full decoder orchestration in progress |

**Open questions**

- Exact bit layout and subframe schedule by which num_pulses, nrgres (Q14), fcbg_idx and the LSFs are delivered from the frame to this stage is specified in mlow-frame / mlow-excitation, not here.

**References**

- [RFC 6716 — Opus (CELT range coder reused by MLow)](https://www.rfc-editor.org/rfc/rfc6716)

[lookup page →](./encodings/mlow-noise.md) · [↑ contents](#contents)

---

<a id="mlow-postfilter"></a>

### MLow post-filters

**`mlow-postfilter`** · status: draft · features: audio · since: 0.1.0

The three decoder-side enhancement filters MLow applies after range decoding: the excitation-domain harmonic comb post-filter (run before LPC synthesis), the post-synthesis HP pitch comb, and the final per-packet harmonic post-filter that mixes lag-delayed copies of the output to sharpen pitch harmonics. None alters the bitstream; each is a deterministic DSP stage a decoder MUST reproduce to obtain bit-aligned PCM.

**Normative**

MLow applies three enhancement filters during decode. They consume no bits and
carry no wire format; they are pure post-processing of decoded signal. A decoder
MUST run them in the order and with the constants below. All math is single-precision
(`f32`) computed with fast (non-strict-IEEE) arithmetic, so a strict-IEEE decoder
reproduces the output to within the i16 output quantization step (1/32768), not
bit-for-bit.

## 1. Excitation harmonic comb post-filter

Applied per subframe to the low-band excitation BEFORE LPC synthesis; its output
is ADDED back into the excitation. The filter derives a 2nd-order pitch-resonant
filter from the excitation's own 3-lag autocorrelation (NOT the pitch lag) and
resonates envelope-shaped noise through it. Subframe length `N` is 80 or 160.

Active-subframe path:

1. Compute the 3-lag autocorrelation `auto[0..2]` of the input, then
   `auto[0] += 9.999999960041972e-13`.
2. Smooth into persistent `smoothed_c[i]` with `coef = 0.4` when `N == 160`,
   else `coef = 0.16`: `smoothed_c[i] = coef*(auto[i] - smoothed_c[i]) + smoothed_c[i]`.
3. Form `local5 = auto[0] * 0.1224999949336052 / smoothed_c[0]` and the scaled
   vector `{local5*smoothed_c[0], 2*local5*smoothed_c[1], 2*local5*smoothed_c[2]}`
   (lags 1 and 2 doubled).
4. Project the 3-vector through the fixed `G_PITCH` 3x16 decorrelation basis
   (row 0 = constant 0.25; rows 1,2 cosine bases, values below). With
   `proj[j] = sum_r scaled[r]*G_PITCH[r][j]`, `peak = max_j proj[j]`,
   `scale = 1.5*peak`, set `refl[i] = scale - proj[i]`, then recover comb
   coefficients `comb_c[r] = sum_i G_PITCH[r][i]*refl[i]`.
5. Fill `N` samples of LCG noise (constants below), seed `pitch_gain` from
   `env_state` on the first call, RMS-envelope-smooth the input with coef `0.95`,
   and multiply the noise by the resulting envelope.
6. Normalize: `local5 /= (sum(noise^2) + 9.999999960041972e-13)`, then
   `comb_c[i] *= local5`.

Inactive-subframe path resets `smoothed_c` and the LCG state and derives a single
scalar gain from the band-energy ratio; it does not build comb coefficients.

Resonator: if `comb_c[0] >= 0`, add `1.0000000031710769e-30`, run the
2-iteration Levinson-style solve (returns reflection terms `r5`, `r8`, `denom`).
On success `g = sqrt(comb_c[0]/denom)` and the resonator FIR coefficients are
`{g, r8*g, r5*g}`; on failure `{sqrt(comb_c[0]), 0, 0}`; if `comb_c[0] < 0` the
resonator is zeroed. Run the 3-tap resonator FIR over the env-shaped noise, then
the static de-emphasis FIR `{0.25, -0.49599999, 0.25}` to produce the additive
output. A trailing AR1/MA1 biquad (corner derived from the band energy and the
sigmoid trailing-pole `g5 = sigmoid(0.2*(nrgEnv[1]-nrgEnv[0]+1e-30) - 3)`) is
added UNLESS the subframe is active with `call_count > 1`.

LCG noise fill: `s = 196314165*s + 907633515` (wrapping i32), output
`s * 8.100000115085493e-10`, emitting the byte-shifted views `s<<8`, `s<<16`,
`s<<24` in the 4-wide block; `state` persists across calls.

`G_PITCH` rows (16 columns each):

    row0: 0.25 x16
    row1: 0.24879618 0.23923509 0.22048031 0.19325261 0.15859832 0.11784916
          0.07257116 0.02450428 -0.02450431 -0.07257118 -0.11784921 -0.15859832
          -0.19325262 -0.22048034 -0.23923509 -0.24879618
    row2: 0.24519631 0.20786740 0.13889255 0.04877256 -0.04877258 -0.13889259
          -0.20786741 -0.24519633 -0.24519631 -0.20786738 -0.13889250 -0.04877260
          0.04877260 0.13889261 0.20786740 0.24519633

## 2. HP (pitch) post-filter

Applied to one frame (`FRAME_LEN = 320`) of post-LPC-synthesis output. Structure:

    de-emphasis (AR1 leaky integrator, coef {1, -0.995})
      -> ARMA2 comb (MA2 numerator, AR2 denominator)
      -> companion pre-emphasis (MA1 differentiator, coef {1, -0.995})

The comb keys on the frame's average pitch lag `lag = sum(l^2)/sum(l)` over the
subframe lags (0 -> unvoiced). The ARMA2 biquad is built by `smpl_calc_hp_coefs`
with `f = 1/lag` for the voiced curve, or `f = 50/16000` (50 Hz corner) when
`lag <= 0`:

    cos_approx(x) = 1 - 0.5*x^2
    coef_ma = { 1, -2*cos_approx(2*pi*maf*f), 1 }
    far = arf[0]*f + arf[1]*f^2
    rar = arr[0]*f + arr[1]*f^2
    coef_ar = { 1, -2*cos_approx(2*pi*far)*(1+rar), 1 + (2*rar + rar^2) }
    sc = (1 - coef_ar[1] + coef_ar[2]) / (1 - coef_ma[1] + coef_ma[2])
    coef_ma *= sc                                   ; unity DC gain

The AR denominator is a resonance at angle `2*pi*far` with radius `1+rar`; `rar`
is negative for a stable pole. Voiced pitch curve: `maf = 0.1`,
`arf = {0.608057355, 0.070939485}`, `arr = {-2.187380512, 2.291030664}`.
Default curve: `maf = 0.1`, `arf = {0.728508218, 0.476039848}`,
`arr = {-4.363803713, 8.441854006}`.

When the lag changes such that `lag > 1.25*lag_old` or `1.25*lag < lag_old`, the
decoder MUST run the OLD coefficients and the NEW coefficients over the frame and
overlap-add with the `cos(omega)^2` down-ramp table (`HP_POSTF_TRANSITION_SPEED = 2`,
`d_omega = pi/(2*(FRAME_LEN+1))`, omega accumulated by repeated addition) before
the companion pre-emphasis. `lag_old < 0` marks a fresh/reset filter.

## 3. Harmonic post-filter

The final per-packet stage; runs on the full low-band output after the HP filter.
It enhances pitch harmonics by mixing `x[-lag] + x[+lag]`, low-pass filtered by a
lag-dependent kernel, and introduces the codec's total group delay
`SMPL_TOT_POSTFILT_DELAY = 48` samples (8 feedback + 40 lag-subframe). Constants:

    FRAME_LEN = 320            LAG_SUBFR_LEN = 40       FB_DELAY = 8
    MIN_PITCH_LAG = 32         MAX_PITCH_LAG = 320      MAXPITCH_LEN = 320
    FB_STRENGTH = 0.4734       STRENGTH = 0.6438        CUTOFF_HZ = 4000
    NHARM_CUTOFF = 6.3         REDUCTION_FAC = 0.0579   LP_FILT_RES = 2500
    PITCH_NUM_SUBFRAMES = 8

The filter operates per 40-sample lag block. The packet is appended to a persistent
StateComb buffer at offset `MAX_PITCH_LAG + HARM_DELAY`; reads index back into
history. The per-packet feedback strength is `fb_strength = 1 - FB_STRENGTH*normalized_bitrate`.
For a block with `lag > 0`:

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

When `xy <= 0` (or `lag <= 0`) the block copies the 48-delayed base signal; if the
previous block filtered, the first `2*FB_DELAY` samples carry the previous kernel's
zero-input response. The per-bucket LP kernel is built by `create_lp_filter` from a
cosine window `filt_win[i] = cos(omega)/(i+1)` (`omega` stepping `0.5*pi/(FB_DELAY+1)`),
cutoff `omega_c = min(omega0*NHARM_CUTOFF, CUTOFF_HZ/16000*pi)` with `omega0 = 2*pi/lag`,
scaled to unity sum; the bucket index is `LP_FILT_RES/max(lag+30,80) - LP_FILT_RES/MAX_PITCH_LAG`.
After processing, StateComb is shifted left by the packet length. The block's lag for
iteration `k` is `round(lags[k])`; `prev_lag` carries across packets.

**Findings**

The three filters are distinct stages. The excitation comb resonates noise shaped by
the excitation's own short-lag autocorrelation. The HP and harmonic post-filters are
organized as the `smpl_postfilter_util`, `smpl_calc_hp_coefs`, and
`smpl_harm_postfilter` stages. Because the codec uses fast (non-strict-IEEE) `f32`
arithmetic, recursive accumulations through the near-unit-circle pitch poles can drift
up to ~1.5e-5 from strict IEEE arithmetic; this is below the i16 LSB and therefore
identical once written to the 16-bit PCM the codec emits. The single larger residual is
the first 48 samples of a silence packet immediately following a voiced packet (the
comb's zero-input response under the prior frame's coefficients), bounded well under
audibility.

**Requires:** [`mlow`](#mlow), [`mlow-excitation`](#mlow-excitation), [`mlow-synthesis`](#mlow-synthesis), [`mlow-frame`](#mlow-frame)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working | all three filters ported and validated against the live WASM decoder and the C decoder dumps |
| [`meowmeow`](../flavors.md) | working | codec post-filter stage |
| [`meowcaller`](../flavors.md) | partial | encodings codec modules are partial |

**Open questions**

- The excitation comb carries a single unresolved 8/7 output scalar; its exact value is not yet pinned down.
- Whether the excitation-comb subframe length selection (N in {80,160}) is fully determined by frame size or also depends on bandwidth mode.

**References**

- [MLow: WhatsApp's low-bitrate speech codec (engineering blog)](https://engineering.fb.com/2024/06/13/web/mlow-metas-low-bitrate-audio-codec/)

[lookup page →](./encodings/mlow-postfilter.md) · [↑ contents](#contents)

---

<a id="mlow-synthesis"></a>

### MLow CELP synthesis

**`mlow-synthesis`** · status: draft · features: audio · since: 0.1.0

How an MLow decoder turns one 20 ms internal frame's decoded parameters (interpolated LPC, fixed-codebook pulses, adaptive-codebook/LTP, and the per-subframe residual-energy floor) into the excitation and runs the order-16 CELP synthesis filter to produce 16 kHz PCM.

**Normative**

An MLow decoder MUST synthesize each 20 ms internal frame as four 80-sample
(5 ms) subframes at 16 kHz. The LPC order is 16. Synthesis proceeds, per
subframe, in this order: per-subframe LPC interpolation, fixed-codebook (FCB)
pulse excitation, adaptive-codebook (ACB/LTP) addition, residual-energy floor
decode and shaped-noise addition, and the order-16 AR synthesis filter. All
arithmetic is single-precision float unless noted; the polynomial recursions in
NLSF→LPC accumulate in double precision.

## Per-subframe LPC interpolation

For each internal frame the decoder reconstructs one order-16 NLSF vector (see
[mlow-lsf-lpc](#mlow-lsf-lpc)). It MUST interpolate, per subframe `sf`, between
the previous frame's final interpolated NLSF (`prev`) and this frame's NLSF
(`lsf`) using a factor `f = interp[idx][sf]`:

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

## Fixed-codebook (FCB) excitation

The decoder MUST build the LPC residual excitation by scaling the sparse signed
FCB pulses (320 positions per frame; see [mlow-excitation](#mlow-excitation)) by
a per-subframe fixed-codebook gain:

    res[pos] = pulses[pos] * fcbgain[ fcbg_idx[sf] ]     for pos in subframe sf

Two gain magnitude tables MUST be used, selected by whether the frame is voiced:

    voiced (34 entries):    fcbgain_v[i]  = 10 ^ (0.05 * (i*3.0 + (-100.0)))
    unvoiced (91 entries):  fcbgain_uv[i] = 10 ^ (0.05 * (i*1.0 + ( -90.0)))

i.e. voiced gains step 3 dB from -100 dB, unvoiced gains step 1 dB from -90 dB.

## Adaptive-codebook (ACB / LTP) contribution — voiced only

For voiced frames the decoder MUST add the adaptive-codebook (long-term
prediction) contribution into the residual before noise and synthesis. Each
80-sample subframe carries two 40-sample lag sub-blocks (`lags_per_subframe ==
2`); each block lag is reconstructed as `intLagQ6*0.5 + 32`, clamped to a
maximum of 320.

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

## Residual-energy floor and shaped noise

The unvoiced excitation level is carried by a per-subframe quantized
residual-energy floor `nrgres_dbq_Q14` (the wire "gain" block of an unvoiced
frame IS the residual-energy quantizer layout; see [mlow-noise](#mlow-noise)).
The decoder MUST decode this floor to a linear residual energy and add
environment-shaped pseudo-random noise into the residual after the ACB step and
before LPC synthesis.

The floor MUST be quantized/reconstructed as a frame-mean scalar plus a 4-vector
shape codebook entry:

    frame_dbq_Q14 = frame_qi * 16686 + (-85) * 2^14
    nrgres_dbq_Q14[sf] = frame_dbq_Q14 + shape_cb_Q10[shape_qi][sf] * 16

where `16686` is the 4-subframe dB step (Q14), `-85` dB is the residual-energy
floor minimum (the maximum is 0 dB), and `shape_cb_Q10` is the 98-vector ×
4-subframe Q10 shape codebook. The dB-domain residual energy used by the
quantizer is `10*log10(nrg/subfrlen + 3.1622776e-9)` clamped to a 0 dB ceiling.

## Order-16 AR synthesis filter

The decoder MUST run the order-16 all-pole CELP synthesis filter over the
combined residual (FCB + ACB + noise), per subframe, with the per-subframe
interpolated LPC coefficients `a` (`a[0] == 1.0`):

    y[n] = res[n] - sum_{i=1..16} a[i] * y[n-i]

Synthesis MUST flow contiguously across subframes and across frames: the filter
state is the previous 16 output samples, carried into the next subframe and the
next frame. The 320 output samples of the frame are the synthesis-filter output.

After the four subframes, the decoder applies the post-LPC pitch-harmonic HP
post-filter to the 320-sample frame (see [mlow-postfilter](#mlow-postfilter));
its comb lag is the energy-weighted mean of the eight per-40-block pitch lags
(0 for unvoiced).

**Findings**

The synthesis runs in the codec's native float domain with output in [-1, 1].
The 16-tap fractional-LTP kernel is the same symmetric FIR used by the
excitation interpolation. `normalized_bitrate` (driving the ACB high-boost) is
a function of the frame's total pulse count and the 16 kHz frame length.

The residual-energy reconstruction is deterministic: frame index 0
with `frame_qi = 0`, `shape_qi = 8` yields
`nrgres_dbq_Q14 = [-1390064, -1392336, -1394000, -1394176]`, which the decoder
reads back as the per-subframe gain floor. The decoder's pre-noise excitation
(FCB pulses × gain plus the voiced ACB/LTP synthesis) is deterministic, per
subframe, for both voiced and unvoiced frames; the shaped noise added afterward
is PRNG-driven.

**Requires:** [`mlow-lsf-lpc`](#mlow-lsf-lpc), [`mlow-excitation`](#mlow-excitation), [`mlow-noise`](#mlow-noise), [`mlow-postfilter`](#mlow-postfilter), [`mlow-frame`](#mlow-frame)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | partial | CELP synth in progress; excitation/LPC modules partially wired |

**Open questions**

- Whether the low-rate ACB gain codebook (vs high-rate) is exercised on production streams.
- The exact env-shaping parameters feeding the per-subframe excitation comb post-filter remain unconfirmed.

**References**

- [RFC 6716 — Opus (CELT range coder reused by MLow)](https://www.rfc-editor.org/rfc/rfc6716)

[lookup page →](./encodings/mlow-synthesis.md) · [↑ contents](#contents)

---

<a id="mlow-vad"></a>

### MLow voice activity detection

**`mlow-vad`** · status: draft · features: audio · since: 0.1.0

The voice activity detector the MLow encoder runs over the raw input PCM to produce a per-internal-frame speech-activity probability and the packet-level coded_as_active_voice flag that drive the encoder's bitrate, voiced/unvoiced classification, and DTX / comfort-noise decisions. The VAD is a fixed-point SILK VAD (a four-band SNR estimator over an allpass filterbank with an adaptive noise floor and a per-packet DTX hangover).

**Normative**

The encoder MUST run the VAD on the raw int16 input PCM, **before** any
encoder high-pass stage, at 16 kHz with an internal frame length of 320
samples (20 ms). A media packet covers 60 ms = three internal frames of 320
samples each (960 samples).

The VAD MUST carry persistent state across packets: the three two-element
allpass-filterbank states, the per-band carried subframe energy, the four
per-band noise levels and their reciprocals, the per-band noise-level bias,
a frame counter, the high-pass filter state, and the DTX hangover counter.

## Per-internal-frame speech activity

For each internal frame the encoder MUST compute `speech_activity_Q8`
(a value in `0..=255`, reported as `speech_activity_Q8 / 256`) as follows.

**1. Four-band split.** The 0–8 kHz frame MUST be split into four bands —
0–1 kHz, 1–2 kHz, 2–4 kHz, 4–8 kHz — by three cascaded first-order allpass
filterbank splits (`ana_filt_bank_1`):

- split the full 0–8 kHz frame into 0–4 kHz (low) and 4–8 kHz (high);
- split the 0–4 kHz band into 0–2 kHz and 2–4 kHz;
- split the 0–2 kHz band into 0–1 kHz and 1–2 kHz.

Each split MUST use the two-tap allpass coefficients `A_FB1_20 = 3894 << 1`
and `A_FB1_21 = -29322`. Even-indexed input samples are processed through the
`A_FB1_21` branch (`x = SMLAWB(y, y, A_FB1_21)`), odd-indexed through the
`A_FB1_20` branch (`x = SMULWB(y, A_FB1_20)`); the low output is
`RSHIFT_ROUND(out_2 + out_1, 11)` and the high output is
`RSHIFT_ROUND(out_2 - out_1, 11)`, both saturated to int16. Each split MUST
carry its own two-element state across frames.

**2. Lowest-band high-pass.** A first-order ARMA high-pass (zero at DC, −3 dB
at 66 Hz) MUST be applied to the lowest band with `a_neg_Q16 = 53084`
(scaled by `(100 - highpass_sharpness) / 100`) and `b_Q16 = (65536 + a_neg_Q16) / 2`,
carrying `hp_state` across frames.

**3. Per-band energy.** For each band the energy MUST be summed over four
internal subframes, with each sample right-shifted by 3 before squaring
(`SMLABB`) and accumulated with saturating positive adds. The energy of the
last subframe of each band MUST be carried into the next frame (`xnrg_subfr`),
and the running total adds the final subframe's energy at half weight
(`sum_squared >> 1`).

**4. Noise-level update.** The four per-band noise levels MUST be updated
(`GetNoiseLevels`) from the band energies before the SNR computation:

- the smoothing coefficient is `VAD_NOISE_LEVEL_SMOOTH_COEF_Q16 = 1024`,
  reduced to `>> 3` when the band energy exceeds `8 * nl`, kept full when it
  is below `nl`, and interpolated in between;
- while `counter < 1000`, the coefficient is floored at
  `min_coef = INT16_MAX / ((counter >> 4) + 1)` and `counter` is incremented;
- each band energy is biased by `noise_level_bias[b]`, and `nl[b]` is clamped
  to at most `0x00FF_FFFF`.

At init the per-band bias MUST be `max(VAD_NOISE_LEVELS_BIAS / (b+1), 1)` with
`VAD_NOISE_LEVELS_BIAS = 50`, the noise level `nl[b] = 100 * bias[b]`, the
reciprocal `inv_nl[b] = INT32_MAX / nl[b]`, and `counter = 15`.

**5. SNR and activity.** For each band the speech energy is `xnrg[b] - nl[b]`;
for positive speech energy the encoder MUST form a Q8 ratio, convert it to a
Q7 SNR via `lin2log` minus `8 * 128`, accumulate the squared SNR, and weight a
tilt accumulator by `TILT_WEIGHTS = [30000, 6000, -12000, -12000]`. The mean
squared SNR is square-rooted (`SQRT_APPROX`) and scaled by 3 to form
`p_SNR_dB_Q7`. The final probability is

    sa_Q15 = sigm_Q15(SMULWB(vad_snr_factor_Q16, p_SNR_dB_Q7) - VAD_NEGATIVE_OFFSET_Q5)
    speech_activity_Q8 = min(sa_Q15 >> 7, 255)

with `VAD_SNR_FACTOR_Q16 = 45000` (scaled by `(150 - non_binariness) / 150`)
and `VAD_NEGATIVE_OFFSET_Q5 = 128`. In the default encoder configuration the
tuning parameters `noise_lvl_update_speed`, `non_binariness`, and
`highpass_sharpness` are all 0.

This per-frame path MUST be bit-exact with the reference fixed-point SILK
`smpl_VAD_GetSA_Q8_c`; all arithmetic is the SILK fixed-point primitives
(`SMULWB`, `SMLAWB`, `SMULWW`, `SMULBB`, `SMLABB`, saturating adds, `lin2log`,
`sqrt_approx`, `sigm_Q15`, `RSHIFT_ROUND`).

## Packet-level activity and DTX hangover

For each 60 ms packet the encoder MUST classify each of the three internal
frames as `Active` when `speech_activity_Q8 > SPEECH_ACTIVITY_DTX_THRES_Q8`
(= `round(0.05 * 256)` = 12) and `Inactive` otherwise, then apply a per-packet
hangover:

- on an `Active` frame, reset `remaining_dtx_hangover` to `hangover_ms`
  (default 60 ms);
- on a non-`Active` frame while `remaining_dtx_hangover > 0`, reclassify the
  frame as `Hangover` and decrement `remaining_dtx_hangover` by
  `PACKET_MS / FRAMES_PER_PACKET` (= 60 / 3 = 20).

The packet's `coded_as_active_voice` flag MUST be set true if any frame is
classified `Active` or `Hangover`, and false only if all three frames are
`Inactive`. The encoder MUST use this flag for its DTX / comfort-noise
decision and the per-frame `speech_activity` for bitrate control and
voiced/unvoiced classification.

This specification reflects the `activity == NO_DECISION` path (the threshold
drives the per-frame type directly); the input-tilt value computed during the
SNR pass is not consumed downstream in this configuration.

**Findings**

The detector is a faithful fixed-point port of the SILK VAD: the two-band
allpass filterbank (`smpl_ana_filt_bank_1`), the per-band noise-level tracker
(`smpl_VAD_GetNoiseLevels`), the four-band SNR-to-sigmoid activity estimate
(`smpl_VAD_GetSA_Q8_c`), and the per-packet DTX hangover. It runs on the raw
microphone PCM rather than the encoder's high-pass output, with its own −3 dB
@ 66 Hz lowest-band high-pass internal to the VAD.

The per-frame `speech_activity` and the packet `coded_as_active_voice` flag
are validated bit-exactly against the reference libopus encoder
(`smpl_VAD_GetSA_Q8_c` enc_dump) over the packets where the carried
noise-level state remains bit-exact.

**Requires:** [`mlow`](#mlow), [`mlow-frame`](#mlow-frame)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | partial | encoding codec modules are partial |

**Open questions**

- Whether non-default VAD tuning (noise_lvl_update_speed, non_binariness, highpass_sharpness) is ever negotiated on the wire, or always left at 0.
- How the per-frame speech_activity is quantised into the bitrate controller and the voiced/unvoiced classifier downstream of the VAD.
- Whether the input_tilt_Q15 value is consumed by any other encoder configuration.

**References**

- [RFC 6716 — Definition of the Opus Audio Codec (SILK VAD)](https://www.rfc-editor.org/rfc/rfc6716)

[lookup page →](./encodings/mlow-vad.md) · [↑ contents](#contents)

---

<a id="crypto"></a>

## Crypto

Keying and media protection: SRTP (hop-by-hop and end-to-end), SFrame, WARP, group-call crypto.

<a id="call-key"></a>

### Call key establishment

**`call-key`** · status: draft · features: audio, video, group · since: 0.1.0

How the 32-byte call key is established for a call and delivered to each recipient device inside the offer's per-device Signal-encrypted <enc> payload, and the role it plays as the root secret for all per-call media keying.

**Normative**

Every 1:1 call is rooted in a single shared secret, the **call key** (`callKey`),
a 32-byte value. The call key is the input keying material from which every
per-call media key is derived: the end-to-end SRTP master secret (see
[srtp-master-key](#srtp-master-key)), the per-participant SFrame keys (see
[sframe-media](#sframe-media)), and the WARP authentication key (see [warp](#warp)).

**Length.** Implementations MUST treat the call key as exactly 32 bytes. All
downstream key-derivation functions consume the full 32 bytes:

    derive_e2e_keys      : HKDF IKM = callKey[0..32]
    derive_e2e_sframe_key: salt = callKey[0..16], IKM = callKey[16..32]
    derive_warp_auth_key : HKDF IKM = callKey[0..32]

A call key shorter than 32 bytes MUST be rejected; no key derivation is defined for
it.

**Delivery.** The caller MUST deliver the call key to each recipient device by
encrypting it to that device's Signal session and placing the ciphertext in an
`<enc>` node, as described in [call-offer](#call-offer). The `<enc>` node MUST carry:

    <enc v="2" type="pkmsg|msg" count="0">CIPHERTEXT</enc>

`type="pkmsg"` MUST be used when the Signal session is being established (a
PreKeySignalMessage); `type="msg"` MUST be used when an existing session is reused.
When the callee has a single device, the `<enc>` node is placed directly in the
`<offer>`. When the callee has multiple devices, each device's `<enc>` MUST be
wrapped in its own `<to jid="...">` element under a `<destination>` node, one per
device, so that every device receives the same call key under its own Signal
session.

**Key generation path.** The `<encopt keygen="2">` element in the offer selects the
v2 keying path. Under this path the Signal-delivered secret is carried in a
`<raw_e2e>` field that replaces the call key as the HKDF input keying material for
end-to-end SRTP derivation; like the call key it MUST be at least 32 bytes, and only
its first 32 bytes are consumed as IKM.

**Plaintext format.** The decrypted Signal plaintext yields the call key (and, under
keygen=2, the `raw_e2e` material). The exact serialization of that plaintext is not
pinned by this section.

**Findings**

The call key is consumed as a fixed 32-byte secret by all three media-keying
functions: the end-to-end SRTP derivation uses the whole 32 bytes as HKDF input
keying material; the SFrame derivation splits it into a 16-byte HKDF salt
(`callKey[0..16]`) and 16-byte HKDF IKM (`callKey[16..32]`); the WARP
authentication-key derivation again uses the whole 32 bytes as IKM. The same call
key is encrypted independently to each recipient device, so every device of a
multi-device callee derives identical per-participant keys from it.

Under keygen=2 a `raw_e2e` secret can stand in for the call key as the SRTP HKDF
IKM; the two are interchangeable from the derivation's point of view, each
contributing 32 bytes of IKM.

**Requires:** [`call-offer`](#call-offer), [`srtp-master-key`](#srtp-master-key), [`sframe-media`](#sframe-media), [`warp`](#warp)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | working | consumes the call key for crypto keying; does not handle <enc> delivery/signalling |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- How the caller generates the 32-byte call key (CSPRNG source / any structure) is not revealed by the keying code, which only consumes it.
- Exact serialization of the Signal plaintext that carries the call key, and how raw_e2e is framed alongside it under keygen=2.
- Whether the call key is regenerated per offer or reused across re-offers / call legs.

**References**

- [Signal Protocol (X3DH + Double Ratchet)](https://signal.org/docs/)
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)

[lookup page →](./crypto/call-key.md) · [↑ contents](#contents)

---

<a id="srtp-master-key"></a>

### SRTP master key and salt derivation

**`srtp-master-key`** · status: review · features: audio, video, group · since: 0.1.0

How the per-participant SRTP master key and salt are derived from the call key, and how the six SRTP/SRTCP session keys are expanded from them.

**Normative**

A call establishes a shared **call key** (`callKey`), delivered to each recipient
device in the offer's `<enc>` payload (see [call-offer](#call-offer)). Each
participant MUST derive its end-to-end SRTP master key and salt in two layers.

**Layer 1 — WAHKDF (per participant).** The master secret MUST be derived with
HKDF-SHA256:

    IKM  = callKey
    salt = (none)
    info = participantLID            ; the participant's LID bytes
    L    = 46
    OKM  = masterKey(16) || masterSalt(14) || unused(16)

The trailing 16 bytes of OKM MUST be discarded.

**Layer 2 — RFC 3711 key derivation.** The six session keys MUST be expanded from
`masterKey`/`masterSalt` with AES-128 in counter mode per RFC 3711 §4.3, using the
master salt as the IV and XORing the key-derivation label into `iv[7]`:

    key_i = AES-128-CM(masterKey, IV = masterSalt with iv[7] ^= label_i)

Labels `0x00`–`0x05` MUST produce, in order: SRTP cipher key (16), SRTP auth key
(20), SRTP salt (14), SRTCP cipher key (16), SRTCP auth key (20), SRTCP salt (14).
The negotiated suite is `AES_CM_128_HMAC_SHA1_80`.

Hop-by-hop SRTP (see [srtp-hop-by-hop](#srtp-hop-by-hop)) MUST skip Layer 1: the
relay supplies 30 bytes of `masterKey || masterSalt` directly, and only Layer 2 is
applied.

**Findings**

HKDF here rests on a proven primitive. All derived keys are distinct per
participant LID, so each peer's media is keyed independently.

**Requires:** [`call-offer`](#call-offer)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | planned | util/hkdf + srtp/e2e are planned modules |

**Open questions**

- Exact byte layout of participantLID used as HKDF info across all client versions.

**References**

- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)

[lookup page →](./crypto/srtp-master-key.md) · [↑ contents](#contents)

---

<a id="srtp-hop-by-hop"></a>

### Hop-by-hop SRTP

**`srtp-hop-by-hop`** · status: draft · features: audio, video, group · since: 0.1.0

The relay-facing SRTP layer that protects media on each hop between a client and the relay, distinct from the end-to-end layer.

**Normative**

Media between a client and the relay MUST be protected with a hop-by-hop SRTP
context that is independent of the end-to-end context. The relay supplies 30 bytes
of `masterKey || masterSalt` directly, so hop-by-hop keying MUST skip the WAHKDF
layer and apply only the RFC 3711 expansion (see
[srtp-master-key](#srtp-master-key)). The suite is `AES_CM_128_HMAC_SHA1_80`.

**Findings**

This is the outer of two nested SRTP layers: end-to-end protects media across the
whole path; hop-by-hop protects each client↔relay hop and is terminated at the relay.

**Requires:** [`srtp-master-key`](#srtp-master-key)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | planned |  |

[lookup page →](./crypto/srtp-hop-by-hop.md) · [↑ contents](#contents)

---

<a id="sframe-media"></a>

### SFrame media end-to-end encryption

**`sframe-media`** · status: draft · features: audio, video, group · since: 0.1.0

Per-frame end-to-end encryption of media payloads (SFrame-style), applied above the SRTP layers so the relay never sees plaintext media.

**Normative**

Each media frame MUST be sealed end-to-end before transport with an SFrame-style
AEAD: an authenticated header carrying a key id and a monotonic frame counter,
with the payload encrypted under a per-participant SFrame key derived from the
call key. The frame counter MUST NOT repeat under a given key. The relay MUST be
unable to recover plaintext media; it only forwards sealed frames.

**Findings**

Recovered in the WhatsApp Web engine as `facebook::rtc::e2ee::FrameDataHandler*`
classes. Group calls extend this with per-sender keys.

**Requires:** [`srtp-master-key`](#srtp-master-key)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Exact AEAD suite, nonce construction, and header varint layout.
- Group-call key distribution and rotation.

[lookup page →](./crypto/sframe-media.md) · [↑ contents](#contents)

---

<a id="srtp-e2e"></a>

### End-to-end SRTP

**`srtp-e2e`** · status: review · features: audio, video · since: 0.1.0

The end-to-end SRTP context for 1:1 calls: an inner AES-128-CTR payload cipher whose keys are derived per participant from the call key and that travels unchanged through the relay, distinct from the hop-by-hop SRTP applied on each leg between a device and the relay.

**Normative**

A 1:1 call protects RTP payloads with **two independent SRTP contexts** that nest:
an **end-to-end (E2E)** context that only the two participant devices can key, and
a **hop-by-hop (HBH)** context (see [srtp-hop-by-hop](#srtp-hop-by-hop)) applied
separately on each leg between a device and the relay. A sender MUST apply the E2E
transform to the media payload first; the resulting bytes are then carried inside the
RTP packet that the HBH transform encrypts on the wire. The relay decrypts the HBH
layer but cannot decrypt the E2E layer, so the E2E ciphertext transits the relay
unchanged. This section specifies the E2E context only.

**Key derivation (per participant, two layers).**

*Layer 1 — master secret.* The 30-byte E2E master secret MUST be derived with
HKDF-SHA256 (see [srtp-master-key](#srtp-master-key)):

    IKM  = callKey[0..32]             ; the 32-byte call key
    salt = 32 zero bytes
    info = participantLID             ; a participant's LID bytes, UTF-8
    L    = 46
    OKM  = masterKey(16) || masterSalt(14) || unused(16)

The trailing 16 bytes MUST be discarded. The `info` is the participant whose keys
are being derived: a device derives its **send** keys from its own LID and its
**receive** keys from the peer LID.

*Layer 2 — session keys.* Three session values MUST be expanded from
`masterKey`/`masterSalt` with the AES-CM key-derivation function (libsrtp /
RFC 3711 §4.3). For each label the IV is the 14-byte master salt zero-padded to 16
bytes with the label XORed into byte 7, and the output is the AES-128-CTR keystream
over `L` zero bytes under `masterKey`:

    cipherKey(16) = AES-128-CM(masterKey, IV = pad16(masterSalt), iv[7] ^= 0x00)
    authKey(20)   = AES-128-CM(masterKey, IV = pad16(masterSalt), iv[7] ^= 0x01)
    salt(14)      = AES-128-CM(masterKey, IV = pad16(masterSalt), iv[7] ^= 0x02)

**Per-packet IV.** For each RTP packet the 16-byte IV MUST be built by right-aligning
the 14-byte `salt` into a 16-byte buffer (zero in bytes 0–1), then XORing in the SSRC
and the 48-bit packet index:

    iv[0..2]  = 0
    iv[2..16] = salt                          ; salt right-aligned (offset = 14 - len)
    iv[4..8]  ^= ssrc                          ; 32-bit, big-endian
    packetIndex = ROC * 2^16 + seq             ; 48-bit
    iv[8..14] ^= packetIndex                    ; 48-bit, big-endian

`seq` is the 16-bit RTP sequence number and `ROC` is the 32-bit rollover counter. The
packet index occupies the low 48 bits; its top 16 bits land in `iv[8..10]` and its low
32 bits in `iv[10..14]`. A sender MUST track `ROC` by incrementing it whenever the
16-bit sequence number wraps (detected as `(seq - lastSeq)` interpreted as a signed
16-bit delta being `< -32768`).

**Payload transform.** The transform MUST be AES-128-CTR (full 128-bit counter) over
the RTP payload, under `cipherKey` and the per-packet IV. The cipher is symmetric:
decryption applies the identical keystream. The transform covers the payload only; the
RTP header is not encrypted.

**Authentication tag.** A 4-byte WARP MESSAGE-INTEGRITY tag (HMAC-SHA1 truncated to 4
bytes, keyed by the WARP auth key — see [warp-crypto](#warp-crypto)) MAY be appended to
the protected payload. A receiver is not required to verify this tag.

An implementation MUST NOT use the HBH session keys, salt, or IV construction for the
E2E context: the two contexts use different KDFs, different IV layouts (E2E XORs a
48-bit packet index into `iv[8..14]`; HBH places `packetIndex << 16` into `iv[8..16]`),
and different counter modes (E2E full 128-bit CTR; HBH libsrtp 2-byte-carry AES-ICM).

**Findings**

The E2E context is the primary working media path for 1:1 calls. Because the inner
ciphertext is opaque to the relay, payloads are end-to-end confidential between the two
devices even though the relay terminates the hop-by-hop SRTP on each leg.

The Layer-2 expansion and the per-packet IV are the same shape as the RFC 3711 SRTP
key derivation and IV used hop-by-hop, but applied with a full 128-bit CTR rather than
the libsrtp 2-byte-carry AES-ICM; the two only diverge past ~1 MiB of keystream per
packet, which does not occur for audio or video frames.

A `callKey`-keyed AES-128-GCM **SFrame** transform exists as a separate end-to-end
media-protection scheme (see [sframe-media](#sframe-media)); it is distinct from this
AES-128-CTR E2E SRTP context. On the observed 1:1 receive path the peer ships plain
(un-SFramed) media inside the E2E SRTP layer.

A keygen-v2 variant replaces `callKey` as the HKDF IKM with a raw end-to-end secret
delivered in the offer (`<raw_e2e>`); the derivation is otherwise identical and requires
at least 32 bytes of input keying material.

**Requires:** [`call-key`](#call-key), [`srtp-master-key`](#srtp-master-key), [`srtp-hop-by-hop`](#srtp-hop-by-hop)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working | ported from src/media/e2e-srtp.ts |
| [`meowmeow`](../flavors.md) | working | crypto keying path only; no signalling/relay |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Exact byte layout of participantLID used as HKDF info across client versions (shared with srtp-master-key).
- Whether the 4-byte WARP MESSAGE-INTEGRITY tag is verified by the production receiver, or only emitted on send.
- Conditions under which keygen-v2 (<raw_e2e>) is selected over the callKey-derived IKM.

**References**

- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)

[lookup page →](./crypto/srtp-e2e.md) · [↑ contents](#contents)

---

<a id="group-call-crypto"></a>

### Group call crypto

**`group-call-crypto`** · status: draft · features: audio, video, group, screen-share · since: 0.1.0

How per-sender media keys are derived and distributed in a group call: a single shared call key is delivered to every participant, and each participant derives one independent SFrame key per sender (keyed by that sender's participant id), so every member can decrypt every other member without a per-pair key exchange.

**Normative**

A group call MUST share a single 32-byte **call key** (`callKey`) among all
participants. The call key is delivered to each recipient device in the offer's
`<enc>` payload (see [call-offer](#call-offer)); group fan-out and membership are
governed by [group-call](#group-call). The same `callKey` is used by every member —
there is no per-pair key.

**Per-sender SFrame keys.** Media is sealed end-to-end with a per-sender SFrame key
(see [sframe-media](#sframe-media) for the frame format). A sender's key MUST be
derived from the shared `callKey` and that sender's **participant id** so that every
other member, holding the same `callKey`, can independently derive the same key and
decrypt that sender's frames.

The 32-byte `callKey` MUST be split into two halves used as HKDF inputs:

    salt = callKey[0..16]
    ikm  = callKey[16..32]

The per-sender key MUST be derived with HKDF-SHA256 (expand), info equal to the
fixed label `"e2e sframe key"` concatenated with the sender's participant id:

    info = "e2e sframe key" || participantId
    L    = 32
    OKM  = HKDF-SHA256(salt = callKey[0..16], ikm = callKey[16..32], info, 32)

The SFrame AEAD (AES-128-GCM) MUST use the first 16 bytes of `OKM` as the key; the
remaining 16 bytes are unused. A call key shorter or longer than 32 bytes MUST cause
key derivation to fail (no key is produced).

**Participant id normalization.** The `participantId` placed in the HKDF info MUST be
the sender's normalized participant JID, computed as follows:

1. Strip any device/resource suffix after `/` and trim surrounding whitespace.
2. If there is no `@`, or the `@` is the first character, use the bare string
   unchanged.
3. Otherwise split into `user@domain`. If `user` already contains `:` (a device
   suffix is present), keep `user@domain` unchanged.
4. If `domain` is `lid` and `user` has no `:` device suffix, the primary device MUST
   be addressed as `:0`, yielding `user:0@lid`.
5. Otherwise use `user@domain`.

**Send vs. receive direction.** Each participant MUST derive a *send* key from its
own (the sender's) normalized participant id and seal its outgoing frames under it.
To receive, a participant MUST derive the *peer* sender's key from that peer's
normalized participant id and open frames under it. Concretely, a member maintaining
a per-peer session derives its encrypt key from the remote party's id and its decrypt
key from its own id only when acting as the SFrame *responder*; the governing rule is
that the key's info label always carries the **sender's** participant id, so the
party that produced a frame and the party consuming it derive the identical key.

**Counters.** Each sender MUST maintain a monotonic per-frame counter that seeds the
GCM nonce and is carried in the SFrame header (see [sframe-media](#sframe-media)). The
counter MUST NOT repeat under a given sender key.

**Findings**

The shared `callKey` is the only group secret: there is no pairwise Diffie-Hellman
or per-recipient ratchet at the media layer. Per-sender separation comes entirely
from binding the HKDF info to the sender's participant id, so the N keys in an
N-party call are all deterministic functions of the one `callKey` plus the roster of
participant ids.

The SFrame derivation differs from the 1:1 E2E-SRTP derivation in three ways that an
implementer must not conflate:
  - SFrame splits `callKey` into a 16-byte salt and 16-byte IKM; E2E-SRTP uses a
    32-byte zero salt and the whole `callKey` as IKM.
  - SFrame uses AES-128-GCM with a non-standard 16-byte nonce; E2E-SRTP uses
    AES-128-CTR.
  - SFrame keys the *send* direction from the remote/peer id and the *receive*
    direction from the self id (the info label tracks the sender), which is the
    opposite of the E2E-SRTP convention where a caller derives send keys from its own
    LID.

`lid`-domain participants without an explicit device suffix are addressed as the
primary device `:0` in the info label; an already-suffixed `user:device` id is used
verbatim. This normalization is load-bearing — a mismatched participant id yields a
different key and the GCM tag check fails closed (no plaintext is recovered).

**Requires:** [`call-offer`](#call-offer), [`group-call`](#group-call), [`srtp-master-key`](#srtp-master-key), [`sframe-media`](#sframe-media)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | working | crypto keying path; codec only otherwise |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- How a new participant joining mid-call obtains the existing callKey, and whether the callKey is rotated on membership change (join/leave).
- Whether a non-zero SFrame key_id is ever used for in-call key rotation, or it is always 0.
- Exact participant-id form (LID vs PN, device-suffix rules) used by the signaling layer to address each sender across all client versions.

**References**

- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)
- [RFC 9605 — SFrame](https://www.rfc-editor.org/rfc/rfc9605)

[lookup page →](./crypto/group-call-crypto.md) · [↑ contents](#contents)

---

<a id="warp-crypto"></a>

### WARP key wrap

**`warp-crypto`** · status: review · features: audio, video · since: 0.1.0

The WARP authentication key derived from the call key and the truncated WARP MESSAGE-INTEGRITY tag that authenticates each protected RTP packet, together with the audio-piggyback RTP extension word that carries it.

**Normative**

WARP adds a per-call **authentication key** and a per-packet
**MESSAGE-INTEGRITY (MI)** tag on top of the end-to-end SRTP payload cipher
(see [srtp-e2e](#srtp-e2e)). It uses the RTP extension profile `0xDEBE`.

**WARP auth key.** Each participant MUST derive the WARP auth key from the
32-byte call key (`callKey`, see [call-offer](#call-offer)) with HKDF-SHA256:

    IKM  = callKey                   ; the full 32 bytes
    salt = (empty)                   ; zero-length salt
    info = "warp auth key"           ; ASCII, no NUL terminator
    L    = 32
    authKey = OKM(32)

The derivation MUST NOT be performed unless `callKey` is exactly 32 bytes.

**WARP MESSAGE-INTEGRITY tag.** The MI tag MUST be computed as the first
4 bytes of HMAC-SHA1 over the protected packet bytes (everything that
precedes the tag) concatenated with the 32-bit rollover counter (ROC) in
big-endian byte order:

    tag = HMAC-SHA1(authKey, packet_without_tag || ROC_be32)[0..4]

where `ROC_be32` is the 4-byte big-endian encoding of the same ROC used to
build the E2E SRTP packet index. The 4-byte tag MUST be appended to the end
of the protected packet:

    wire = packet_without_tag || tag(4)

The sender MUST append this tag to every protected packet.

**Audio piggyback extension.** The MI tag is carried via a WARP RTP
extension. For audio, the per-packet extension word is selected by 0-based
packet index:

    packet_index 0, 1  -> no piggyback word (empty extension)
    packet_index >= 2  -> piggyback word 0x30010000

i.e. the first two packets of a stream carry an empty WARP extension and
every subsequent packet carries the 4-byte extension word `0x30 0x01 0x00
0x00`. The piggyback word MUST be emitted as a big-endian 32-bit value.

**Findings**

HMAC-SHA1, AES-128-CTR and HKDF-SHA256 are proven primitives. The auth key is
derived once per call from the full 32-byte call key (unlike the per-participant
E2E SRTP keys, which mix in the participant LID). The MI tag is present on the
wire but the receiver does not re-verify it; the payload cipher's correctness
is what gates a valid frame.

**Requires:** [`srtp-e2e`](#srtp-e2e), [`call-offer`](#call-offer)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working |  |
| [`meowmeow`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Whether the receiver is ever required to verify the WARP MI tag, and what action a mismatch triggers.
- The full meaning of the 0x30010000 piggyback word beyond signalling MI presence, and the video-stream piggyback schedule (only the audio schedule is pinned).
- Whether the empty-extension-then-piggyback start offset (index >= 2) is fixed on the wire or negotiable.

**References**

- [RFC 2104 — HMAC](https://www.rfc-editor.org/rfc/rfc2104)
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)
- [RFC 8285 — A General Mechanism for RTP Header Extensions](https://www.rfc-editor.org/rfc/rfc8285)

[lookup page →](./crypto/warp-crypto.md) · [↑ contents](#contents)

---

<a id="relay"></a>

## Relay

The media transport and relay stack: STUN, the relay handshake, RTP/RTCP framing, and the media loop.

<a id="relay-candidates"></a>

### Transport candidates

**`relay-candidates`** · status: draft · features: audio, video, group · since: 0.1.0

How relay (and host) transport candidates are carried in the `<relay>` block of a call ack: the `<te2>` endpoint format with its packed IPv4/IPv6 address bytes, the indexed `<token>`/`<auth_token>` tables, and the rules for selecting which endpoint to probe for latency versus which to connect the media transport to.

**Normative**

The signalling server returns transport candidates inside a `<relay>` element
(a child of a call ack). A client MUST parse `<relay>` into the set of relay
endpoints, the keying material, and the token tables before it can probe latency
(see [call-relaylatency](#call-relaylatency)) or connect the media transport.

## `<relay>` element

`<relay>` carries these attributes and children:

    <relay uuid=… self_pid=… peer_pid=…>
      <key>…</key>                 ; relay key (base64 ASCII), 16 bytes decoded
      <hbh_key>…</hbh_key>         ; hop-by-hop key (base64 ASCII), 30 bytes decoded
      <warp_mi_tag_len>…</warp_mi_tag_len>  ; optional decimal, > 0
      <token id="N">…</token>      ; indexed relay tokens (0-based)
      <auth_token id="N">…</auth_token>     ; indexed auth tokens (0-based)
      <te2 …>…</te2>               ; one or more transport endpoints
    </relay>

`uuid` is an opaque string. `self_pid` and `peer_pid` are decimal participant ids.
Parsers SHOULD accept node content as either raw bytes or UTF-8 text.

### `<key>` and `<hbh_key>`

`<key>` content is the relay key. A client MUST base64-decode it (standard
alphabet, with a no-padding fallback) to obtain the raw relay key bytes (16 bytes
in observed traffic); if the content does not look like base64 it is used
verbatim. The raw `<key>` ASCII (pre-decode) is the STUN message-integrity key.

`<hbh_key>` content MUST decode to exactly 30 bytes
(`masterKey(16) || masterSalt(14)`) for hop-by-hop SRTP (see
[srtp-hop-by-hop](#srtp-hop-by-hop)). Decoding MUST handle a single base64 layer,
and MUST retry a second base64 decode if the first result is not 30 bytes
(double-base64); a content that does not yield 30 bytes is treated as absent.

`<warp_mi_tag_len>`, when present, is a decimal integer; a value MUST be ignored
unless it parses and is greater than zero.

### Token tables

`<token>` and `<auth_token>` form two independent 0-based indexed tables. Each
element carries an `id` attribute giving its slot; a client MUST place the
element's (decoded) content at that index, growing the table with empty entries as
needed. When `id` is absent the next free slot is used. A `<te2>` endpoint
references these tables by `token_id` / `auth_token_id`.

### `<te2>` endpoint

Each `<te2>` describes one relay address. Its content is the packed address:

    6 bytes  → IPv4 :  a.b.c.d  +  port (u16, big-endian, bytes[4..6])
    18 bytes → IPv6 :  8 × u16 groups (big-endian)  +  port (u16, bytes[16..18])

Content of any other length MUST be skipped. The default relay port observed in
traffic is 3478 (the packed port bytes `0x0D 0x96`).

`<te2>` attributes:

- `relay_id`   — decimal, default 0.
- `relay_name` — string, default empty.
- `token_id`   — decimal index into the `<token>` table, default 0.
- `auth_token_id` — decimal index into the `<auth_token>` table, default 0.
- `is_fna`     — `"1"` marks a fallback (inbound-only) relay; absent/other = false.
- `protocol`   — decimal, default 0; carried onto the parsed address.
- `c2r_rtt`    — optional decimal client→relay RTT in milliseconds.

Multiple `<te2>` sharing the same `relay_id` and `relay_name` MUST be merged into a
single endpoint that accumulates all of its addresses (e.g. an IPv4 and an IPv6
address for one relay). The endpoint's `c2r_rtt` is taken from the latest `<te2>`
that supplies one. A client MUST retain the verbatim 6-byte IPv4:port content of
the first IPv4 `<te2>` for an endpoint; this exact byte string is what is echoed in
the `<te>` of a `<relaylatency>` stanza (see [call-relaylatency](#call-relaylatency)).

## Endpoint selection

An endpoint is an **outbound (latency) candidate** if and only if it is not FNA
(`is_fna` false) AND its `auth_token_id` is non-zero. FNA relays
(`is_fna=1`, `auth_token_id=0`) are inbound-only and MUST NOT be probed for
outbound latency.

- For **relaylatency probing**, a client MUST use only outbound candidates, deduped
  by `relay_name` and ordered by ascending `relay_id`.
- For **connecting the media transport**, a client MUST select, in order of
  preference: (1) the first outbound candidate; else (2) the first non-FNA
  endpoint; else (3) the first endpoint. `auth_token_id` only gates latency
  probing — an offer whose endpoints all have `auth_token_id=0` has no latency
  candidate yet MUST still connect media to a chosen endpoint rather than drop the
  call.

When a relay block is updated (e.g. the accept ack supplies a fresh `hbh_key`), a
client merging the patch over an existing block MUST prefer each present patch
field, and MUST treat empty token tables / empty endpoint lists in the patch as
"unset" so the base values are retained.

## Synthetic ICE credentials

For implementations that drive media through a WebRTC stack, the synthetic SDP
credentials are derived from this block: the ICE ufrag is the base64 of the raw
selected `auth_token` bytes, and the ICE pwd is the base64 of the decoded relay
key. An empty token or key yields an empty string.

**Findings**

`<te2>` (rather than an SDP candidate line) is the on-the-wire form for relay
candidates; addresses are packed binary, not text. One logical relay can appear as
several `<te2>` rows (one per address family) that must be coalesced by
`relay_id`+`relay_name`. The split between "latency candidate" (gated on a non-zero
`auth_token_id`) and "media endpoint" (any reachable, preferring non-FNA) is the
key selection nuance: skipping it either probes inbound-only relays or drops calls
whose offers carry no latency candidate. The relay key's pre-decode ASCII doubles
as the STUN message-integrity key, so the verbatim content must be retained
alongside the decoded bytes.

**Requires:** [`call-relaylatency`](#call-relaylatency), [`srtp-hop-by-hop`](#srtp-hop-by-hop), [`stun-relay`](#stun-relay)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working | origin of the parser (src/relay/parse.ts) |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Full semantics of the relay key vs hbh_key roles beyond STUN MI and hop-by-hop SRTP keying.
- Meaning of the protocol attribute values on a <te2> beyond being carried through.
- Whether token_id/auth_token_id ever index beyond the tables present, and the intended fallback.

**References**

- [RFC 5389 — STUN](https://www.rfc-editor.org/rfc/rfc5389)

[lookup page →](./relay/relay-candidates.md) · [↑ contents](#contents)

---

<a id="stun-relay"></a>

### STUN relay handshake

**`stun-relay`** · status: draft · features: audio, video, group · since: 0.1.0

The STUN dialect WhatsApp uses to bind to a relay and select transport candidates before media flows.

**Normative**

Before media flows, a client MUST complete a STUN-based handshake against the
relay candidates carried in the offer's `<destination>` (see
[call-offer](#call-offer)), establishing the client↔relay binding that WARP frames
ride over. Candidates are annotated with measured latency so the lowest-latency
relay can be chosen.

**Findings**

A STUN dialect rather than full ICE; the candidate list and latency hints come
from the signalling plane.

**Requires:** [`call-offer`](#call-offer)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | planned |  |

[lookup page →](./relay/stun-relay.md) · [↑ contents](#contents)

---

<a id="warp"></a>

### WARP relay framing

**`warp`** · status: draft · features: audio, video, group · since: 0.1.0

The framing WhatsApp media uses across its relay, wrapping SRTP-protected RTP for forwarding through the relay infrastructure.

**Normative**

After the STUN-based relay handshake (see [stun-relay](#stun-relay)), media MUST be
carried in WARP frames between client and relay. A WARP frame wraps the
hop-by-hop-protected RTP payload with the relay's forwarding header; the relay
forwards frames between participants without terminating the end-to-end SFrame
layer (see [sframe-media](#sframe-media)).

**Findings**

WARP sits between the SRTP layers and the relay transport. Exact header field
widths and the relay control sub-protocol are still being pinned.

**Requires:** [`stun-relay`](#stun-relay), [`srtp-hop-by-hop`](#srtp-hop-by-hop)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working |  |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- WARP header field widths, endianness, and the relay control messages.

[lookup page →](./relay/warp.md) · [↑ contents](#contents)

---

<a id="rtcp"></a>

### RTCP control

**`rtcp`** · status: review · features: audio, video · since: 0.1.0

The RTCP feedback and control packets exchanged on the media path of a call: a standard Sender Report (PT 200) carrying NTP/RTP timing and send counters, and two WhatsApp compact control reports (PT 208 and PT 209). It also specifies how a received packet is classified as RTP or RTCP when both share a port.

**Normative**

RTCP packets share the media 5-tuple with RTP and are protected as SRTCP
(see [srtp-hop-by-hop](#srtp-hop-by-hop)). Every RTCP packet defined here uses
RTP version 2 (the top two bits of byte 0 are `0b10`) and an 8-byte fixed
header of `version/padding/count`, `payload type`, and a big-endian 16-bit
`length` field. The `length` field MUST be set to the packet size in 32-bit
words minus one. All multi-byte integer fields are big-endian.

**Sender Report (PT 200).** A sender MAY emit a 28-byte Sender Report
describing its own stream. RC (report count) MUST be 0; the report carries no
reception report blocks. The layout MUST be:

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

- byte 0 MUST be `0x80` (V=2, P=0, RC=0); byte 1 MUST be `200`; the `length`
  field MUST be `6`.
- `sender SSRC` MUST be the sender's own synchronization source identifier
  (see [ssrc](#ssrc)).
- The NTP timestamp MUST encode the wall-clock send time as a 64-bit NTP value:
  the high 32 bits are seconds since the NTP epoch (1900-01-01), computed as
  `floor(now_ms / 1000) + 2208988800` truncated to 32 bits, and the low 32 bits
  are the fractional second, computed as `floor((now_ms mod 1000) / 1000 *
  2^32)`.
- `RTP timestamp` MUST be the RTP timestamp corresponding to the same instant
  as the NTP timestamp, in the sender stream's clock units.
- `sender's packet count` MUST be the total number of RTP data packets the
  sender has transmitted, and `sender's octet count` the total number of
  payload octets transmitted, both since the start of the stream.

**Compact report (PT 208).** A 12-byte compact control report binding a local
source to a remote source. The layout MUST be:

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

- byte 0 MUST be `0x81` (V=2, P=0, RC=1); byte 1 MUST be `208`; the `length`
  field MUST be `2`.
- The first SSRC word MUST be the local source and the second MUST be the
  remote source.

**Compact report (PT 209).** An 8-byte compact control report carrying only the
local source, used in the pre-speech phase. The layout MUST be:

```
 0               1               2               3
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|1 0|0|0 0 0 0 1|   PT = 209    |        length = 1             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        local SSRC                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- byte 0 MUST be `0x81` (V=2, P=0, RC=1); byte 1 MUST be `209`; the `length`
  field MUST be `1`.

**On-the-wire size with SRTCP.** Each report above is the cleartext RTCP. After
SRTCP protection an authenticated trailer of 14 bytes is appended (the SRTCP
E-flag/index word plus the authentication tag), so the PT 208 report is 26 bytes
on the wire, the PT 209 report is 22 bytes, and the Sender Report is 42 bytes.

**Classification (RTP vs. RTCP).** When demultiplexing a received packet that
shares a port with RTP media, a receiver MUST treat the packet as RTCP only if
all of the following hold; otherwise it MUST treat it as RTP:

- the packet is at least 22 bytes (the 8-byte header plus the 14-byte SRTCP
  trailer);
- the version bits (top two bits of byte 0) equal 2;
- byte 1, interpreted as an unsigned 8-bit value, is `>= 64`.

Because WhatsApp RTP sets the extension bit (`X=1`, byte 0 `0x90`) and carries a
7-bit payload type in the low bits of byte 1, a receiver MUST NOT classify a
packet as RTCP when the extension bit is set in byte 0 and the low 7 bits of
byte 1 equal the Opus RTP payload type. The RTCP payload type is then the full
byte 1, and the sender SSRC is bytes 4..8 of the packet.

**Findings**

The two compact reports (PT 208 and PT 209) use payload types in the
application/profile-specific range and are specific to WhatsApp; PT 209 is the
shorter, local-only form seen before speech begins, while PT 208 binds the
local source to the remote source once both endpoints are known. The Sender
Report follows RFC 3550 §6.4.1 with no reception report blocks (RC=0). The NTP
fraction is computed with floating-point scaling against 2^32 and the seconds
field is reduced modulo 2^32, matching the source arithmetic.

**Requires:** [`srtp-hop-by-hop`](#srtp-hop-by-hop), [`ssrc`](#ssrc), [`rtp-framing`](#rtp-framing)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working | origin of the rtcp.ts implementation this is ported from |
| [`meowcaller`](../flavors.md) | planned | relay modules are planned |

**Open questions**

- Trigger conditions and cadence for emitting PT 208 vs PT 209, and how often Sender Reports are sent.
- Semantics consumed by the peer/relay from the PT 208/209 compact reports beyond the SSRC binding.

**References**

- [RFC 3550 — RTP/RTCP](https://www.rfc-editor.org/rfc/rfc3550)
- [RFC 3711 — SRTP/SRTCP](https://www.rfc-editor.org/rfc/rfc3711)

[lookup page →](./relay/rtcp.md) · [↑ contents](#contents)

---

<a id="rtp-framing"></a>

### RTP framing

**`rtp-framing`** · status: review · features: audio, video · since: 0.1.0

The RTP packet framing that carries SRTP-protected Opus media: the fixed WhatsApp 16-byte speech header and 20-byte DTX/piggyback header (RTP extension profile 0xdebe), the Opus payload-type and payload classifiers, and the send-side sequencing of sequence number, timestamp, and marker bit.

**Normative**

Protected media MUST be carried in RTP version 2 packets. Audio uses payload
type **120** (Opus); a receiver MUST also accept payload type **121** as
WhatsApp Opus. The marker bit and the 7-bit payload type occupy byte 1
(`marker << 7 | (payloadType & 0x7f)`).

**Header layout.** Every packet MUST carry exactly one of two header shapes.
A plain speech packet MUST use the 16-byte header; a DTX or
warp-piggyback packet MUST use the 20-byte header, which sets the RTP
extension bit (`X=1`) and appends a single 0xdebe extension word.

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

20-byte DTX / piggyback header (16-byte header with ext length = 1 word,
followed by one 32-bit extension word):

    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |       0xdebe (ext profile)    |     ext length = 1 word       |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                       extension word                         |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

All multi-byte fields (sequence number, timestamp, SSRC, the 0xdebe profile,
the extension length, and the extension word) MUST be big-endian. The contributing
source count (CC) MUST be 0 and the padding bit (P) MUST be 0 for these headers.

Even when the 16-byte header carries no extension words, the sender MUST emit the
0xdebe extension profile tag with an extension length of 0; the `X` bit is therefore
0 for the 16-byte form (no extension block follows) and 1 for the 20-byte form.

**Extension word.** When the header is 20 bytes:

- For a DTX (comfort-noise) packet the extension word MUST be `0x30010000`.
- For a warp-piggyback packet the extension word MUST be the piggyback word
  computed for that packet (see [warp](#warp)).

**Payload classification.** The sender MUST select the header shape and marker
behaviour from the Opus payload:

- A payload is **DTX/comfort-noise** when: it is a single byte `0x10`, `0x88`,
  or `0x90`; or it is 2–15 bytes whose first byte `b0` satisfies
  `(b0 & 0xf8) == 0x08` or `b0 == 0x0a`; or it is ≤ 6 bytes with
  `(b0 & 0xf0) == 0x30`. DTX payloads MUST use the 20-byte header.
- A payload is an **Opus priming frame** when it equals one of the fixed
  priming frames. Priming and DTX payloads MUST NOT latch the speech marker.
- All other payloads are **speech** and MUST use the 16-byte header.

**Sequencing (send side).** A stream MUST start its sequence number at **1** and
its timestamp at **0**. Each emitted packet MUST advance the sequence number by 1
(wrapping modulo 2^16) and the timestamp by `samplesPerPacket` (wrapping modulo
2^32). The marker bit MUST be set on the first speech packet of the stream (the
speech onset); priming and DTX packets sent before speech MUST NOT set the marker
and MUST NOT latch the onset. Subsequent speech packets MUST NOT set the marker
unless an explicit marker is requested by the caller.

**Wire-size estimation.** Implementations MAY estimate the on-wire SRTP size of a
packet as `headerSize + payloadLength + authTagLength`, where `headerSize` is 16
for speech or 20 for DTX, and `authTagLength` is the SRTP auth tag length (see
[srtp-hop-by-hop](#srtp-hop-by-hop)): the short 4-byte tag applies to DTX packets
and to short speech packets (priming frames or payloads ≤ 18 bytes), and the
full 10-byte tag applies otherwise.

**Findings**

The 0xdebe extension profile is WhatsApp-specific and is present on every header,
distinguishing the 16-byte (zero extension words) and 20-byte (one extension word)
forms by the extension-length field alone. The DTX extension word `0x30010000` and
the header byte layouts are fixed.

On parse, only the fixed 12-byte RTP fields are decoded; the total header length is
computed from the version, CC, and (when `X=1`) the extension length so the payload
offset can be found without interpreting the extension word.

Opus speech frames produced by the mlow codec can be recognised by their first byte
(20 ms frames `0x48..0x4f`, 60 ms frames `0x50..0x57`) on payloads of at least 18
bytes; this classification does not change the RTP header shape, which is the
16-byte speech form.

**Requires:** [`warp`](#warp), [`srtp-hop-by-hop`](#srtp-hop-by-hop), [`opus`](#opus), [`ssrc`](#ssrc)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working | ported to whatsapp-rust from the zapo-caller src/media/rtp.ts framing |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Whether payload type 121 is used for a distinct media variant or is only accepted on receive.
- The full set of warp-piggyback extension words and the packet index at which piggybacking begins.

**References**

- [RFC 3550 — RTP](https://www.rfc-editor.org/rfc/rfc3550)
- [RFC 8285 — A General Mechanism for RTP Header Extensions](https://www.rfc-editor.org/rfc/rfc8285)

[lookup page →](./relay/rtp-framing.md) · [↑ contents](#contents)

---

<a id="ssrc"></a>

### SSRC allocation

**`ssrc`** · status: review · features: audio, video, group, screen-share · since: 0.1.0

How RTP synchronization-source identifiers (SSRCs) are deterministically derived for each participant and each relay media stream from the call id and the participant LID, and how the nine relay stream slots are ordered.

**Normative**

SSRCs are not negotiated or randomly chosen: every SSRC is **derived
deterministically** so that all peers and the relay independently compute the
same value for a given participant and stream slot.

**Per-stream SSRC derivation.** Each SSRC MUST be derived with HKDF-SHA256:

    salt = slotWord                   ; the slot index as a little-endian u32 (4 bytes)
    IKM  = callId                     ; the call id bytes
    info = participantLID             ; the participant's LID bytes
    L    = 4
    SSRC = u32_from_le_bytes(OKM)     ; the 4-byte OKM read back as a little-endian u32

The `slotWord` is the 4-byte little-endian encoding of the slot index used as
the HKDF salt. The 4-byte HKDF output MUST be interpreted as a little-endian
`u32` to obtain the 32-bit SSRC.

**Slot allocation.** A participant occupies a fixed plan of **nine** relay
stream slots. The slot words, in stream order, MUST be:

    [0, 1, 4, 2, 3, 5, 7, 8, 6]

An implementation that needs all nine of a participant's relay stream SSRCs
MUST derive them by applying the per-stream derivation above with each of the
nine slot words in this exact order; the resulting array index is the stream
index and the value at that index is the slot word fed to HKDF as the salt.

**Participant mapping.** Because `info = participantLID`, every participant's
SSRCs are distinct from every other participant's, and because `IKM = callId`,
SSRCs do not collide across unrelated calls. The same `participantLID` byte
string MUST be used for SSRC derivation as is used elsewhere as the HKDF
`info` for that participant (see [srtp-master-key](#srtp-master-key)).

**Participant LID formatting.** The participant LID used as `info` is the
device-qualified LID. A bare `@lid` JID (no device suffix) MUST be qualified
to device `0` — i.e. `<user>@lid` becomes `<user>:0@lid` — before use. A LID
that already carries a `:N@lid` device suffix MUST be passed through
unchanged. JIDs whose domain is not `lid` MUST be passed through unchanged.
Any resource part (after `/`) MUST be stripped first. On the receive path an
implementation MAY try the device-qualified `:0@lid` form and the bare
`@lid` form as candidate `info` values when matching a peer sender.

**Findings**

The nine-slot plan and the `[0, 1, 4, 2, 3, 5, 7, 8, 6]` slot-word ordering
come from the relay's stream-allocate plan: the array index is the position
in the relay's stream list, and the value is the salt word fed to HKDF, so the
on-wire stream order is a permutation of the natural slot indices. The
derivation is keyed only on `callId`, `participantLID`, and the slot word, so
no round-trip with the relay is required to learn a peer's SSRCs — a receiver
can precompute every expected SSRC for every known participant.

**Requires:** [`srtp-master-key`](#srtp-master-key)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working |  |
| [`zapo-caller`](../flavors.md) | working | original derivation ported from src/media/voip-crypto.ts |
| [`meowcaller`](../flavors.md) | planned | relay path is planned |

**Open questions**

- Semantic meaning of each of the nine slots (which slot carries audio vs. video vs. screen-share, and primary vs. RTX/FEC) is not pinned by the source.
- Whether the slot-word permutation is fixed for all client versions or negotiated/versioned.

**References**

- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)
- [RFC 3550 — RTP (SSRC)](https://www.rfc-editor.org/rfc/rfc3550)

[lookup page →](./relay/ssrc.md) · [↑ contents](#contents)

---

<a id="media-loop"></a>

### Media loop and session

**`media-loop`** · status: draft · features: audio, video · since: 0.1.0

The runtime media send/receive loop and the per-call session state machine: how a call session advances through its lifecycle phases, and how each outbound audio frame is sequenced, RTP-framed, end-to-end SRTP encrypted and WARP-tagged before it leaves the relay channel — and the reverse for inbound frames.

**Normative**

## Session state

A call MUST be tracked as a session holding, at minimum, the call id, the peer JID,
the call-creator JID, the direction (outgoing or incoming), and the current
lifecycle **phase**. The phase MUST be one of:

    Idle | Calling | Ringing | Connecting | Active | Ended

An outgoing session MUST start in `Idle`; an incoming session MUST start in
`Ringing`. Phase transitions MUST be validated; an out-of-order or illegal
transition MUST be rejected (a no-op) so a stray server message cannot advance a
torn-down call. The following transitions are legal, and all others (other than the
idempotent self-transition `x → x`, which MUST be accepted) MUST be rejected:

    Idle       → Calling      ; outgoing direction only
    Calling    → Ringing
    Ringing    → Connecting
    Connecting → Active
    <any phase except Ended> → Ended

`Ended` MUST be terminal: no transition out of `Ended` is legal. An incoming
session MUST NOT transition to `Calling`. Media MAY flow only while the session is
in `Active`.

## Media pipeline keying

The pipeline MUST derive two independent E2E-SRTP key sets from the call key (see
[srtp-master-key](#srtp-master-key)): the **send** keys, keyed by the sender's own
participant id, and the **recv** keys, keyed by the peer's participant id. The HKDF
`info` for the send direction MUST be the sender's own participant id so that the
peer — which derives *its* receive keys from the sender's id — can decrypt. Both
JIDs MUST be normalized with the E2E-SRTP participant-id rule (see [ssrc](#ssrc))
before key derivation. Inverting these two directions MUST NOT happen: it re-keys
the body and breaks interoperability.

## Outbound loop (protect)

For each audio frame to send, the implementation MUST, in order:

1. Obtain the next RTP header from the send sequencer. The RTP sequence number MUST
   start at 1 for the first packet and increment by 1 per packet; the RTP timestamp
   MUST advance by the per-packet sample count (`samples_per_packet`, e.g. 960 for a
   60 ms frame at 16 kHz); the payload type MUST be `120` for Opus media.
2. Advance the rollover counter (ROC) for the new sequence number.
3. Encode the RTP header bytes.
4. E2E-SRTP encrypt the Opus payload under the **send** keys, using the header's
   SSRC, the sequence number and the ROC as the keystream inputs (see
   [srtp-e2e](#srtp-e2e)).
5. Concatenate `rtp_header || encrypted_payload`.
6. Append the WARP message-integrity tag, computed over that concatenation under the
   send auth key with the ROC, to produce the final relay packet (see
   [warp](#warp)). The WARP MI tag is 4 bytes.

The resulting packet MUST be sent as one binary message on the relay media channel
(see [stun-relay](#stun-relay), [call-transport](#call-transport)).

## Inbound loop (unprotect)

For each relay packet classified as RTP (see [rtp-framing](#rtp-framing)), the
implementation MUST:

1. Reject the packet if it is shorter than `12 + 4` bytes (minimum RTP header plus
   WARP MI tag).
2. Strip the trailing 4-byte WARP MI tag.
3. Parse the RTP header and compute its byte length; reject the packet if there is
   no payload after the header.
4. E2E-SRTP decrypt the remaining payload under the **recv** keys, using the parsed
   SSRC, sequence number and the ROC.

The decrypted result is the Opus payload, to be handed to the decoder (see
[opus](#opus)).

## Codec parameters

Audio media MUST be Opus, mono, at 16 kHz, in 60 ms frames (`960` samples per
packet), encoded in VoIP application mode. Priming frames are fixed constant
payloads and MUST bypass the encoder (see [rtp-framing](#rtp-framing)).

**Findings**

The send sequencer initializes the RTP sequence number to 1 (not 0) and advances
the timestamp by `samples_per_packet` each packet. The Opus payload type is 120;
payload type 121 is also recognized as WhatsApp Opus media on the inbound path.

The ROC is tracked independently on the send side; on the inbound path a ROC of 0
is correct for in-order packets at the start of a stream, and a full ROC search is
part of the live receive path. The inbound path strips but does NOT verify the WARP
MI tag in the reference composition.

The reference Opus configuration is 25 kbps bitrate at complexity 9; the proprietary
"mlow" encode (see [mlow](#mlow)) is the on-wire WhatsApp codec, while standard
libopus at these parameters is accepted by the peer.

**Requires:** [`srtp-master-key`](#srtp-master-key), [`srtp-e2e`](#srtp-e2e), [`warp`](#warp), [`rtp-framing`](#rtp-framing), [`ssrc`](#ssrc), [`opus`](#opus), [`call-transport`](#call-transport), [`stun-relay`](#stun-relay)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../flavors.md) | working | session state machine and protect/unprotect pipeline composition; live relay flow over the channel is deferred |
| [`zapo-caller`](../flavors.md) | working | signalling + crypto + relay loop |
| [`meowcaller`](../flavors.md) | planned |  |

**Open questions**

- Full inbound ROC-recovery (rollover) algorithm for out-of-order and wrapped sequence numbers.
- Whether the WARP MI tag is verified on receive in the production client, and the failure policy if it is.
- Send-side pacing / DTX and comfort-noise behavior during the Active phase.
- Exact retransmission/jitter-buffer handling on the receive path.

**References**

- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)
- [RFC 3550 — RTP](https://www.rfc-editor.org/rfc/rfc3550)
- [RFC 6716 — Opus](https://www.rfc-editor.org/rfc/rfc6716)

[lookup page →](./relay/media-loop.md) · [↑ contents](#contents)

---
