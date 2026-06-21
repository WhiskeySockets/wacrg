<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Flavors

Independent reimplementations of the call protocol — libraries and ports that realize the spec in real code. A flavor is **not** an evidence-gathering tool: a tool produces a fact, a flavor *corroborates* the spec by implementing it. `provenance.flavors` cites these ids — a flavor is a corroborating source, never a technique, and it does not corroborate a flavor it derives from. Generated from `spec/flavors/`.

| Flavor | Language | Maturity | Covers | Derives from | Maintainer | Description |
| --- | --- | --- | --- | --- | --- | --- |
| [meowcaller](https://github.com/purpshell/meowcaller) | go | partial | `media` | `whatsapp-rust` | @purpshell | Clean-room pure-Go WhatsApp calling library porting the whatsapp-rust codec module by module under human audit. |
| [whatsapp-rust (VoIP)](https://github.com/oxidezap/whatsapp-rust) | rust | working | `signaling`, `keying`, `media`, `transport` | `zapo-caller` | @jlucaso1 | Pure-Rust reconstruction of the full WhatsApp VoIP stack — MLow codec, SFrame, SRTP, WARP, STUN/relay, RTP/RTCP, and call signaling. |
| zapo-caller | typescript | working | `signaling`, `keying`, `transport` | - | @vinikjkkj | TypeScript reconstruction of the WhatsApp caller (signaling, SRTP/SFrame/WARP keying, STUN/relay, RTP), created by Vini with Auties, Edgard, and Shelltear. |

[Back to spec overview](./index.md)
