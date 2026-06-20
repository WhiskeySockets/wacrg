<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Flavors

Independent reimplementations of the call protocol — libraries and ports that realize the spec in real code. A flavor is **not** an evidence-gathering tool: a tool produces a fact, a flavor *corroborates* the spec by implementing it. `provenance.flavors` cites these ids — a flavor is a corroborating source, never a technique, and it does not corroborate a flavor it derives from. Generated from `spec/flavors/`.

| Flavor | Language | Maturity | Covers | Derives from | Maintainer | Description |
| --- | --- | --- | --- | --- | --- | --- |
| [meowcaller](https://github.com/purpshell/meowcaller) | go | partial | `media` | `whatsapp-rust` | @purpshell | A clean-room, pure-Go WhatsApp 1:1 calling library built module by module under human audit and verified byte-exact against shared known-answer vectors. An independent Go flavor whose codec modules port the whatsapp-rust reference (a fork at oxidezap/whatsapp-rust) one module at a time; each Go function carries a // Source of truth: permalink to that reference, and the spec-to-code inverse is recorded in meowcaller.map.yaml. In progress: the MLow receive DSP is largely KAT-verified; keying, signaling, and transport are planned. Listed as covering only media until those land (honesty over coverage). |
| meowmeow (Go VoIP reference) | go | working | `keying`, `media` | - | @purpshell | A Go reconstruction of the WhatsApp VoIP media stack, including a byte-exact MLow/SMPL CELP codec reverse-engineered op-by-op from the WhatsApp WASM and pinned against captured WASM decode vectors. The original reference the whatsapp-rust MLow codec was ported from. An independent reconstruction, not an evidence-gathering tool. |
| [whatsapp-rust (VoIP)](https://github.com/jlucaso1/whatsapp-rust) | rust | working | `signaling`, `keying`, `media`, `transport` | `meowmeow`, `zapo-caller` | @jlucaso1 | Pure-Rust reconstruction of the WhatsApp Web client with a working VoIP media stack (wacore/src/voip): a from-scratch MLow/SMPL CELP codec, SFrame, E2E and hop-by-hop SRTP, WARP, STUN/relay, RTP/RTCP, and call signaling. The codec is a port of the byte-exact Go reference (meowmeow); the crypto and signaling are ported from zapo-caller. Because it derives from those flavors it is NOT independent corroboration of them. A fork at oxidezap/whatsapp-rust is the reference the meowcaller flavor ports from. |
| zapo-caller | typescript | working | `signaling`, `keying`, `transport` | - | @vinikjkkj | A TypeScript reconstruction of the WhatsApp call client (caller side), created by Vini (vinikjkkj) with community contributors Auties, Edgard, and Sheiitear. Implements the call signaling, callKey/SRTP/SFrame/WARP keying, STUN/relay transport, and RTP framing, with primitives pinned to known-answer vectors. The upstream source that the whatsapp-rust VoIP crypto and signaling were ported from. An independent reconstruction, not an evidence-gathering tool. |

See the [implementation map](./flavor-map.md) for where each flavor realizes the spec in code.

[Back to spec overview](./index.md)
