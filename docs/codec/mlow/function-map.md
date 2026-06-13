<!-- Hand-written narrative. Backed by data/identity-map.json (machine-generated from warden). -->

# MLow function map

This is the **identity table** for the audio codec subsystem: which WASM
functions implement which C++ class, recovered from the binary's own RTTI and
`__FILE__` strings rather than guessed. It is the basis for the corrected names
in the warden knowledge base.

> **Provenance.** Module `wa.wasm` SHA-1
> `3638a506b4055c2fc6bec75edff18512ca79fe64`. Technique: `wasm-analysis`.
> Confidence: class membership is **`probable`** (a function referencing a
> class's typeinfo operates on that class); exact per-method roles are
> `speculative` until each function body is read. Full lists:
> [`data/identity-map.json`](data/identity-map.json).

## Two failure modes, and why renames need the body

The deep-analysis pass that first populated the KB named functions from their
lifted pseudo-C alone. That produces **both** kinds of error, and recovering the
codec means guarding against each:

**1. Wrong auto-names.** Some functions are confidently misnamed. The decoder
entry (index 1839) is named `dispatch_audio_effect_by_format_`, yet it references
`facebook::rtc::AudioDecoderMLowImpl`'s typeinfo and is part of the MLow decoder.
The auto-name is misleading; the typeinfo is the better anchor.

**2. False-positive string-xref.** The reverse trap is just as real. warden's
string index attributes a data string to a function by an `i32.const` whose value
matches the string's address, which **over-matches**: large functions reference
many constants, and some addresses collide. Worked examples found while writing
this page:

| idx | auto-name | matched an MLow needle, but the **body** is | verdict |
| --- | --- | --- | --- |
| 7466 | `init_video_encoder_params` | H.264 macroblock sizing (`(w+15)>>4`), profile check `== 66` (Baseline) | genuinely **video**; auto-name correct |
| 7952 | `parse_h264_nal_unit` | NAL header parse (`b>>7`, `b>>5`, `b&31`) + an executorch op | genuinely **video/NN**; auto-name correct |

So **typeinfo membership is a hint, not proof**, and a single string match is
weaker still. Every rename in this project is therefore made only after reading
the function body; the table below lists *who references a class's typeinfo* (an
upper bound that includes incidental references), not a verified method list. The
counts are reference counts, to be narrowed by body reads, not member counts.

This is exactly why wacrg keeps **provenance** separate from the claim: the
evidence (typeinfo, source path, body shape) is recorded so a reviewer can see
how far a name has actually been verified.

## Codec classes (RTTI-anchored)

Function counts are the number of functions that reference each class's typeinfo.

| C++ class | role | # funcs | anchor indices |
| --- | --- | --- | --- |
| `facebook::rtc::AudioDecoderMLowImpl` | MLow speech decoder | 10 | 1839, 4245, 4882, 6261, 7006, 7018, 8032, 8036, 10750, 11416 |
| `facebook::rtc::MLowFrame` | MLow audio frame/packet | 37 | 1916, 2024, 2039, 2314, 3790, 3922, 3926, 3928, 4703, 4733, 4815, 4819, 5418, 5422 … |
| `concerto::MlowRedPayloadSplitter` | RED redundancy split | 7 | 2024, 3607, 4016, 10750, 11407, 11416, 11419 |
| `facebook::rtc::ReedSolomonCode` | RS FEC core | 22 | (see identity-map.json) |
| `facebook::rtc::ReedSolomonFactoryImpl` | RS FEC factory | 7 | — |
| `facebook::rtc::RSEncoderDecoder` | RS encode/decode | 2 | — |
| `facebook::rtc::RSCodec` | RS codec wrapper | 2 | 10750, 11416 |

## Receive-engine classes (WebRTC NetEq, renamed `concerto`)

The class names are **verbatim** WebRTC NetEq internals, which is what makes the
identification near-certain.

| C++ class | WebRTC role |
| --- | --- |
| `concerto::NetEqImpl`, `concerto::NetEqController` | the NetEq receive engine + controller |
| `concerto::DecoderDatabase` | pluggable decoder registry (MLow / Opus) |
| `concerto::PacketBuffer` | reorder/jitter packet store |
| `concerto::DelayManager`, `concerto::DelayPeakDetector`, `concerto::BufferLevelFilter` | adaptive jitter delay |
| `concerto::Expand`, `concerto::ExpandFactory`, `concerto::Merge` | packet-loss concealment (expand/merge) |
| `concerto::TimestampScaler` | sample-rate / timestamp scaling |
| `concerto::StatisticsCalculator` (+ `PeriodicUma*`) | receive stats |

## Adjacent classes (named, out of codec scope)

| C++ class / file | layer |
| --- | --- |
| `facebook::rtc::e2ee::FrameDataHandlerGeneric` / `H264`, `KeyAccessTracker`, `FrameStatsCollector` | E2EE media (SFrame-style) |
| `concerto::PacketPairBweV3`, `concerto::PacketPairBwe`, `concerto::AimdRateControl*`, `concerto::DelayBasedBwe` | bandwidth estimation / congestion control |
| `whatsapp::wasm::WasmAudioDriver` and capture/playback drivers | platform audio I/O (JS boundary) |
| `facebook::rtc::LumaHistogramDetector`, `ScreenContentDetector` | video analysis |

## Source compilation units

`__FILE__` strings tie functions to the WhatsApp VoIP source tree
(`xplat/wa-voip/wacall/`):

| source file | layer |
| --- | --- |
| `media/src/codec/wa_opus.cc` | Opus codec |
| `media/src/codec/hybrid_codec.cc` | codec selection (MLow vs Opus) |
| `media/src/codec/wa_h26x_passthrough.cc`, `media/src/codec/h26x_packetizer.cc` | video codec |
| `media/src/audio/wa_audio_transformation.cc`, `media/src/audio/audio_stream_tx_stats.cc` | audio TX path |
| `media/src/core/wa_media_pipeline.cc` | media pipeline core |
| `system/src/media/codec_utils.cc` | codec utilities |
| `platforms/wasm/drivers/WasmAudioDriver.cpp` | WASM audio driver |
| `xplat/rtc/webrtc/latest/modules/rtp_rtcp/source/multistream_forward_error_correction.cc` | WebRTC FEC |

The MLow-specific units (`AudioDecoderMLowImpl.cpp`, `MLowFrame.cpp`) are reached
via RTTI rather than `__FILE__` strings, because their asserts were optimized
out; the typeinfo above is the anchor instead.

## Corrected names in the KB

Corrections are applied to the warden knowledge base as reversible, top-authority
renames (provenance `human`, logged so any can be undone) **only after the
function body is read** and the role is justified, never from typeinfo or a single
string match alone (see the two failure modes above). The
[methodology](methodology.md#applying-corrections) gives the exact procedure; the
running list of body-verified renames is maintained there as the per-function
read proceeds. The class table above is the *worklist* for that read, not a set of
finished names.
