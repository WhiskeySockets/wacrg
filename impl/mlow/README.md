# mlow: reference implementation

A clean-room, decode-first reference implementation of WhatsApp's **MLow**
audio codec and receive pipeline, reconstructed by static analysis of the
WhatsApp Web calling engine (WASM). It is the executable companion to the
research in [`docs/codec/mlow/`](../../docs/codec/mlow/index.md).

> **Status: in progress.** This is reverse-engineered
> from a single static technique and has not been validated against the WASM
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
| `rangecoder.go`, `ec_enc.go` **(done, tested)** | CELT range coder (decode + matched encoder) | [decode-pipeline.md](../../docs/codec/mlow/decode-pipeline.md) |
| `tables.go` **(done, tested)** | recovered inverse-CDF tables for #8911 | [decode-pipeline.md](../../docs/codec/mlow/decode-pipeline.md) (decode schedule) |
| `frame.go` *(pending)* | MLow frame / TOC parse | function-map.md |
| `red.go`, `fec.go` *(pending)* | RED split + Reed-Solomon FEC | function-map.md |
| `mdct.go` *(pending)* | CELT-style MDCT band decode | decode-pipeline.md |
| `lpc.go` *(pending)* | LPC synthesis (Levinson-Durbin verified, #9083) | decode-pipeline.md |
| `decoder.go` *(pending)* | full decode (range -> MDCT/LPC -> PCM) | decode-pipeline.md |

Each file, as it lands, cites the exact WASM function indices and the lifted-C
evidence it was built from, so a reviewer can trace any line back to the binary.

## Out of scope

The neural companion post-filter (`mlowcompanion_*`, ExecuTorch/XNNPACK) is
excluded; intelligible audio is reachable without it. Opus is a separate
codec present in the same binary and is not implemented here.

## Build

```bash
cd impl/mlow
go build ./...
go test ./...
```
