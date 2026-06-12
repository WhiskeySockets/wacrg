<!-- Hand-written narrative how-to. Catalogue entry: ../spec/techniques.md (id: baileys-instrumentation). -->

# How-to: Baileys instrumentation

**Maturity:** established · **Reveals:** signaling, keying (envelope + session
context) · **Risk:** low

Where [WebSocket capture](websocket-capture.md) gives you raw decoded frames, Baileys
instrumentation gives you **already-parsed node objects** plus the client's own view
of the Signal session that keys a call. It is the natural second step: structured,
scriptable, and easy to wire straight into the capture intake format.

> **Scope of consent:** instrument **your own** build and accounts only. Log
> structure, not secrets — never write real key bytes anywhere. Sanitize before
> sharing. See [DISCLAIMER](../../DISCLAIMER.md) and [SECURITY](../../SECURITY.md).

## What it adds over raw capture

- Nodes arrive **parsed** (tag/attrs/children as objects), so you skip byte
  wrangling.
- You can **correlate** a `<call>` offer with the Signal session state that produced
  its `<enc>` nodes (e.g. whether the type is `pkmsg` because no session existed).
- Findings can be emitted directly in the shape the spec expects.

## Steps

1. **Clone and run [Baileys](https://github.com/WhiskeySockets/Baileys)** against a
   test account you own.
2. **Add hooks around node send/receive.** Wrap the point where the library parses
   inbound nodes and serializes outbound ones. Filter for `tag === 'call'` and the
   following `ack`/receipt.
3. **Tap session/keying state.** When an offer carries `<enc>`, record the envelope
   metadata (`v`, `type`, count of `<enc>` nodes) and, from the session, whether a
   prior Signal session existed — **without** logging key material.
4. **Emit structured findings.** Print a compact object per call node (tag, attrs,
   child summary, your interpretation, confidence). Optionally format it to drop
   straight into a `spec/stanzas/*.yaml` attribute list.
5. **Sanitize and upstream** via the Stanza capture form or a PR, with technique
   `baileys-instrumentation`.

## Tips & pitfalls

- The library only exposes what it implements — **gaps in Baileys are gaps here.**
  If a node shape isn't parsed, fall back to [raw capture](websocket-capture.md).
- WhatsApp evolves node shapes; pin the app/library versions you used in
  `provenance.sources` so reviewers can reproduce.
- This and a raw WebSocket capture observe the **same** wire data — they are *not*
  independent corroboration of each other for the corroboration rule.

See also: [keying](../encryption-keying.md), [signaling](../signaling.md).
