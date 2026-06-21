<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Group call crypto

_Crypto · `group-call-crypto`_

`CRY-06` · _status: draft · audio, video, group, screen-share_

A single 32-byte call key is shared with every group-call participant, and each participant derives one SFrame key per sender keyed by that sender's participant id.

**Call key.** A group call MUST share one 32-byte `callKey` among all participants,
delivered to each recipient device in the offer's `<enc>` payload (see
[call-offer](../signalling/call-offer.md)). The same `callKey` is used by every member; there is no
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
nonce, carried in the SFrame header (see [sframe-media](../crypto/sframe-media.md)). The counter MUST
NOT repeat under a given sender key.

**Notes.** SFrame derivation differs from 1:1 E2E-SRTP: SFrame splits `callKey` into 16-byte
salt + 16-byte IKM (E2E-SRTP uses a 32-byte zero salt and the whole `callKey` as IKM);
SFrame uses AES-128-GCM with a 16-byte nonce (E2E-SRTP uses AES-128-CTR).

Requires: [`call-offer`](../signalling/call-offer.md), [`group-call`](../signalling/group-call.md), [`srtp-master-key`](../crypto/srtp-master-key.md), [`sframe-media`](../crypto/sframe-media.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | — | — |
| `zapo-caller` | working | — | — |
| `meowcaller` | planned | — | — |

**Annotation** `wacrg:CRY-06` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/crypto/group-call-crypto.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/crypto/group-call-crypto.yaml)

**Open questions**
- How a new participant joining mid-call obtains the existing callKey, and whether the callKey is rotated on membership change (join/leave).
- Whether a non-zero SFrame key_id is ever used for in-call key rotation, or it is always 0.
- Exact participant-id form (LID vs PN, device-suffix rules) used by the signaling layer to address each sender across all client versions.

**References**
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)
- [RFC 9605 — SFrame](https://www.rfc-editor.org/rfc/rfc9605)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[← in the full spec](../../index.md#group-call-crypto)
