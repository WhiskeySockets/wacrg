<!--
Thanks for contributing to the WhatsApp Calls Research Group spec!

The spec is a machine-readable YAML corpus under spec/ (plus corpus/ intake).
Human docs, coverage stats, and the badge are GENERATED from it. Please run the
toolchain locally before opening this PR so generated files stay in sync.
-->

## Summary

<!-- What does this PR change, and why? One or two sentences. -->

## Linked issue

<!-- e.g. "Closes #123" or "Refs #123". Link the capture/finding/discrepancy
     issue this PR addresses, if any. -->

Closes #

## What kind of change is this?

- [ ] New or updated stanza (`spec/stanzas/`)
- [ ] New or updated flow (`spec/flows/`)
- [ ] New or updated enum (`spec/enums/`)
- [ ] New or updated technique (`spec/techniques/`)
- [ ] Capture intake (`corpus/captures/`)
- [ ] Tooling / scripts (`scripts/`)
- [ ] Docs / repo meta
- [ ] Other (describe below)

## Checklist

- [ ] I ran `npm run build` locally (validate + generate + coverage) and it passed.
- [ ] Generated docs are regenerated and committed (`docs/spec`, `COVERAGE.md`, `docs/coverage-badge.json`), and `npm run check` is clean.
- [ ] Every new attribute/child carries an honest `confidence` and `provenance` (techniques + sources).
- [ ] Provenance `techniques` use only the fixed technique ids, and any `enum:<id>` types reference an existing enum.
- [ ] No real PII or secrets: all examples/captures are synthetic and sanitized (`sanitized: true`).
- [ ] Uncertainty is recorded in `open_questions` rather than fabricated as certainty.

## Notes for reviewers

<!-- Anything reviewers should pay special attention to: assumptions,
     open questions, conflicting evidence, etc. -->
