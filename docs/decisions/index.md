<!-- Hand-written narrative. The decision record (ADR) area. -->

# Decision records

Implementation decisions, recorded. When a conversation over a specific
implementation detail of a derivative implementation (e.g.
[meowcaller](https://github.com/), the pure-Go flavor) concludes with a choice
worth remembering, that choice is written here as a timestamped record: **what was
decided, the context, the options weighed, and why**.

wacrg is the agreed spec, so it is also the home of the agreed *decisions*. A
record here is the durable answer to "why is it built this way?" — and, over time,
the source from which the spec itself is updated.

## What belongs here

- A decision made while implementing the protocol that future readers (or other
  implementations) need to understand: a byte-layout call, an interop trade-off, a
  deviation from a reference and its justification, a resolution of a discrepancy.

## What does not

- Routine code changes, refactors, or anything a commit message already covers.
- Pre-emptive or speculative records. A decision record is written **after** a real
  decision, **on direction** — never autonomously and never for its own sake.

## How records are made

- One file per decision: `docs/decisions/YYYY-MM-DD-<slug>.md`, following
  [`_TEMPLATE.md`](_TEMPLATE.md).
- The date in the filename is the day the decision was taken.
- The implementing code may link back here by plain URL where a pointer helps; the
  reasoning lives in the record, not in code comments.

## Records

_None yet. The first will be added when an implementation decision is taken and
the record is directed._
