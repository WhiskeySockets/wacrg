<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call Offer

**Tag:** `<call>`  
**Category:** signaling  
**Status:** draft  
**Spec version:** 0.1.0  
**Direction:** outgoing, incoming

## Summary

The opening stanza of a 1:1 call. A caller device emits a top-level <call> node whose <offer> child describes the proposed session: the requested media (audio and/or video), network information, device capabilities, encryption options, the per-recipient-device media key wrapped in one or more Signal <enc> payloads, and the caller's candidate transport endpoints. The server routes the stanza to the callee's devices and returns an <ack>; the callee answers with a <call> carrying <preaccept>, <accept>, <reject> or <terminate>. Because WhatsApp is multi-device, a single offer typically fans out to every companion device of the callee, with a distinct <enc> node per device. All field-level details below are a working model derived from synthetic reasoning and prior WABinary knowledge; no real capture has confirmed them yet.

## Attributes

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `from` | `jid` | yes | probable | JID of the caller. On outgoing offers the client usually omits this and the server stamps it; on the copy delivered to the callee it identifies the calling account (and, in multi-device, often the specific calling device). <br/>_observed:_ `A@s.whatsapp.net`, `A.0:12@s.whatsapp.net` | techniques: websocket-capture, baileys-instrumentation; sources: Analogy to message stanza routing in WA multi-device |
| `to` | `jid` | yes | probable | JID of the callee account the offer is addressed to. The server fans the stanza out to the callee's registered devices. <br/>_observed:_ `B@s.whatsapp.net` | techniques: websocket-capture; sources: none |
| `id` | `string` | yes | probable | Stanza id used to correlate the server <ack>/receipt with this <call>. This is the transport-level message id, distinct from the call-id that identifies the logical call session. <br/>_observed:_ `1A2B3C4D5E` | techniques: websocket-capture, baileys-instrumentation; sources: none |
| `t` | `timestamp` | no | speculative | Unix timestamp (seconds) at which the offer was created. Presence and exact semantics are unconfirmed; some call stanzas carry a t attribute, others appear to rely on the offer child's own timing. <br/>_observed:_ `1733779200` | techniques: websocket-capture; sources: none |

## Children

### `<offer>`

**occurrence:** 1 - **confidence:** probable

Container describing the proposed call. Carries the logical call-id and the identity of the call creator, and groups all of the media, network, capability, encryption and transport descriptors.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `call-id` | `string` | yes | probable | Opaque identifier of the logical call session. Echoed verbatim in every subsequent stanza for this call (preaccept/accept/reject/terminate) so both ends and the server can correlate them. <br/>_observed:_ `CALLID-0001-synthetic` | techniques: websocket-capture, baileys-instrumentation; sources: none |
| `call-creator` | `jid` | yes | probable | JID of the device/account that created the call. Used by the callee and server to attribute control stanzas (e.g. terminate) to the originator. <br/>_observed:_ `A@s.whatsapp.net` | techniques: websocket-capture; sources: none |

#### `<audio>`

**occurrence:** 0..1 - **confidence:** probable

Audio media descriptor. Present for any call that requests audio, which is effectively all 1:1 calls. Advertises the codec sample rate and an encryption marker.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `enc` | `string` | no | speculative | Marks the audio stream as encrypted and/or selects the SRTP profile. The exact value vocabulary is unknown; it may name a codec/crypto suite or simply be a boolean-like flag. <br/>_observed:_ `opus` | techniques: websocket-capture; sources: none |
| `rate` | `int` | no | speculative | Advertised audio sample rate in Hz (Opus is typically negotiated at 16000 or 48000). Whether this is a hard requirement or a hint is unconfirmed. <br/>_observed:_ `16000`, `48000` | techniques: websocket-capture, frida-hooking; flavors: zapo-caller, whatsapp-rust; sources: Reconstructed: two <audio enc=opus rate=8000\|16000> nodes |

#### `<video>`

**occurrence:** 0..1 - **confidence:** speculative

