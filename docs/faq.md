<!-- Hand-written narrative. Complements the generated docs under docs/spec/. -->

# FAQ

## What is wacrg?

The **WhatsApp Calls Research Group**: a collaborative, GitHub-native effort to
reverse-engineer and document a complete, machine-readable specification of the
WhatsApp 1:1 call protocol, covering signaling, keying, media, and transport. It is
maintained by people who work on [Baileys](https://github.com/WhiskeySockets/Baileys)
and unifies findings from multiple reverse-engineering techniques into one
provenance-tracked spec. Start at the [home page](index.md).

## Is this an official WhatsApp project?

No. wacrg is not affiliated with, authorized by, or endorsed by WhatsApp or
Meta. It is independent interoperability and security research. See
[legal and ethics](legal-and-ethics.md) and [`DISCLAIMER.md`](../DISCLAIMER.md).

## Is the spec accurate / complete?

Not yet, and we are upfront about it. As of `0.1.0` this is a research
scaffold with a starting model, not authoritative truth. There are no real
captures; all examples are synthetic. Most facts are graded `probable` or
`speculative` and carry open questions. Read each fact's
[confidence and provenance](methodology/index.md) before relying on it.

## Why does every fact have a "confidence" and "provenance"?

Because independent contributors use different techniques, and we need a way
to converge honestly. **Provenance** records *who saw a fact and where*;
**confidence** records *how much to trust it*. A fact is promoted toward
`confirmed` only when independent techniques corroborate it. This
[corroboration rule](methodology/index.md#the-corroboration-rule-how-confidence-is-promoted)
is the heart of the project.

## What are the confidence levels?

`confirmed`, `probable`, `speculative`, `unknown`. Most of the current spec sits
at `probable` (signaling) or `speculative` (media/keying derivation).

## What are the seven techniques?

`websocket-capture`, `baileys-instrumentation`, `frida-hooking`, `mitm-tls`,
`static-smali-analysis`, `memory-dump`, and `wasm-analysis`. They reveal different
layers; the [techniques page](spec/techniques.md) details each one's strengths and
limits.

## How do I contribute a finding?

File a Stanza capture issue using the GitHub Issue Form. A workflow ingests
it into [`corpus/captures/`](../corpus/README.md) and opens a PR automatically.
See the [capture pipeline](methodology/capture-pipeline.md). You can also add a
capture by hand by copying the
[example](../corpus/captures/example-sanitized-offer.yaml).

## Can I capture my own real calls and submit them?

Only with synthetic test accounts you control, and only after full
sanitization (no PII, no key material). Never capture other people. Never paste
real bytes. See the [sanitization rules](legal-and-ethics.md). This is
non-negotiable.

## Why is the media plane so under-documented?

Because the cheap techniques (WebSocket capture, Baileys instrumentation) only
see the [signaling plane](signaling.md); the [media plane](media-srtp.md) is
SRTP/UDP and never crosses the control socket. Observing it needs the harder
techniques (Frida, memory dump) or
[WASM analysis of the WhatsApp Web client](techniques/wasm-analysis.md), whose
calling engine ships as a WebAssembly module, so it is the project's biggest open
frontier. See the [roadmap](roadmap.md).

## What is the difference between `corpus/` and `spec/`?

`corpus/` is raw intake: individual captures as observed, with provenance.
`spec/` is the curated source of truth: captures reconciled into stanzas,
flows, enums, and techniques with confidence levels. Human docs under
[`docs/spec/`](spec/index.md) are generated from `spec/` and must not be
edited by hand.

## Why is the documentation generated from YAML?

So there is a single machine-readable source of truth. Validation,
generation, and the [coverage metric](spec/coverage.md) all run off the same
YAML, which keeps the human docs, diagrams, and stats consistent and lets us
automate quality checks. Edit the YAML under `spec/`, not the generated Markdown.

## What does the coverage percentage mean?

A weighted measure of how much of the spec is well-supported:
`(confirmed + 0.5 × probable) / total`, broken down by category and technique.
We use it to find gaps and aim the next captures. See
[coverage](spec/coverage.md) and the [roadmap](roadmap.md).

## Does this cover group calls?

No. wacrg is scoped to 1:1 calls. Group-call media topology is explicitly out
of scope for now.

## I found a security vulnerability. What do I do?

Do not post it as a capture. Follow [`SECURITY.md`](../SECURITY.md) and report
it responsibly first.

## What license is this under?

Code/tooling: [MIT](../LICENSE). Spec and docs content:
[CC BY 4.0](../LICENSE-docs). See [legal and ethics](legal-and-ethics.md).
