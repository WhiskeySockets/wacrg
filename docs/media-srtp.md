<!-- Hand-written narrative. Complements the generated docs under docs/spec/. -->

# Media plane: SRTP, RTP, and codecs

Once a call is accepted, the actual audio and video do **not** travel over the
[signaling WebSocket](transport-noise.md). They flow on a separate **media
plane**: **SRTP over UDP** to WhatsApp voip/relay servers, using transport
endpoints negotiated during signaling.

> Confidence: this is the **least-observed** plane in wacrg today. That media is
> SRTP/UDP and end-to-end encrypted is `probable`; almost everything more
> specific — exact codecs, RTP header usage, the SRTP cipher suite, the key
> schedule — is `speculative`. We mark it accordingly and lead with open
> questions. Do not treat anything here as settled.

## What we believe is true

- **Transport is UDP.** Real-time media needs low latency and tolerates loss, so
  it uses UDP rather than the call's TCP/WebSocket control channel.
- **Media is encrypted with SRTP.** Frames are RTP packets protected by SRTP
  (encryption + authentication). The SRTP keys are *derived* from the call/media
  key that signaling delivered via Signal `<enc>` — see
  [encryption & keying](encryption-keying.md). This keeps media end-to-end
  encrypted even though it transits WhatsApp relays.
- **Relays may carry the media.** When a direct path is unavailable (NAT,
  firewalls), media is forwarded through WhatsApp relay servers chosen from the
  candidates offered during signaling — see [ICE & relays](ice-and-relays.md).
  Relays forward *ciphertext*; they are not media-decryption points.

## What we do not know yet

This section is deliberately long, because it is where the honesty lives.

- **Codecs.** Static `wasm-analysis` now identifies the **audio** codec at
  `probable`: the primary codec is **MLow** (an in-house CELP speech codec with
  an optional neural "companion"), with **Opus** present as an alternate, carried
  over an RED + Reed-Solomon FEC layer into a WebRTC-NetEq receive engine. See
  [MLow and the audio media plane](codec/mlow/index.md). What remains open: the
  MLow bitstream/bitrates, DTX usage, mid-call renegotiation, and the exact
  `<audio enc rate>` mapping. Video codec(s) and parameters are still open.
- **RTP details.** Payload type numbers, SSRC assignment, header extensions,
  marker/sequence handling, and whether multiple media (audio+video) are
  multiplexed on one 5-tuple are all unknown.
- **SRTP profile.** The specific SRTP cipher suite (e.g. AES-CM vs. AES-GCM),
  authentication tag length, and replay-window behavior are unconfirmed.
- **Key derivation.** *How* the Signal-delivered media key becomes SRTP master
  keys/salts — the KDF, labels, and whether keys are per-direction or rekeyed
  mid-call — is the single biggest open question and is treated as
  `speculative` throughout (see [keying](encryption-keying.md#srtp-key-derivation)).
- **Congestion control / quality adaptation.** Bandwidth estimation, packet-loss
  concealment, and jitter-buffer behavior are out of scope until we can observe
  them.
- **Group vs. 1:1.** wacrg is scoped to **1:1** calls; group-call media topology
  (SFU-style mixing) is explicitly out of scope for `0.1.0`.

## Why media is hard to capture

The techniques that reveal signaling cheaply (WebSocket capture, Baileys
instrumentation) **do not** see the media plane, because media never crosses the
control socket. Reaching media facts requires observing UDP/SRTP directly or
hooking the media engine — for example **Frida hooking** of the native voip
library, or memory inspection to recover derived SRTP keys. Those techniques are
harder and lower-yield, which is exactly why this plane is under-documented. See
[methodology](methodology/index.md) and the
[techniques table](spec/techniques.md).

## Open questions (tracked)

The above is summarized as `open_questions` on the relevant
[stanza](spec/stanzas/index.md) and [technique](spec/techniques.md) entries.
Priorities for moving any of this from `speculative` toward `probable`:

1. Confirm the audio codec and its `<audio enc rate>` mapping. *(Codec
   identified at `probable` by static [MLow analysis](media/mlow/index.md);
   promoting to `confirmed` needs a second technique, e.g. a Frida hook or a live
   media capture of the same frames.)*
2. Determine the SRTP cipher suite and key-derivation steps.
3. Establish whether/how media keys rotate during a long call.

If you can observe the media plane safely and with **fully synthetic test
accounts**, see the [capture pipeline](methodology/capture-pipeline.md) and the
[legal and ethics](legal-and-ethics.md) rules first.