Video media descriptor, present only for video calls. Advertises the video codec and an encryption/orientation marker analogous to <audio>. Shape is inferred and not yet observed in a real capture.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `enc` | `string` | no | speculative | Encryption/codec marker for the video stream (e.g. a VP8/H264 hint). <br/>_observed:_ `vp8` | techniques: websocket-capture; sources: none |
| `orientation` | `int` | no | speculative | Initial camera orientation in degrees; existence unconfirmed. <br/>_observed:_ `0`, `90` | techniques: frida-hooking; sources: none |

#### `<net>`

**occurrence:** 0..1 - **confidence:** speculative

Network information advertised by the caller (e.g. connection medium and a coarse network identifier). Helps the server and peer choose relay strategy. Both presence and attribute names are speculative.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `medium` | `int` | no | speculative | Connection medium hint (e.g. an enum distinguishing cellular vs wifi). <br/>_observed:_ `1`, `3` | techniques: frida-hooking, static-smali-analysis; sources: none |

#### `<capability>`

**occurrence:** 0..1 - **confidence:** probable

Device capability descriptor. The payload is commonly an opaque binary blob (a packed bitfield/version structure) rather than readable XML, so captures usually show it as bytes. Advertises which call features the caller's build supports.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `ver` | `int` | no | probable | Capability format version, selecting how the binary payload is interpreted. <br/>_observed:_ `1`, `2` | techniques: websocket-capture, static-smali-analysis; flavors: zapo-caller, whatsapp-rust; sources: Reconstructed: ver=1 body is a fixed 7-byte blob 01 05 f7 09 e4 bb 13 |

#### `<encopt>`

**occurrence:** 0..1 - **confidence:** probable

Encryption options for the call. Notably carries the keygen attribute that indicates which key-generation scheme produced the media key wrapped in the sibling <enc> nodes.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `keygen` | `int` | no | probable | Key-generation scheme version for the call/media key. Couples the <enc> payload format to a derivation method the callee must use to recover the SRTP master key. <br/>_observed:_ `1`, `2` | techniques: websocket-capture, frida-hooking; flavors: zapo-caller, whatsapp-rust; sources: Reconstructed: keygen=2 selects the v2 <raw_e2e> SRTP key path |

#### `<enc>`

**occurrence:** 1..n - **confidence:** probable

The keying payload. One <enc> node per recipient device: the call/media key is encrypted to that device using the existing Signal session, so the ciphertext is a Signal message. With several companion devices an offer carries several <enc> nodes. The child text/byte content is the Signal ciphertext and is never human-readable.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `v` | `int` | no | probable | Envelope/version of the enc payload format. <br/>_observed:_ `2` | techniques: websocket-capture, baileys-instrumentation; sources: none |
| `type` | `string` | yes | probable | Signal message type. pkmsg (PreKeySignalMessage) when establishing a new session with the target device, otherwise msg (SignalMessage) when an established session already exists. Mirrors the same attribute on message <enc> nodes. <br/>_observed:_ `pkmsg`, `msg` | techniques: websocket-capture, baileys-instrumentation; sources: Mirrors message-layer enc.type semantics |
| `count` | `int` | no | speculative | Possible retry/rekey counter seen on some enc nodes; semantics for calls are unconfirmed. <br/>_observed:_ `0`, `1` | techniques: baileys-instrumentation; sources: none |

#### `<destination>`

**occurrence:** 0..1 - **confidence:** probable

Transport candidate list. Wraps one or more endpoint entries (<te> or <endpoint>) describing relay/host candidates the peer can use to reach the caller's media, optionally annotated with measured latency. This is the bridge from signaling into the SRTP-over-UDP media path.

##### `<te>`

**occurrence:** 0..n - **confidence:** speculative

A single transport endpoint candidate (relay or host). Naming is uncertain: captures may use <te>, <endpoint>, or a flat list of attributes on <destination>. Carries an address/port and a latency hint.

**Attributes**

| Name | Type | Required | Confidence | Description | Provenance |
| --- | --- | --- | --- | --- | --- |
| `ip` | `string` | no | speculative | Candidate IP address (synthetic example only; real values are PII-sensitive). <br/>_observed:_ `203.0.113.10` | techniques: websocket-capture; sources: none |
| `port` | `int` | no | speculative | Candidate UDP port for media. <br/>_observed:_ `3478`, `50000` | techniques: websocket-capture; sources: none |
| `latency` | `int` | no | speculative | Measured/estimated round-trip latency to this relay in milliseconds. <br/>_observed:_ `18`, `42` | techniques: websocket-capture; sources: none |

