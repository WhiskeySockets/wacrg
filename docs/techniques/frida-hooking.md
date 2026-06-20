<!-- Hand-written narrative how-to. Catalogue entry: ../spec/techniques.md (id: frida-hooking). -->

# How-to: Frida dynamic hooking

**Maturity:** emerging · **Reveals:** keying, media, transport · **Risk:** higher
(owned device required)

Frida reaches the values the WebSocket never carries: the derived media key after
it is decrypted from an `<enc>` node, and the SRTP/RTP path that signaling-only
techniques can't observe. It is the highest-reach technique into the keying and media
planes, and the most effort to keep working across app updates.

> **Hard ethics line.** Attach only to the app running on your own device,
> signed into your own account, calling another device/account you control or a
> consenting tester. Never hook an app you do not own or use this to access anyone
> else's call. Recovered keys are secrets: they must never be committed. Only
> the *structure* of how a key becomes an SRTP key, described abstractly, belongs in
> the spec. See [SECURITY](../../SECURITY.md) and [DISCLAIMER](../../DISCLAIMER.md).

## Why bother

Most of the [media](../media-srtp.md) and
[SRTP key-derivation](../encryption-keying.md#srtp-key-derivation) facts in the spec
are `speculative` today precisely because cheap techniques can't see them. Frida is
how those facts get observed and promoted toward `confirmed` (paired with at
least one other independent technique).

## Steps (high level)

1. **Prepare an owned test device** (rooted device or emulator) and install
   [Frida](https://frida.re/) server.
2. **Locate hook points.** Use [static analysis](../techniques/index.md) (jadx /
   Ghidra) to find the call-setup and crypto functions of interest, e.g. where the
   `<enc>` plaintext is consumed and where SRTP context is initialized.
3. **Write hooks** that log *shapes and relationships* (sizes, which buffer feeds
   which, ordering) rather than dumping raw secret bytes. Capture the moment an
   incoming key becomes an SRTP key.
4. **Place a controlled call** and record the trace.
5. **Abstract the finding.** Translate the trace into a protocol fact ("the 32-byte
   secret from `<enc>` is used as the SRTP master key via <KDF>") with technique
   `frida-hooking` and honest confidence. No key material in the repo.
6. **Upstream** via PR/issue, and note the build/offsets in `provenance.sources`.

## Tips & pitfalls

- Function offsets/signatures shift between builds; expect to re-locate hooks
  after updates. Record the exact build.
- Frida + WebSocket capture are independent corroboration (runtime vs wire), a
  good pairing to move keying facts to `confirmed`.
- If a hook only confirms *intended* logic you already read statically, that is one
  technique's worth of evidence, not two.

See also: [encryption & keying](../encryption-keying.md),
[media / SRTP](../media-srtp.md), [ICE & relays](../ice-and-relays.md).
