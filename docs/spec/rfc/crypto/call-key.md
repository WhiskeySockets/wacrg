<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call key establishment

**Category:** [Crypto](../index.md#crypto)  
**Part id:** `call-key`

**`call-key`** · status: draft · features: audio, video, group · since: 0.1.0

How the 32-byte call key is established for a call and delivered to each recipient device inside the offer's per-device Signal-encrypted <enc> payload, and the role it plays as the root secret for all per-call media keying.

**Normative**

Every 1:1 call is rooted in a single shared secret, the **call key** (`callKey`),
a 32-byte value. The call key is the input keying material from which every
per-call media key is derived: the end-to-end SRTP master secret (see
[srtp-master-key](../crypto/srtp-master-key.md)), the per-participant SFrame keys (see
[sframe-media](../crypto/sframe-media.md)), and the WARP authentication key (see [warp](../relay/warp.md)).

**Length.** Implementations MUST treat the call key as exactly 32 bytes. All
downstream key-derivation functions consume the full 32 bytes:

    derive_e2e_keys      : HKDF IKM = callKey[0..32]
    derive_e2e_sframe_key: salt = callKey[0..16], IKM = callKey[16..32]
    derive_warp_auth_key : HKDF IKM = callKey[0..32]

A call key shorter than 32 bytes MUST be rejected; no key derivation is defined for
it.

**Delivery.** The caller MUST deliver the call key to each recipient device by
encrypting it to that device's Signal session and placing the ciphertext in an
`<enc>` node, as described in [call-offer](../signalling/call-offer.md). The `<enc>` node MUST carry:

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

**Requires:** [`call-offer`](../signalling/call-offer.md), [`srtp-master-key`](../crypto/srtp-master-key.md), [`sframe-media`](../crypto/sframe-media.md), [`warp`](../relay/warp.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working |  |
| [`meowmeow`](../../flavors.md) | working | consumes the call key for crypto keying; does not handle <enc> delivery/signalling |
| [`meowcaller`](../../flavors.md) | planned |  |

**Open questions**

- How the caller generates the 32-byte call key (CSPRNG source / any structure) is not revealed by the keying code, which only consumes it.
- Exact serialization of the Signal plaintext that carries the call key, and how raw_e2e is framed alongside it under keygen=2.
- Whether the call key is regenerated per offer or reused across re-offers / call legs.

**References**

- [Signal Protocol (X3DH + Double Ratchet)](https://signal.org/docs/)
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)

---

[in the full RFC →](../index.md#call-key) · [RFC contents](../index.md#contents)
