# wacrg tooling

These TypeScript scripts turn the machine-readable corpus under
[`spec/`](../spec) and [`corpus/`](../corpus) into validated, generated,
human-readable docs. They run on Node 20+ via [`tsx`](https://github.com/privatenumber/tsx)
with ESM `import` syntax, with no build step.

```bash
npm i              # install dev dependencies
npm run validate   # schema + referential-integrity checks (also: npm test)
npm run generate   # regenerate docs/spec/** from the corpus
npm run coverage   # recompute COVERAGE.md, docs/spec/coverage.md, badge JSON
npm run build      # validate -> generate -> coverage (the full pipeline)
npm run check      # build, then fail if generated artifacts drifted from git
```

## How the pieces fit together

```
spec/**/*.yaml ──┐
corpus/**/*.yaml ─┼─► lib/corpus.ts  (glob + parse + typed loaders)
                  │
                  ├─► validate.ts ──► console report + exit code
                  ├─► generate-docs.ts ─► docs/spec/**.md (+ mermaid)
                  └─► coverage.ts ─► COVERAGE.md, docs/spec/coverage.md,
                                      docs/coverage-badge.json
```

### `lib/corpus.ts`

The single place that knows the on-disk shapes. It exports:

- The shared enums and the **fixed technique id set** (`TECHNIQUE_IDS`).
- TypeScript interfaces matching every canonical YAML shape (stanza, flow,
  enum, technique, tool, flavor, flavor map, contributor, glossary, capture).
- Typed loaders (`loadStanzas`, `loadFlows`, `loadEnums`, `loadTechniques`,
  `loadTools`, `loadFlavors`, `loadFlavorMaps`, `loadContributors`,
  `loadCaptures`, `loadGlossary`) that glob + parse and return
  `{ path, relPath, data }`. `loadFlavors` excludes the `*.map.yaml` files,
  which `loadFlavorMaps` loads separately.
- `readSchema(relPath)` to read a JSON Schema, plus `fromRoot(...)` /
  `REPO_ROOT` so every script resolves paths relative to the repository root
  regardless of the current working directory.
- `walkAttributes(stanza)` / `walkChildren(stanza)` generators that recurse
  into nested children, used by both the validator and the coverage tool.

### `validate.ts` (`npm run validate`, `npm test`)

1. Loads every YAML file under `spec/` and `corpus/`.
2. Validates each against its JSON Schema in `spec/schema/*.schema.json` and
   `corpus/schema/capture.schema.json` using `ajv` + `ajv-formats`.
3. Checks referential integrity:
   - `provenance.techniques` values exist as a technique id;
   - `provenance.tools` / `provenance.flavors` resolve to a registered
     `spec/tools/` / `spec/flavors/` id;
   - `capture.source.technique` exists as a technique id;
   - `flow.steps[].stanza` (when set) exists as a stanza id;
   - a flavor's `maintainer`, `basis` (fixed techniques), and `derives_from`
     resolve (and a flavor never derives from itself);
   - a flavor map's `flavor` and each entry's `spec.{stanza,flow,enum}` resolve;
   - attribute types of the form `enum:<id>` reference an existing enum id;
   - every capture sets `sanitized: true`.
4. Prints a per-file report and exits `1` on any error, `0` on success.

If a schema file is missing it warns and skips that file's schema check rather
than crashing, so the tooling stays usable while schemas are being authored.

### `generate-docs.ts` (`npm run generate`)

Idempotently overwrites `docs/spec/**` from the corpus:

| Input | Output |
| --- | --- |
| `spec/stanzas/*.yaml` | `docs/spec/stanzas/<id>.md` + `docs/spec/stanzas/index.md` |
| `spec/flows/*.yaml` | `docs/spec/flows/<id>.md` (with a mermaid sequence diagram) + `docs/spec/flows/index.md` |
| `spec/enums/*.yaml` | `docs/spec/enums.md` |
| `spec/techniques/*.yaml` | `docs/spec/techniques.md` |
| `spec/tools/*.yaml` | `docs/spec/tools.md` |
| `spec/flavors/*.yaml` | `docs/spec/flavors.md` |
| `spec/flavors/*.map.yaml` | `docs/spec/flavor-map.md` (the inverse Source-of-truth) |
| `spec/contributors/*.yaml` | `docs/spec/contributors.md` |
| `spec/glossary.yaml` | `docs/spec/glossary.md` |
| (overview) | `docs/spec/index.md` |

Stanza pages render attribute tables (name, type, required, confidence,
description, provenance), recurse into nested children, and include examples,
notes, open questions, and references. Every generated file starts with a
`<!-- GENERATED FILE ... -->` banner. Mermaid diagrams use a fenced block whose
info string is the word `mermaid`, which both GitHub and mkdocs-material render.

### `coverage.ts` (`npm run coverage`)

Walks every attribute and child across all stanzas, tallies by confidence, and
computes `coverage% = (confirmed + 0.5 × probable) / total`, rounded. It breaks
the score down by category and by technique, then writes `COVERAGE.md` (repo
root), `docs/spec/coverage.md` (identical), and `docs/coverage-badge.json`, a
[shields.io endpoint](https://shields.io/endpoint) object whose color is orange
(< 34%), yellow (34–66%), or green (≥ 67%).

### `ingest-issue.ts` (`npm run ingest`)

Used by the `issue-to-corpus` GitHub Action. Reads `ISSUE_NUMBER`,
`ISSUE_TITLE`, and `ISSUE_BODY` from the environment, splits the Issue Form body
on `^### ` headings, maps the stanza-capture form sections onto a capture
object, and writes `corpus/captures/issue-<n>.yaml` (`sanitized: true`,
`status: draft`), printing the written path. Missing sections are tolerated.

Run it locally against a sample:

```bash
ISSUE_NUMBER=12 ISSUE_TITLE="call offer" \
ISSUE_BODY=$'### Stanza tag\ncall\n\n### Direction\noutgoing' \
npm run ingest
```

### `ingest-flavor.ts` (`npm run ingest:flavor`)

Used by the `flavor-to-corpus` GitHub Action — the vendor self-attachment path.
Reads `ISSUE_NUMBER`, `ISSUE_TITLE`, `ISSUE_BODY`, and `ISSUE_AUTHOR`, splits the
flavor-registration Issue Form body on `^### ` headings, and writes
`spec/flavors/<id>.yaml` (stamping the submitter's GitHub login as `maintainer`,
`status: draft`). If the form's pipe-delimited `Coverage map` section is filled
in, it also writes `spec/flavors/<id>.map.yaml` (the inverse Source-of-truth).
`covers`/`basis` are filtered to the allowed sets; `derives_from` is preserved so
a port is never counted as independent of its upstream.

```bash
ISSUE_NUMBER=12 ISSUE_AUTHOR=you \
ISSUE_BODY=$'### Flavor id\nmy-lib\n\n### Language\nrust' \
npm run ingest:flavor
```
