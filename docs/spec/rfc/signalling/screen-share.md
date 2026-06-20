<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Screen sharing

**Category:** [Signalling](../index.md#signalling)  
**Part id:** `screen-share`

**`screen-share`** · status: draft · features: screen-share, video, group · since: 0.1.0

The signalling that starts and stops a screen-share track within a call.

**Normative**

TODO. A participant starts a screen-share by adding a video track flagged as
screen content and signalling it to the other participants; the receiver renders
it distinctly from the camera track. The track flag and start/stop stanzas are not
yet specified.

**Findings**

The WhatsApp Web engine carries a `ScreenContentDetector`, indicating screen
content is handled distinctly in the media path.

**Requires:** [`group-call`](../signalling/group-call.md)

**Implemented by**

| Flavor | Status | Note |
| --- | --- | --- |
| [`whatsapp-rust`](../../flavors.md) | unknown |  |

**Open questions**

- How a screen-share track is flagged in signalling and in the RTP/encoding plane.

---

[in the full RFC →](../index.md#screen-share) · [RFC contents](../index.md#contents)
