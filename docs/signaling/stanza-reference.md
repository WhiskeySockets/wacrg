<!-- Hand-written narrative: the complete <call> stanza reference, from the working
     reconstructions (zapo-caller TS, whatsapp-rust Rust). Exact wire structures. -->

# Call signaling: complete stanza reference

This is the exact wire structure of every `<call>` signaling stanza in a WhatsApp
1:1 call, recovered from two working reconstructions whose builders are exercised
by tests. Where this agrees with the earlier capture-derived model in
[signaling](../signaling.md), the fact is **corroborated by a second independent
technique**; where it adds structure (child order, magic blobs, encodings) it is
new and `probable`.

> **Confidence.** `probable` for the structures below: they come from
> reconstructions ([zapo-caller](../../spec/tools.md) TS, ported into
> [whatsapp-rust](../../spec/tools.md) Rust) that place real calls, with the
> stanza builders unit-tested. Facts that **also** match the websocket-capture
> model are noted as candidates for `confirmed` (two independent techniques).
>
> **Provenance.** Technique `wasm-analysis` (+ the capture model it corroborates)
> · tools `zapo-caller`, `whatsapp-rust`, `warden` · contributors `auties`,
> `sheiitear`, `edgard`, `jlucaso1`, `purpshell` · sources:
> `wacore/src/voip/stanza.rs` (Rust, ported from `zapo-caller src/signaling.ts`).
> Synthetic examples only; no real ids/keys.

## Common envelope

Every action is wrapped in a top-level `<call>` node:

```xml
<call to="{peer-jid}" [id="{wrapper-id}"]>
  <{action} call-id="{call-id}" call-creator="{creator-jid}"> … </{action}>
</call>
```

- `to` is the peer JID (LID in modern calls). `id` (the wrapper stanza id) is
  present on the actions that the client originates with a random id
  (`preaccept`, `heartbeat`); on others the IQ layer supplies it.
- The **action** node (`offer`/`accept`/`preaccept`/`transport`/`relaylatency`/
  `terminate`/`mute_v2`/`reject`/`heartbeat`) carries `call-id` and
  `call-creator` attributes - the call identity and the JID of the device that
  created the call.
- `heartbeat` is the exception: it is wrapped as `<call to="{call-id}@call"
  id="{wrapper}">`, addressing the call object itself rather than the peer.

## `<offer>` - open the call

```xml
<call to="{peer}">
  <offer call-id="{cid}" call-creator="{creator}">
    <privacy>{privacy-token bytes}</privacy>            <!-- optional -->
    <audio enc="opus" rate="8000"/>
    <audio enc="opus" rate="16000"/>
    <net medium="3"/>
    <capability ver="1">01 05 f7 09 e4 bb 13</capability>
    <!-- single callee device: a bare <enc>; multi-device: a <destination> -->
    <enc v="2" type="pkmsg|msg" count="0">{encrypted callKey}</enc>
    <encopt keygen="2"/>
    <device-identity>{bytes}</device-identity>          <!-- optional -->
  </offer>
</call>
```

**The child order is load-bearing**: the server rejects a mis-ordered offer with
**error 439**. The order is exactly: `privacy` -> `audio`(8k) -> `audio`(16k) ->
`net` -> `capability` -> (`destination` | `enc`) -> `encopt` ->
`device-identity`.

