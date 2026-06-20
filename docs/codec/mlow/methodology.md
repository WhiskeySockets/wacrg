<!-- Hand-written narrative: a reproducible research log. -->

# Methodology: recovering MLow from the WASM

Every claim in these MLow pages is reproducible from the same WhatsApp Web
calling-engine binary with [warden](../../techniques/wasm-analysis.md). This page
is the step-by-step log, so a reviewer can re-run it and a second technique can
corroborate it.

> **Inputs.** `wa.wasm`, SHA-1 `3638a506b4055c2fc6bec75edff18512ca79fe64`
> (9,819,554 bytes), ingested into a warden knowledge base as version `v1`
> (id `1`). All queries below run against that KB; none execute the binary, so no
> live traffic and no key material are involved.
> Technique `wasm-analysis` · tool `warden` · contributor `purpshell`.

## 0. The binary is the same one shipped to clients

The Web bridge instantiates a `whatsapp.wasm` whose SHA-1 matches `wa.wasm`
byte-for-byte, so static findings here describe the code clients actually run.

## 1. Anchor on the codec's own type names

WhatsApp's Web build keeps **C++ RTTI** strings. warden's string-xref index
(`function_strings`, surfaced by `warden xref` and the studio's string search)
maps a substring to the functions that reference it. Anchoring on the MLow class
names:

```python
from warden.kb import KnowledgeBase
kb = KnowledgeBase("analysis/.warden/warden.db"); VID = 1
for needle in ["AudioDecoderMLow", "MLow", "Mlow", "SILK", "companion"]:
    for h in kb.functions_referencing(VID, needle, limit=200):
        print(needle, h["func_index"], h["name"], h["strings"])
```

This returns the Itanium-mangled typeinfo strings verbatim, e.g.
`N8facebook3rtc20AudioDecoderMLowImplE`, `N8facebook3rtc9MLowFrameE`,
`N8concerto22MlowRedPayloadSplitterE`.

## 2. Demangle the typeinfo to class identities

Each `function_strings` row that looks like Itanium RTTI (`N...E`) is demangled
with `c++filt -t`, then grouped by class:

```python
import re, subprocess
rows = kb._conn.execute(
    "SELECT func_index, text FROM function_strings WHERE version_id=?", (VID,)
).fetchall()
typemap = {}
for r in rows:
    if re.fullmatch(r"N[0-9].*E", r["text"]):
        typemap.setdefault(r["text"], set()).add(r["func_index"])
dem = lambda s: subprocess.run(["c++filt","-t",s], capture_output=True, text=True).stdout.strip()
```

The full result is committed at `impl/mlow/data/identity-map.json` (kept under
`impl/`, not the published `docs/` site, per the
[attribution model](../../attribution.md)). The codec-relevant classes are in the
[function map](function-map.md). Key reads:

- `facebook::rtc::AudioDecoderMLowImpl`: the decoder.
- `facebook::rtc::MLowFrame`: the audio frame.
- `concerto::MlowRedPayloadSplitter`: the RED split.
- `facebook::rtc::ReedSolomonCode` / `ReedSolomonFactoryImpl` / `RSEncoderDecoder`
  / `RSCodec`: Reed-Solomon FEC.
- the `concerto::NetEq*` family: a verbatim WebRTC NetEq fork.

## 3. Tie functions to source files

The same `function_strings` rows include `__FILE__` paths from asserts/logs. A
regex for `...(\.cc|\.cpp|\.h)` over the rows yields the source tree under
`xplat/wa-voip/wacall/media/src/`, which independently corroborates the codec /
audio / RED grouping (e.g. `wa_opus.cc`, `hybrid_codec.cc`, `codec_utils.cc`,
`multistream_forward_error_correction.cc`).

## 4. Read the body before trusting either name

A typeinfo reference says a function *touches* a class; it does not say *how*. The
function at index 1839 references `AudioDecoderMLowImpl` and dispatches on a byte
via a 16-way switch:

```python
print(kb.get_function_code(VID, 1839)["lifted_c"])      # switch on mem8_u[p1+28]
print(kb.callees_of(VID, 1839))                          # the per-branch handlers
```

But its callees are string/format helpers and several branches set error code 18,
so it may be a config or serialized-message validator that constructs an
`AudioDecoderMLowImpl`, not the decode path. The current read is
"belongs to the MLow decoder class; exact role pending." Mapping each branch is
[open work](index.md#open-questions).

### Pitfall: string-xref over-matches

The string index attributes a data string to a function by an `i32.const` equal
to the string's address. Big functions reference many constants, so this
over-matches. Concrete false positives caught here: indices 7466 and
7952 surfaced under an MLow needle, but their bodies are unmistakably H.264
(macroblock sizing `(w+15)>>4`, profile `== 66`, NAL header `b>>7`/`b>>5`/`b&31`):
genuinely video, correctly auto-named. Rename from
the body, corroborated by typeinfo and source path, never from a single string
hit.

## 5. Config and tuning strings

Filtering `function_strings` for `mlow`/`companion` surfaces the decoder's
configuration surface, which names real fields without running anything:

- `WebRTC-MLowDecoder-lowPassCutoffFrequencyHz`, `p->mlow_dec_cutoff_hz`: output
  low-pass cutoff (a band-limiting post step).
- `p->mlow_red_secondary_complexity`, `mvp->mlow_red_proactive_update_limit`:
  RED redundancy strength and update cadence.
- `mlowcompanion_af1_kernel_bias`, `mlowcompanion_fnet_tconv_bias`,
  `mlowcompanion_ft2_subias`, `mlowcompanion_tdshape1_alpha1_f_bias`: companion
  NN weights (out of scope).

## Applying corrections

Once a body read justifies a role, the KB name is corrected with a reversible,
top-authority rename plus an evidence-citing summary:

```python
sid = kb.get_function(VID, idx)["stable_id"]
kb.rename_function(sid, "<role_anchored_name>", actor="human")
kb.set_summary(sid, "<class>; <role observed in body>; evidence: <typeinfo/file>.",
               actor="human")
```

Every rename is logged (`add_rename`) and can be undone in the studio, so a later
correction never silently overwrites history. Names are applied only with a
body justification. The class table in the [function map](function-map.md) is the
worklist, and the running list of verified renames is kept there as the read
proceeds.

## Confidence discipline

Per the [corroboration rule](../../methodology/index.md), all of the above is one
technique (`wasm-analysis`) and is therefore capped at `probable`. The RTTI
and `__FILE__` evidence make the *structural* claims strong within that cap; the
*algorithmic* claims (bitstream, sample rate, RS parameters) stay `speculative`
until a body-by-body read or a second technique corroborates them. Discrepancies
(e.g. 8 kHz vs 16 kHz vs 32 kHz) are recorded as open questions, not rounded
away.
