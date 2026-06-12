# Governance

This document describes how wacrg is organized and how decisions get made. The goal
is simple: let independent contributors converge quickly on **one** trustworthy,
provenance-tracked specification without losing rigor.

## Roles

| Role | Who | Responsibilities |
| --- | --- | --- |
| **Contributor** | anyone who files a capture, opens an issue/PR, or joins a discussion | observe, document, propose facts; follow the confidence/provenance rules |
| **Area owner** | a maintainer responsible for one protocol layer | triage and review changes in their area; safeguard confidence discipline |
| **Maintainer** | trusted long-term contributors | review and merge, manage releases, steward the schemas and tooling |

Current people are listed in [MAINTAINERS.md](./MAINTAINERS.md). Areas map to the
`area/*` labels and to [`.github/CODEOWNERS`](./.github/CODEOWNERS):
`area/signaling`, `area/keying`, `area/media`, `area/transport`.

## How a fact moves from speculative to confirmed

Confidence is governed by a single rule, applied in review:

1. A newly documented fact starts at **`speculative`** (inferred/assumed) or
   **`probable`** (one clean observation from one technique).
2. A fact is promoted to **`confirmed`** only when **at least two _independent_
   techniques** agree on it. Two observations from the same technique against the
   same client build are **not** independent.
3. Uncertainty is recorded in `open_questions`, never hidden by inflating confidence.
4. When two techniques disagree, the conflict is filed as a `type/discrepancy` issue
   and **both** observations stay documented until it is resolved — we do not
   silently overwrite history.

Provenance (`techniques` + `sources`) is mandatory on every attribute and child so a
reviewer can verify the rule has been met. See
[docs/methodology](./docs/methodology/index.md) for the reasoning.

## Decision making

- **Routine changes** (new captures, documenting fields, fixes) are decided by normal
  review: an area owner or maintainer approves and merges.
- **Schema, tooling, or process changes** need review from at least one maintainer and
  a heads-up in [Discussions](https://github.com/WhiskeySockets/wacrg/discussions) so
  contributors can weigh in.
- **Disputes** are resolved by discussion first; if consensus cannot be reached, the
  maintainers decide. We favor keeping disagreements visible (as discrepancies) over
  forcing premature resolution.

## Releases

- The spec is versioned (currently `0.1.0`). Generated docs and the coverage badge are
  committed so the published site and badge always reflect `main`.
- A release is a tagged snapshot (`vX.Y.Z`) that bundles the corpus and generated docs
  (see the `release` workflow). We cut a release when a meaningful batch of facts has
  been corroborated or the schema changes.
- Versioning intent: bump **patch** for added/corrected facts, **minor** for
  additive schema/structure changes, **major** for breaking schema changes.

## Becoming a maintainer

Sustained, high-quality contribution — especially careful application of the
confidence/provenance rules and helpful review of others' work — is the path to
becoming an area owner or maintainer. Existing maintainers extend the invitation and
record it in [MAINTAINERS.md](./MAINTAINERS.md).

## Amending this document

Changes to governance are proposed by PR, announced in Discussions, and require
maintainer approval.