- **`<audio enc="opus" rate="...">`** - the offer advertises **two** audio
  formats, 8000 and 16000 Hz. The rate is the lever for codec selection (see
  [accept](#accept-answer-the-call)).
- **`<net medium="3">`** - the network medium on the offer (accept/transport use
  `medium="2"`).
- **`<capability ver="1">`** carries a fixed 7-byte blob
  `01 05 f7 09 e4 bb 13` for offer/accept (a different blob for preaccept).
- **`<enc v="2" type count="0">`** is the per-device wrapped media key (the
  `callKey`), encrypted with the recipient device's Signal session. `type` is
  `pkmsg` (no session yet) or `msg` (existing session) - the same multi-device
  fan-out as messaging (see [encryption-keying](../encryption-keying.md)). One
  callee device uses a bare `<enc>`; **multiple devices** wrap each in
  `<destination><to jid="..."><enc>…</enc></to>…</destination>`.
- **`<encopt keygen="2">`** selects key-generation **v2** (the `<raw_e2e>` keying
  path; see [SRTP](../keying/srtp-key-schedule.md)).

## `<preaccept>` - early ring acknowledgement

```xml
<call to="{peer}" id="{random-wrapper}">
  <preaccept call-id="{cid}" call-creator="{creator}">
    <audio enc="opus" rate="..."/> …
    <encopt keygen="2"/>
    <capability ver="1">01 05 f7 09 e4 bb 07</capability>
  </preaccept>
</call>
```

Sent by the callee to signal the call is ringing before the user answers. Child
order: `audio`* -> `encopt` -> `capability`. Note the **distinct preaccept
capability blob** `01 05 f7 09 e4 bb 07` (the offer/accept blob ends `13`,
preaccept ends `07`).

## `<accept>` - answer the call

```xml
<call to="{peer}">
  <accept call-id="{cid}" call-creator="{creator}">
    <audio enc="opus" rate="..."/> …
    <te priority="2">{relay transport-endpoint bytes}</te>   <!-- optional -->
    <net medium="2"/>
    <encopt keygen="2"/>
    <capability ver="1">…</capability>                        <!-- optional -->
    <rte>{bytes}</rte>                                         <!-- optional -->
    <voip_settings uncompressed="1">{bytes}</voip_settings>   <!-- optional -->
  </accept>
</call>
```

Child order: `audio`* -> `te`(priority 2) -> `net`(medium 2) -> `encopt` ->
`capability` -> `rte` -> `voip_settings`.

- **Codec selection lever:** the `<audio rate>` formats are advertised in
  preference order. Advertising **only `8000`** steers the caller off Meta's
  16 kHz **MLow** codec and onto standard Opus narrow-band - a useful
  interoperability knob.
- **`<te priority>`** carries a relay transport-endpoint blob (priority 2 on
  accept, 1 on transport).
- **`<voip_settings uncompressed="1">`** carries the call's tunable settings.

## `<transport>` - ICE / relay candidate updates

```xml
<call to="{peer}">
  <transport call-id="{cid}" call-creator="{creator}"
             [p2p-cand-round="{n}"] [transport-message-type="{n}"]>
    <te priority="1">{relay-te bytes}</te>    <!-- optional -->
    <net medium="2" [protocol="0"]/>
  </transport>
</call>
```

- **`net` protocol rule:** `<net medium="2">` carries `protocol="0"` **unless**
  `transport-message-type="9"` (a keepalive), in which case `protocol` is
  omitted. This is the wire signal that distinguishes a candidate update from a
  transport keepalive.
- `p2p-cand-round` numbers the ICE candidate round.

## `<relaylatency>` - report measured relay RTT

```xml
<call to="{peer}">
  <relaylatency call-id="{cid}" call-creator="{creator}">
    <te latency="{encoded}" relay_name="{relay}">{address bytes}</te>
    <destination>…</destination>    <!-- peer devices; omitted for inbound callee -->
  </relaylatency>
</call>
```

- **Latency encoding:** the `latency` attribute is `0x02000000 + rtt_ms` as a
  decimal string. E.g. 45 ms -> `33554477`. (The high bit pattern tags the value
  as a latency measurement.)
- `relay_name` is the relay server id (e.g. `gru1c02`); the `<te>` bytes are the
  relay address.

## `<heartbeat>` - keepalive on the call object

```xml
<call to="{call-id}@call" id="{random-wrapper}">
  <heartbeat call-id="{cid}" call-creator="{creator}"/>
</call>
```

Addressed to `{call-id}@call` (not the peer). Periodic liveness during an active
call.

## `<terminate>` - end the call

```xml
<call to="{peer}">
  <terminate call-id="{cid}" call-creator="{creator}" [reason="..."]>
    <destination>…</destination>    <!-- other devices to hang up -->
  </terminate>
</call>
```

- **`reason`** is an enum string, e.g. `accepted_elsewhere` (the call was picked
  up on another of your devices), timeout, rejected, etc.
- The optional `<destination>` lists the caller's *other* devices to tear down
  (the multi-device "accepted elsewhere" fan-out).

## `<mute_v2>` and `<reject>`

```xml
<mute_v2 call-id="{cid}" call-creator="{creator}" mute-state="{state}"/>
<reject  call-id="{cid}" call-creator="{creator}"/>
```

`mute_v2` toggles mic mute mid-call (`mute-state` carries the on/off state);
`reject` declines an incoming call outright.

## Acknowledgement and receipts

The server returns an `<ack>` for each `<call>`. An inbound `<offer>` also
triggers the client to send a `<receipt>` with an `<offer/>` child back to the
caller (the delivery acknowledgement distinct from preaccept/accept).

## Field summary

| stanza | wrapper `to` | key attrs | notable children | load-bearing rule |
| --- | --- | --- | --- | --- |
| offer | peer | call-id, call-creator | privacy, audio×2, net(3), capability, enc/destination, encopt, device-identity | child order (else 439) |
| preaccept | peer (+id) | call-id, call-creator | audio*, encopt, capability(preaccept blob) | distinct capability blob |
| accept | peer | call-id, call-creator | audio*, te(2), net(2), encopt, [capability,rte,voip_settings] | audio rate = codec lever |
| transport | peer | +p2p-cand-round, +transport-message-type | te(1), net(2,[protocol=0]) | protocol omitted iff type=9 |
| relaylatency | peer | call-id, call-creator | te(latency,relay_name), [destination] | latency = 0x2000000+rtt |
| heartbeat | `{cid}@call` (+id) | call-id, call-creator | - | addresses call object |
| terminate | peer | +reason | [destination] | reason enum |
| mute_v2 | peer | +mute-state | - | - |
| reject | peer | call-id, call-creator | - | - |

## See also

[signaling](../signaling.md) (overview) ·
[WASM view](wasm-call-handling.md) (engine-side handlers) ·
[encryption-keying](../encryption-keying.md) (the `<enc>` callKey) ·
[reconstruction](../reconstruction.md).
