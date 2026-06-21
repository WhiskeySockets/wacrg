<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# RTP framing

_Relay - `rtp-framing`_

`REL-05` - _status: review - audio, video_

RTP framing for SRTP-protected Opus media: the 16-byte speech and 20-byte DTX/piggyback headers (ext profile 0xdebe), payload classification, and send-side sequencing.

Protected media MUST use RTP version 2. Audio payload type is **120** (Opus); a
receiver MUST also accept **121**. Byte 1 = `marker << 7 | (payloadType & 0x7f)`.
CC MUST be 0; P MUST be 0. All multi-byte fields MUST be big-endian.

**Header shape.** Every packet MUST carry exactly one of two headers. Speech uses
the 16-byte header (`X=0`); DTX or warp-piggyback uses the 20-byte header (`X=1`).
The 0xdebe extension profile tag MUST be emitted on every header; the 16-byte form
has extension length 0 (no extension block), the 20-byte form has length 1 word.

16-byte speech header:

    0               1               2               3
    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |V=2|P|X=0| CC=0  |M|     PT      |       sequence number       |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                           timestamp                          |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                             SSRC                             |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |       0xdebe (ext profile)    |     ext length = 0 words      |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

20-byte DTX / piggyback header (16-byte header with ext length = 1 word, then one
32-bit extension word):

    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |       0xdebe (ext profile)    |     ext length = 1 word       |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                       extension word                         |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

**Extension word** (20-byte header only):
- DTX (comfort-noise): MUST be `0x30010000`.
- Warp-piggyback: MUST be the piggyback word for that packet (see [warp](../relay/warp.md)).

**Payload classification.** Select header shape and marker from the Opus payload:
- **DTX/comfort-noise** when: single byte `0x10`, `0x88`, or `0x90`; or 2–15 bytes
  with first byte `b0` where `(b0 & 0xf8) == 0x08` or `b0 == 0x0a`; or ≤ 6 bytes
  with `(b0 & 0xf0) == 0x30`. MUST use the 20-byte header.
- **Opus priming frame** when it equals one of the fixed priming frames.
- All other payloads are **speech** and MUST use the 16-byte header.
- Priming and DTX payloads MUST NOT latch the speech marker.

**Sequencing (send side).** A stream MUST start sequence number at **1** and
timestamp at **0**. Each packet MUST advance the sequence number by 1 (mod 2^16)
and the timestamp by `samplesPerPacket` (mod 2^32). The marker bit MUST be set on
the first speech packet (speech onset); priming/DTX packets before speech MUST NOT
set the marker or latch the onset. Subsequent speech packets MUST NOT set the
marker unless the caller explicitly requests it.

**Wire-size estimation.** Implementations MAY estimate on-wire SRTP size as
`headerSize + payloadLength + authTagLength`, where `headerSize` is 16 (speech) or
20 (DTX), and `authTagLength` (see [srtp-hop-by-hop](../crypto/srtp-hop-by-hop.md)) is the
short 4-byte tag for DTX and short speech packets (priming frames or payloads
≤ 18 bytes), else the full 10-byte tag.

**Notes.** On parse, only the fixed 12-byte RTP fields are decoded; total header length is
computed from version, CC, and (when `X=1`) the extension length, so the payload
offset is found without interpreting the extension word.

Mlow Opus speech frames are recognisable by first byte (20 ms `0x48..0x4f`,
60 ms `0x50..0x57`) on payloads ≥ 18 bytes; this does not change the 16-byte header.

Requires: [`warp`](../relay/warp.md), [`srtp-hop-by-hop`](../crypto/srtp-hop-by-hop.md), [`opus`](../encodings/opus.md), [`ssrc`](../relay/ssrc.md)  
Breakdown: [`video-packetization`](../encodings/video-packetization.md), [`media-loop`](../relay/media-loop.md), [`rtcp`](../relay/rtcp.md)

**Implemented by**

| Flavor | Status | Source | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [:material-github: history](https://github.com/oxidezap/whatsapp-rust-private/commits/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/rtp.rs) - [:material-github: blame](https://github.com/oxidezap/whatsapp-rust-private/blame/674e85164b35ca19115dfebcf605708d15951ee7/wacore/src/voip/rtp.rs) - commits [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | — |
| `zapo-caller` | working | — | ported to whatsapp-rust from the zapo-caller src/media/rtp.ts framing |

**Annotation** `wacrg:REL-05` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

**Contributors** [![Rajeh Taher](https://github.com/purpshell.png?size=20) Rajeh Taher](../contributors.md#purpshell) (wrote initial spec)

[:material-github: protocol history / diff](https://github.com/WhiskeySockets/wacrg/commits/main/spec/relay/rtp-framing.yaml) - [:material-github: blame](https://github.com/WhiskeySockets/wacrg/blame/main/spec/relay/rtp-framing.yaml)

**Open questions**
- Whether payload type 121 is used for a distinct media variant or is only accepted on receive.
- The full set of warp-piggyback extension words and the packet index at which piggybacking begins.

**References**
- [RFC 3550 — RTP](https://www.rfc-editor.org/rfc/rfc3550)
- [RFC 8285 — A General Mechanism for RTP Header Extensions](https://www.rfc-editor.org/rfc/rfc8285)

## Changelog
- **2026-06-21** — Initial spec entry.

---

[Back to the full spec](../../index.md#rtp-framing)
