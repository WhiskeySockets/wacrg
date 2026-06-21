<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# End-to-end SRTP

_Crypto · `srtp-e2e`_

_status: review · audio, video_

The end-to-end AES-128-CTR SRTP context for 1:1 calls, keyed per participant from the call key and carried unchanged through the relay inside the hop-by-hop SRTP.

A 1:1 call nests two SRTP contexts: the **E2E** context specified here and a
**hop-by-hop (HBH)** context (see [srtp-hop-by-hop](../crypto/srtp-hop-by-hop.md)) applied per
leg. A sender MUST apply the E2E transform to the payload first; those bytes are
carried inside the RTP packet that the HBH transform encrypts on the wire. The
relay decrypts HBH but not E2E, so E2E ciphertext transits the relay unchanged.

**Layer 1 — master secret.** Derive the 30-byte E2E master secret with HKDF-SHA256
(see [srtp-master-key](../crypto/srtp-master-key.md)):

    IKM  = callKey[0..32]             ; the 32-byte call key
    salt = 32 zero bytes
    info = participantLID             ; participant LID bytes, UTF-8
    L    = 46
    OKM  = masterKey(16) || masterSalt(14) || unused(16)

The trailing 16 bytes MUST be discarded. A device derives **send** keys from its
own LID and **receive** keys from the peer LID.

**Layer 2 — session keys.** Expand three values from `masterKey`/`masterSalt` with
the AES-CM KDF (RFC 3711 §4.3). Per label, the IV is the 14-byte master salt
zero-padded to 16 bytes with the label XORed into byte 7; output is the
AES-128-CTR keystream over `L` zero bytes under `masterKey`:

    cipherKey(16) = AES-128-CM(masterKey, IV = pad16(masterSalt), iv[7] ^= 0x00)
    authKey(20)   = AES-128-CM(masterKey, IV = pad16(masterSalt), iv[7] ^= 0x01)
    salt(14)      = AES-128-CM(masterKey, IV = pad16(masterSalt), iv[7] ^= 0x02)

**Per-packet IV.** Build the 16-byte IV by right-aligning the 14-byte `salt` into a
16-byte buffer, then XORing in the SSRC and the 48-bit packet index:

    iv[0..2]  = 0
    iv[2..16] = salt                          ; salt right-aligned (offset = 14 - len)
    iv[4..8]  ^= ssrc                          ; 32-bit, big-endian
    packetIndex = ROC * 2^16 + seq             ; 48-bit
    iv[8..14] ^= packetIndex                    ; 48-bit, big-endian

`seq` is the 16-bit RTP sequence number; `ROC` is the 32-bit rollover counter. The
packet index's top 16 bits land in `iv[8..10]`, low 32 bits in `iv[10..14]`. A
sender MUST increment `ROC` whenever `seq` wraps (signed 16-bit `(seq - lastSeq)
< -32768`).

**Payload transform.** MUST be AES-128-CTR (full 128-bit counter) over the RTP
payload under `cipherKey` and the per-packet IV; decryption applies the identical
keystream. The RTP header is not encrypted.

**Authentication tag.** A 4-byte WARP MESSAGE-INTEGRITY tag (HMAC-SHA1 truncated to
4 bytes, keyed by the WARP auth key — see [warp-crypto](../crypto/warp-crypto.md)) MAY be
appended. A receiver is not required to verify it.

An implementation MUST NOT reuse HBH session keys, salt, or IV construction for E2E:
the contexts differ in KDF, IV layout (E2E XORs a 48-bit packet index into
`iv[8..14]`; HBH places `packetIndex << 16` into `iv[8..16]`), and counter mode
(E2E full 128-bit CTR; HBH libsrtp 2-byte-carry AES-ICM).

**Notes.** A `callKey`-keyed AES-128-GCM SFrame transform (see [sframe-media](../crypto/sframe-media.md)) is
a separate scheme; on the observed 1:1 receive path the peer ships plain media inside
the E2E SRTP layer. A keygen-v2 variant replaces the HKDF IKM with a raw end-to-end
secret from the offer (`<raw_e2e>`, >=32 bytes); derivation is otherwise identical.

Parent: [`srtp-master-key`](../crypto/srtp-master-key.md)  
Requires: [`call-key`](../crypto/call-key.md), [`srtp-master-key`](../crypto/srtp-master-key.md), [`srtp-hop-by-hop`](../crypto/srtp-hop-by-hop.md)  
Breakdown: [`warp-crypto`](../crypto/warp-crypto.md), [`media-loop`](../relay/media-loop.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | working | — | — |
| `zapo-caller` | working | — | ported from src/media/e2e-srtp.ts |
| `meowcaller` | planned | — | — |

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/rfc/crypto/srtp-e2e.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/rfc/crypto/srtp-e2e.yaml)

**Open questions**
- Exact byte layout of participantLID used as HKDF info across client versions (shared with srtp-master-key).
- Whether the 4-byte WARP MESSAGE-INTEGRITY tag is verified by the production receiver, or only emitted on send.
- Conditions under which keygen-v2 (<raw_e2e>) is selected over the callKey-derived IKM.

**References**
- [RFC 3711 — SRTP](https://www.rfc-editor.org/rfc/rfc3711)
- [RFC 5869 — HKDF](https://www.rfc-editor.org/rfc/rfc5869)

---

[← in the full RFC](../../../index.md#srtp-e2e)
