# WhatsApp Calls Research Group (wacrg)
[![spec coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/WhiskeySockets/wacrg/main/docs/coverage-badge.json)](./COVERAGE.md)
[![spec version](https://img.shields.io/badge/spec-0.1.0-blue)](./spec)
[![license: MIT](https://img.shields.io/badge/code-MIT-green)](./LICENSE)

A collaborative home for reverse-engineering and documenting a complete, maintainer-approved spec of the WhatsApp VoIP/RTC stack to achieve 1:1 WhatsApp calling capabilities and to keep it maintained.

## Table of contents

- [What is wacrg?](#what-is-wacrg)
- [The provenance + confidence model](#the-provenance--confidence-model)
- [How the machine-readable spec works](#how-the-machine-readable-spec-works)
- [Featured tooling: warden](#featured-tooling-warden)
- [Repository map](#repository-map)
- [Quickstart for contributors](#quickstart-for-contributors)
- [The GitHub-native workflow](#the-github-native-workflow)
- [Coverage](#coverage)
- [Governance, conduct, security, disclaimer](#governance-conduct-security-disclaimer)
- [Licensing](#licensing)


## What is wacrg?

[WhiskeySockets](https://github.com/WhiskeySockets) maintains
[Baileys](https://github.com/WhiskeySockets/Baileys), a TypeScript library for the WhatsApp
Web / multi-device protocol. Several maintainers and community researchers have independently
poked at **WhatsApp calling** using different reverse-engineering techniques: WebSocket
captures, Baileys instrumentation, Frida hooks, TLS MITM, static smali analysis, memory dumps,
and WASM analysis of the Web client.
Each technique reveals a different slice of the truth, and the findings have lived scattered
across issues, gists, and private notes.

wacrg unifies those findings into one provenance-tracked specification. It is a research
scaffold: a documented, machine-checkable model of how a 1:1 call is set up,
keyed, carried, and torn down, built so that independent contributors can converge quickly
without losing track of who saw what, how, and how sure they are.

This project documents the protocol for **interoperability and research**. It is **not
affiliated with or endorsed by Meta or WhatsApp**. See [DISCLAIMER.md](./DISCLAIMER.md).

> **Honesty over completeness.** No real captures exist in this repository yet. Every example
> is **synthetic and clearly labeled**. Most facts are marked `probable` or `speculative` and
> carry open questions. We never fabricate false certainty.


## The provenance + confidence model

This model is how independent maintainers using different
techniques converge on a single spec.

Every protocol fact (an attribute, a child node, an enum value, a flow step) carries two
things:

1. **Provenance**: who observed it (a registered contributor), which technique(s)
   produced it, which independent reimplementations (**flavors**)
   corroborate it, and which source(s) (issue/PR refs) prove it. The technique
   vocabulary is a fixed set:

   | technique id | what it is |
   | --- | --- |
   | `websocket-capture` | capturing decrypted WABinary frames off the Noise WebSocket |
   | `baileys-instrumentation` | logging/decoding inside the Baileys client |
   | `frida-hooking` | dynamic instrumentation of the native app at runtime |
   | `mitm-tls` | TLS man-in-the-middle of relevant flows |
   | `static-smali-analysis` | reading disassembled Android smali / native code |
   | `memory-dump` | extracting state/keys from process memory |
   | `wasm-analysis` | RE of the WhatsApp **Web** calling engine, which ships as Emscripten WASM (see [warden](https://github.com/purpshell/warden)) |

2. **Confidence**: one of `confirmed`, `probable`, `speculative`, `unknown`.

A finding earns higher confidence as independent techniques corroborate it. The
[GOVERNANCE.md](./GOVERNANCE.md) rule is explicit: a fact moves to `confirmed` only when at
least two different techniques independently agree. Until then it stays `probable` or
`speculative`, and disagreements are tracked as `type/discrepancy` rather than silently
resolved.

This means the spec is auditable: for any claim you can trace back to who observed it,
the technique that produced it, and the source that proves it.
Contributors register in [`spec/contributors/`](./spec/contributors), and independent
reimplementations in
[`spec/flavors/`](./spec/flavors); captures filed via the Issue Form are stamped with the
submitter's GitHub identity automatically. See [Attribution & proof](./docs/attribution.md).


## How the machine-readable spec works

The single source of truth is a YAML corpus under [`spec/`](./spec). Humans do not edit
the rendered docs; those are generated. The pipeline:

```
spec/*.yaml  ──▶  scripts/validate.ts   (schema + referential integrity)
             ──▶  scripts/generate-docs.ts  ──▶  docs/spec/*.md (+ mermaid diagrams)
             ──▶  scripts/coverage.ts     ──▶  COVERAGE.md, docs/coverage-badge.json
```

- **Stanzas** ([`spec/stanzas/`](./spec/stanzas)) describe WABinary nodes (`<call>`, `<offer>`,
  `<accept>`, `<terminate>`, and others) as tag/attributes/children trees, each field with confidence +
  provenance.
- **Flows** ([`spec/flows/`](./spec/flows)) describe end-to-end sequences (outgoing audio call,
  reject, and others) and render to mermaid sequence diagrams.
- **Enums** ([`spec/enums/`](./spec/enums)) capture closed value sets (terminate reasons, and others).
- **Techniques** ([`spec/techniques/`](./spec/techniques)) document each RE method.
- **Contributors** ([`spec/contributors/`](./spec/contributors)) record who produced each
  fact. See [attribution & proof](./docs/attribution.md).
- **Flavors** ([`spec/flavors/`](./spec/flavors)) are independent reimplementations
  (libraries/ports) that corroborate the spec by realizing it in code; each spec part
  records its in-the-wild implementation status across them.
- **Glossary** ([`spec/glossary.yaml`](./spec/glossary.yaml)) defines shared terms (WABinary,
  Noise, SRTP, and others).
- **Captures** ([`corpus/captures/`](./corpus/captures)) are intake records: raw (synthetic)
  observations that get distilled into stanza facts.

Everything is validated against JSON Schemas in `spec/schema/` and `corpus/schema/`, and
cross-references (a `provenance.techniques` value, a flow step's `stanza`, an `enum:<id>` type)
are checked for referential integrity. The spec version is `0.1.0`.


## Featured tooling: warden

WhatsApp Web ships its calling engine as a WebAssembly module, which makes the web
client a cleaner reverse-engineering surface than the mobile app: structured control
flow, an explicit JS↔WASM boundary, and an open-source Emscripten runtime that lets
40–80% of the binary be auto-identified instead of read by hand.

[**warden**](https://github.com/purpshell/warden) (`pip install warden-re`) is a
reverse-engineering knowledge base for Emscripten WebAssembly, built for this surface.
It parses and fingerprints the module, auto-names library code via its Emscripten
Oracle, lifts functions to pseudo-C, and keeps annotations keyed to stable
function identity so they survive WhatsApp's frequent rebuilds instead of resetting
every release. Its knowledge base uses a provenance and confidence economy that
mirrors wacrg's own model, which fits feeding curated facts back into the spec.

This surface is documented here as the
[`wasm-analysis`](./docs/techniques/wasm-analysis.md) technique; see its how-to guide for
the workflow, and [warden's repository](https://github.com/purpshell/warden) for the tool.


## Repository map

| Path | What lives here |
| --- | --- |
| [`spec/`](./spec) | The machine-readable corpus: `signalling/`, `encodings/`, `crypto/`, `relay/` (the normative spec parts), plus `stanzas/`, `flows/`, `enums/`, `techniques/`, `flavors/`, `contributors/`, `glossary.yaml`, and `schema/`. **The source of truth.** |
| [`corpus/`](./corpus) | Capture intake: `captures/` (synthetic/sanitized observations) and `schema/capture.schema.json`. |
| [`docs/`](./docs) | **Generated** human docs + the Pages/mkdocs site. `docs/spec/` is produced by the generator; `docs/coverage-badge.json` feeds the badge. Do not hand-edit generated files. |
| [`scripts/`](./scripts) | TypeScript tooling run via `tsx`: `validate.ts`, `generate-docs.ts`, `coverage.ts`, `ingest-issue.ts`, and shared helpers in `scripts/lib/corpus.ts`. |
| [`.github/`](./.github) | GitHub-native plumbing: Issue Forms, Actions workflows, `labels.yml`, `CODEOWNERS`. |
| repo root | Governance + meta docs: this README, [CONTRIBUTING](./CONTRIBUTING.md), [GOVERNANCE](./GOVERNANCE.md), [MAINTAINERS](./MAINTAINERS.md), [SECURITY](./SECURITY.md), [DISCLAIMER](./DISCLAIMER.md), [CODE_OF_CONDUCT](./CODE_OF_CONDUCT.md), licenses, `CITATION.cff`. |


## Quickstart for contributors

You can contribute **without writing any code**, or by editing the corpus directly.

### Option A: File a capture via an Issue Form (no local setup)

1. Open a new issue using the **"Stanza capture"** form.
2. Fill in the stanza tag, direction, your capture technique, a confidence level, the (synthetic
   or **fully sanitized**) raw stanza, and what you decoded.
3. On submit, automation ingests your form into a `corpus/captures/issue-<n>.yaml` file and opens
   a pull request for review. See [the workflow](#the-github-native-workflow) below.

> **Never** paste real phone numbers, JIDs, keys, or media. Sanitize everything. See
> [DISCLAIMER.md](./DISCLAIMER.md).

### Option B: PR a `spec/` YAML directly

```bash
# Requires Node >= 20
git clone https://github.com/WhiskeySockets/wacrg.git
cd wacrg
npm install

# Edit or add YAML under spec/ (see CONTRIBUTING.md for the shapes), then:
npm run build      # validate -> generate docs -> compute coverage
npm run check      # ensures generated docs/coverage are committed and in sync
```

Useful scripts:

| script | does |
| --- | --- |
| `npm run validate` | schema-validate every YAML + check referential integrity |
| `npm run generate` | regenerate `docs/spec/**` from the corpus |
| `npm run coverage` | recompute `COVERAGE.md` + the coverage badge JSON |
| `npm run build` | validate, generate, coverage (run before every PR) |
| `npm run check` | build, then fail if generated output isn't committed |
| `npm run ingest` | (CI) turn a stanza-capture Issue Form into a capture YAML |
| `npm run ingest:flavor` | (CI) turn a flavor-registration Issue Form into a flavor (+ map) |

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full PR checklist, confidence rules, and commit
conventions.


## The GitHub-native workflow

wacrg leans on GitHub as the collaboration substrate:

- **Issues → corpus PR.** The *Stanza capture* Issue Form (labelled `type/stanza-capture`,
  `status/needs-review`) is parsed by `scripts/ingest-issue.ts` in the `issue-to-corpus`
  workflow, which writes a capture YAML and opens a `ingest/issue-<n>` pull request. Maintainers
  review, refine confidence/provenance, and merge.
- **Flavor self-attachment.** The *Flavor registration* Issue Form (labelled
  `type/flavor-registration`) lets a library vendor attach its independent reimplementation
  to the spec: `scripts/ingest-flavor.ts` in the `flavor-to-corpus` workflow writes
  `spec/flavors/<id>.yaml` (and an `<id>.map.yaml` linking spec bits to code permalinks),
  stamps the submitter as `maintainer`, and opens an `attach/flavor-issue-<n>` PR.
- **Actions** validate every push/PR (`npm run check`), regenerate docs, and publish.
- **Pages** renders the generated docs site (mkdocs + mermaid) from `docs/`.
- **Discussions** are for open questions, technique deep-dives, and proposing model changes
  before they harden into spec.
- **Projects** track findings by area (`area/signaling`, `area/keying`, `area/media`,
  `area/transport`) and lifecycle (`status/needs-review` → reviewed → merged).
- **Releases** snapshot the spec at versioned milestones (current: `0.1.0`).
- **Labels** are managed declaratively from [`.github/labels.yml`](./.github/labels.yml).
- **Bots** keep things tidy: a welcome comment on new PRs, a Conventional-Commit
  PR-title check, path-based auto-labeling, a dependency-review gate, a gentle stale
  bot, thread-locking on long-closed issues, and Dependabot for tooling updates.


## Coverage

The current spec coverage is summarized in [COVERAGE.md](./COVERAGE.md) and rendered in the docs
at [`docs/spec/coverage.md`](./docs/spec/coverage.md). Coverage is computed as:

```
coverage% = (confirmed + 0.5 * probable) / total_facts
```

across every attribute and child in every stanza, then broken down by category and by technique.
The badge at the top of this README reads the live number from
[`docs/coverage-badge.json`](./docs/coverage-badge.json).

Because this is an early research scaffold, coverage is expected to be low. That is honest
and intentional. Raising it means independent corroboration, not guessing.


## Governance, conduct, security, disclaimer

- [CONTRIBUTING.md](./CONTRIBUTING.md): how to add facts, the confidence/provenance rules, dev
  loop, PR checklist.
- [GOVERNANCE.md](./GOVERNANCE.md): roles, how findings move `speculative → confirmed`, release
  cadence, area ownership.
- [MAINTAINERS.md](./MAINTAINERS.md): who maintains what.
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md): Contributor Covenant 2.1.
- [SECURITY.md](./SECURITY.md): responsible disclosure (report real WhatsApp vulnerabilities to
  Meta first, not here).
- [DISCLAIMER.md](./DISCLAIMER.md): research purpose, trademarks, legal/ToS compliance, no PII.
- [docs/attribution.md](./docs/attribution.md): how who/technique/tool/source attribution is
  recorded and proven across multiple researchers.

The rendered documentation site is published from [`docs/`](./docs) via GitHub Pages.


## Licensing

- **Code & tooling** (everything under `scripts/`, schemas, config): **MIT**, see
  [LICENSE](./LICENSE).
- **Spec & documentation content** (`spec/`, `corpus/`, `docs/`, and prose): **CC BY 4.0**, see
  [LICENSE-docs](./LICENSE-docs).

Copyright © 2026 **WhiskeySockets and the WhatsApp Calls Research Group contributors**.

If you cite this work, see [CITATION.cff](./CITATION.cff).
