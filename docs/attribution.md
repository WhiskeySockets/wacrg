# Attribution & proof

wacrg is built by multiple researchers using different tools. For the spec to be
trustworthy, every fact must be traceable to who observed it, what technique
and tool produced it, and a source that proves it. This page describes how
that attribution works and why it is verifiable.

## The provenance dimensions

Every fact in the corpus (each attribute and child of a stanza) carries a
`provenance` block with up to five dimensions:

| Field | Answers | Required | References |
| --- | --- | --- | --- |
| `techniques` | *By what method?* | yes | the fixed technique set (`spec/techniques/`) |
| `tools` | *With what tool?* | recommended | the tool registry (`spec/tools/`) |
| `flavors` | *Which reimplementations corroborate it?* | optional | the flavor registry (`spec/flavors/`) |
| `contributors` | *Who observed/submitted it?* | recommended | the contributor registry (`spec/contributors/`) |
| `sources` | *Where is the proof?* | recommended | issue/PR/commit refs, e.g. `#42` |

A **tool** gathers evidence (warden, frida); a **flavor** is an independent
reimplementation that corroborates a fact by realizing it in code. A flavor is a
*corroborating source*, not a technique: it never on its own promotes a fact to
`confirmed`, and a flavor does not corroborate a flavor it `derives_from` (a port and
its upstream count once). See [flavors](spec/flavors.md) and the
[implementation map](spec/flavor-map.md).

Example, inside a stanza YAML:

```yaml
attributes:
  - name: call-id
    type: string
    confidence: probable
    description: Opaque per-call identifier.
    provenance:
      techniques: [websocket-capture]
      tools: [baileys]
      contributors: [purpshell]
      sources: ["#42"]
```

The validator enforces referential integrity: every `techniques`, `tools`, and
`contributors` value must resolve to a registered id, or `npm run validate` fails.

## The registries

- **Contributors**: `spec/contributors/<id>.yaml`, one file per researcher: `id`
  (your GitHub handle), `name`, `affiliation`, the `techniques`/`tools` you use, and
  proof `links`. Rendered to [the contributors page](spec/contributors.md).
- **Tools**: `spec/tools/<id>.yaml`, one file per evidence-gathering tool: `id`,
  `version`, `url`, the `techniques` it supports, and `maintainer`. Rendered to
  [the tools page](spec/tools.md).
- **Flavors**: `spec/flavors/<id>.yaml`, one file per independent reimplementation:
  `id`, `language`, `maturity`, `maintainer`, `covers`, `basis`, and `derives_from`.
  An optional `spec/flavors/<id>.map.yaml` records, per spec bit, the code permalink and
  validating vector (the inverse Source-of-truth). Rendered to
  [the flavors page](spec/flavors.md) and the [implementation map](spec/flavor-map.md).

Registering yourself once means every fact you contribute is attributed
consistently, and your toolset is documented in one place.

## How attribution is verified

Attribution is only meaningful if it can be verified. wacrg layers four independent
forms of evidence:

1. **GitHub-authenticated identity.** When you file a capture through the *Stanza
   capture* Issue Form, the `issue-to-corpus` workflow stamps the capture's
   `source.contributor` with **your GitHub login**
   (`github.event.issue.user.login`). You cannot set it to someone else. The same
   holds for pull-request authorship.
2. **Corpus provenance** records technique + tool + contributor + source on the fact
   itself, so the attribution travels with the data.
3. **Git history** is the immutable ledger: `git blame` / `git log` show exactly who
   authored each line and when, linked to the PR that merged it.
4. **Source references** (`sources: ["#42"]`) tie the fact back to the issue/PR or
   note where it was first reported and reviewed.

Together these answer, for any fact: who observed it, with what technique and tool,
and where the proof is recorded.

## Stronger cryptographic proof

For high-assurance contributions, maintainers may additionally require:

- **Signed commits** (GPG or SSH). Enabling "Require signed commits" on the protected
  `main` branch ties every merged fact to a cryptographic key.
- **DCO sign-off.** Add `Signed-off-by: Name <email>` to commits (the
  [Developer Certificate of Origin](https://developercertificate.org/)) to certify you
  have the right to contribute the data.

These turn "this GitHub account submitted it" into "this key certifies it."

## Attribution vs. confidence

They are linked but separate. A fact reaches `confirmed` only when two independent
contributors or techniques corroborate it (see [governance](../GOVERNANCE.md) and
[methodology](methodology/index.md)). Because each fact lists its contributors and
techniques, a reviewer can verify the corroboration rule at a glance: it requires two
different people using two independent techniques.

## TL;DR for contributors

- Register yourself once at `spec/contributors/<your-handle>.yaml`.
- Add your tool(s) under `spec/tools/` if not already there.
- If you maintain an independent reimplementation, register it under `spec/flavors/`
  (and optionally add an `<id>.map.yaml` pointing at your code).
- On every fact you add, set `provenance.techniques`, `provenance.tools`,
  `provenance.contributors: [<your-handle>]`, `provenance.sources`, and
  `provenance.flavors` for any reimplementation that reproduces it.
- File captures via the Issue Form; your identity is stamped automatically.
