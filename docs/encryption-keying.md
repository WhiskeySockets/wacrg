<!-- Hand-written narrative. Complements the generated docs under docs/spec/. -->

# Encryption & keying

A WhatsApp call is end-to-end encrypted. The mechanism reuses the **Signal
protocol** sessions that already secure messaging: the call/media key is wrapped
in an `<enc>` node inside the [signaling](signaling.md) offer, encrypted to each
peer *device*, and the [SRTP media keys](media-srtp.md) are derived from it.

> Confidence map for this page: the call key being delivered via Signal `<enc>`
> and multi-device fan-out are `probable`. The `pkmsg`/`msg` distinction is
> `probable`. The **SRTP key-derivation** steps are `speculative` and clearly
> marked. Where this page describes a KDF or label, assume it is a hypothesis to
> be tested, not a fact.

## Two encryption layers

Do not confuse the two layers that protect a call stanza:

1. **Noise (link layer).** The whole WebSocket is Noise-encrypted, so the server
   sees only ciphertext on the wire. This protects against on-path observers but
   *not* against the server itself — see [transport](transport-noise.md).
2. **Signal (end-to-end layer).** The `<enc>` payloads inside the offer are
   additionally encrypted with the recipient device's Signal session. The server
   routes them but **cannot read** them. This is what makes the call's key
   material end-to-end encrypted.

The media key therefore enjoys end-to-end protection: only the peer devices that
hold the relevant Signal session can unwrap it.

## How the media key travels

The media key is carried inside `<enc>` nodes in the `<offer>`:

```xml
<enc v="2" type="pkmsg">…Signal ciphertext (per device)…</enc>
```

- The plaintext inside the ciphertext is (believed to be) the **call/media key**
  — the shared secret from which both sides derive SRTP keys.
- It is encrypted using the standard WhatsApp/Signal stack: **X3DH** to establish
  a session if one does not exist, then the **Double Ratchet** for ongoing
  messages. Because messaging has usually already established these sessions, a
  call typically reuses them.

### `pkmsg` vs. `msg`

The `<enc type>` attribute mirrors Signal's message types:

- **`pkmsg`** — a *PreKeyWhisperMessage*. Sent when there is **no existing
  session** with the target device; it bundles the X3DH material needed to
  establish one. You will see this for a first-ever contact or a device you have
  not messaged before.
- **`msg`** — a *WhisperMessage*. Sent when a session **already exists**; it is
  just the next Double Ratchet message. This is the common case between people
  who already chat.

So the same logical key can ship as `pkmsg` to one device and `msg` to another in
the same offer, depending on session state.

## Multi-device fan-out

WhatsApp is multi-device: an account can have several linked devices, each with
its **own** Signal identity. A call must be decryptable by whichever of the
callee's devices answers, so the offer **fans out** the media key:

- The caller produces **one `<enc>` per target device**, each encrypting the same
  call key to that device's Signal session.
- An offer to a callee with, say, a phone plus two linked companions therefore
  carries multiple `<enc>` nodes, with `type` (`pkmsg`/`msg`) varying per device
  based on session state.
- The caller's *own* other devices may also need the key (so the call shows up
  correctly across the caller's devices), following the same per-device pattern.

This is the same fan-out model as encrypted messaging; calls inherit it directly.

## SRTP key derivation

This is the **most speculative** part of the whole spec.

Once both endpoints hold the shared call/media key, the [media plane](media-srtp.md)
needs concrete **SRTP master keys and salts**. The expectation is that a **key
derivation function** expands the call key into the SRTP keying material, likely:

- per-direction keys (send vs. receive), and
- possibly periodic rekeying for long calls.

**What we do not know:** the exact KDF, the input labels/context, the SRTP cipher
suite the keys feed, and whether the derivation incorporates call-id or other
signaling fields as salt. None of this is confirmed. It is captured as
`open_questions` and will only move to `probable` when a technique that can
observe derived SRTP keys (e.g. [Frida hooking](spec/techniques.md) of the media
engine, or a memory dump) corroborates a hypothesis.

## What this means for contributors

- A capture of an **offer** can reveal `<enc>` structure, `type` values, and
  per-device fan-out *without* exposing key plaintext — and it **must not**
  expose plaintext. Replace all ciphertext with placeholders (see
  [sanitization](legal-and-ethics.md)).
- Confirming the **key-derivation** path is the highest-value, hardest target.
  If you attempt it, use **synthetic test accounts only** and follow the
  [capture pipeline](methodology/capture-pipeline.md).

## Open questions

- Exact contents of the `<enc>` plaintext (is it solely the media key, or a
  small structure?).
- The meaning of `<encopt keygen>` and `<enc v>` version values.
- The SRTP KDF, labels, cipher suite, and rekey policy.
- How key material is coordinated across the caller's own multi-device set.
