# mlow — reference implementation

A clean-room, **decode-first** reference implementation of WhatsApp's **MLow**
audio codec and receive pipeline, reconstructed by static analysis of the
WhatsApp Web calling engine (WASM). It is the executable companion to the
research in [`docs/codec/mlow/`](../../docs/codec/mlow/index.md).

> **Status: in progress, and deliberately honest.** This is reverse-engineered
> from a single static technique and has **not** been validated against the WASM
> output (no live decode oracle is used). Stages that are not yet recovered
> return [`ErrNotRecovered`](mlow.go) instead of emitting plausible-but-wrong
> samples. Treat output as a research artifact, not a drop-in WhatsApp codec,
> until a second technique corroborates the bitstream (the wacrg
> [corroboration rule](../../docs/methodology/index.md)).

## Why a fresh implementation

A prior Go attempt existed but was never validated against anything except a
synthetic sine round-trip, and it modelled MLow as a bare SILK-style LPC codec.
The static analysis shows the real picture is layered differently: an **RED +
Reed-Solomon FEC** envelope, a **WebRTC-NetEq** jitter/PLC engine (the binary's
`concerto` classes), and MLow as one registered decoder alongside Opus. This
implementation mirrors that recovered structure rather than the prior guess.

## Layout

| file | layer | source-of-truth doc |
| --- | --- | --- |
| `doc.go`, `mlow.go` | public API, architecture, honesty contract | [index.md](../../docs/codec/mlow/index.md) |
| `red.go` *(pending)* | RED redundancy split | [function-map.md](../../docs/codec/mlow/function-map.md) |
| `fec.go` *(pending)* | Reed-Solomon FEC | function-map.md |
| `frame.go` *(pending)* | MLow frame / TOC parse | index.md (open questions) |
| `rangecoder.go` *(pending)* | entropy/range decoder | index.md (open questions) |
| `decoder.go` *(pending)* | CELP decode (LSF/LPC/LTP/excitation/synthesis) | index.md (open questions) |

Each file, as it lands, cites the exact WASM function indices and the lifted-C
evidence it was built from, so a reviewer can trace any line back to the binary.

## Out of scope

The neural **companion** post-filter (`mlowcompanion_*`, ExecuTorch/XNNPACK) is
excluded; intelligible audio is reachable without it. **Opus** is a separate
codec present in the same binary and is not implemented here.

## Build

```bash
cd impl/mlow
go build ./...
go test ./...
```
