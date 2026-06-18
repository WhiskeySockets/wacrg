<!-- GENERATED FILE — do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Tools

Concrete tools used to obtain evidence — more specific than a technique. Provenance entries reference these ids to record **what tools** produced a fact. Generated from `spec/tools/`.

| Tool | Version | Techniques | Maintainer | Description |
| --- | --- | --- | --- | --- |
| [Baileys](https://github.com/WhiskeySockets/Baileys) | — | `websocket-capture`, `baileys-instrumentation` | @purpshell | TypeScript WhatsApp Web / multi-device library. Used to drive a scriptable session and to capture and decode WABinary <call> nodes off the Noise WebSocket, and as a host for instrumentation hooks. |
| [Frida](https://frida.re/) | — | `frida-hooking` | — | Dynamic instrumentation toolkit. Hooks native functions at runtime on an owned device to observe call setup, derived keys, and the SRTP/media path. |
| [Ghidra](https://ghidra-sre.org/) | — | `static-smali-analysis`, `wasm-analysis` | — | Software reverse-engineering suite. With the WASM plugin it disassembles and decompiles the WhatsApp Web call module; also used for native library analysis. |
| meowmeow (Go VoIP reference) | — | `wasm-analysis` | @purpshell | A Go reconstruction of the WhatsApp VoIP media stack, including a byte-exact MLow/SMPL CELP codec reverse-engineered op-by-op from the WhatsApp WASM and pinned against captured WASM decode vectors. The reference the whatsapp-rust MLow codec was ported from. |
| [mitmproxy](https://mitmproxy.org/) | — | `mitm-tls` | — | Interactive TLS-capable intercepting proxy. Observes auxiliary HTTPS endpoints and relay/transport configuration around a call on an owned device. |
| [warden](https://github.com/purpshell/warden) | 0.1.0 | `wasm-analysis` | @purpshell | Living reverse-engineering knowledge base for Emscripten WebAssembly — parse, fingerprint, auto-identify library code via the Emscripten Oracle, lift to pseudo-C, and diff across releases, with annotations keyed to stable function identity so they survive vendor rebuilds. Installable as warden-re. |
| [whatsapp-rust (VoIP)](https://github.com/jlucaso1/whatsapp-rust) | — | `wasm-analysis` | @jlucaso1 | Pure-Rust reconstruction of the WhatsApp Web client with a working VoIP media stack (wacore/src/voip): a from-scratch MLow/SMPL CELP codec, SFrame, E2E and hop-by-hop SRTP, WARP, STUN/relay, RTP/RTCP, and call signaling. The codec is a port of a byte-exact Go reference (meowmeow) reverse-engineered op-by-op from the WhatsApp WASM and pinned against captured decode vectors; the crypto and signaling are ported from zapo-caller. An independent corroboration source for the keying, media, transport, and signaling planes. |
| zapo-caller | — | `wasm-analysis`, `frida-hooking` | @auties | A TypeScript reconstruction of the WhatsApp call client (caller side), authored by the community (Edgard, Sheiitear, Auties). Implements the call signaling, callKey/SRTP/SFrame/WARP keying, STUN/relay transport, and RTP framing, with primitives pinned to known-answer vectors. The upstream source that the whatsapp-rust VoIP crypto and signaling were ported from. |

[Back to spec overview](./index.md)
