# AGENTS.md — working notes for agents contributing to wacrg

> Guidance for any AI coding agent (and humans) working **on this repository**.
> Follows the [agents.md](https://agents.md) convention. wacrg is a
> GitHub-native, machine-readable, **confidence-graded** specification of the
> WhatsApp 1:1 call protocol — signaling, keying, media, transport.
>
> Read this first, then the doc it points you to for your task. This file is
> meant to **accrete**: when you learn something durable about the process,
> add it here so the next agent starts where you finished.

## The one rule that makes this project trustworthy

**Confidence is earned, and provenance is mandatory.** Every fact is graded
`confirmed | probable | speculative | unknown` and carries who/what/how/where.
A single technique (one static read, one capture, one reconstruction) is
**`probable` at most**. `confirmed` requires **two or more independent**
techniques or contributors agreeing. Never round up; put uncertainty in
`open_questions`, not in the grade. The full model:
[CONTRIBUTING.md](CONTRIBUTING.md), [GOVERNANCE.md](GOVERNANCE.md),
[docs/methodology/index.md](docs/methodology/index.md).

## Repo layout

```text
spec/                 the CURATED corpus (YAML, schema-validated) — the source of truth
  stanzas/ flows/ enums/ techniques/ glossary.yaml
  contributors/<id>.yaml   WHO (one per researcher)
  tools/<id>.yaml          WHAT tools exist (warden, ghidra, frida, …)
  schema/*.schema.json     validation
corpus/captures/      raw observations (intake), sanitized
docs/                 the published MkDocs site (hand-written narrative + generated)
  spec/**             GENERATED from spec/ — committed, do not hand-edit
  methodology/  techniques/
  codec/mlow/   keying/   signaling/   reconstruction.md   ← deep RE narratives
impl/<area>/          executable reference implementations (Go, etc.) tied to a doc
scripts/              validate / generate / coverage / ingest (TypeScript, tsx)
```

`docs/media/` is **gitignored** (a prior raw dump burned that path). Put new
sections under a real path like `docs/codec/`, `docs/keying/`, `docs/signaling/`.

## Before you commit — the build gate

```bash
npm run build   # validate (schema + referential integrity) → generate docs/spec → coverage
npm run check   # build + `git diff --exit-code` on generated files (CI parity)
```

`validate` **fails** if any `provenance.techniques`/`tools`/`contributors` id is
unregistered. `generate` rewrites `docs/spec/**`; `coverage` rewrites
`COVERAGE.md` + `docs/coverage-badge.json` — **commit the regenerated files**.
A root-level file (this one, README) does not affect the gate, but any `spec/`
change does.

**Stage explicit paths, never `git add -A`** — this repo is edited concurrently
by more than one agent/human. Check `git status` shows only your files first.
**Commit, do not push.** [Conventional Commits](https://www.conventionalcommits.org/):
`feat:` new fact/doc, `fix:` correction, `docs:` prose, `chore:` tooling.
No Claude/AI attribution in commit messages. No real PII/keys/media — ever.

## Attribution: the four provenance dimensions

Every spec attribute/child carries `provenance` with: `techniques` (fixed set),
`tools` (must exist in `spec/tools/`), `contributors` (must exist in
`spec/contributors/`), `sources` (issue/PR/commit refs). Raw tool output
(identity maps, dumps) lives under `impl/` or `corpus/`, **not** `docs/`. Full
model: [docs/attribution.md](docs/attribution.md). Register yourself once at
`spec/contributors/<handle>.yaml`.

## Methodology: techniques and independent reconstructions

The seven fixed techniques (the only `provenance.techniques` values):
`websocket-capture`, `baileys-instrumentation`, `frida-hooking`, `mitm-tls`,
`static-smali-analysis`, `memory-dump`, `wasm-analysis`.

The under-served frontier is **keying + media internals**; the lever is
**`wasm-analysis`** of the WhatsApp **Web** engine (it ships the codec and KDFs
as WASM) plus **independent reconstructions** by the community. When two of
these agree on a fact, it is corroborated toward `confirmed`. Treat an
independent working reimplementation (e.g. a Rust/TS port that places real calls)
as strong evidence — but record it as a **distinct contributor/source**, and
only call a fact `confirmed` when the agreeing techniques are genuinely
independent (a reimplementation derived from the same capture is *not*
independent of that capture). External reconstructions are tracked in
[docs/reconstruction.md](docs/reconstruction.md); cite them in
`provenance.sources`.

## wasm-analysis operational guide (the warden workflow)

The `wa.wasm` Web engine is reversed with [warden](https://github.com/purpshell/warden)
into a knowledge base (`analysis/.warden/warden.db`, label `v1`). What actually
works, and the traps:

- **Trust strings over agent names.** The deep-analysis pass auto-named ~90% of
  functions by guessing; those names are **leads, not facts**. Ground truth is
  the binary's own strings: demangled C++ RTTI (`c++filt -t` on `N…E` typeinfo),
  `__FILE__` source paths, and config/log literals. Recover identity from those.
- **String-xref has false positives.** warden attributes a data string to a
  function by an `i32.const` matching the string's address; large functions
  collide. Real examples that bit us: #7466/#7952 matched MLow needles but are
  H.264; #1522 "sframe_aes256_ctr" is float DSP. **Always body-verify before any
  rename** (`kb.rename_function(sid, name, actor="human")` is reversible+logged).
- **Static-memory tables.** `wa.wasm` uses bulk-memory *passive* segments (no
  static offset). `analysis/extract_table.py <addr>` rebuilds the seg→address map
  from the `memory.init` placements in `__wasm_init_memory` (#224) and reads any
  CDF/codebook/scale table by address.
- **Grade honestly:** structure recovered from RTTI/strings is `probable`; an
  inferred algorithm is `speculative` until a body read or a second technique
  confirms it.

## Reference implementations (`impl/`)

When a finding is concrete enough to run, add a **stdlib-only, tested** reference
under `impl/<area>/`, cross-linked to its doc. Conventions that have worked:
- Prove primitives against an **authoritative known-answer** where one exists
  (e.g. the SRTP HKDF vs RFC 5869; the CELT range coder vs a matched encoder
  round-trip). Recovered *and* executable beats recovered alone.
- Return an explicit `ErrNotRecovered` for stages not yet recovered rather than
  emitting plausible-but-wrong output. Honesty over coverage.
- Cite the WASM function indices / evidence each file was built from.

## Build on context that compounds

This repo is designed to **accumulate** understanding: a finding becomes a doc,
a doc cites its provenance, provenance lets the next contributor see exactly how
sure we are and what to attack next. When you finish a piece:
1. Write the narrative under `docs/…` (confidence-graded, provenance-stamped).
2. If runnable, add the `impl/…` reference + test.
3. Update [docs/reconstruction.md](docs/reconstruction.md) (the system-level
   gap analysis) and the relevant roadmap so the *frontier* moves visibly.
4. Add any durable process lesson **to this file**.

> Note: this is not [docs/AGENTS.md]-style; wacrg has no agent-crew feature.
> This file is purely how to *work on wacrg*.
