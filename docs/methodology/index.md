<!-- Hand-written narrative. Complements the generated docs under docs/spec/. -->

# Methodology

wacrg exists because no single reverse-engineering technique tells the whole
story. Each maintainer reaches the WhatsApp call protocol through a different
lens, and each lens has blind spots. The methodology combines those
views into one spec where every fact is traceable and honestly graded.

## The multi-technique approach

There is a fixed set of seven techniques (the only values allowed in
`provenance.techniques` and `capture.source.technique`). Each reveals different
layers of the protocol:

| Technique id | Best at seeing | Notes |
| --- | --- | --- |
| `websocket-capture` | signaling | Reads decrypted WABinary nodes at the framing boundary. Cheap; sees `<call>` stanzas for free. Blind to media. |
| `baileys-instrumentation` | signaling, keying | Logs parsed nodes and session state from inside a client. Can observe `<enc>` structure. |
| `frida-hooking` | keying, media, transport | Hooks native functions at runtime; can reach the media engine and derived keys. Higher effort. |
| `mitm-tls` | signaling, transport | TLS interception of auxiliary HTTPS endpoints; does not break Noise/Signal. |
| `static-smali-analysis` | signaling, keying, media | Reads the app's logic without running it; great for *intended* behavior, not live values. |
| `memory-dump` | keying, media | Recovers in-memory key material/state; powerful but fragile and sensitive. |
| `wasm-analysis` | signaling, keying, media, transport | Static/iterative RE of the WhatsApp **Web** calling engine, which ships as Emscripten WASM, a cleaner, more stable surface than mobile. Powered by [warden](https://github.com/purpshell/warden). |

The full, machine-generated catalogue, with strengths, limitations, tooling, and
maturity, is the [techniques page](../spec/techniques.md). Practical, per-technique
how-to guides live under [`docs/techniques/`](../techniques/index.md).

Signaling is over-served and media/keying are under-served.
Cheap techniques all point at the same WebSocket, so the `<call>` stanza family
is comparatively well-mapped, while the SRTP key schedule needs the hardest
techniques. The newest technique, [`wasm-analysis`](../techniques/wasm-analysis.md)
of the WhatsApp Web calling engine, which ships as WebAssembly, is aimed
at that under-served keying/media frontier. The
[coverage report](../spec/coverage.md) breaks coverage down *by technique*
to surface this imbalance.

## The corroboration rule

Confidence follows a rule:

- A fact observed by one technique, once, is at most **`probable`**, and
  often `speculative` if the observer is unsure of the meaning.
- A fact is promoted toward **`confirmed`** when two or more independent
  techniques agree on it. "Independent" matters: two WebSocket captures of the
  same client build are *not* independent corroboration; a WebSocket capture and
  a Frida hook *are*.
- A fact stays **`speculative`** when it is inferred or assumed but not directly
  observed (most of the [media](../media-srtp.md) and
  [SRTP keying](../encryption-keying.md#srtp-key-derivation) details today).
- A fact is **`unknown`** when we have a slot for it but no evidence at all.

This is why **provenance** is mandatory on every attribute: it records *which*
techniques and *which* sources back the claim, so a reviewer can see at a glance
whether the corroboration rule has been satisfied. Provenance is the audit trail
that makes confidence levels meaningful rather than arbitrary.

## Why provenance and confidence are separate fields

- **Provenance** answers *"who saw this and where?"*: techniques + source refs
  (issues/PRs/notes).
- **Confidence** answers *"how much should you trust it?"*: the graded
  conclusion drawn from that provenance.

Keeping them separate lets the spec carry a defensible chain of reasoning. If a
later capture contradicts an earlier one, we record the discrepancy
(`type/discrepancy`), revisit the confidence, and keep both sources visible
rather than silently overwriting history.

## From observation to spec

1. A contributor makes an observation with one technique.
2. They file it as a [capture](capture-pipeline.md), which lands in
   [`corpus/captures/`](../../corpus/README.md) with its technique and confidence.
3. Maintainers reconcile captures into curated [`spec/`](../../spec/) entries,
   attaching provenance and setting confidence per the corroboration rule.
4. The generator renders human docs; the coverage script scores progress.

The result is a spec where you can always ask of any fact: *who saw this, with
what, and how sure are we?* and get a real answer.

See [the capture pipeline](capture-pipeline.md) for the mechanics, and the
[roadmap](../roadmap.md) for how we use coverage to prioritize the next captures.
