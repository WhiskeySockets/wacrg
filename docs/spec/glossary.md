<!-- GENERATED FILE — do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Glossary

Shared vocabulary for the WhatsApp calls protocol. Generated from `spec/glossary.yaml`.

| Term | Definition |
| --- | --- |
| **call-creator** | The JID of the device that created/initiated the call. Together with call-id it uniquely identifies a call, disambiguating cases where the same call-id space might otherwise collide across the two endpoints. |
| **call-id** | An identifier uniquely naming a single call instance. Combined with call-creator it keys the call across both peers and the server, and ties together the offer, accept/reject, transport updates, and terminate for that call. |
| **Double Ratchet** | The Signal Protocol's ratcheting algorithm that derives a fresh message key for every message, combining a Diffie-Hellman ratchet with symmetric key chains to provide forward secrecy and break-in recovery. Established <enc> messages (type msg) use it. |
| **ICE** | Interactive Connectivity Establishment, the NAT-traversal framework for negotiating a working media path between peers by gathering and testing candidate transport addresses. WhatsApp's <transport>/<destination> relay candidates are an ICE-like mechanism. |
| **JID** | Jabber/XMPP Identifier addressing a WhatsApp account or device, e.g. user@s.whatsapp.net, with a device suffix (user.deviceId@...) under multi-device. Call stanzas use JIDs in from/to and in call-creator to route between specific devices. |
| **msg** | A normal SignalMessage: the <enc> type used to deliver the call/media key over an already-established Double Ratchet session, the common case between contacts that have interacted before. |
| **multi-device** | WhatsApp's architecture allowing several linked devices (phone plus companions) to share one account, each with its own Signal identity. For calls it means an offer may carry one <enc> per peer device, and "elsewhere" terminate reasons stop other devices ringing once one answers or declines. |
| **Noise Protocol** | The Noise Protocol Framework handshake (WhatsApp uses an XX-style pattern) that establishes the encrypted transport for the multi-device WebSocket connection. All WABinary traffic, including call signaling, rides inside this Noise-encrypted channel; it secures the client-to-server link and is distinct from the end-to-end Signal layer. |
| **pkmsg** | A PreKeySignalMessage: the <enc> type used when no Signal session exists with the target device yet, carrying X3DH handshake material to establish the session before decrypting the wrapped call/media key. |
| **prekey** | A pre-generated public key (signed prekey and one-time prekeys) published to the server so others can run X3DH and start a Signal session asynchronously. Consuming a one-time prekey is what enables a pkmsg-type <enc> to establish a fresh session for call key delivery. |
| **Signal Protocol** | The end-to-end encryption protocol (X3DH key agreement plus the Double Ratchet) used between user devices. In calls it protects the <enc> payload that delivers the call/media key, so even WhatsApp servers relaying the stanza cannot read the key. |
| **SRTP** | Secure Real-time Transport Protocol — the encrypted media transport for call audio/video, carried as UDP packets to WhatsApp voip relay servers. SRTP session keys are derived from the call/media key delivered over the Signal-encrypted <enc> nodes in signaling. |
| **TURN/relay** | TURN (Traversal Using Relays around NAT) servers relay media when a direct peer path is not possible. WhatsApp routes call media through its own voip relay servers; the transport endpoints (<te>/<endpoint>) advertised in signaling identify these relays. |
| **WABinary** | WhatsApp's compact binary encoding of an XMPP-like stanza tree (tag, attributes, children) used on the wire instead of textual XML. Call signaling stanzas such as <call> are WABinary nodes. Tokenised dictionaries and binary value types make it smaller than XML while preserving the same logical structure. |
| **X3DH** | Extended Triple Diffie-Hellman, the asynchronous key-agreement step of the Signal Protocol. It lets one device establish a shared secret with another using published prekeys without both being online, bootstrapping the session that later <enc> messages (type pkmsg) ride on. |

[Back to spec overview](./index.md)
