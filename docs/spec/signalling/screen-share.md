<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. Run `npm run generate` to regenerate. -->

# Screen sharing

_Signalling · `screen-share`_

`SIG-11` · _status: draft · screen-share, video, group_

Start and stop a screen-share track within a call.

TODO. A participant starts a screen-share by adding a video track flagged as
screen content; the receiver renders it distinctly from the camera track. The
track flag and start/stop stanzas are not yet specified.

**Notes.** WhatsApp Web carries a `ScreenContentDetector` symbol; screen content is
handled distinctly in the media path.

Parent: [`group-call`](../signalling/group-call.md)  
Requires: [`group-call`](../signalling/group-call.md)

**Implemented by**

| Flavor | Status | Commits | Notes |
| --- | --- | --- | --- |
| `whatsapp-rust` | unknown | — | — |

**Annotation** `wacrg:SIG-11` — a flavor marks its implementation site in source with this comment; a script clones the source, finds it, and attaches the commit blame/permalink.

Discovered by Vini · [protocol history / diff ↗](https://github.com/WhiskeySockets/wacrg/commits/main/spec/signalling/screen-share.yaml) · [blame ↗](https://github.com/WhiskeySockets/wacrg/blame/main/spec/signalling/screen-share.yaml)

**Open questions**
- How a screen-share track is flagged in signalling and in the RTP/encoding plane.

---

[← in the full spec](../../index.md#screen-share)
