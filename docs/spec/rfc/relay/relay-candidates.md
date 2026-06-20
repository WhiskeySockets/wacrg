<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Transport candidates

**Category:** [Relay](../index.md#relay)  
**Part id:** `relay-candidates`

**`relay-candidates`** · status: draft · features: audio, video, group · since: 0.1.0

How relay (and host) transport candidates are carried in the `<relay>` block of a call ack: the `<te2>` endpoint format with its packed IPv4/IPv6 address bytes, the indexed `<token>`/`<auth_token>` tables, and the rules for selecting which endpoint to probe for latency versus which to connect the media transport to.

**Normative**

The signalling server returns transport candidates inside a `<relay>` element
(a child of a call ack). A client MUST parse `<relay>` into the set of relay
endpoints, the keying material, and the token tables before it can probe latency
(see [call-relaylatency](../signalling/call-relaylatency.md)) or connect the media transport.

## `<relay>` element

`<relay>` carries these attributes and children:

    <relay uuid=… self_pid=… peer_pid=…>
      <key>…</key>                 ; relay key (base64 ASCII), 16 bytes decoded
      <hbh_key>…</hbh_key>         ; hop-by-hop key (base64 ASCII), 30 bytes decoded
      <warp_mi_tag_len>…</warp_mi_tag_len>  ; optional decimal, > 0
      <token id="N">…</token>      ; indexed relay tokens (0-based)
      <auth_token id="N">…</auth_token>     ; indexed auth tokens (0-based)
      <te2 …>…</te2>               ; one or more transport endpoints
    </relay>

`uuid` is an opaque string. `self_pid` and `peer_pid` are decimal participant ids.
Parsers SHOULD accept node content as either raw bytes or UTF-8 text.

### `<key>` and `<hbh_key>`

`<key>` content is the relay key. A client MUST base64-decode it (standard
alphabet, with a no-padding fallback) to obtain the raw relay key bytes (16 bytes
in observed traffic); if the content does not look like base64 it is used
verbatim. The raw `<key>` ASCII (pre-decode) is the STUN message-integrity key.

`<hbh_key>` content MUST decode to exactly 30 bytes
(`masterKey(16) || masterSalt(14)`) for hop-by-hop SRTP (see
[srtp-hop-by-hop](../crypto/srtp-hop-by-hop.md)). Decoding MUST handle a single base64 layer,
and MUST retry a second base64 decode if the first result is not 30 bytes
(double-base64); a content that does not yield 30 bytes is treated as absent.

`<warp_mi_tag_len>`, when present, is a decimal integer; a value MUST be ignored
unless it parses and is greater than zero.

### Token tables

`<token>` and `<auth_token>` form two independent 0-based indexed tables. Each
element carries an `id` attribute giving its slot; a client MUST place the
element's (decoded) content at that index, growing the table with empty entries as
needed. When `id` is absent the next free slot is used. A `<te2>` endpoint
references these tables by `token_id` / `auth_token_id`.

### `<te2>` endpoint

Each `<te2>` describes one relay address. Its content is the packed address:

    6 bytes  → IPv4 :  a.b.c.d  +  port (u16, big-endian, bytes[4..6])
    18 bytes → IPv6 :  8 × u16 groups (big-endian)  +  port (u16, bytes[16..18])

Content of any other length MUST be skipped. The default relay port observed in
traffic is 3478 (the packed port bytes `0x0D 0x96`).

`<te2>` attributes:

- `relay_id`   — decimal, default 0.
- `relay_name` — string, default empty.
- `token_id`   — decimal index into the `<token>` table, default 0.
- `auth_token_id` — decimal index into the `<auth_token>` table, default 0.
- `is_fna`     — `"1"` marks a fallback (inbound-only) relay; absent/other = false.
- `protocol`   — decimal, default 0; carried onto the parsed address.
- `c2r_rtt`    — optional decimal client→relay RTT in milliseconds.

Multiple `<te2>` sharing the same `relay_id` and `relay_name` MUST be merged into a
single endpoint that accumulates all of its addresses (e.g. an IPv4 and an IPv6
address for one relay). The endpoint's `c2r_rtt` is taken from the latest `<te2>`
that supplies one. A client MUST retain the verbatim 6-byte IPv4:port content of
the first IPv4 `<te2>` for an endpoint; this exact byte string is what is echoed in
the `<te>` of a `<relaylatency>` stanza (see [call-relaylatency](../signalling/call-relaylatency.md)).

## Endpoint selection

An endpoint is an **outbound (latency) candidate** if and only if it is not FNA
(`is_fna` false) AND its `auth_token_id` is non-zero. FNA relays
(`is_fna=1`, `auth_token_id=0`) are inbound-only and MUST NOT be probed for
outbound latency.

- For **relaylatency probing**, a client MUST use only outbound candidates, deduped
  by `relay_name` and ordered by ascending `relay_id`.
- For **connecting the media transport**, a client MUST select, in order of
  preference: (1) the first outbound candidate; else (2) the first non-FNA
  endpoint; else (3) the first endpoint. `auth_token_id` only gates latency
  probing — an offer whose endpoints all have `auth_token_id=0` has no latency
  candidate yet MUST still connect media to a chosen endpoint rather than drop the
  call.

When a relay block is updated (e.g. the accept ack supplies a fresh `hbh_key`), a
client merging the patch over an existing block MUST prefer each present patch
field, and MUST treat empty token tables / empty endpoint lists in the patch as
"unset" so the base values are retained.

## Synthetic ICE credentials

For implementations that drive media through a WebRTC stack, the synthetic SDP
credentials are derived from this block: the ICE ufrag is the base64 of the raw
selected `auth_token` bytes, and the ICE pwd is the base64 of the decoded relay
key. An empty token or key yields an empty string.

**Findings**

`<te2>` (rather than an SDP candidate line) is the on-the-wire form for relay
candidates; addresses are packed binary, not text. One logical relay can appear as
several `<te2>` rows (one per address family) that must be coalesced by
`relay_id`+`relay_name`. The split between "latency candidate" (gated on a non-zero
`auth_token_id`) and "media endpoint" (any reachable, preferring non-FNA) is the
key selection nuance: skipping it either probes inbound-only relays or drops calls
whose offers carry no latency candidate. The relay key's pre-decode ASCII doubles
as the STUN message-integrity key, so the verbatim content must be retained
alongside the decoded bytes.

**Requires:** [`call-relaylatency`](../signalling/call-relaylatency.md), [`srtp-hop-by-hop`](../crypto/srtp-hop-by-hop.md), [`stun-relay`](../relay/stun-relay.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | working |  |
| [`zapo-caller`](../../flavors.md) | working | origin of the parser (src/relay/parse.ts) |
| [`meowcaller`](../../flavors.md) | planned |  |

**Open questions**

- Full semantics of the relay key vs hbh_key roles beyond STUN MI and hop-by-hop SRTP keying.
- Meaning of the protocol attribute values on a <te2> beyond being carried through.
- Whether token_id/auth_token_id ever index beyond the tables present, and the intended fallback.

**References**

- [RFC 5389 — STUN](https://www.rfc-editor.org/rfc/rfc5389)

---

[in the full RFC →](../index.md#relay-candidates) · [RFC contents](../index.md#contents)
