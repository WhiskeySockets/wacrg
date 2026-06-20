<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# MLow range coder

**Category:** [Encodings](../index.md#encodings)  
**Part id:** `mlow-rangecoder`

**`mlow-rangecoder`** · status: review · features: audio · since: 0.1.0

The Opus/CELT range entropy coder (RFC 6716 §4.1) that MLow reuses verbatim to pack a frame: range-coded symbols are read from the front of the payload and raw uniform bits from the back, sharing a single byte buffer. This part specifies the coder state, the constants, the symbol/raw-bit primitives, and the encoder flush that merges the two streams.

**Normative**

An MLow payload is a single byte buffer that carries two interleaved bit
streams produced by one Opus/CELT range coder: **range-coded symbols** packed
from the **front** (low offsets, ascending) and **raw uniform bits** packed
from the **back** (high offsets, descending). A decoder MUST consume both
streams from the same buffer with the algorithms below; the streams meet
somewhere in the middle and the two cursors never overlap in a well-formed
payload.

## Constants

All arithmetic is on unsigned 32-bit integers with modular (wrapping)
semantics wherever noted. The coder uses these fixed constants:

```
EC_SYM_BITS   = 8                         ; bits per renormalisation byte
EC_CODE_BITS  = 32                        ; range register width
EC_SYM_MAX    = (1 << EC_SYM_BITS) - 1    ; 255
EC_CODE_TOP   = 1 << (EC_CODE_BITS - 1)   ; 0x80000000
EC_CODE_BOT   = EC_CODE_TOP >> EC_SYM_BITS ; 0x00800000
EC_CODE_EXTRA = (EC_CODE_BITS - 2) % EC_SYM_BITS + 1   ; 7
EC_WINDOW_SIZE = 32                       ; raw-bit window width
EC_UINT_BITS  = 8                         ; uint split threshold
EC_CODE_SHIFT = EC_CODE_BITS - EC_SYM_BITS - 1   ; 23
```

The helper `ilog(x)` MUST return `floor(log2(x)) + 1` for `x > 0` and `0` for
`x == 0` (equivalently `32 - clz(x)`). `ec_mini(a, b)` MUST return the smaller
of `a` and `b`.

## Decoder

### Initialisation

A decoder MUST initialise its state as follows (RFC 6716 `ec_dec_init`):

```
offs       = 0                ; front cursor (range bytes)
end_offs   = 0                ; back cursor (raw bytes, counts from buffer end)
end_window = 0 ; nend_bits = 0
rng        = 1 << EC_CODE_EXTRA          ; 0x80
nbits_total = EC_CODE_BITS + 1
            - ((EC_CODE_BITS - EC_CODE_EXTRA) / EC_SYM_BITS) * EC_SYM_BITS
rem        = read_byte()
val        = rng - 1 - (rem >> (EC_SYM_BITS - EC_CODE_EXTRA))
normalize()
```

`read_byte()` MUST return `buf[offs]` and advance `offs` while `offs <
len(buf)`, and MUST return `0` once the front cursor reaches the end of the
buffer (reading past the end yields zero bytes, it is not an error).

### Normalisation

After every symbol the decoder MUST renormalise so that `rng > EC_CODE_BOT`:

```
while rng <= EC_CODE_BOT:
    nbits_total += EC_SYM_BITS
    rng <<= EC_SYM_BITS
    sym0 = rem
    rem  = read_byte()
    sym  = (sym0 << EC_SYM_BITS | rem) >> (EC_SYM_BITS - EC_CODE_EXTRA)
    val  = ((val << EC_SYM_BITS) + (EC_SYM_MAX & ~sym)) & (EC_CODE_TOP - 1)
```

All `val` updates here MUST use wrapping 32-bit arithmetic.

### Decoding a symbol

Decoding a symbol against a frequency table of total `ft` is two steps: read
the cumulative frequency, locate the symbol externally, then advance.

`decode(ft)` MUST return a value in `[0, ft)`:

```
if ft == 0:               err = 1; ext = 1; return 0
ext = rng / ft
if ext == 0:              err = 1; ext = 1; return 0
s = val / ext
return ft - ec_mini(s + 1, ft)
```

After the caller locates the symbol whose cumulative range is `[fl, fh)` out of
`ft`, it MUST call `update(fl, fh, ft)`:

```
s = ext * (ft - fh)               ; wrapping
val = val - s                     ; wrapping
if fl > 0:  rng = ext * (fh - fl) ; wrapping
else:       rng = rng - s         ; wrapping
normalize()
```

### CDF table decode

A symbol against a **u16 cumulative CDF table** `cdf` (length `n >= 2`) MUST be
decoded as follows. A non-zero base `cdf[0]` is subtracted from every entry, so
the effective total is `cdf[n-1] - cdf[0]`:

```
if n < 2:                     err = 1; return 0
base = cdf[0]
if cdf[n-1] <= base:          err = 1; return 0
ft = cdf[n-1] - base
fs = decode(ft)
target = base + fs
k = 0
while k < n-1 and cdf[k+1] <= target:  k += 1
update(cdf[k] - base, cdf[k+1] - base, ft)
return k
```

### Inverse-CDF table decode

A symbol against a **u8 inverse-CDF table** `icdf` with `ftb = log2(ft)`
(RFC 6716 `ec_dec_icdf`) MUST be decoded as:

```
if icdf is empty:  err = 1; return 0
r = rng >> ftb
ret = -1 ; s = rng
repeat:
    t = s
    ret += 1
    s = r * icdf[ret]
until val >= s or ret == len(icdf) - 1
val = val - s
rng = t - s
normalize()
return ret
```

### Binary / logp decode

A single bit with probability `P(0) = 1 / 2^logp` (`ec_dec_bit_logp`) MUST be
decoded as:

```
s = rng >> logp
ret = (val < s) ? 1 : 0
if ret == 0:  val = val - s ; rng = rng - s
else:         rng = s
normalize()
return ret
```

A uniform `bits_n`-bit symbol read directly off the range stream
(`decode_raw_symbol`) MUST be decoded by first computing
`ext = rng >> bits_n` (on `ext == 0`, set `err = 1`, `ext = 1`, return `0`),
then `s = val / ext`, `ft = 1 << bits_n`, `sym = ft - ec_mini(s + 1, ft)`, and
finally `update(sym, sym + 1, ft)`, returning `sym`.

### Uniform integer decode

An integer uniformly distributed in `[0, ft0)` for `ft0 > 1`
(`ec_dec_uint`) MUST be decoded as:

```
ft  = ft0 - 1
ftb = ilog(ft)
if ftb > EC_UINT_BITS:
    ftb -= EC_UINT_BITS
    t = (ft >> ftb) + 1
    s = decode(t) ; update(s, s+1, t)
    v = (s << ftb) | bits_n(ftb)
    if v <= ft:  return v
    err = 1 ; return ft
else:
    s = decode(ft + 1) ; update(s, s+1, ft + 1)
    return s
```

### 64-symbol fine-lag decode

The MLow excitation parser reads a 64-value uniform fine-lag symbol
(`decode_64_fine_sym`) as:

```
ext = rng >> 6
if ext == 0:  err = 1; ext = 1; return 0
s = val / ext
sym = clamp(63 - s, 0, 64)
update(sym, sym + 1, 64)
return sym
```

### Raw bits from the back

Raw bits are pulled from the **back** of the buffer, LSB-first, through a
32-bit window. `bits_n(n)` MUST:

```
window = end_window ; available = nend_bits
if available < n:
    repeat:
        window |= read_byte_from_end() << available
        available += EC_SYM_BITS
    until available > EC_WINDOW_SIZE - EC_SYM_BITS
ret = window & ((1 << n) - 1)
window >>= n
available -= n
end_window = window ; nend_bits = available
nbits_total += n
return ret
```

`read_byte_from_end()` MUST return `buf[storage - 1 - end_offs]` (where
`storage = len(buf)`) and then increment `end_offs`, while `end_offs <
storage`; it MUST return `0` once exhausted.

### Error state and tell

Any operation that detects a degenerate or exhausted input (zero `ft`, zero
`ext`, empty/invalid table) MUST set the sticky error flag `err = 1`. A
consumer SHOULD treat a set `err` as a hard decode failure rather than using
the synthesised values. `ec_tell` MUST be `nbits_total - ilog(rng)`.

## Encoder

The encoder is the exact inverse and produces a byte-identical buffer. It MUST
initialise with `rng = EC_CODE_TOP`, `val = 0`, `rem = -1`, `offs = 0`,
`end_offs = 0`, `nbits_total = EC_CODE_BITS + 1`, and an output buffer of fixed
`size` bytes.

### Renormalisation and carry

```
normalize():
    while rng <= EC_CODE_BOT:
        carry_out(val >> EC_CODE_SHIFT)
        val = (val << EC_SYM_BITS) & (EC_CODE_TOP - 1)   ; wrapping
        rng <<= EC_SYM_BITS
        nbits_total += EC_SYM_BITS

carry_out(c):
    if c != EC_SYM_MAX:
        carry = c >> EC_SYM_BITS
        if rem >= 0:  write_byte(rem + carry)
        while ext > 0:
            write_byte((EC_SYM_MAX + carry) & EC_SYM_MAX)
            ext -= 1
        rem = c & EC_SYM_MAX
    else:
        ext += 1
```

`write_byte(b)` MUST store `b` at `buf[offs]` and advance `offs` while
`offs + end_offs < storage`, otherwise set `err = -1`. `write_byte_at_end(b)`
MUST store `b` at `buf[storage - 1 - end_offs]` and increment `end_offs` under
the same bound, otherwise set `err = -1`.

### Encoding primitives

`encode(fl, fh, ft)` (the inverse of `decode`/`update`) MUST, with `err = -1`
on `ft == 0`:

```
r = rng / ft
if fl > 0:
    val = val + (rng - r * (ft - fl))   ; wrapping
    rng = r * (fh - fl)                 ; wrapping
else:
    rng = rng - r * (ft - fh)           ; wrapping
normalize()
```

The encoder MUST provide the matching inverses of every decode primitive:
`bit_logp(val, logp)`, `encode_icdf(s, icdf, ftb)`, `encode_cdf(s, cdf)`
(with the same `cdf[0]` base subtraction and validity checks as the decoder),
`encode_uint(fl, ft0)`, `encode_raw_symbol(sym, nbits)` =
`encode(sym, sym+1, 1 << nbits)`, and `encode_64_fine_sym(sym)` =
`encode(sym, sym+1, 64)`. Raw bits are written toward the back with
`bits_n(fl, n)` through the same 32-bit window, flushing full bytes with
`write_byte_at_end` when the window would exceed `EC_WINDOW_SIZE`.

### Flush

After all symbols are written the encoder MUST flush (`ec_enc_done`) to emit
the final range bytes, drain the back raw-bit window, and merge the two
streams into the single buffer:

```
l   = EC_CODE_BITS - ilog(rng)
msk = (EC_CODE_TOP - 1) >> l
end = (val + msk) & ~msk
if (end | msk) >= val + rng:
    l += 1 ; msk >>= 1 ; end = (val + msk) & ~msk
while l > 0:
    carry_out(end >> EC_CODE_SHIFT)
    end = (end << EC_SYM_BITS) & (EC_CODE_TOP - 1)
    l -= EC_SYM_BITS
if rem >= 0 or ext > 0:  carry_out(0)
; drain back window
while nend_bits >= EC_SYM_BITS:
    write_byte_at_end(end_window & EC_SYM_MAX)
    end_window >>= EC_SYM_BITS ; nend_bits -= EC_SYM_BITS
if err == 0:
    zero-fill buf[offs .. storage - end_offs)
    if remaining bits:
        if end_offs >= storage - offs:  err = -1
        else:  buf[storage - end_offs - 1] |= end_window
```

The finished payload is `buf`; the meaningful body length is `offs + end_offs`
bytes (front range bytes plus back raw-bit bytes), and the gap between the two
cursors MUST be zero-fill padding written by the flush. A successful flush MUST
have `err == 0`; a non-zero `err` means the buffer was too small and the output
MUST be discarded.

**Findings**

The coder is the standard Opus/CELT range coder of RFC 6716 §4.1 (libopus
`celt/entdec.c` / `celt/entenc.c`), used unchanged. Encoder and decoder are
exact inverses: encoding a script of mixed `icdf`, raw back-bits, `bit_logp`,
and `uint` operations and then decoding the result reproduces the original
values, and the encoded bytes are reproducible byte-for-byte from the same
script.

MLow exercises a specific subset of the primitives: the u16 cumulative-CDF
symbol coder (`decode_cdf`/`encode_cdf`), the uniform `nbits`-bit raw symbol,
and the 64-symbol fine-lag read used by the excitation/pitch-lag parser. The
generic `decode_uint`, `decode_icdf`, and `bit_logp` paths are part of the same
coder and remain available, but several are not on MLow's own decode path.

The split-stream layout is the key wire detail: range-coded symbols grow from
the front of the buffer and raw uniform bits grow from the back, both managed by
one coder, and `done()` is what stitches them together with zero padding in the
middle.

**Requires:** [`mlow`](../encodings/mlow.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working | full ec_dec + ec_enc port; round-trip vectors pass |
| [`meowmeow`](../../flavors.md) | working | Go reference (voip/media/rangecoder.go) the Rust port matches bit-for-bit |
| [`meowcaller`](../../flavors.md) | partial | encodings codec modules are partial |

**Open questions**

- Which exact subset of primitives the MLow frame parser invokes, and in what order, is defined by the frame/excitation parts rather than the coder itself.

**References**

- [RFC 6716 — Definition of the Opus Audio Codec, §4.1 (Range Decoder)](https://www.rfc-editor.org/rfc/rfc6716#section-4.1)
- [libopus — celt/entdec.c / celt/entenc.c](https://github.com/xiph/opus/blob/main/celt/entdec.c)

---

[in the full RFC →](../index.md#mlow-rangecoder) · [RFC contents](../index.md#contents)
