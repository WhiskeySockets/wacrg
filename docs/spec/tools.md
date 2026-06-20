<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Tools

Concrete tools used to obtain evidence, more specific than a technique. Provenance entries reference these ids to record **what tools** produced a fact. Generated from `spec/tools/`.

| Tool | Version | Techniques | Maintainer | Description |
| --- | --- | --- | --- | --- |
| [Baileys](https://github.com/WhiskeySockets/Baileys) | - | `websocket-capture`, `baileys-instrumentation` | @purpshell | TypeScript WhatsApp Web / multi-device library. Used to drive a scriptable session and to capture and decode WABinary <call> nodes off the Noise WebSocket, and as a host for instrumentation hooks. |
| [Frida](https://frida.re/) | - | `frida-hooking` | - | Dynamic instrumentation toolkit. Hooks native functions at runtime on an owned device to observe call setup, derived keys, and the SRTP/media path. |
| [Ghidra](https://ghidra-sre.org/) | - | `static-smali-analysis`, `wasm-analysis` | - | Software reverse-engineering suite. With the WASM plugin it disassembles and decompiles the WhatsApp Web call module; also used for native library analysis. |
| [mitmproxy](https://mitmproxy.org/) | - | `mitm-tls` | - | Interactive TLS-capable intercepting proxy. Observes auxiliary HTTPS endpoints and relay/transport configuration around a call on an owned device. |
| [warden](https://github.com/purpshell/warden) | 0.1.0 | `wasm-analysis` | @purpshell | Living reverse-engineering knowledge base for Emscripten WebAssembly, parse, fingerprint, auto-identify library code via the Emscripten Oracle, lift to pseudo-C, and diff across releases, with annotations keyed to stable function identity so they survive vendor rebuilds. Installable as warden-re. |

[Back to spec overview](./index.md)
