<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call accept stanza

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `call-accept`

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
(see [srtp-master-key](../crypto/srtp-master-key.md)), matching the offer's `encopt`.

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
a `<preaccept>` (see [call-preaccept](../signalling/call-preaccept.md)) before the `<accept>`. The
`<accept>` and `<offer>` share the `call-id`/`call-creator` correlation and the
`encopt keygen="2"` key path, so both ends agree on v2 SRTP keying before media
starts. The audio-rate selection in the accept is the lever that steers the
negotiated codec: advertising only 8 kHz keeps the peer on RFC narrowband Opus,
while 16 kHz selects the wideband path. The relay `<te>`, `<rte>`, and
`<voip_settings>` children are optional and are populated once the callee has
resolved its relay allocation.

**Requires:** [`call-offer`](../signalling/call-offer.md), [`call-preaccept`](../signalling/call-preaccept.md), [`srtp-master-key`](../crypto/srtp-master-key.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working |  |
| [`meowcaller`](../../flavors.md) | planned |  |

**Open questions**

- Byte layout and semantics of the <te priority=2> relay transport-endpoint blob.
- Contents of the <rte> relay-token-extension blob and the <voip_settings uncompressed=1> body.
- Whether the server enforces the <accept> child order with a 439-style rejection as it does for <offer>.

**References**

- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)

---

[in the full RFC →](../index.md#call-accept) · [RFC contents](../index.md#contents)
