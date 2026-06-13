<!-- Hand-written narrative. Part of the wacrg corpus area. -->

# Corpus

`corpus/` is the **intake area** of the WhatsApp Calls Research Group (wacrg). It
holds raw, sanitized, machine-readable *captures* — individual observations of
call stanzas contributed by maintainers using different reverse-engineering
techniques. Captures are the unrefined input; the curated, cross-referenced
specification lives one step downstream under [`spec/`](../spec/) and is rendered
into [`docs/spec/`](../docs/spec/).

Think of the flow as:

```
Issue Form  ->  ingest-issue.ts  ->  corpus/captures/*.yaml  ->  (review)  ->  spec/*.yaml
   raw            normalize             this directory            curate        source of truth
```

A capture is a snapshot of *one* stanza as one person saw it, with provenance
attached. A spec entry is the **distilled, corroborated** understanding of that
stanza after multiple captures and techniques have been reconciled. Keeping the
two separate is deliberate: it lets us preserve the raw evidence trail even as
the curated spec evolves.

## What lives here

| Path | Purpose |
| --- | --- |
| `corpus/captures/*.yaml` | Individual sanitized captures, one file per record. |
| `corpus/captures/example-sanitized-offer.yaml` | A clearly-synthetic example capture you can copy from. |
| `corpus/schema/capture.schema.json` | JSON Schema (draft 2020-12) that every capture must validate against. |

## How captures get here

Most captures arrive automatically. When a contributor files a **Stanza
capture** issue using the GitHub Issue Form, the
[`issue-to-corpus`](../.github/workflows/issue-to-corpus.yml) workflow runs
`scripts/ingest-issue.ts`, which parses the form sections and writes a new
`corpus/captures/issue-<N>.yaml` file, then opens a pull request. Reviewers check
sanitization and plausibility before merging.

You can also add a capture by hand: copy
[`example-sanitized-offer.yaml`](captures/example-sanitized-offer.yaml), edit it,
and run `npm run validate`. See [the capture
pipeline](../docs/methodology/capture-pipeline.md) for the full lifecycle.

## The capture shape

Every file in `corpus/captures/` is validated against
[`capture.schema.json`](schema/capture.schema.json). The required fields are:

- `id` — stable identifier (e.g. `issue-12`).
- `source.technique` — one of the seven fixed technique ids:
  `websocket-capture`, `baileys-instrumentation`, `frida-hooking`, `mitm-tls`,
  `static-smali-analysis`, `memory-dump`, `wasm-analysis`.
- `stanza_tag` — the top-level WABinary tag, e.g. `call`.
- `direction` — `outgoing`, `incoming`, or `bidirectional`.
- `confidence` — `confirmed`, `probable`, `speculative`, or `unknown`.
- `raw.format` + `raw.body` — the captured payload (`xml`, `hex`, `base64`, or `json`).
- `sanitized` — **must be `true`**.

Optional fields include `title`, `status`, `source.issue`, `source.contributor`
(auto-stamped from the submitter's GitHub identity when filed via the Issue Form),
`source.tools` (tool ids from `spec/tools/`), `source.captured_at`, `decoded` (a
human-readable annotation), `attributes` (a flat list of `{name, value, note}`),
and `notes`.

## Sanitization rules (mandatory)

The corpus is **public** and contains only **synthetic or sanitized** data. There
are no real captures in this repository, and there must never be. Before a
capture is committed:

1. **No real PII.** Replace phone numbers, JIDs, names, and account identifiers
   with obvious placeholders such as `A@s.whatsapp.net` / `B@s.whatsapp.net`.
2. **No secrets or key material.** Signal ciphertext, prekeys, session state,
   media keys, SRTP keys, and auth tokens must be replaced with labelled
   placeholders (e.g. `CIPHERTEXTPLACEHOLDER`). Never paste real bytes.
3. **No relay/IP specifics that identify a person.** Latency hints and candidate
   shapes are fine; concrete IPs tied to a real session are not.
4. **`sanitized: true` is an assertion, not a formality.** Setting it means you
   personally verified the record is clean. The schema rejects anything else.
5. **When in doubt, redact.** Honesty over completeness — a partial, clearly
   placeholdered capture is worth far more than a "complete" one that leaks data.

See [legal and ethics](../docs/legal-and-ethics.md) for the broader framing and
[`DISCLAIMER.md`](../DISCLAIMER.md) for the affiliation disclaimer.

## Validating

```bash
npm run validate
```

This loads every file under `corpus/` and `spec/`, validates each against its
schema, and checks referential integrity (for example, that
`source.technique` names a real technique). Fix any reported error before
opening a PR.
