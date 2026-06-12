<!-- Hand-written narrative. The per-technique catalogue table is generated at ../spec/techniques.md. -->

# Technique guides

wacrg converges findings from **six** reverse-engineering techniques into one
provenance-tracked spec. Each technique reveals a different slice of the WhatsApp
call protocol, and a fact earns higher confidence only when **independent**
techniques corroborate it (see [methodology](../methodology/index.md) and
[governance](../../GOVERNANCE.md)).

This page links to practical how-to guides. The machine-generated catalogue — with
each technique's maturity, target layers, strengths, limitations, and tooling — is
the [techniques page](../spec/techniques.md), rendered from
[`spec/techniques/`](../../spec/techniques).

## Maturity levels

| Maturity | Meaning |
| --- | --- |
| `established` | Reliable, low-friction, reproducible by most contributors. |
| `emerging` | Works, but needs setup, a controlled device, or careful interpretation. |
| `experimental` | High effort/fragility; results need strong corroboration. |

## The six techniques

| Technique | Maturity | Best at | Guide |
| --- | --- | --- | --- |
| [WebSocket / WABinary capture](websocket-capture.md) | established | signaling, keying envelope | [guide](websocket-capture.md) |
| [Baileys instrumentation](baileys-instrumentation.md) | established | signaling, keying | [guide](baileys-instrumentation.md) |
| [Frida dynamic hooking](frida-hooking.md) | emerging | keying, media, transport | [guide](frida-hooking.md) |
| TLS man-in-the-middle | emerging | signaling context, transport | see catalogue |
| Static smali / native analysis | emerging | vocabulary, intended logic | see catalogue |
| Process memory dump | experimental | keying, media (ground truth) | see catalogue |

> **Ethics first.** Every technique here is for **interoperability and research on
> accounts and devices you own**. Never target third parties, never capture real
> users' data, and only ever commit **synthetic or fully sanitized** material. See
> [the disclaimer](../../DISCLAIMER.md) and [security policy](../../SECURITY.md).

## Contributing a technique guide

The TLS MITM, static analysis, and memory-dump techniques have catalogue entries but
no full how-to guide yet — these are great `good-first-capture`-adjacent
contributions. Copy the structure of an existing guide, keep it hedged and ethical,
and link it from the technique's `guide:` field in `spec/techniques/<id>.yaml`.
