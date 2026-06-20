# Contributing to wacrg

Thanks for helping document the WhatsApp 1:1 call protocol. This guide explains how to add or
modify protocol facts, the rules that keep the spec honest, and how to run the tooling locally.

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md), the
[Disclaimer](./DISCLAIMER.md) (research/interop purpose, no real PII), and the licensing terms in
[LICENSE](./LICENSE) (code) and [LICENSE-docs](./LICENSE-docs) (spec/docs content).

---

## Contents

- [Two ways to contribute](#two-ways-to-contribute)
- [The corpus shapes](#the-corpus-shapes)
- [Confidence and provenance rules](#confidence-and-provenance-rules)
- [Local development](#local-development)
- [How captures flow from Issue Forms to corpus PRs](#how-captures-flow-from-issue-forms-to-corpus-prs)
- [PR checklist](#pr-checklist)
- [Commit conventions](#commit-conventions)
- [Labels](#labels)

---

## Two ways to contribute

1. **File a capture (no local setup).** Open an issue with the **Stanza capture** form. On
   submit, automation writes a `corpus/captures/issue-<n>.yaml` and opens a PR. This is the
   fastest on-ramp and the recommended path for raw observations. See
   [the capture flow](#how-captures-flow-from-issue-forms-to-corpus-prs).
2. **Edit the corpus directly.** Add or modify a YAML under [`spec/`](./spec) (a stanza, flow,
   enum, technique, glossary entry) or [`corpus/`](./corpus), run the tooling, and open a PR.

---

## The corpus shapes

Every fact lives in YAML under `spec/` or `corpus/` and is validated against a JSON Schema in
`spec/schema/*.schema.json` (or `corpus/schema/capture.schema.json`). The canonical key shapes
are documented inline in the schemas and in the project's shared contract; the essentials:

### Shared enums (use these EXACT values)

- **confidence:** `confirmed` | `probable` | `speculative` | `unknown`
- **status:** `draft` | `review` | `stable` | `deprecated`
- **category / layer:** `signaling` | `keying` | `media` | `transport`
- **spec_version:** `"0.1.0"`
- **technique ids (fixed set):** `websocket-capture`, `baileys-instrumentation`,
  `frida-hooking`, `mitm-tls`, `static-smali-analysis`, `memory-dump`,
  `wasm-analysis`

### Adding or modifying a stanza

A stanza file is `spec/stanzas/<id>.yaml` describing one WABinary node. It declares the node's
`tag`, `category`, `direction`, `status`, a plain-language `summary`, then `attributes` and
nested `children` (recursive, same shape), plus `examples`, `notes`, `open_questions`, and
`references`.

Each **attribute** and **child** must carry:

- `confidence` (one of the values above), and
- `provenance` recording how (`techniques`, subset of the fixed set), with what
  (`tools`, ids from `spec/tools/`), who (`contributors`, ids from
  `spec/contributors/`), and proof (`sources`, issue/PR/commit refs like `"#12"`).
  See [attribution & proof](./docs/attribution.md).

Attribute `type` is one of `string|int|hex|bytes|bool|jid|timestamp|enum:<enum-id>`. When you use
`enum:<id>`, that enum must exist as `spec/enums/<id>.yaml`. The validator enforces it.

`examples` must be synthetic and sanitized and labelled as such (`note:` field). Never paste
real data.

### Flows, enums, techniques, glossary

- **Flow** (`spec/flows/<id>.yaml`): ordered `participants` + `steps`. A step may reference a
  stanza via `stanza: <stanza-id>`; that id must exist. Flows render to mermaid sequence
  diagrams.
- **Enum** (`spec/enums/<id>.yaml`): a closed set of `values`, each with `confidence` and a
  `description`.
- **Technique** (`spec/techniques/<id>.yaml`): `id` MUST be from the fixed technique set;
  document `maturity`, `targets`, `strengths`, `limitations`, `tooling`, optional `guide` path.
- **Contributor** (`spec/contributors/<id>.yaml`): register yourself once with `id` (your
  GitHub handle), `name`, and the techniques/tools you use. Referenced by `provenance.contributors`.
- **Tool** (`spec/tools/<id>.yaml`): a concrete tool with `id`, `version`, `url`, `techniques`
  it supports, and `maintainer`. Referenced by `provenance.tools`.
- **Glossary** (`spec/glossary.yaml`): shared `terms`.

> When in doubt about a key name, copy an existing file of the same kind and adapt it. The
> validator will tell you precisely what's wrong.

---

## Confidence and provenance rules

These rules are what keep the spec trustworthy. Please follow them strictly.

1. **Default low.** A newly observed fact is `speculative` unless you have strong reason
   otherwise. A single clean capture from one technique is usually `probable`, not `confirmed`.
2. **`confirmed` requires independent corroboration by ≥ 2 different techniques.** One technique,
   no matter how clean, does not reach `confirmed`. This is enforced socially in review and
   defined in [GOVERNANCE.md](./GOVERNANCE.md).
3. **Always record provenance.** Every attribute/child needs `provenance.techniques` (which
   methods saw it); also record `provenance.contributors` (who: your contributor id),
   `provenance.tools` (which tools), and `provenance.sources` (where: an issue/PR/commit
   ref). No orphan facts. See [attribution & proof](./docs/attribution.md).
4. **Put uncertainty in `open_questions`, not in confidence inflation.** If you're unsure what a
   field means, mark it `speculative` *and* add an open question. Do not round up.
5. **Disagreements are first-class.** If two techniques contradict each other, do not silently
   pick one. Open a `type/discrepancy` issue and leave both observations documented until
   resolved.
6. **Synthetic examples only.** All `examples`/`raw` bodies must be synthetic or fully sanitized
   and labelled as such.

---

## Local development

Requires **Node >= 20**.

```bash
npm install

npm run validate   # schema + referential-integrity checks; exits non-zero on any error
npm run generate   # regenerate docs/spec/** from the corpus (idempotent)
npm run coverage   # recompute COVERAGE.md, docs/spec/coverage.md, docs/coverage-badge.json
npm run build      # validate -> generate -> coverage (run this before every PR)
npm run check      # build, then `git diff --exit-code` on generated files (CI parity)
npm test           # alias for validate
```

The generated files (`docs/spec/**`, `COVERAGE.md`, `docs/coverage-badge.json`) are **committed**
to the repo so the badge and Pages work. `npm run check` fails if you forgot to regenerate them.
Always run `npm run build` and commit the result.

Shared corpus-loading helpers live in [`scripts/lib/corpus.ts`](./scripts/lib/corpus.ts); the
three pipeline scripts import from it.

---

## How captures flow from Issue Forms to corpus PRs

```
Stanza capture Issue Form
        │  (labels: type/stanza-capture, status/needs-review)
        ▼
issue-to-corpus workflow  ──▶  tsx scripts/ingest-issue.ts
        │     reads ISSUE_NUMBER / ISSUE_TITLE / ISSUE_BODY
        │     splits the body on `### ` headings
        ▼
corpus/captures/issue-<n>.yaml   (sanitized: true, status: draft)
        ▼
create-pull-request  ──▶  branch ingest/issue-<n>  ──▶  maintainer review & merge
```

The form's section headings are fixed (Stanza tag; Direction; Client / platform; Capture
technique; Tools used; Confidence; Raw stanza; Decoded structure; Observed attributes;
Provenance; Notes / open questions) so the ingester can parse them. The submitter's GitHub
identity is recorded automatically as the capture's `source.contributor`. During review,
maintainers promote the capture's facts into the relevant `spec/stanzas/*.yaml`, applying the
confidence/provenance rules above.

---

## PR checklist

Before requesting review, confirm:

- [ ] My change touches the corpus (`spec/`/`corpus/` YAML), not hand-edited generated docs.
- [ ] `npm run build` passes locally and I committed the regenerated `docs/spec/**`,
      `COVERAGE.md`, and `docs/coverage-badge.json`.
- [ ] `npm run check` is green (no uncommitted generated diffs).
- [ ] Every new attribute/child/value has confidence and provenance (techniques,
      tools, contributors, sources).
- [ ] Confidence is honest; `confirmed` only with ≥ 2 independent techniques. Uncertainty lives
      in `open_questions`.
- [ ] Any `enum:<id>` type, flow `stanza`, or `provenance.techniques` value resolves to a
      real id (validator passes).
- [ ] No real PII, phone numbers, JIDs, keys, or media. Examples are synthetic/sanitized and
      labelled.
- [ ] Relevant labels applied (`area/*`, `confidence/*`, `type/*`).

---

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/). Common types:

- `feat:` a new stanza/flow/enum/technique or new documented fact
- `fix:` a correction to an existing fact, schema, or script
- `docs:` prose-only changes (README, this guide, etc.)
- `chore:` tooling, CI, labels, housekeeping
- `refactor:` non-behavioral code/script changes

Scope by area when useful, e.g. `feat(signaling): document <preaccept> attributes`.

Keep the subject imperative and under ~72 chars. Reference issues in the body (`Refs #12`).

---

## Labels

Labels are declared in [`.github/labels.yml`](./.github/labels.yml) and synced automatically. Use
`area/*` for protocol layer, `type/*` for the kind of contribution, `confidence/*` to flag the
maturity of a finding, and `status/needs-review` while a capture awaits triage.
`good-first-capture` marks friendly on-ramps.

---

Questions? Open a [Discussion](https://github.com/WhiskeySockets/wacrg/discussions) or ping a
maintainer listed in [MAINTAINERS.md](./MAINTAINERS.md).
