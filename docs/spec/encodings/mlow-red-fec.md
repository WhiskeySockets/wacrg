<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# MLow RED and Reed-Solomon FEC

_Encodings · `mlow-red-fec`_

`ENC-02` · _status: draft · audio_

The optional "SplitRed" redundancy envelope wrapping an MLow RTP audio payload: one main frame plus zero or more time-shifted redundant copies of earlier frames, recoverable without retransmission.

## Applicability

SplitRed is the OUTERMOST layer of an MLow RTP audio payload. It MUST be
applied only when `mlow_red_redundancy_level > 0`. Otherwise the RTP payload is
a single bare MLow frame (see [mlow-frame](../encodings/mlow-frame.md)) with no wrapper and the
SplitRed parse MUST NOT be applied.

A decoder MUST choose between SplitRed and bare-frame based on the negotiated
redundancy level, NOT by sniffing the first byte (a bare frame's first byte has
its high bit set and is misread as a redundant block header). Feeding a bare
frame to the SplitRed parser is malformed and MUST be rejected.

## Wire layout

With `N` = number of redundant blocks in the packet:

```
[ red_hdr[0] (2B) ] ... [ red_hdr[N-1] (2B) ]   ; N redundant-block headers
[ main_marker     (1B) ]                         ; terminates the header run
[ red_payload[0] ] ... [ red_payload[N-1] ]      ; redundant bodies, in header order
[ main_payload ]                                 ; main frame body, last
```

### Redundant block header (`red_hdr[i]`, 2 bytes)

```
byte 0:  1 t t t t t t t      ; high bit MUST be 1; low 7 bits = time_code
byte 1:  s s s s s s s s      ; size = byte length of red_payload[i]
```

- `byte0` MUST have `0x80` set; `byte0 & 0x7f` is `time_code`.
- `byte1` is the unsigned byte length of the redundant body (max 255 bytes).

### Main marker (`main_marker`, 1 byte)

```
byte 0:  0 t t t t t t t      ; high bit MUST be 0; low 7 bits = main time_code
```

`0x80` MUST be clear; the parser detects end-of-header-run by a byte with the
high bit clear. `byte & 0x7f` is the main frame's `time_code`. The main payload
length is NOT in the header; it is whatever bytes remain after the header run
and all redundant payloads.

## Parse procedure

Let `p` be the payload, `n = len(p)`. A decoder MUST parse as follows and MUST
reject on each error condition:

1. If `n == 0`, reject (`PktSizeZero`).
2. Walk the header run from `cur = 0`, tracking `rem` = bytes from `cur` to end
   (`rem` starts at `n`):
   - If `rem == 0` before a main marker is seen, reject (`HeaderTooShort`).
   - Read `b0 = p[cur]`.
   - If `b0 < 0x80`, this is the main marker: if `rem <= 1`, reject
     (`MainTooShort`); otherwise stop the walk.
   - Else redundant header: if `rem <= 2`, reject (`RedundantTooShort`). Read
     `size = p[cur+1]`. If `size + 2 >= rem`, reject (`RedundantTooShort`).
     Record `{ code: b0 & 0x7f, size }`. Advance `cur += 2`; `rem -= size + 2`.
3. Read main marker: `main_code = p[cur] & 0x7f`; advance `cur += 1`.
4. For each recorded redundant block `r`, in header order, the next `r.size`
   bytes at `cur` are its body (`is_main = false`, `time_code = r.code`);
   advance `cur += r.size`.
5. The remaining `main_size = rem - 1` bytes are the main body (`is_main = true`,
   `time_code = main_code`).

Redundant frames are yielded first in header order, main frame last. Each body
is a complete MLow frame (TOC plus body), decoded per [mlow-frame](../encodings/mlow-frame.md).
A decoder SHOULD use a redundant copy only when the main frame for that
`time_code` was lost.

## Reed-Solomon FEC

A Reed-Solomon FEC tier exists alongside the RED envelope. Its on-wire
encoding, generator polynomial, symbol size, and negotiation are not specified
here.

**Notes.** The header run has no count field for `N`: the terminator is structural, found
by the high bit of the leading byte (set = redundant, clear = main). The
`size + 2 >= rem` check guarantees the one-byte main marker plus a non-empty
main payload remain after every redundant block.

Worked example (one redundant block + main):

```
p = 85 03 00  AA BB CC  50 11 22 33
    |  |  |   \______/  \_________/
    |  |  |   red body  main body (4B)
    |  |  main_marker (time_code 0)
    |  size = 3
    red hdr byte0 = 0x85 -> high bit set, time_code = 5
```

yields redundant frame `AA BB CC` (time_code 5) then main `50 11 22 33`
(time_code 0). A lone main marker (e.g. `00 50 11 22`) yields a single main
frame with no redundancy.

Parent: [`mlow`](../encodings/mlow.md)  
Requires: [`mlow`](../encodings/mlow.md), [`mlow-frame`](../encodings/mlow-frame.md)  
Breakdown: [`mlow-decoder`](../encodings/mlow-decoder.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [history ↗](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/mlow/red.rs) · [blame ↗](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/mlow/red.rs) · commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | depack_split_red parses the RED envelope; bare-frame streams bypass it |
| `meowcaller` | partial | — | codec modules partial |

**Annotation** `wacrg:ENC-02` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Rajeh Taher · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/encodings/mlow-red-fec.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/encodings/mlow-red-fec.yaml)

**Open questions**
- On-wire encoding of the Reed-Solomon FEC tier: generator polynomial, symbol/block size, and parity layout.
- Negotiation signalling that sets mlow_red_redundancy_level and enables Reed-Solomon FEC.
- Semantics of time_code relative to RTP timestamp / frame sequence, and the receiver's repair (jitter-buffer) policy for selecting a redundant copy.
- Encoder side: how many redundant copies are emitted per level and which past frames are chosen.

**References**
- [RFC 2198 — RTP Payload for Redundant Audio Data](https://www.rfc-editor.org/rfc/rfc2198)

## Changelog
- **2026-06-21** · v0.1.0 — Initial spec entry.

---

[← in the full spec](../../index.md#mlow-red-fec)
