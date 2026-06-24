<!-- Hand-written narrative. Complements the generated docs under docs/spec/. -->

# Media plane: SRTP, RTP, and codecs

Once a call is accepted, the actual audio and video do not travel over the
[signaling WebSocket](transport-noise.md). They flow on a separate **media
plane**: SRTP over UDP to WhatsApp voip/relay servers, using transport
endpoints negotiated during signaling.

> Confidence: media as SRTP/UDP and end-to-end encrypted is `probable`. Much of
> what this page once marked `speculative` has since been recovered to `probable`
> by `wasm-analysis` plus independent reconstructions: the audio codec
> ([MLow](codec/mlow/index.md)), the SRTP cipher suite and
> [key schedule](keying/srtp-key-schedule.md), the per-frame
> [SFrame](keying/sframe-media-e2ee.md) layer, and the
> [WARP/STUN media transport](transport/warp-stun-relay.md). What is still open
> (video, RTP multiplexing, replay window, mid-call rekeying) is marked below.
> Nothing here is `confirmed` yet — that wants a fresh on-wire media capture.

## What we believe is true

- **Transport is UDP.** Real-time media needs low latency and tolerates loss, so
  it uses UDP rather than the call's TCP/WebSocket control channel.
- **Media is encrypted with SRTP.** Frames are RTP packets protected by SRTP
  (encryption + authentication). The SRTP keys are *derived* from the call/media
  key that signaling delivered via Signal `<enc>`. See
  [encryption & keying](encryption-keying.md). This keeps media end-to-end
  encrypted even though it transits WhatsApp relays.
- **Relays may carry the media.** When a direct path is unavailable (NAT,
  firewalls), media is forwarded through WhatsApp relay servers chosen from the
  candidates offered during signaling. See [ICE & relays](ice-and-relays.md).
  Relays forward *ciphertext*; they are not media-decryption points.

## What has been recovered

Much of the media plane this page once listed as unknown is now mapped to
`probable` by static `wasm-analysis` plus two independent reconstructions:

- **Codecs.** The primary audio codec is **MLow** (an in-house CELP speech codec
  with an optional neural "companion"), with **Opus** as an alternate, carried
  over an RED + Reed-Solomon FEC layer into a WebRTC-NetEq receive engine. See
  [MLow and the audio media plane](codec/mlow/index.md).
- **RTP details.** Media rides **WARP** (WhatsApp's RTP profile): first byte
  `0x90`, audio payload types 120/121, a `0xDEBE` header-extension profile, and a
  4-byte per-packet HMAC tag; SSRCs are derived rather than random. See
  [WARP/STUN media transport](transport/warp-stun-relay.md).
- **SRTP profile.** The suite is **`AES_CM_128_HMAC_SHA1_80`** (AES-128 counter
  mode, 80-bit HMAC-SHA1 tag), applied in two layers — hop-by-hop to the relay
  and end-to-end. See [SRTP key schedule](keying/srtp-key-schedule.md).
- **Key derivation.** How the Signal-delivered call key becomes SRTP master
  keys/salts is recovered: a `WAHKDF` (HKDF-SHA256 keyed by the call key, with the
  participant LID as `info`) feeding the RFC 3711 KDF. See
  [SRTP key schedule](keying/srtp-key-schedule.md).
- **Per-frame E2EE.** Above SRTP, **SFrame** encrypts each frame's payload with
  AES-128-GCM. See [SFrame](keying/sframe-media-e2ee.md).

## What is still open

- **Video.** The video codec(s) and parameters remain unmapped; the recovered
  media plane is audio-first.
- **RTP multiplexing.** Whether audio and video share one 5-tuple, SSRC
  assignment across slots, and the exact RTCP (compound) layout.
- **MLow bitstream.** Bitrates, DTX usage, mid-call renegotiation, and the exact
  `<audio enc rate>` mapping.
- **Rekeying and replay.** Whether SRTP/SFrame keys rotate during a long call,
  the SRTP replay-window behavior, and the exact HKDF `info` beyond the LID.
- **Congestion control / quality adaptation.** Bandwidth estimation, packet-loss
  concealment, and jitter-buffer behavior are out of scope until we can observe
  them.
- **Group vs. 1:1.** wacrg is scoped to **1:1** calls; group-call media topology
  (SFU-style mixing) is explicitly out of scope for `0.1.0`.

## Why media is hard to capture

The techniques that reveal signaling cheaply (WebSocket capture, Baileys
instrumentation) do not see the media plane, because media never crosses the
control socket. Reaching media facts requires observing UDP/SRTP directly or
hooking the media engine, for example **Frida hooking** of the native voip
library, or memory inspection to recover derived SRTP keys. Those techniques are
harder and lower-yield, which is exactly why this plane is under-documented. See
[methodology](methodology/index.md) and the
[techniques table](spec/techniques.md).

## Open questions (tracked)

The above is summarized as `open_questions` on the relevant
[stanza](spec/stanzas/index.md) and [technique](spec/techniques.md) entries.
The recovered facts are `probable`; the priorities now are to confirm them and
close the remaining gaps:

1. A fresh on-wire media capture decoded against the recovered WARP/SRTP/SFrame
   formats — the missing independent technique that would reach `confirmed`.
2. The `<audio enc rate>` mapping and MLow bitstream specifics (bitrates, DTX).
3. The video codec and how audio/video multiplex on the media path.
4. Whether/how SRTP and SFrame keys rotate during a long call.

If you can observe the media plane safely and with fully synthetic test
accounts, see the [capture pipeline](methodology/capture-pipeline.md) and the
[legal and ethics](legal-and-ethics.md) rules first.
