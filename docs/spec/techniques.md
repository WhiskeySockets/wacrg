<!-- GENERATED FILE — do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Reverse-engineering techniques

The methods maintainers use to observe and confirm protocol facts. Each technique id is part of the fixed provenance vocabulary. Generated from `spec/techniques/`.

| Technique | Maturity | Targets | Guide |
| --- | --- | --- | --- |
| [Baileys instrumentation](#baileys-instrumentation) | established | signaling, keying | [guide](../techniques/baileys-instrumentation.md) |
| [Frida dynamic hooking](#frida-dynamic-hooking) | emerging | keying, media, transport | [guide](../techniques/frida-hooking.md) |
| [Process memory dump](#process-memory-dump) | experimental | keying, media | — |
| [TLS man-in-the-middle](#tls-man-in-the-middle) | emerging | signaling, transport | — |
| [Static smali / native analysis](#static-smali-native-analysis) | emerging | signaling, keying, media | — |
| [WebSocket / WABinary capture](#websocket-wabinary-capture) | established | signaling, keying | [guide](../techniques/websocket-capture.md) |

## Baileys instrumentation

**id:** `baileys-instrumentation`  
**maturity:** established  
**status:** stable  
**targets:** signaling, keying

Add logging and introspection hooks inside the Baileys client to record parsed call nodes, session state, and the shape of the Signal-protocol material used to key a call. Builds on websocket-capture by giving structured, already-decoded access to nodes and to the client's view of the keying handshake.

**Strengths**

- Works with already-parsed node objects rather than raw bytes.
- Can correlate a <call> offer with the Signal session state that produced its <enc> nodes.
- Easy to script: emit findings straight into the capture intake format.
- Deterministic and repeatable against your own test accounts.

**Limitations**

- Constrained to what the library implements and exposes; gaps in Baileys are gaps here too.
- Still does not reach the media engine or SRTP key derivation.
- Risk of drift if WhatsApp changes node shapes faster than the library tracks them.

**Tooling**

- Baileys (WhiskeySockets)
- Custom event/middleware hooks around node send/receive
- The capture Issue Form to upstream findings

**Maintainers:** @purpshell

**Guide:** [docs/techniques/baileys-instrumentation.md](../techniques/baileys-instrumentation.md)

**References**

- [Baileys](https://github.com/WhiskeySockets/Baileys)
- [Signal Protocol documentation](https://signal.org/docs/)

## Frida dynamic hooking

**id:** `frida-hooking`  
**maturity:** emerging  
**status:** review  
**targets:** keying, media, transport

Attach Frida to the WhatsApp app on a device you own and hook native functions around call setup and cryptography to observe values the WebSocket never carries — notably derived media keys and the SRTP/RTP path. Highest effort, highest reach into the keying and media planes.

**Strengths**

- Can observe runtime values, including derived keys and SRTP parameters, at the moment they are computed.
- Reaches the media engine and transport selection that signaling-only techniques cannot.
- Lets you confirm (not just infer) how a key in an <enc> node becomes an SRTP key.

**Limitations**

- Requires a rooted/owned test device and ongoing effort to track app updates.
- Function offsets and signatures shift between builds; hooks are brittle.
- Sensitive: only ever run against your own accounts and devices, never third parties.

**Tooling**

- Frida (frida.re)
- A rooted test device or emulator you control
- Symbol/offset discovery aids (e.g. a disassembler) to locate hook points

**Guide:** [docs/techniques/frida-hooking.md](../techniques/frida-hooking.md)

**References**

- [Frida](https://frida.re/)
- [SRTP (RFC 3711)](https://www.rfc-editor.org/rfc/rfc3711)

## Process memory dump

**id:** `memory-dump`  
**maturity:** experimental  
**status:** draft  
**targets:** keying, media

Recover in-memory state and key material from the WhatsApp process on a device you own — for example the plaintext call/media key after it is decrypted from an <enc> node, or SRTP context. The most invasive technique; powerful for keying/media but fragile and highly sensitive.

**Strengths**

- Can recover the actual plaintext key bytes that other techniques only see as ciphertext or derivations.
- Provides ground-truth values to anchor speculative keying/media facts.

**Limitations**

- Extremely build- and timing-dependent; layouts change constantly.
- Requires a rooted/owned device and careful handling — never dump a device or account that is not yours.
- Recovered material is sensitive; only synthetic/own-account values may ever be written to this repo, and never raw keys.

**Tooling**

- Process memory acquisition on a rooted test device you own
- A debugger/instrumentation harness to snapshot at the right moment
- Frida (to locate the moment a key is in memory)

**References**

- [SRTP (RFC 3711)](https://www.rfc-editor.org/rfc/rfc3711)

## TLS man-in-the-middle

**id:** `mitm-tls`  
**maturity:** emerging  
**status:** draft  
**targets:** signaling, transport

Intercept the auxiliary HTTPS/TLS traffic around a call (provisioning, relay allocation, telemetry) on a device you own. Does not break WhatsApp's Noise transport or Signal-protocol encryption, but can surface server endpoints, relay/ICE configuration, and timing that contextualize the signaling plane.

**Strengths**

- Reveals out-of-band HTTPS endpoints and relay/transport configuration that the WebSocket alone does not explain.
- Useful for mapping which servers participate in call setup and media relaying.
- Standard, well-understood tooling.

**Limitations**

- Cannot decrypt the Noise WebSocket or Signal payloads — the core call crypto is out of reach.
- Certificate pinning blocks naive interception; needs a patched/owned client to bypass on your own device.
- Often yields context rather than direct protocol facts; corroborate before raising confidence.

**Tooling**

- mitmproxy
- A device/emulator you own with a trusted interception CA
- Pinning-bypass on your own build where required

**References**

- [mitmproxy](https://mitmproxy.org/)

## Static smali / native analysis

**id:** `static-smali-analysis`  
**maturity:** emerging  
**status:** draft  
**targets:** signaling, keying, media

Decompile the WhatsApp Android app and read the disassembled smali and native code to map how call stanzas are built, which attributes and enum values exist, and how the keying and media paths are wired — the intended behavior, without running anything.

**Strengths**

- Exposes the full vocabulary of attributes, node tags, and enum constants as the app defines them, including paths rarely seen live.
- Great for discovering names/structure to look for with dynamic techniques.
- No live account or device required once you have the APK.

**Limitations**

- Shows intended logic, not observed runtime values — easy to misread dead or feature-flagged code paths.
- Obfuscation and native code raise the effort substantially.
- A finding here is a hypothesis; it needs a live technique to corroborate before reaching confirmed.

**Tooling**

- apktool / baksmali for smali
- jadx for readable decompilation
- Ghidra / radare2 for native libraries

**References**

- [jadx](https://github.com/skylot/jadx)
- [Ghidra](https://ghidra-sre.org/)

## WebSocket / WABinary capture

**id:** `websocket-capture`  
**maturity:** established  
**status:** stable  
**targets:** signaling, keying

Capture and decode the binary WABinary nodes that flow over the Noise-encrypted WhatsApp multi-device WebSocket. Because call signaling rides the same socket as messaging, the entire <call> stanza family can be observed at the framing boundary on an account you control — without touching the native media engine.

**Strengths**

- Cheapest, lowest-risk way to see the <call> stanza family end to end.
- Observes the full node tree (tags, attributes, children) after Noise decryption.
- Reveals the structure of the <enc> keying envelope (type pkmsg/msg, version) even though the ciphertext payload stays opaque.
- Reproducible from a plain library session; no rooted device or app patching needed.

**Limitations**

- Completely blind to the media plane (SRTP, RTP, codecs) — that traffic never crosses the WebSocket.
- Sees the <enc> envelope but not the plaintext call/media key inside it.
- Only as complete as your client's own session; multi-device fan-out beyond your devices is inferred, not observed.

**Tooling**

- Baileys (WhiskeySockets) for a scriptable multi-device session
- A WABinary decoder (Baileys exposes one)
- Frame logging at the Noise transport boundary

**Maintainers:** @purpshell

**Guide:** [docs/techniques/websocket-capture.md](../techniques/websocket-capture.md)

**References**

- [Baileys](https://github.com/WhiskeySockets/Baileys)
- [The Noise Protocol Framework](https://noiseprotocol.org/)

[Back to spec overview](./index.md)
