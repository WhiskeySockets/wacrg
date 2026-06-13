<!-- Hand-written narrative. Complements the generated docs under docs/spec/. -->

# WhatsApp Calls Research Group

**wacrg** is a collaborative, GitHub-native effort to reverse-engineer and
document a complete, machine-readable specification of the **WhatsApp 1:1
(one-to-one) call protocol** — its signaling, keying, media, and transport.

It is maintained by people who work on
[Baileys](https://github.com/WhiskeySockets/Baileys) and adjacent tooling. Each
of us reaches the protocol through a *different* lens — WebSocket captures,
Baileys instrumentation, Frida hooks, TLS interception, static analysis, memory
dumps — and historically those findings lived scattered across notes, chats, and
forks. wacrg exists to **unify them into one provenance-tracked spec**, with
enough automation that contributing is fast.

> **This is a research scaffold, not authoritative truth.** As of version
> `0.1.0` there are **no real captures**. Every example is synthetic and clearly
> labelled. Most facts are marked `probable` or `speculative` and carry open
> questions. We would rather say "we are not sure" than fabricate certainty.

## How to read the spec

The specification has two halves:

- **The corpus** — machine-readable YAML under [`spec/`](../spec/) (curated) and
  [`corpus/`](../corpus/) (raw intake). This is the single source of truth.
- **The rendered docs** — human-readable Markdown generated *from* that YAML into
  [`docs/spec/`](spec/index.md). Never edit those pages by hand; they are
  overwritten on every build.

Start here:

- **[Architecture](architecture.md)** — the two planes (signaling vs. media) and
  where keying sits. Read this first.
- **[Signaling](signaling.md)** — the `<call>` node family and how stanzas
  compose into flows. Links into the generated
  [stanza catalog](spec/stanzas/index.md) and [flow catalog](spec/flows/index.md).
- **[Transport over Noise](transport-noise.md)** — how call signaling rides the
  same Noise-encrypted WebSocket as messaging.
- **[Encryption & keying](encryption-keying.md)** — how the media key is
  delivered via Signal sessions inside `<enc>`.
- **[Media / SRTP](media-srtp.md)** and **[ICE & relays](ice-and-relays.md)** —
  the media plane and its transport.

## The provenance & confidence model

This is the heart of the project. Every protocol fact in the corpus carries:

- **Provenance** — *which technique(s)* observed it and *which sources*
  (issues, PRs, notes) confirmed it.
- **Confidence** — one of `confirmed`, `probable`, `speculative`, `unknown`.

A single technique seeing something once is, at best, `probable`. Confidence is
*promoted* when **independent techniques corroborate** the same observation — for
example, a WebSocket capture and a Frida hook agreeing on an attribute's meaning.
This corroboration rule is exactly how maintainers using different methods
converge on one trustworthy spec. The full process is described in
[methodology](methodology/index.md).

The generated [coverage report](spec/coverage.md) turns this into a single
number: a weighted percentage of attributes that are confirmed or probable,
broken down by category and technique. We use it as a scoreboard to *speedrun*
toward a complete spec — see the [roadmap](roadmap.md).

## Contributing a capture

The fastest path is to file a **Stanza capture** issue. A GitHub Action ingests
it into [`corpus/captures/`](../corpus/README.md) and opens a PR automatically.
Read the [capture pipeline](methodology/capture-pipeline.md) for what happens
next and the [sanitization rules](legal-and-ethics.md) before you paste anything.

## Legal & ethics

wacrg is interoperability and security research. It targets the *protocol*, not
people. Comply with the law and platform terms; never capture or publish real
users' data; sanitize everything. See
[legal and ethics](legal-and-ethics.md), the project
[`DISCLAIMER.md`](../DISCLAIMER.md), and [`SECURITY.md`](../SECURITY.md). wacrg is
not affiliated with or endorsed by WhatsApp or Meta.

## License

Code and tooling are licensed under the [MIT License](../LICENSE). Spec and
documentation content are licensed under
[CC BY 4.0](../LICENSE-docs). Copyright "WhiskeySockets and the WhatsApp Calls
Research Group contributors".