## Examples

### Illustrative outgoing audio offer (synthetic)

> Synthetic and sanitized, not a real capture. Element/attribute shapes are a working hypothesis. The <enc> payload is shown as a placeholder; in reality it is opaque Signal ciphertext. A single recipient device is shown; multi-device offers repeat <enc> per device.


```xml
<call from="A@s.whatsapp.net" to="B@s.whatsapp.net" id="1A2B3C4D5E">
  <offer call-id="CALLID-0001-synthetic" call-creator="A@s.whatsapp.net">
    <audio enc="opus" rate="16000"/>
    <net medium="3"/>
    <capability ver="2"><!-- opaque binary capability blob --></capability>
    <encopt keygen="2"/>
    <enc v="2" type="pkmsg"><!-- Signal ciphertext: wrapped media key --></enc>
    <destination>
      <te ip="203.0.113.10" port="3478" latency="18"/>
    </destination>
  </offer>
</call>
```

### Illustrative multi-device audio offer with two recipient devices (synthetic)

> Synthetic and sanitized. Demonstrates one <enc> per callee companion device; the type differs depending on whether a Signal session already exists with each device (pkmsg establishes, msg reuses).


```xml
<call from="A@s.whatsapp.net" to="B@s.whatsapp.net" id="1A2B3C4D5F">
  <offer call-id="CALLID-0002-synthetic" call-creator="A@s.whatsapp.net">
    <audio enc="opus" rate="16000"/>
    <encopt keygen="2"/>
    <enc v="2" type="pkmsg"><!-- key for device B.0 --></enc>
    <enc v="2" type="msg"><!-- key for device B.12 --></enc>
    <destination>
      <te ip="203.0.113.10" port="3478" latency="18"/>
      <te ip="198.51.100.7" port="50000" latency="42"/>
    </destination>
  </offer>
</call>
```

## Notes

The offer simultaneously performs three jobs: it signals intent to call, it delivers the media key (keying) to each peer device via Signal, and it seeds the transport negotiation (candidate endpoints). Keeping those concerns in one stanza is why call-offer is the richest node in the corpus. Two working reconstructions (zapo-caller in TypeScript, ported into whatsapp-rust in Rust) now corroborate the structure and pin the load-bearing details: the child order is mandatory and the server rejects a mis-ordered offer with error 439. The exact order is privacy -> audio(8000) -> audio(16000) -> net(medium=3) -> capability -> (destination \| enc) -> encopt(keygen=2) -> device-identity. The <capability ver="1"> body is a fixed 7-byte blob (01 05 f7 09 e4 bb 13). See the full stanza reference at docs/signaling/stanza-reference.md.

## Open questions

- Resolved: media is advertised as two <audio enc="opus" rate="8000|16000"> nodes (reconstruction).
- Resolved: <capability> is a fixed 7-byte blob with ver="1" (01 05 f7 09 e4 bb 13 for offer); the packed bit meaning is still open.
- Resolved: encopt keygen="2" selects the v2/<raw_e2e> SRTP key path (see docs/keying/srtp-key-schedule.md).
- Resolved: transport candidates are carried as <te> blobs; multi-device fan-out uses <destination><to jid><enc>.
- Does the offer include an explicit media-key length or salt, or is everything derived from the Signal plaintext?
- What do the individual bits of the capability blob encode (feature flags, build version)?

## References

- [Signal Protocol (X3DH + Double Ratchet) overview](https://signal.org/docs/)
- [Baileys (WhatsApp Web multi-device library)](https://github.com/WhiskeySockets/Baileys)
- [whatsapp-rust voip stanza builders (reconstruction)](https://github.com/jlucaso1/whatsapp-rust)
- [wacrg stanza reference](docs/signaling/stanza-reference.md)

---

[Back to stanza catalog](./index.md) - [Spec overview](../index.md)
