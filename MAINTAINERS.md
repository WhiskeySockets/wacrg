# Maintainers

This file lists the people who maintain wacrg and the areas/techniques they steward.
Roles are described in [GOVERNANCE.md](./GOVERNANCE.md). Areas map to the `area/*`
labels and to [`.github/CODEOWNERS`](./.github/CODEOWNERS).

## Active maintainers

| Name | GitHub | Area(s) | Primary technique(s) |
| --- | --- | --- | --- |
| Rajeh Taher | [@purpshell](https://github.com/purpshell) | `area/signaling`, `area/keying` (lead) | `websocket-capture`, `baileys-instrumentation` |

## Areas seeking an owner

These layers need maintainers. If you work on them regularly and apply the
confidence/provenance discipline, introduce yourself in
[Discussions](https://github.com/WhiskeySockets/wacrg/discussions) or open a PR adding
yourself here.

| Area | Status | Needs |
| --- | --- | --- |
| `area/media` | _seeking maintainer_ | SRTP/RTP, codecs — strongest with `frida-hooking` / `static-smali-analysis` |
| `area/transport` | _seeking maintainer_ | ICE/relay/endpoint selection — `frida-hooking` / `mitm-tls` |
| `area/keying` | _co-owner welcome_ | Signal-protocol keying of the media key, SRTP derivation |

## How to join

See [Becoming a maintainer](./GOVERNANCE.md#becoming-a-maintainer). In short: contribute
well over time, review others' work, and an existing maintainer will extend the
invitation and add you above.

> The handles and team references in this repository (including
> `@WhiskeySockets/wacrg-maintainers` in CODEOWNERS) are seeds for the group to adjust
> as it forms.
