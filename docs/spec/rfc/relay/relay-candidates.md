<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Transport candidates

_Relay · `relay-candidates`_

_status: draft · audio, video, group_

Parse the `<relay>` block of a call ack into relay endpoints (`<te2>` packed addresses), keying material, and indexed token tables, then select which endpoint to probe for latency versus connect media to.

## `<relay>` element

    <relay uuid=… self_pid=… peer_pid=…>
      <key>…</key>                 ; relay key (base64 ASCII), 16 bytes decoded
      <hbh_key>…</hbh_key>         ; hop-by-hop key (base64 ASCII), 30 bytes decoded
      <warp_mi_tag_len>…</warp_mi_tag_len>  ; optional decimal, > 0
      <token id="N">…</token>      ; indexed relay tokens (0-based)
      <auth_token id="N">…</auth_token>     ; indexed auth tokens (0-based)
      <te2 …>…</te2>               ; one or more transport endpoints
    </relay>

`uuid` is an opaque string. `self_pid`/`peer_pid` are decimal participant ids.
Node content MAY be raw bytes or UTF-8 text.

### `<key>` and `<hbh_key>`

`<key>`: base64-decode (standard alphabet, no-padding fallback) to the raw relay
key (16 bytes observed); if content is not base64, use verbatim. The pre-decode
ASCII is the STUN message-integrity key and MUST be retained.

`<hbh_key>`: MUST decode to exactly 30 bytes (`masterKey(16) || masterSalt(14)`)
for hop-by-hop SRTP (see [srtp-hop-by-hop](../crypto/srtp-hop-by-hop.md)). Handle a single
base64 layer; if the first decode is not 30 bytes, retry a second base64 decode
(double-base64). Content not yielding 30 bytes is treated as absent.

`<warp_mi_tag_len>`: decimal; MUST be ignored unless it parses and is > 0.

### Token tables

`<token>` and `<auth_token>` are two independent 0-based indexed tables. Place each
element's decoded content at the slot given by its `id`, growing the table with
empty entries as needed; when `id` is absent use the next free slot. `<te2>`
references these via `token_id` / `auth_token_id`.

### `<te2>` endpoint

Content is the packed address:

    6 bytes  → IPv4 : a.b.c.d + port (u16 big-endian, bytes[4..6])
    18 bytes → IPv6 : 8 × u16 groups (big-endian) + port (u16, bytes[16..18])

Any other content length MUST be skipped. Default relay port is 3478 (packed
`0x0D 0x96`).

Attributes:

- `relay_id` — decimal, default 0.
- `relay_name` — string, default empty.
- `token_id` — decimal index into `<token>` table, default 0.
- `auth_token_id` — decimal index into `<auth_token>` table, default 0.
- `is_fna` — `"1"` marks a fallback (inbound-only) relay; absent/other = false.
- `protocol` — decimal, default 0; carried onto the parsed address.
- `c2r_rtt` — optional decimal client→relay RTT in milliseconds.

Multiple `<te2>` sharing the same `relay_id` and `relay_name` MUST be merged into
one endpoint accumulating all addresses (e.g. one IPv4 + one IPv6). The endpoint's
`c2r_rtt` is taken from the latest `<te2>` supplying one. A client MUST retain the
verbatim 6-byte IPv4:port content of the first IPv4 `<te2>`; this exact byte string
is echoed in the `<te>` of a `<relaylatency>` stanza (see
[call-relaylatency](../signalling/call-relaylatency.md)).

## Endpoint selection

An endpoint is an **outbound (latency) candidate** iff `is_fna` is false AND
`auth_token_id` is non-zero. FNA relays (`is_fna=1`, `auth_token_id=0`) are
inbound-only and MUST NOT be probed for outbound latency.

- **relaylatency probing**: use only outbound candidates, deduped by `relay_name`,
  ordered by ascending `relay_id`.
- **media transport**: select in order: (1) first outbound candidate; else (2)
  first non-FNA endpoint; else (3) first endpoint. An offer whose endpoints all
  have `auth_token_id=0` has no latency candidate but MUST still connect media to a
  chosen endpoint rather than drop the call.

When merging a patch relay block (e.g. accept ack supplies a fresh `hbh_key`) over
an existing block, a client MUST prefer each present patch field, and MUST treat
empty token tables / empty endpoint lists in the patch as "unset" so base values
are retained.

## Synthetic ICE credentials

For WebRTC stacks: ICE ufrag = base64 of the raw selected `auth_token` bytes; ICE
pwd = base64 of the decoded relay key. An empty token or key yields an empty string.

Requires: [`call-relaylatency`](../signalling/call-relaylatency.md), [`srtp-hop-by-hop`](../crypto/srtp-hop-by-hop.md), [`stun-relay`](../relay/stun-relay.md)

**Implemented by**
- **whatsapp-rust** — working · [commits ↗](https://github.com/oxidezap/whatsapp-rust/commits)
- **zapo-caller** — working — origin of the parser (src/relay/parse.ts)

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/relay/relay-candidates.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/relay/relay-candidates.yaml)

**Open questions**
- Full semantics of the relay key vs hbh_key roles beyond STUN MI and hop-by-hop SRTP keying.
- Meaning of the protocol attribute values on a <te2> beyond being carried through.
- Whether token_id/auth_token_id ever index beyond the tables present, and the intended fallback.

**References**
- [RFC 5389 — STUN](https://www.rfc-editor.org/rfc/rfc5389)

---

[← in the full RFC](../../../index.md#relay-candidates)
