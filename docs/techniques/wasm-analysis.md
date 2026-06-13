<!-- Hand-written narrative how-to. Catalogue entry: ../spec/techniques.md (id: wasm-analysis). -->

# How-to: WhatsApp Web WASM analysis

**Maturity:** emerging · **Reveals:** signaling, keying, media, transport (static) ·
**Risk:** low (no live traffic required)

WhatsApp **Web** implements its calling engine as an **Emscripten-compiled
WebAssembly** module. That single fact reframes the whole problem: instead of
fighting obfuscated Android smali or native ARM, you get a standardized bytecode with
explicit function boundaries, typed signatures, structured control flow, and an
explicit JavaScript boundary (imports/exports) into WebCrypto, WebRTC, and the socket.
For the under-served **keying** and **media** layers, this is the most promising
surface the project has.

> **Scope of consent:** analyze the module shipped to **your own** browser session on
> **your own** account. Static analysis touches no one else's data. Document the
> protocol's *structure and behavior* — never commit recovered secret values or key
> material. See [DISCLAIMER](../../DISCLAIMER.md) and [SECURITY](../../SECURITY.md).

## Why WASM-on-web beats the mobile app

| Mobile app (smali / native) | WhatsApp Web (WASM) |
| --- | --- |
| Obfuscated DEX + native ARM; every release churns | Standardized bytecode; structure stays comparable across builds |
| Library code looks like everything else | Open-source Emscripten runtime → **40–80% auto-identifiable** |
| Annotations die on each update | Annotations can be keyed to **stable function identity** and carried forward |
| Hard for tools/agents to reason about | Lifts cleanly to pseudo-C; agent-friendly |

It is **not** a total replacement: WASM static analysis does not see live call packets
or real-time SRTP media — pair it with [Frida](frida-hooking.md) or
[WebSocket capture](websocket-capture.md) for runtime corroboration.

## warden: the living RE knowledge base

[**warden**](https://github.com/purpshell/warden) (`pip install warden-re`) is built for
exactly this surface. It treats reverse engineering as a *versioned knowledge base*
rather than a one-shot decompile, so work compounds across WhatsApp's frequent rebuilds.
Its three superpowers:

1. **Emscripten Oracle** — compiles labelled reference modules and fingerprints them, so
   it can auto-name the libc/musl/allocator/runtime functions that make up most of any
   Emscripten binary.
2. **Persistent, versioned symbol KB** — every name/type/comment is keyed to a **stable
   function identity** (structural hash + type signature + import call targets), not a
   table index, so annotations survive a rebuild.
3. **Cross-version carry-over** — diffs a new module against the last and carries
   annotations forward, surfacing only what genuinely changed.

Notably, warden's KB uses a **provenance + confidence economy** (human > oracle > export
> import > string-xref > diff-carry > agent) that mirrors wacrg's own
[confidence/provenance model](../methodology/index.md) — which makes exporting a warden
finding into a wacrg fact a natural step.

## Workflow

1. **Locate the module.** In a logged-in WhatsApp Web session (your own account), use
   browser devtools to find the call-related `.wasm` request and its Emscripten JS glue.
   Save both.
2. **Ingest + fingerprint** with warden:
   ```
   warden init
   warden ingest call.wasm --glue call.glue.js --label web-<version>
   ```
3. **Auto-identify runtime code** via the Oracle so analyst effort lands on app logic:
   ```
   warden oracle identify web-<version> --store oracle.store
   warden coverage web-<version>
   ```
4. **Lift app functions to pseudo-C** and read the call-setup / crypto / media paths:
   ```
   warden lift web-<version> --index <fn>
   ```
   Look for calls across the JS boundary to WebCrypto (keying), to the media/RTP engine
   (SRTP), and to the socket (signaling) to anchor which functions own which layer.
5. **Diff across releases** to track what WhatsApp changed without redoing prior work:
   ```
   warden diff web-<old> web-<new>
   ```
6. **Translate findings into spec facts.** Express what you learned as protocol
   *structure* (e.g. "an N-byte secret from the keying envelope feeds the SRTP context
   via <KDF>") with technique `wasm-analysis`, honest confidence (usually `probable`
   for a single static read), and provenance referencing the module version. **No key
   material in the repo.**

## Pitfalls

- **Whole-program LTO** can inline library functions into callers, lowering Oracle hit
  rate and hiding boundaries. Manual annotation is the fallback.
- Static reads reveal *intended* logic; a runtime technique (Frida, capture) is what
  promotes a `wasm-analysis` finding toward `confirmed` — and the two **are** independent
  corroboration.
- Pin the exact module version (and hash) in `provenance.sources` so others can fetch
  the same binary.

See also: [encryption & keying](../encryption-keying.md),
[media / SRTP](../media-srtp.md), [methodology](../methodology/index.md), and
[warden](https://github.com/purpshell/warden).
