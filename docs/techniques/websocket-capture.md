<!-- Hand-written narrative how-to. Catalogue entry: ../spec/techniques.md (id: websocket-capture). -->

# How-to: WebSocket / WABinary capture

**Maturity:** established · **Reveals:** signaling, the `<enc>` keying envelope ·
**Risk:** low

This is the cheapest technique and the recommended starting point. Because call
signaling rides the same Noise-encrypted WhatsApp multi-device WebSocket as
messaging, the entire `<call>` stanza family becomes visible once you decode the
WABinary frames on an account you control.

> **Scope of consent:** do this only with **your own** account(s) and contacts who
> have agreed to test with you. Never capture another person's call without consent.
> Commit only **synthetic or fully sanitized** stanzas, never real JIDs, phone
> numbers, keys, or media. See [DISCLAIMER](../../DISCLAIMER.md).

## What you can and cannot see

| You **can** see | You **cannot** see |
| --- | --- |
| `<call>` / `<offer>` / `<accept>` / `<terminate>` and related node trees | the SRTP/RTP media plane (different transport) |
| attributes: `call-id`, `call-creator`, timestamps, reasons | the plaintext call/media key inside `<enc>` |
| the `<enc>` envelope: `v`, `type` (`pkmsg`/`msg`), and that ciphertext exists | derived keys or codec negotiation internals |

## Steps

1. **Stand up a multi-device session you control.** A scriptable client such as
   [Baileys](https://github.com/WhiskeySockets/Baileys) is the simplest path. It
   already speaks the Noise handshake and exposes a WABinary decoder.
2. **Log frames at the transport boundary.** After Noise decryption, every inbound
   and outbound frame is a WABinary node. Dump the decoded node tree (tag, attrs,
   children) for anything whose tag is `call`, plus the `ack`/receipt that follows.
3. **Place a test call** between two devices you own (or with a consenting tester).
   Capture the full lifecycle: offer → ack → (pre)accept → terminate.
4. **Isolate the `<call>` nodes** and pretty-print the tree. Note the attribute
   names and values, the child nodes (`<audio>`, `<enc>`, `<destination>`, and
   others), and their order.
5. **Sanitize.** Replace real JIDs with `A@s.whatsapp.net` / `B@s.whatsapp.net`,
   redact any base64 ciphertext to a short placeholder, strip timestamps to
   relative values.
6. **Upstream it.** File a **Stanza capture** Issue Form (or PR a
   `spec/stanzas/*.yaml`) with technique `websocket-capture`, an honest confidence
   (usually `probable` for a single clean capture), and what you decoded.

## Tips & pitfalls

- The same offer may contain multiple `<enc>` nodes (one per recipient device).
  Record how many and their `type`, even though the payloads are opaque.
- Attribute presence can vary by audio vs video and by client build. Capture both
  and note the build.
- A WebSocket capture is not independent corroboration of another WebSocket
  capture of the same build. To push a fact toward `confirmed`, pair it with a
  different technique (e.g. [Frida](frida-hooking.md)).

See also: [signaling overview](../signaling.md), [keying](../encryption-keying.md),
and the [capture pipeline](../methodology/capture-pipeline.md).
