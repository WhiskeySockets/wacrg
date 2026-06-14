<!-- Hand-written narrative. Complements the generated docs under docs/spec/. -->

# Signaling: the `<call>` node family

Call control is expressed as **WABinary nodes** under a top-level `<call>` tag,
routed by the WhatsApp server between caller and callee devices over the
[Noise-encrypted WebSocket](transport-noise.md). This page is the human-readable
overview; the precise, machine-generated definitions — attribute tables,
confidence levels, provenance, and examples — live in the
[stanza catalog](spec/stanzas/index.md), and the end-to-end sequences live in the
[flow catalog](spec/flows/index.md).

> Everything here is a **starting model**. Each attribute and child in the
> generated pages carries its own `confidence` and, where we are unsure, an
> `open_questions` entry. Treat unhedged prose below as `probable` unless noted.

## The `<call>` envelope

A `<call>` node is the routing envelope. Its core attributes identify the
parties and (via the child stanza) the call:

- `from` / `to` — JIDs of the sending and receiving devices.
- `id` — the stanza id used for server acknowledgement.

The **child** of `<call>` determines what the stanza *means*. Exactly one of the
control stanzas below appears as the child (an offer, an accept, a terminate, and
so on), most carrying a `call-id` that correlates every stanza belonging to the
same call, and often a `call-creator` naming the initiating device.

## The control stanzas

| Child | Meaning | Direction (typical) |
| --- | --- | --- |
| `<offer>` | Start a call; advertise media + deliver the media key | outgoing → callee |
| `<preaccept>` | Early/ringing acknowledgement | callee → caller |
| `<accept>` | Callee accepts the call | callee → caller |
| `<reject>` | Callee declines | callee → caller |
| `<terminate>` | End the call, with a `reason` | either direction |
| `<transport>` | ICE/relay transport updates | either direction |
| `<relaylatency>` | Relay latency probe results | either direction |
| mute / video-toggle | In-call state updates | either direction |

The server also emits `<ack>` / receipt nodes to acknowledge call stanzas; these
are part of the shared messaging infrastructure rather than the `<call>` family
itself.

### The offer in detail

The `<offer>` is the richest stanza and the one most worth understanding. Inside
it you typically find:

- **Media descriptors** — `<audio enc rate>` and, for video calls, `<video>`,
  describing the proposed codec(s) and parameters.
- **`<net>`** — network information hints (e.g. connection medium).
- **`<capability ver>`** — device call capabilities, usually a binary blob.
- **`<encopt keygen>`** — encryption / key-generation options.
- **One or more `<enc v type>`** — Signal-protocol ciphertext delivering the
  call/media key, **one per peer device**. `type="pkmsg"` establishes a new
  session; `type="msg"` uses an existing one. See
  [encryption & keying](encryption-keying.md).
- **`<destination>`** — transport endpoints (`<te>` / `<endpoint>`): relay
  candidates with latency hints, feeding [ICE/relay selection](ice-and-relays.md).

A synthetic, sanitized offer is shown in
[`corpus/captures/example-sanitized-offer.yaml`](../corpus/captures/example-sanitized-offer.yaml)
and rendered on the generated [offer stanza page](spec/stanzas/index.md).

### Termination reasons

`<terminate>` (and `<reject>`) carry a `reason`. Known/likely values include
`timeout`, `busy`, `declined`, and `connection_lost`. The authoritative list is
the generated [enums page](spec/enums.md).

## How stanzas compose into flows

Individual stanzas only tell half the story; what matters is the **sequence**. A
flow ties stanzas together into a realistic exchange between caller, server, and
callee. For example, the outgoing-audio flow is roughly:

```
offer  →  (ack)  →  preaccept  →  accept  →  [media comes up]  →  … updates …  →  terminate
```

Each step in a flow references a stanza `id`, so the
[generated flow pages](spec/flows/index.md) render a Mermaid sequence diagram and
link every step back to its stanza definition. This is the most useful entry
point if you are trying to understand the *order of operations* rather than a
single node.

See also:

- [Architecture](architecture.md) for the two-plane picture and a lifecycle
  diagram.
- [Transport over Noise](transport-noise.md) for what carries these stanzas.
- [Encryption & keying](encryption-keying.md) for what the `<enc>` nodes do.

## Open questions

- The full set of in-call state updates (mute, hold, video toggle, camera
  switch) and their exact node shapes.
- Whether `<preaccept>` is always present or conditional on callee state.
- Server-side vs. peer-side origination of `<transport>` and `<relaylatency>`
  updates.

These are tracked as `open_questions` on the relevant
[stanza entries](spec/stanzas/index.md).

For the **WASM-side** view of the same machinery - the engine's own offer/accept/
rekey handlers, the call state machine, and the group/call-link surface, recovered
by `wasm-analysis` as an independent second technique - see
[call signaling from the WASM](signaling/wasm-call-handling.md).
