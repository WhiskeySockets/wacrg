<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Enumerations

Closed value sets referenced by stanza attributes (e.g. terminate reasons). Generated from `spec/enums/`.

## Encryption payload (enc) types

**id:** `enc-types`  
**status:** draft

Values for the type attribute of an <enc> node, which carries Signal-protocol ciphertext. In call signaling, the media/call key is delivered to each recipient device inside one or more <enc> nodes using the EXISTING Signal session between the two devices (X3DH for the initial handshake, Double Ratchet thereafter). The type distinguishes a message that also bootstraps a new Signal session (pkmsg, a PreKeySignalMessage) from one sent over an already-established session (msg, a normal SignalMessage). These two tokens are well established in WhatsApp message encryption; their reuse for call key delivery is the working assumption here, marked probable.

| Value | Confidence | Description |
| --- | --- | --- |
| `pkmsg` | probable | PreKeySignalMessage. Used when there is no established Signal session with the target device yet: it bundles the X3DH prekey handshake material so the recipient can build the session, then decrypts the wrapped call/media key. Expected the first time a device pair exchanges a call (or after a session reset). |
| `msg` | probable | Normal SignalMessage over an already-established Double Ratchet session. Used for call key delivery once a session with the target device exists, which is the common case for contacts that have previously messaged or called each other. |

## Call media types

**id:** `media-types`  
**status:** draft

Media track types that can appear in a 1:1 call, used by media descriptors inside the offer (<audio>, <video>) and by mute/toggle state updates. WhatsApp 1:1 calls always carry audio; video is optional and may be enabled at offer time or escalated to during an audio call. Codec details are recorded here as notes/values where known: audio is understood to use Opus, and video an H.264/VP8-family codec, though exact codec negotiation (in <audio enc rate>/<video> attributes) is only partially reconstructed.

| Value | Confidence | Description |
| --- | --- | --- |
| `audio` | probable | The mandatory audio track, present in every 1:1 call. Believed to use the Opus codec carried in SRTP; the offer's <audio> descriptor likely advertises sample rate (rate) and an encoding/payload identifier (enc). |
| `video` | probable | Optional video track. Present from the start for a video call or added mid-call via a toggle/upgrade. Codec is believed to be in the H.264/VP8 family; negotiation details in the <video> descriptor are not fully decoded. |

## Call terminate reasons

**id:** `terminate-reasons`  
**status:** draft

Candidate values for the reason attribute on a <terminate> (and, where it shares the vocabulary, <reject>) call stanza. The reason explains why a call ended or was not connected and drives both UI (missed call, declined, busy) and call-log/state on each device. WhatsApp multi-device complicates this: when one of a user's linked devices answers or declines, the OTHER devices receive a terminate with an "elsewhere" reason so they stop ringing. The set below is a hedged working list; some values are inferred from observed UI behaviour rather than confirmed wire strings, and the exact spelling (hyphen vs underscore) is uncertain.

| Value | Confidence | Description |
| --- | --- | --- |
| `timeout` | probable | The call rang without being answered until the ring timeout elapsed; surfaces as a missed call. The most commonly inferred terminate reason. |
| `busy` | probable | The callee is already on another call (or otherwise busy) and cannot take this one; surfaces to the caller as busy/engaged. |
| `declined` | probable | The callee actively declined/rejected the call. May overlap with the reason carried by a <reject> stanza rather than a server-originated <terminate>. |
| `accept_elsewhere` | speculative | Sent to a user's other linked devices once one device has accepted the call, telling them to stop ringing. The exact wire token is unconfirmed. |
| `reject_elsewhere` | speculative | Sent to a user's other linked devices once one device has rejected/declined the call, telling them to stop ringing. Wire token unconfirmed. |
| `connection_lost` | speculative | The media/transport connection dropped (network loss, relay failure) and could not be recovered, ending an in-progress call. |
| `retry` | speculative | Signals that the call setup should be retried, e.g. after a transient routing or session-establishment failure. Whether this is a true terminate reason or a separate control value is unclear. |
| `cancelled` | speculative | The caller hung up/cancelled before the callee answered (the outgoing-side counterpart to timeout). Distinguishing cancelled from timeout on the wire is an open question. |
| `unknown` | unknown | Placeholder for a terminate whose reason is absent or not yet decoded. Not necessarily a literal wire value; used by tooling when the reason cannot be classified. |

[Back to spec overview](./index.md)
