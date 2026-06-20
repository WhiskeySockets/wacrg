<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call offer stanza

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `call-offer`

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
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working |  |
| [`meowcaller`](../../flavors.md) | planned |  |

**Open questions**

- Full meaning of the packed <capability> bitfield.
- Whether an explicit media-key length/salt is carried, or all is derived from the Signal plaintext.

**References**

- [Signal Protocol (X3DH + Double Ratchet)](https://signal.org/docs/)

---

[in the full RFC →](../index.md#call-offer) · [RFC contents](../index.md#contents)
