<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Specification overview

This is the generated, human-readable view of the wacrg corpus, a machine-readable model of the WhatsApp 1:1 call protocol. Every page below is generated from YAML under `spec/`; do not edit the Markdown by hand.

!!! warning "Research scaffold, not authoritative truth"
    No real captures exist yet. Examples are synthetic and clearly labeled, and most facts carry `probable` or `speculative` confidence with open questions. Trust the confidence levels, not the prose.

## Contents

| Section | Count |
| --- | --- |
| [Stanzas](./stanzas/index.md) | 9 |
| [Flows](./flows/index.md) | 4 |
| [Enums](./enums.md) | 3 |
| [Techniques](./techniques.md) | 7 |
| [Tools](./tools.md) | 8 |
| [Contributors](./contributors.md) | 5 |
| [Glossary](./glossary.md) | - |
| [Coverage](./coverage.md) | - |

## How the spec is organized

- **Stanzas** describe individual WABinary nodes (tag, attributes, nested children) with per-fact provenance and confidence.
- **Flows** stitch stanzas into end-to-end signaling sequences with mermaid diagrams.
- **Enums** capture closed value sets (e.g. terminate reasons).
- **Techniques** document the reverse-engineering methods that back each fact; **Tools** and **Contributors** record what produced it and who submitted it.
- **Coverage** quantifies how confirmed the spec currently is.
