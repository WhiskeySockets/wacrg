<!-- Hand-written narrative. Complements the generated docs under docs/spec/. -->

# Transport: call signaling over the Noise WebSocket

Call *signaling* does not get its own connection. It rides the **same
Noise-protocol-encrypted WebSocket** that a WhatsApp multi-device client already
uses for messaging. To the transport layer, a `<call>` stanza is just another
WABinary node flowing through the established secure channel.

> Confidence: that signaling shares the messaging WebSocket and uses WABinary is
> `probable` — it follows directly from how multi-device clients are structured
> and is consistent across observation techniques. The byte-level framing details
> below are summarized from the WA multi-device messaging transport, which is the
> firmest part of this picture.

## The stack underneath a `<call>` node

From the bottom up, a signaling stanza is wrapped like this:

```
TCP
  └─ WebSocket (binary frames)
       └─ Noise protocol (XX handshake, then encrypted transport)
            └─ WABinary frame (length-prefixed, often compressed)
                 └─ <call> node (tag + attributes + children)
                      └─ <enc> payloads = Signal-protocol ciphertext
```

- **Noise** establishes the link-level encrypted channel during connection setup
  (an `XX`-style handshake binding the client's Noise static key to its
  registration identity). After the handshake, every frame is encrypted under the
  negotiated transport keys. This protects *all* traffic on the socket — messages
  and calls alike — from anyone between the client and WhatsApp's edge.
- **WABinary** is WhatsApp's compact binary XML-like encoding. A node has a
  **tag**, a map of **attributes**, and an ordered list of **children** (more
  nodes, or a byte payload). A token dictionary substitutes common strings with
  single-byte tokens; payloads may be compressed. The result is an XMPP-shaped
  tree expressed in bytes. Throughout the spec we render nodes as XML for
  readability, but on the wire they are WABinary.

## Relationship to messaging

Calls reuse the messaging plumbing almost entirely:

- **Same socket, same Noise session.** No separate handshake for calls.
- **Same node grammar.** `<call>` sits alongside `<message>`, `<iq>`,
  `<receipt>`, `<ack>`, and friends as a top-level routable stanza.
- **Same server routing and acknowledgements.** Call stanzas are
  store-and-forward routed between devices, and the server emits `<ack>` /
  receipt nodes just as it does for messages.
- **Same Signal sessions for E2E payloads.** The `<enc>` nodes inside a call
  offer use the *exact same* per-device Signal sessions (X3DH + Double Ratchet)
  that encrypt message content. Keying for a call therefore piggybacks on
  sessions that already exist from messaging — see
  [encryption & keying](encryption-keying.md).

The main thing that is *call-specific* is the `<call>` tag family and its
semantics. Everything below it (Noise, WABinary, routing, acks, Signal sessions)
is shared infrastructure.

## Why this matters for capture

Because signaling shares the messaging socket:

- A technique that can already observe decrypted WABinary nodes (for example,
  **WebSocket capture** at the framing boundary, or **Baileys instrumentation**
  that logs parsed nodes) sees call stanzas "for free" — they appear in the same
  node stream. This is why the [`websocket-capture`](spec/techniques.md) and
  `baileys-instrumentation` techniques target the **signaling** layer.
- Conversely, observing signaling tells you nothing directly about the **media**
  plane (SRTP/UDP), which never crosses this socket. Media-plane facts require
  different techniques and are correspondingly lower-confidence — see
  [media / SRTP](media-srtp.md).
- The `<enc>` payloads are Signal ciphertext even *inside* the Noise channel, so
  reading the media key requires access to the device's Signal session state, not
  just the socket. That two-layer encryption (Noise link + Signal end-to-end) is
  the reason the WA server can route a call without learning its keys.

## Open questions

- Exact WABinary token-dictionary entries used by current `<call>` stanzas, and
  whether any call-specific tokens exist beyond the shared messaging set.
- Whether any call control ever uses a non-`<call>` transport path (e.g.
  `<iq>`-based negotiation) under specific conditions.
- Framing-level differences, if any, between platforms (Android vs. iOS vs. Web)
  for the same logical stanza.

These are tracked as `open_questions` on the relevant stanza entries in the
[generated spec](spec/stanzas/index.md).
