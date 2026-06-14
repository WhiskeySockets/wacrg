<!-- Hand-written narrative. Detail page for docs/signaling.md, from the WASM side.
     A second, independent technique (wasm-analysis) over the websocket-capture spec. -->

# Call signaling, from the WASM

[signaling](../signaling.md) documents the `<call>` stanza family as seen on the
wire (websocket-capture). This page is the **WASM-side** view: what the Web
calling engine's own code reveals about how it **builds and parses** those
stanzas. Because it is a *different technique* over the same protocol, where the
two agree a fact is corroborated toward `confirmed`; where the WASM shows
something the wire captures have not, it is a new `probable` lead.

> **Confidence.** `probable` (one static technique). Provenance: module `wa.wasm`
> SHA-1 `3638a50…`; technique `wasm-analysis` · tool `warden` · contributor
> `purpshell` · source: commit history. Evidence here is the engine's own log and
> parse-error **strings**, which name operations and attributes literally; the
> stanza *tags* themselves are WABinary tokens, not strings, so this recovers the
> **vocabulary and logic**, not raw tag bytes.

## The call control is Rust

A load-bearing structural finding: the call-control core is **Rust**
(`call_control::ffi`, `call_control::ffi_utils`), compiled into the module and
heavily inlined. That is why the signaling handlers do not appear as clean,
separately-named functions (they collapse into a few mega-functions alongside the
C++ `WAWapWriter.cpp` serializer and `wa_call_xml_utils.cc`); the readable surface
is the strings. The C++ side handles WABinary serialization; the Rust side owns
the call state machine.

## Signaling operations (recovered)

The engine's strings name the handlers for each phase of a call:

- **Offer.** `parse_xmpp_offer` (`fill_common_header`), `handle_incoming_xmpp_offer`,
  `preprocess_offer` (with a "caller has been timeout already / sending call
  missed event" path), pending-offer buffering (`can_buffer_as_pending_call_offer`,
  `handle_pending_call_offer`), and an **offer v2** path
  (`make_v2_offer_for_invite`, `enable_offer_v2_upgrade`,
  `fast_call_setup_callee_v2`).
- **Ack / nack.** `handle_offer_ack` (de-dupes "duplicate call offer ack"),
  `handle_offer_nack` (creates a device jid).
- **Preaccept.** `handle_preaccept` (looks up device info).
- **Accept.** `handle_accept` -> `call_update_participant_keys`.
- **Rekey.** `handle_enc_rekey` (e.g. "Rekey master sent enc_rekey for bot
  removal, scheduling E2EE restore timer") - the keying rotation path.
- **Relay / transport msgs.** `handle_incoming_relay_msg`,
  `parse_bwe_info_from_relay_latency_msg` (the `relaylatency` stanza), relay
  rebinding and latency probes.
- **Summary / teardown.** `fill_call_summary` parses the terminal node.

## Stanza attributes (recovered)

Parse-error strings reveal real attribute names the engine reads off `<call>`
child nodes:

| attribute | seen in | note |
| --- | --- | --- |
| `call-creator` | offer, call summary, waiting room | the initiator |
| `call_id` | throughout | per-call id |
| `call_duration` | call summary | terminal stat |
| `user_pn` | call summary user | participant phone number |
| `state` | call summary user | per-user state |
| `media` | waiting room | media type |
| `link-token` | waiting room | call-link join token |
| `jid` | waiting room user, devices | participant/device jid |

## Call state machine

The engine runs an explicit state machine via `change_call_state`, with named
states - one captured verbatim is **`ConnectedLonely`** ("call is ConnectedLonely,
ignore the request to set call state to %s"). Reconnection logic is visible too
("entering reconnecting while e2e signaling probe works", "... while relay e2e
bind probe works"), as is device-switch handling
(`handle_device_switch_stream_recreation: skipping in call_state=%s`). Enumerating
all states is [open](#open-questions).

## Group calls, call links, and waiting rooms

Beyond 1:1 (wacrg's current scope), the binary shows the group surface:

- **Group updates** arrive as XMPP MESSAGE `GroupUpdate` (with `call_id`,
  `transaction_id`, `media_type`), parsed by
  `convert_xmpp_group_info_to_group_info`.
- **Call links / waiting rooms**: `is_call_link` / `is_from_call_link`,
  `invited`, a `link-token` attribute, and a waiting-room admission flow
  (`handle_waiting_room`, `serialize_waiting_room_admit`,
  `update_call_group_with_waiting_room_user`).

These corroborate that the same `<call>` machinery scales from 1:1 to group/link
calls, and mark where a 1:1-scoped spec stops.

## Corroboration vs. new

- **Corroborates** the wire spec: the offer/preaccept/accept/terminate phases and
  the `relaylatency` and `call-creator` facts now have a *second* technique behind
  them (static `wasm-analysis` alongside websocket-capture) - candidates to
  promote toward `confirmed`.
- **New leads** (WASM-only so far): the **offer v2** upgrade path, the explicit
  **call state machine** (`ConnectedLonely`, reconnect probes), **precall E2E
  bind**, the **waiting-room / call-link** flow, and the `fill_call_summary`
  attribute set (`call_duration`, `user_pn`, `state`).

## Open questions

- The raw WABinary **tag tokens** for each `<call>` child (offer/accept/…), which
  are tokenized, not string-literal, in the binary.
- The full **call-state enum** and its transitions (owned by the Rust core).
- The exact **offer v1 vs v2** structural difference.
- How `precall_e2e_bind` sequences relative to the SRTP/SFrame
  [keying](../encryption-keying.md).

## See also

[signaling](../signaling.md) · [transport](../transport-noise.md) ·
[encryption-keying](../encryption-keying.md) · [reconstruction](../reconstruction.md).
