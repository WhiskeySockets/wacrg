<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# WhatsApp Calls — the RFC

The normative specification of the WhatsApp call stack, compiled from `spec/rfc/`. Each section is citable by its stable id (e.g. `call-offer`); implement to these descriptions to interoperate. Every section also has its own lookup page, and libraries follow changes via the [feed](./feed.json) (see [updates](./updates.md)).

!!! warning "Work in progress"
    Sections marked `draft`, or carrying open questions, are not yet pinned to the wire. Trust the status badge and the `Implemented by` table over the prose.

## Contents

- **[Signalling](#signalling)**
    - [Call offer stanza](#call-offer) · `call-offer`
    - [Group call setup](#group-call) · `group-call`
    - [Raise hand](#raise-hand) · `raise-hand`
    - [In-call emoji reactions](#reactions) · `reactions`
    - [Screen sharing](#screen-share) · `screen-share`
- **[Encodings](#encodings)**
    - [MLow audio codec](#mlow) · `mlow`
    - [Video codec](#video) · `video`
- **[Crypto](#crypto)**
    - [SRTP master key and salt derivation](#srtp-master-key) · `srtp-master-key`
    - [Hop-by-hop SRTP](#srtp-hop-by-hop) · `srtp-hop-by-hop`
    - [SFrame media end-to-end encryption](#sframe-media) · `sframe-media`
- **[Relay](#relay)**
    - [STUN relay handshake](#stun-relay) · `stun-relay`
    - [WARP relay framing](#warp) · `warp`

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

Reconstructed op-by-op from the WhatsApp Web WASM and pinned byte-exact against
captured decode vectors. The receive (decode) path is the priority for a working
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

<a id="crypto"></a>

## Crypto

Keying and media protection: SRTP (hop-by-hop and end-to-end), SFrame, WARP, group-call crypto.

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

HKDF here rests on a proven primitive — the Layer-1 derivation is verified against
the RFC 5869 Appendix A known-answer test in at least one implementation. All
derived keys are distinct per participant LID, so each peer's media is keyed
independently.

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

<a id="relay"></a>

## Relay

The media transport and relay stack: STUN, the relay handshake, RTP/RTCP framing, and the media loop.

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
