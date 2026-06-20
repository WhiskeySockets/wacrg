<!-- Hand-written narrative. Complements the generated docs under docs/spec/. -->

# Roadmap

wacrg is built by a small group of maintainers, each with a different
technique, working toward a complete, provenance-tracked spec of the WhatsApp 1:1 call
protocol. This page lays out the phases and how we use the
[coverage metric](spec/coverage.md) to decide what to work on next.

## What `0.1.0` covers

Version `0.1.0` is the scaffold and starting model, not a finished spec. It
ships:

- The corpus structure (`spec/` curated, `corpus/` intake) and schemas.
- The tooling: validate, generate, coverage, and the issue→corpus ingest.
- A starting model of the [`<call>` signaling family](signaling.md), with most
  attributes graded `probable` or `speculative` and carrying open questions.
- Narrative docs for [architecture](architecture.md),
  [transport](transport-noise.md), [keying](encryption-keying.md),
  [media](media-srtp.md), and [transport/relays](ice-and-relays.md).
- A synthetic, sanitized example capture, and no real captures.

In other words, `0.1.0` makes it possible and fast to contribute facts; it does
not yet claim to contain many confirmed ones.

## Phases

### Phase 0: Scaffold (this release)

Tooling, schemas, the starting model, and the contribution pipeline. Done when a
contributor can file a capture and watch it flow into a corpus PR.

### Phase 1: Map the signaling plane

Use the cheap, high-yield techniques ([WebSocket capture](spec/techniques.md),
Baileys instrumentation) to nail down the `<call>` family: every child stanza,
every attribute, and the [enums](spec/enums.md) (terminate reasons, net medium,
encopt). Goal: move the signaling category from mostly `probable` to mostly
`confirmed` via [corroboration](methodology/index.md#the-corroboration-rule-how-confidence-is-promoted).

### Phase 2: Pin down keying

Document the `<enc>` fan-out, `pkmsg`/`msg` behavior, and `<encopt keygen>`
semantics, corroborated across signaling-capture and client-instrumentation. The
hard part, the [SRTP key derivation](encryption-keying.md#srtp-key-derivation),
moves here only as the harder techniques (Frida, memory dump) produce evidence.

### Phase 3: Open up the media & transport planes

The least-covered area so far. Confirm codecs, the SRTP profile, RTP details, and the
[ICE/relay](ice-and-relays.md) selection logic. This needs the higher-effort
techniques and is where most `speculative → probable` promotions will happen.

### Phase 4: Completeness & hardening

Cross-platform differences, edge-case flows (busy, timeout, network change,
multi-device hand-off), discrepancy resolution, and a coherent `1.0.0` spec.

## How we use coverage to prioritize

The [coverage report](spec/coverage.md) computes a single weighted percentage,
`(confirmed + 0.5 × probable) / total`, and breaks it down by category and
by technique. We use it to guide the work:

- **Find the gaps.** A low category score (e.g. `media`) tells us where the spec
  is thin; a low technique score tells us which lens is under-applied.
- **Aim the next captures.** Open a `good-first-capture` issue targeting the
  weakest area so a new contributor can make progress quickly.
- **Reward corroboration, not volume.** Because confirmed counts double-weight a
  probable, the metric rewards a second independent technique
  confirming an existing fact over piling on more single-source observations.
- **Track momentum.** Coverage is regenerated on every build and snapshotted at
  each [release](legal-and-ethics.md), so progress is visible release-over-release.

The metric is a tool for prioritization, not a target to game. Honest
`speculative` grades keep it truthful, and that honesty is what makes the number
worth watching.

## How to help right now

- Pick a weak area from the [coverage report](spec/coverage.md).
- File a [Stanza capture](methodology/capture-pipeline.md) for a stanza in it,
  using synthetic test accounts and the [sanitization rules](legal-and-ethics.md).
- Better yet, corroborate an existing `probable` fact with a different
  technique to push it toward `confirmed`.
