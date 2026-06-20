<!-- Hand-written narrative. Complements the generated docs under docs/spec/. -->

# Legal & ethics

wacrg is interoperability and security research. The goal is to document how
the WhatsApp 1:1 call protocol works so that independent clients (such as
[Baileys](https://github.com/WhiskeySockets/Baileys)) can interoperate and so the
security community can reason about the protocol. This page sets the boundaries
everyone working in this repository agrees to.

> wacrg is **not affiliated with, authorized by, or endorsed by** WhatsApp,
> Meta, or any of their subsidiaries. "WhatsApp" and related marks belong to
> their respective owners and are used here only for identification and
> descriptive purposes (nominative fair use). See [`DISCLAIMER.md`](../DISCLAIMER.md).

## Framing: research, not exploitation

- We study the protocol, not people. The object of study is message
  structure, keying, and transport behavior, never the content of anyone's
  communications.
- We document; we do not weaponize. Findings exist to enable interoperability
  and defensive understanding, not to attack accounts, infrastructure, or
  users.
- We value honesty over completeness. Speculative findings are labelled
  speculative. We do not overstate certainty to look more authoritative.

## Comply with the law and platform terms

Contributors are responsible for ensuring their own activity is lawful in their
jurisdiction and consistent with the terms of any service they touch. In
particular:

- Do **not** access accounts or data you are not authorized to access.
- Do **not** disrupt, overload, or probe production infrastructure.
- Reverse-engineering for interoperability has different legal treatment in
  different jurisdictions; know the rules that apply to you. Nothing here is legal
  advice.

If a contribution cannot be made without crossing one of these lines, it does not
belong in wacrg.

## No targeting of real users

This is absolute:

- **Use synthetic test accounts** that you control on every side of a capture.
- **Never** capture, store, or publish another person's calls, metadata, or
  identifiers.
- **Never** include real phone numbers, JIDs, names, device identifiers, IPs, or
  any other personal data.

There are no real captures in this repository, and there must never be. Every
example is synthetic and clearly labelled as such.

## PII & sanitization rules

All data committed to the corpus must be sanitized **before** it is shared. The
authoritative rules live in the [corpus README](../corpus/README.md); the
essentials:

1. **No PII.** Replace JIDs and phone numbers with placeholders
   (`A@s.whatsapp.net`, `B@s.whatsapp.net`).
2. **No secrets or key material.** Signal ciphertext, prekeys, session state,
   media keys, and SRTP keys become labelled placeholders, never real bytes.
3. **No identifying network specifics.** Latency hints are fine; IPs tied to a
   real session are not.
4. **`sanitized: true` is an assertion.** Setting it certifies you verified the
   record is clean. The
   [capture schema](../corpus/schema/capture.schema.json) enforces it and
   reviewers re-check it.
5. **When in doubt, redact.** A clearly-placeholdered partial capture beats a
   "complete" one that leaks.

The [capture pipeline](methodology/capture-pipeline.md) describes where in the
flow sanitization happens (before the issue is filed, and again at review).

## Responsible disclosure

If your research surfaces a **security vulnerability** (as opposed to ordinary
protocol structure), do not publish it as a capture. Follow the process in
[`SECURITY.md`](../SECURITY.md) and report it through the appropriate channel
first.

## Trademark & affiliation disclaimer

wacrg is an independent research project of WhiskeySockets and contributors. It
has no relationship with WhatsApp or Meta. All trademarks are the property of
their respective owners. Full text in [`DISCLAIMER.md`](../DISCLAIMER.md).

## Licensing

Code and tooling are under the [MIT License](../LICENSE). Specification and
documentation content are under [CC BY 4.0](../LICENSE-docs). By contributing you
agree your contributions are licensed the same way. Copyright "WhiskeySockets and
the WhatsApp Calls Research Group contributors".

---

See also: [`DISCLAIMER.md`](../DISCLAIMER.md) · [`SECURITY.md`](../SECURITY.md) ·
[corpus sanitization rules](../corpus/README.md) ·
[capture pipeline](methodology/capture-pipeline.md).
