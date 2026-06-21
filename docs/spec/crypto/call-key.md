<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Call key establishment

_Crypto - `call-key`_

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
session and place the ciphertext in an `<enc>` node (see [call-offer](../signalling/call-offer.md)):

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

Requires: [`call-offer`](../signalling/call-offer.md), [`srtp-master-key`](../crypto/srtp-master-key.md), [`sframe-media`](../crypto/sframe-media.md), [`warp`](../relay/warp.md)  
Breakdown: [`srtp-e2e`](../crypto/srtp-e2e.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [:material-github: history](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/sframe.rs) - [:material-github: blame](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/sframe.rs) - commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `zapo-caller` | working | — | — |
| `meowcaller` | planned | — | — |

**Annotation** `wacrg:CRY-01` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Vini - [:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/crypto/call-key.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/crypto/call-key.yaml)

**Open questions**
- How the caller generates the 32-byte call key (CSPRNG source / any structure) is not revealed by the keying code, which only consumes it.
- Exact serialization of the Signal plaintext that carries the call key, and how raw_e2e is framed alongside it under keygen=2.
- Whether the call key is regenerated per offer or reused across re-offers / call legs.

**References**
- [Signal Protocol (X3DH + Double Ratchet)](https://signal.org/docs/)
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#call-key)
