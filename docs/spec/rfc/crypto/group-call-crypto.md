<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Group call crypto

**Category:** [Crypto](../index.md#crypto)  
**Part id:** `group-call-crypto`

**`group-call-crypto`** · status: draft · features: audio, video, group, screen-share · since: 0.1.0

How per-sender media keys are derived and distributed in a group call: a single shared call key is delivered to every participant, and each participant derives one independent SFrame key per sender (keyed by that sender's participant id), so every member can decrypt every other member without a per-pair key exchange.

**Normative**

A group call MUST share a single 32-byte **call key** (`callKey`) among all
participants. The call key is delivered to each recipient device in the offer's
`<enc>` payload (see [call-offer](../signalling/call-offer.md)); group fan-out and membership are
governed by [group-call](../signalling/group-call.md). The same `callKey` is used by every member —
there is no per-pair key.

**Per-sender SFrame keys.** Media is sealed end-to-end with a per-sender SFrame key
(see [sframe-media](../crypto/sframe-media.md) for the frame format). A sender's key MUST be
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
GCM nonce and is carried in the SFrame header (see [sframe-media](../crypto/sframe-media.md)). The
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

**Requires:** [`call-offer`](../signalling/call-offer.md), [`group-call`](../signalling/group-call.md), [`srtp-master-key`](../crypto/srtp-master-key.md), [`sframe-media`](../crypto/sframe-media.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working |  |
| [`meowmeow`](../../flavors.md) | working | crypto keying path; codec only otherwise |
| [`meowcaller`](../../flavors.md) | planned |  |

**Open questions**

- How a new participant joining mid-call obtains the existing callKey, and whether the callKey is rotated on membership change (join/leave).
- Whether a non-zero SFrame key_id is ever used for in-call key rotation, or it is always 0.
- Exact participant-id form (LID vs PN, device-suffix rules) used by the signaling layer to address each sender across all client versions.

**References**

- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)
- [RFC 9605 — SFrame](https://www.rfc-editor.org/rfc/rfc9605)

---

[in the full RFC →](../index.md#group-call-crypto) · [RFC contents](../index.md#contents)
