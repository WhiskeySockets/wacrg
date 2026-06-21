<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Media loop and session

_Relay · `media-loop`_

_status: draft · audio, video_

Per-call session state machine plus the outbound (protect) and inbound (unprotect) audio frame pipelines: RTP framing, E2E-SRTP, and WARP tagging.

## Session state

A session MUST hold at minimum: call id, peer JID, call-creator JID, direction
(outgoing | incoming), and current **phase**. Phase MUST be one of:

    Idle | Calling | Ringing | Connecting | Active | Ended

Outgoing sessions MUST start in `Idle`; incoming sessions MUST start in `Ringing`.
The idempotent self-transition `x → x` MUST be accepted. The only other legal
transitions are:

    Idle       → Calling      ; outgoing only
    Calling    → Ringing
    Ringing    → Connecting
    Connecting → Active
    <any phase except Ended> → Ended

All other transitions MUST be rejected as a no-op. `Ended` MUST be terminal. An
incoming session MUST NOT transition to `Calling`. Media MAY flow only in `Active`.

## Media pipeline keying

Derive two independent E2E-SRTP key sets from the call key (see
[srtp-master-key](../crypto/srtp-master-key.md)): **send** keys keyed by the sender's own
participant id, **recv** keys keyed by the peer's participant id. The HKDF `info`
for the send direction MUST be the sender's own participant id (the peer derives
its recv keys from that id). Both JIDs MUST be normalized with the E2E-SRTP
participant-id rule (see [ssrc](../relay/ssrc.md)) before derivation. The two directions MUST
NOT be inverted.

## Outbound loop (protect)

For each audio frame to send, in order:

1. Obtain the next RTP header from the send sequencer. RTP sequence number starts
   at 1 and increments by 1 per packet; RTP timestamp advances by
   `samples_per_packet` (960 for a 60 ms frame at 16 kHz); payload type MUST be
   `120` (Opus).
2. Advance the rollover counter (ROC) for the new sequence number.
3. Encode the RTP header bytes.
4. E2E-SRTP encrypt the Opus payload under the **send** keys, using the header SSRC,
   sequence number and ROC as keystream inputs (see [srtp-e2e](../crypto/srtp-e2e.md)).
5. Concatenate `rtp_header || encrypted_payload`.
6. Append the 4-byte WARP message-integrity tag, computed over that concatenation
   under the send auth key with the ROC (see [warp](../relay/warp.md)).

Send the result as one binary message on the relay media channel (see
[stun-relay](../relay/stun-relay.md), [call-transport](../signalling/call-transport.md)).

## Inbound loop (unprotect)

For each relay packet classified as RTP (see [rtp-framing](../relay/rtp-framing.md)):

1. Reject if shorter than `12 + 4` bytes (min RTP header + WARP MI tag).
2. Strip the trailing 4-byte WARP MI tag.
3. Parse the RTP header, compute its byte length; reject if no payload follows.
4. E2E-SRTP decrypt the remaining payload under the **recv** keys, using the parsed
   SSRC, sequence number and ROC.

The decrypted result is the Opus payload for the decoder (see [opus](../encodings/opus.md)).

## Codec parameters

Audio MUST be Opus, mono, 16 kHz, 60 ms frames (`960` samples per packet), VoIP
application mode. Reference encode: 25 kbps, complexity 9. Payload type 120 on
send; 120 and 121 both recognized as Opus on the inbound path. Priming frames are
fixed constant payloads and MUST bypass the encoder (see [rtp-framing](../relay/rtp-framing.md)).

**Notes.** The inbound path strips but does NOT verify the WARP MI tag in the reference
composition. The proprietary "mlow" encode (see [mlow](../encodings/mlow.md)) is the on-wire
WhatsApp codec; standard libopus at the reference parameters is accepted by the peer.

Requires: [`srtp-master-key`](../crypto/srtp-master-key.md), [`srtp-e2e`](../crypto/srtp-e2e.md), [`warp`](../relay/warp.md), [`rtp-framing`](../relay/rtp-framing.md), [`ssrc`](../relay/ssrc.md), [`opus`](../encodings/opus.md), [`call-transport`](../signalling/call-transport.md), [`stun-relay`](../relay/stun-relay.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | [`674e851`](https://github.com/oxidezap/whatsapp-rust-private/commit/674e85164b35ca19115dfebcf605708d15951ee7) | session state machine and protect/unprotect pipeline composition; live relay flow over the channel is deferred |
| `zapo-caller` | working | — | signalling + crypto + relay loop |

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/relay/media-loop.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/relay/media-loop.yaml)

**Open questions**
- Full inbound ROC-recovery (rollover) algorithm for out-of-order and wrapped sequence numbers.
- Whether the WARP MI tag is verified on receive in the production client, and the failure policy if it is.
- Send-side pacing / DTX and comfort-noise behavior during the Active phase.
- Exact retransmission/jitter-buffer handling on the receive path.

**References**
- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)
- [RFC 3550 — RTP](https://www.rfc-editor.org/rfc/rfc3550)
- [RFC 6716 — Opus](https://www.rfc-editor.org/rfc/rfc6716)

---

[← in the full RFC](../../../index.md#media-loop)
