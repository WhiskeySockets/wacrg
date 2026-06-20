/**
 * generate-docs.ts: render the YAML corpus into human-readable Markdown.
 *
 * Input -> output (idempotent; every file is overwritten each run):
 *   spec/stanzas/*.yaml    -> docs/spec/stanzas/<id>.md + docs/spec/stanzas/index.md
 *   spec/flows/*.yaml      -> docs/spec/flows/<id>.md   + docs/spec/flows/index.md
 *   spec/enums/*.yaml      -> docs/spec/enums.md
 *   spec/techniques/*.yaml -> docs/spec/techniques.md
 *   spec/glossary.yaml     -> docs/spec/glossary.md
 *   overview               -> docs/spec/index.md
 *
 * Flows additionally embed a fenced ```mermaid sequenceDiagram built from
 * participants + steps. Every generated file carries a banner comment.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  RFC_CATEGORIES,
  RFC_CATEGORY_META,
  SPEC_VERSION,
  fromRoot,
  loadContributors,
  loadEnums,
  loadFlavorMaps,
  loadFlavors,
  loadFlows,
  loadGlossary,
  loadRfcParts,
  loadStanzas,
  loadTechniques,
  loadTools,
  type Attribute,
  type Child,
  type FlavorMapEntry,
  type Flow,
  type RfcCategory,
  type RfcPart,
  type Stanza,
} from './lib/corpus.ts';

const BANNER =
  '<!-- GENERATED FILE. Do not edit by hand. Source: spec/ corpus. ' +
  'Run `npm run generate` to regenerate. -->\n';

function write(relPath: string, body: string): void {
  const abs = fromRoot(relPath);
  mkdirSync(dirname(abs), { recursive: true });
  const content = body.endsWith('\n') ? body : body + '\n';
  writeFileSync(abs, BANNER + '\n' + content, 'utf8');
}

/** Write a file verbatim, with no generated-file banner (for JSON feeds etc.). */
function writeRaw(relPath: string, body: string): void {
  const abs = fromRoot(relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body.endsWith('\n') ? body : body + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Small markdown helpers.
// ---------------------------------------------------------------------------

/** Escape pipe characters so cell text doesn't break a markdown table. */
function cell(text: string | undefined): string {
  if (text === undefined || text === null) return '';
  return String(text).replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
}

function yesNo(v: boolean | undefined): string {
  return v ? 'yes' : 'no';
}

function list(items: string[] | undefined): string {
  if (!items || items.length === 0) return '';
  return items.map((i) => `- ${i}`).join('\n');
}

function provenanceLine(attr: Attribute): string {
  const prov = attr.provenance;
  if (!prov) return '';
  const parts: string[] = [];
  parts.push(`techniques: ${prov.techniques?.length ? prov.techniques.join(', ') : 'none'}`);
  if (prov.tools?.length) parts.push(`tools: ${prov.tools.join(', ')}`);
  if (prov.flavors?.length) parts.push(`flavors: ${prov.flavors.join(', ')}`);
  if (prov.contributors?.length) {
    parts.push(`by: ${prov.contributors.map((c) => '@' + c).join(', ')}`);
  }
  parts.push(`sources: ${prov.sources?.length ? prov.sources.join(', ') : 'none'}`);
  return parts.join('; ');
}

function fence(lang: string, body: string): string {
  const trimmed = body.replace(/\n+$/, '');
  return '```' + lang + '\n' + trimmed + '\n```';
}

// ---------------------------------------------------------------------------
// Attribute + child rendering (recursive).
// ---------------------------------------------------------------------------

function attributesTable(attrs: Attribute[] | undefined): string {
  if (!attrs || attrs.length === 0) return '_No attributes documented yet._';
  const head =
    '| Name | Type | Required | Confidence | Description | Provenance |\n' +
    '| --- | --- | --- | --- | --- | --- |';
  const rows = attrs.map((a) => {
    const observed = a.observed_values?.length
      ? ` <br/>_observed:_ ${a.observed_values.map((v) => '`' + v + '`').join(', ')}`
      : '';
    return (
      `| \`${cell(a.name)}\` | \`${cell(a.type)}\` | ${yesNo(a.required)} | ` +
      `${cell(a.confidence ?? 'unknown')} | ${cell(a.description)}${observed} | ` +
      `${cell(provenanceLine(a))} |`
    );
  });
  return [head, ...rows].join('\n');
}

function childSection(child: Child, depth: number): string {
  // Headings start at level 3 for top-level children and increase with depth.
  const level = Math.min(6, 3 + depth);
  const hashes = '#'.repeat(level);
  const parts: string[] = [];
  parts.push(`${hashes} \`<${child.tag}>\``);
  const meta: string[] = [];
  if (child.occurrence) meta.push(`**occurrence:** ${cell(child.occurrence)}`);
  if (child.confidence) meta.push(`**confidence:** ${cell(child.confidence)}`);
  if (meta.length) parts.push(meta.join(' · '));
  if (child.description) parts.push(cell(child.description));
  if (child.attributes?.length) {
    parts.push('**Attributes**');
    parts.push(attributesTable(child.attributes));
  }
  const sections = [parts.join('\n\n')];
  for (const grandchild of child.children ?? []) {
    sections.push(childSection(grandchild, depth + 1));
  }
  return sections.join('\n\n');
}

// ---------------------------------------------------------------------------
// Stanza pages.
// ---------------------------------------------------------------------------

function renderStanza(stanza: Stanza): string {
  const out: string[] = [];
  out.push(`# ${stanza.display_name ?? stanza.id}`);

  const facts: string[] = [
    `**Tag:** \`<${stanza.tag}>\``,
    `**Category:** ${cell(stanza.category)}`,
    `**Status:** ${cell(stanza.status ?? 'draft')}`,
    `**Spec version:** ${cell(stanza.spec_version ?? '0.1.0')}`,
  ];
  if (stanza.direction?.length) {
    facts.push(`**Direction:** ${stanza.direction.join(', ')}`);
  }
  out.push(facts.join('  \n'));

  if (stanza.summary) {
    out.push('## Summary');
    out.push(cell(stanza.summary));
  }

  out.push('## Attributes');
  out.push(attributesTable(stanza.attributes));

  if (stanza.children?.length) {
    out.push('## Children');
    for (const child of stanza.children) {
      out.push(childSection(child, 0));
    }
  }

  if (stanza.examples?.length) {
    out.push('## Examples');
    for (const ex of stanza.examples) {
      if (ex.title) out.push(`### ${ex.title}`);
      if (ex.note) out.push(`> ${ex.note}`);
      if (ex.body) out.push(fence(ex.format ?? 'text', ex.body));
    }
  }

  if (stanza.notes) {
    out.push('## Notes');
    out.push(cell(stanza.notes));
  }

  if (stanza.open_questions?.length) {
    out.push('## Open questions');
    out.push(list(stanza.open_questions));
  }

  if (stanza.references?.length) {
    out.push('## References');
    out.push(
      stanza.references
        .map((r) => (r.url ? `- [${r.title ?? r.url}](${r.url})` : `- ${r.title ?? ''}`))
        .join('\n'),
    );
  }

  out.push('---');
  out.push('[Back to stanza catalog](./index.md) · [Spec overview](../index.md)');

  return out.join('\n\n');
}

function renderStanzaIndex(stanzas: Stanza[]): string {
  const out: string[] = [];
  out.push('# Stanza catalog');
  out.push(
    'Machine-readable descriptions of the WABinary nodes that carry WhatsApp ' +
      '1:1 call signaling. Generated from `spec/stanzas/`.',
  );
  const head =
    '| Stanza | Tag | Category | Direction | Status |\n| --- | --- | --- | --- | --- |';
  const rows = stanzas
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => {
      const dir = s.direction?.length ? s.direction.join(', ') : '-';
      return (
        `| [${cell(s.display_name ?? s.id)}](./${s.id}.md) | \`<${cell(s.tag)}>\` | ` +
        `${cell(s.category)} | ${dir} | ${cell(s.status ?? 'draft')} |`
      );
    });
  out.push([head, ...rows].join('\n'));
  out.push('[Back to spec overview](../index.md)');
  return out.join('\n\n');
}

// ---------------------------------------------------------------------------
// Flow pages (with mermaid sequence diagrams).
// ---------------------------------------------------------------------------

/** Sanitize a participant id into a mermaid-safe alias. */
function mermaidAlias(id: string): string {
  return id.replace(/[^A-Za-z0-9_]/g, '_');
}

function mermaidDiagram(flow: Flow): string {
  const lines: string[] = ['sequenceDiagram', '  autonumber'];
  const participants = flow.participants ?? [];
  for (const p of participants) {
    const alias = mermaidAlias(p.id);
    const label = (p.label ?? p.id).replace(/"/g, "'");
    lines.push(`  participant ${alias} as ${label}`);
  }
  for (const step of flow.steps ?? []) {
    const from = mermaidAlias(step.from);
    const to = mermaidAlias(step.to);
    let text = step.label ?? step.stanza ?? '';
    if (step.confidence) text = `${text} [${step.confidence}]`;
    text = text.replace(/[\n;]/g, ' ').replace(/"/g, "'").replace(/\s+/g, ' ').trim() || '(message)';
    lines.push(`  ${from}->>${to}: ${text}`);
    if (step.note) {
      const noteText = step.note
        .replace(/[\n;]/g, ' ')
        .replace(/"/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
      lines.push(`  Note over ${from},${to}: ${noteText}`);
    }
  }
  return fence('mermaid', lines.join('\n'));
}

function renderFlow(flow: Flow): string {
  const out: string[] = [];
  out.push(`# ${flow.title ?? flow.id}`);
  out.push(
    [
      `**Status:** ${cell(flow.status ?? 'draft')}`,
      `**Spec version:** ${cell(flow.spec_version ?? '0.1.0')}`,
    ].join('  \n'),
  );

  if (flow.summary) {
    out.push('## Summary');
    out.push(cell(flow.summary));
  }

  out.push('## Sequence');
  out.push(mermaidDiagram(flow));

  if (flow.participants?.length) {
    out.push('## Participants');
    out.push(
      flow.participants.map((p) => `- **${cell(p.label ?? p.id)}** (\`${p.id}\`)`).join('\n'),
    );
  }

  if (flow.steps?.length) {
    out.push('## Steps');
    const head =
      '| # | From | To | Message | Stanza | Confidence | Note |\n' +
      '| --- | --- | --- | --- | --- | --- | --- |';
    const rows = flow.steps.map((s, i) => {
      const stanzaLink = s.stanza
        ? `[\`${s.stanza}\`](../stanzas/${s.stanza}.md)`
        : '-';
      return (
        `| ${i + 1} | ${cell(s.from)} | ${cell(s.to)} | ${cell(s.label)} | ` +
        `${stanzaLink} | ${cell(s.confidence ?? '')} | ${cell(s.note)} |`
      );
    });
    out.push([head, ...rows].join('\n'));
  }

  if (flow.open_questions?.length) {
    out.push('## Open questions');
    out.push(list(flow.open_questions));
  }

  out.push('---');
  out.push('[Back to flow catalog](./index.md) · [Spec overview](../index.md)');
  return out.join('\n\n');
}

function renderFlowIndex(flows: Flow[]): string {
  const out: string[] = [];
  out.push('# Call flows');
  out.push(
    'End-to-end signaling sequences assembled from individual stanzas. ' +
      'Generated from `spec/flows/`.',
  );
  const head = '| Flow | Status | Summary |\n| --- | --- | --- |';
  const rows = flows
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (f) =>
        `| [${cell(f.title ?? f.id)}](./${f.id}.md) | ${cell(f.status ?? 'draft')} | ${cell(
          f.summary,
        )} |`,
    );
  out.push([head, ...rows].join('\n'));
  out.push('[Back to spec overview](../index.md)');
  return out.join('\n\n');
}

// ---------------------------------------------------------------------------
// Enums, techniques, glossary, overview.
// ---------------------------------------------------------------------------

function renderEnums(enums: ReturnType<typeof loadEnums>): string {
  const out: string[] = [];
  out.push('# Enumerations');
  out.push(
    'Closed value sets referenced by stanza attributes (e.g. terminate ' +
      'reasons). Generated from `spec/enums/`.',
  );
  if (enums.length === 0) {
    out.push('_No enums documented yet._');
    return out.join('\n\n');
  }
  for (const { data } of enums.slice().sort((a, b) => a.data.id.localeCompare(b.data.id))) {
    out.push(`## ${data.title ?? data.id}`);
    const meta = [`**id:** \`${data.id}\``, `**status:** ${cell(data.status ?? 'draft')}`];
    out.push(meta.join('  \n'));
    if (data.summary) out.push(cell(data.summary));
    if (data.values?.length) {
      const head = '| Value | Confidence | Description |\n| --- | --- | --- |';
      const rows = data.values.map(
        (v) =>
          `| \`${cell(v.value)}\` | ${cell(v.confidence ?? 'unknown')} | ${cell(
            v.description,
          )} |`,
      );
      out.push([head, ...rows].join('\n'));
    } else {
      out.push('_No values documented yet._');
    }
  }
  out.push('[Back to spec overview](./index.md)');
  return out.join('\n\n');
}

function renderTechniques(techniques: ReturnType<typeof loadTechniques>): string {
  const out: string[] = [];
  out.push('# Reverse-engineering techniques');
  out.push(
    'The methods maintainers use to observe and confirm protocol facts. Each ' +
      'technique id is part of the fixed provenance vocabulary. Generated from ' +
      '`spec/techniques/`.',
  );
  if (techniques.length === 0) {
    out.push('_No techniques documented yet._');
    return out.join('\n\n');
  }
  const head = '| Technique | Maturity | Targets | Guide |\n| --- | --- | --- | --- |';
  const rows = techniques
    .slice()
    .sort((a, b) => a.data.id.localeCompare(b.data.id))
    .map(({ data }) => {
      const targets = data.targets?.length ? data.targets.join(', ') : '-';
      const guide = data.guide
        ? `[guide](${guideLink(data.guide)})`
        : '-';
      const anchor = (data.title ?? data.id).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return (
        `| [${cell(data.title ?? data.id)}](#${anchor}) | ${cell(data.maturity ?? '')} | ` +
        `${targets} | ${guide} |`
      );
    });
  out.push([head, ...rows].join('\n'));

  for (const { data } of techniques
    .slice()
    .sort((a, b) => a.data.id.localeCompare(b.data.id))) {
    out.push(`## ${data.title ?? data.id}`);
    const meta = [
      `**id:** \`${data.id}\``,
      `**maturity:** ${cell(data.maturity ?? '')}`,
      `**status:** ${cell(data.status ?? '')}`,
    ];
    if (data.targets?.length) meta.push(`**targets:** ${data.targets.join(', ')}`);
    out.push(meta.join('  \n'));
    if (data.summary) out.push(cell(data.summary));
    if (data.strengths?.length) {
      out.push('**Strengths**');
      out.push(list(data.strengths));
    }
    if (data.limitations?.length) {
      out.push('**Limitations**');
      out.push(list(data.limitations));
    }
    if (data.tooling?.length) {
      out.push('**Tooling**');
      out.push(list(data.tooling));
    }
    if (data.maintainers?.length) {
      out.push(`**Maintainers:** ${data.maintainers.map((m) => `@${m}`).join(', ')}`);
    }
    if (data.guide) {
      out.push(`**Guide:** [${data.guide}](${guideLink(data.guide)})`);
    }
    if (data.references?.length) {
      out.push('**References**');
      out.push(
        data.references
          .map((r) => (r.url ? `- [${r.title ?? r.url}](${r.url})` : `- ${r.title ?? ''}`))
          .join('\n'),
      );
    }
  }
  out.push('[Back to spec overview](./index.md)');
  return out.join('\n\n');
}

/** A guide path like docs/techniques/foo.md is relative to docs/spec/. */
function guideLink(guidePath: string): string {
  // Generated technique page lives at docs/spec/techniques.md; the guide path
  // is given relative to the repo's docs/ dir, so step up one level.
  const stripped = guidePath.replace(/^docs\//, '');
  return `../${stripped}`;
}

function renderContributors(contributors: ReturnType<typeof loadContributors>): string {
  const out: string[] = [];
  out.push('# Contributors');
  out.push(
    'Researchers who contribute to the spec. Provenance entries reference these ' +
      'ids to record **who** contributed each fact. Generated from ' +
      '`spec/contributors/`.',
  );
  if (contributors.length === 0) {
    out.push('_No contributors registered yet._');
    return out.join('\n\n');
  }
  const head =
    '| Contributor | GitHub | Affiliation | Techniques | Tools |\n' +
    '| --- | --- | --- | --- | --- |';
  const rows = contributors
    .slice()
    .sort((a, b) => a.data.id.localeCompare(b.data.id))
    .map(({ data }) => {
      const gh = data.github
        ? `[@${data.github}](https://github.com/${data.github})`
        : '-';
      const techniques = data.techniques?.length
        ? data.techniques.map((t) => `\`${t}\``).join(', ')
        : '-';
      const tools = data.tools?.length
        ? data.tools.map((t) => `\`${t}\``).join(', ')
        : '-';
      return (
        `| ${cell(data.name ?? data.id)} | ${gh} | ${cell(data.affiliation ?? '-')} | ` +
        `${techniques} | ${tools} |`
      );
    });
  out.push([head, ...rows].join('\n'));
  out.push('[Back to spec overview](./index.md)');
  return out.join('\n\n');
}

function renderTools(tools: ReturnType<typeof loadTools>): string {
  const out: string[] = [];
  out.push('# Tools');
  out.push(
    'Concrete tools used to obtain evidence, more specific than a technique. ' +
      'Provenance entries reference these ids to record **what tools** produced ' +
      'a fact. Generated from `spec/tools/`.',
  );
  if (tools.length === 0) {
    out.push('_No tools registered yet._');
    return out.join('\n\n');
  }
  const head =
    '| Tool | Version | Techniques | Maintainer | Description |\n' +
    '| --- | --- | --- | --- | --- |';
  const rows = tools
    .slice()
    .sort((a, b) => a.data.id.localeCompare(b.data.id))
    .map(({ data }) => {
      const name = data.url
        ? `[${cell(data.name ?? data.id)}](${data.url})`
        : cell(data.name ?? data.id);
      const techniques = data.techniques?.length
        ? data.techniques.map((t) => `\`${t}\``).join(', ')
        : '-';
      const maintainer = data.maintainer ? `@${data.maintainer}` : '-';
      return (
        `| ${name} | ${cell(data.version ?? '-')} | ${techniques} | ${maintainer} | ` +
        `${cell(data.description ?? '')} |`
      );
    });
  out.push([head, ...rows].join('\n'));
  out.push('[Back to spec overview](./index.md)');
  return out.join('\n\n');
}

function renderFlavors(flavors: ReturnType<typeof loadFlavors>): string {
  const out: string[] = [];
  out.push('# Flavors');
  out.push(
    'Independent reimplementations of the call protocol — libraries and ports ' +
      'that realize the spec in real code. A flavor is **not** an ' +
      'evidence-gathering tool: a tool produces a fact, a flavor *corroborates* ' +
      'the spec by implementing it. `provenance.flavors` cites these ids — a ' +
      'flavor is a corroborating source, never a technique, and it does not ' +
      'corroborate a flavor it derives from. Generated from `spec/flavors/`.',
  );
  if (flavors.length === 0) {
    out.push('_No flavors registered yet._');
    return out.join('\n\n');
  }
  const head =
    '| Flavor | Language | Maturity | Covers | Derives from | Maintainer | Description |\n' +
    '| --- | --- | --- | --- | --- | --- | --- |';
  const rows = flavors
    .slice()
    .sort((a, b) => a.data.id.localeCompare(b.data.id))
    .map(({ data }) => {
      const name = data.url
        ? `[${cell(data.name ?? data.id)}](${data.url})`
        : cell(data.name ?? data.id);
      const covers = data.covers?.length
        ? data.covers.map((c) => `\`${c}\``).join(', ')
        : '-';
      const derives = data.derives_from?.length
        ? data.derives_from.map((d) => `\`${d}\``).join(', ')
        : '-';
      const maint = data.maintainer ? `@${data.maintainer}` : '-';
      return (
        `| ${name} | ${cell(data.language ?? '-')} | ${cell(data.maturity ?? '-')} | ` +
        `${covers} | ${derives} | ${maint} | ${cell(data.description ?? '')} |`
      );
    });
  out.push([head, ...rows].join('\n'));
  out.push(
    'See the [implementation map](./flavor-map.md) for where each flavor realizes the spec in code.',
  );
  out.push('[Back to spec overview](./index.md)');
  return out.join('\n\n');
}

/** Label a flavor-map entry's spec target, linking node refs where they exist. */
function specBitLabel(spec: FlavorMapEntry['spec'] | undefined): string {
  if (!spec) return '-';
  if (spec.stanza) return `stanza [\`${spec.stanza}\`](./stanzas/${spec.stanza}.md)`;
  if (spec.flow) return `flow [\`${spec.flow}\`](./flows/${spec.flow}.md)`;
  if (spec.enum) return `enum \`${spec.enum}\``;
  if (spec.module) return `${spec.area ? spec.area + ' · ' : ''}\`${spec.module}\``;
  if (spec.label) return spec.label;
  if (spec.area) return spec.area;
  return '-';
}

function renderFlavorMap(
  flavors: ReturnType<typeof loadFlavors>,
  maps: ReturnType<typeof loadFlavorMaps>,
): string {
  const out: string[] = [];
  out.push('# Implementation map');
  out.push(
    'The inverse of the code-to-reference `// Source of truth:` comment: for each ' +
      'flavor, **where each bit of the spec is realized in real code**. Each row ' +
      'pairs a spec bit with a code permalink and the vector that validates it. ' +
      'Generated from `spec/flavors/*.map.yaml`.',
  );
  const byFlavor = new Map(maps.map((m) => [m.data.flavor, m.data] as const));
  const sorted = flavors.slice().sort((a, b) => a.data.id.localeCompare(b.data.id));
  if (sorted.length === 0) {
    out.push('_No flavors registered yet._');
    return out.join('\n\n');
  }
  for (const { data: flavor } of sorted) {
    out.push(`## ${flavor.name ?? flavor.id}`);
    const entries = byFlavor.get(flavor.id)?.entries ?? [];
    if (entries.length === 0) {
      const covers = flavor.covers?.length
        ? flavor.covers.map((c) => `\`${c}\``).join(', ')
        : '_none declared_';
      out.push(
        `No per-bit map yet. Declared coverage (plane level): ${covers}. A flavor ` +
          `adds \`spec/flavors/${flavor.id}.map.yaml\` to record exact code permalinks.`,
      );
      continue;
    }
    const head =
      '| Spec bit | Status | Validated by | Confidence | Code |\n' +
      '| --- | --- | --- | --- | --- |';
    const rows = entries.map((e) => {
      const status = e.validation?.status ?? '-';
      const kat = e.validation?.kat ? `\`${e.validation.kat}\`` : '-';
      const conf = e.confidence ?? '-';
      const codeText = e.code?.symbol ? `\`${e.code.symbol}\`` : 'source';
      const code = e.code?.url ? `[${codeText}](${e.code.url})` : codeText;
      return `| ${cell(specBitLabel(e.spec))} | ${cell(status)} | ${kat} | ${cell(conf)} | ${code} |`;
    });
    out.push([head, ...rows].join('\n'));
  }
  out.push('[Back to spec overview](./index.md)');
  return out.join('\n\n');
}

// ---------------------------------------------------------------------------
// RFC: small YAML parts compiled into one ever-scrolling page + per-part pages.
// ---------------------------------------------------------------------------

function rfcSorted(parts: ReturnType<typeof loadRfcParts>): RfcPart[] {
  const order = (c: string) => (RFC_CATEGORIES as readonly string[]).indexOf(c);
  return parts
    .map((p) => p.data)
    .slice()
    .sort((a, b) => {
      const c = order(a.category) - order(b.category);
      if (c) return c;
      const o = (a.order ?? 999) - (b.order ?? 999);
      if (o) return o;
      return a.id.localeCompare(b.id);
    });
}

function rfcImplTable(part: RfcPart, toFlavors: string): string {
  if (!part.implementations?.length) return '_No known implementations yet._';
  const head = '| Flavor | Status | Note |\n| --- | --- | --- |';
  const rows = part.implementations.map(
    (i) => `| [\`${cell(i.flavor)}\`](${toFlavors}) | ${cell(i.status)} | ${cell(i.note ?? '')} |`,
  );
  return [head, ...rows].join('\n');
}

/** Rewrite ergonomic `](part-id)` cross-refs to the correct anchor/page link. */
function rfcResolveRefs(
  md: string,
  partIds: Set<string>,
  linkRequire: (id: string) => string,
): string {
  return md.replace(/\]\(([a-z0-9][a-z0-9-]*)\)/g, (m, id) =>
    partIds.has(id) ? `](${linkRequire(id)})` : m,
  );
}

/** Shared body for a part, used by both the compiled page and the lookup page. */
function rfcBody(
  part: RfcPart,
  ctx: { toFlavors: string; linkRequire: (id: string) => string; partIds: Set<string> },
): string {
  const ref = (md: string) => rfcResolveRefs(md, ctx.partIds, ctx.linkRequire);
  const out: string[] = [];
  const meta = [`**\`${part.id}\`**`, `status: ${part.status ?? 'draft'}`];
  if (part.features?.length) meta.push(`features: ${part.features.join(', ')}`);
  if (part.since) meta.push(`since: ${part.since}`);
  out.push(meta.join(' · '));
  out.push(ref(part.summary.trim()));
  if (part.normative?.trim()) {
    out.push('**Normative**');
    out.push(ref(part.normative.trimEnd()));
  }
  if (part.findings?.trim()) {
    out.push('**Findings**');
    out.push(ref(part.findings.trimEnd()));
  }
  if (part.requires?.length) {
    out.push(
      '**Requires:** ' +
        part.requires.map((d) => `[\`${d}\`](${ctx.linkRequire(d)})`).join(', '),
    );
  }
  out.push('**Implemented by**');
  out.push(rfcImplTable(part, ctx.toFlavors));
  if (part.open_questions?.length) {
    out.push('**Open questions**');
    out.push(list(part.open_questions));
  }
  if (part.references?.length) {
    out.push('**References**');
    out.push(
      part.references
        .map((r) => (r.url ? `- [${r.title ?? r.url}](${r.url})` : `- ${r.title ?? ''}`))
        .join('\n'),
    );
  }
  return out.join('\n\n');
}

function rfcGroupByCategory(sorted: RfcPart[]): Map<RfcCategory, RfcPart[]> {
  const byCat = new Map<RfcCategory, RfcPart[]>();
  for (const p of sorted) {
    const arr = byCat.get(p.category) ?? [];
    arr.push(p);
    byCat.set(p.category, arr);
  }
  return byCat;
}

function renderRfcIndex(parts: ReturnType<typeof loadRfcParts>): string {
  const sorted = rfcSorted(parts);
  const byCat = rfcGroupByCategory(sorted);
  const partIds = new Set(sorted.map((p) => p.id));
  const out: string[] = [];
  out.push('# WhatsApp Calls — the RFC');
  out.push(
    'The normative specification of the WhatsApp call stack, compiled from ' +
      '`spec/rfc/`. Each section is citable by its stable id (e.g. `call-offer`); ' +
      'implement to these descriptions to interoperate. Every section also has its ' +
      'own lookup page, and libraries follow changes via the [feed](./feed.json) ' +
      '(see [updates](./updates.md)).',
  );
  out.push(
    '!!! warning "Work in progress"\n' +
      '    Sections marked `draft`, or carrying open questions, are not yet pinned ' +
      'to the wire. Trust the status badge and the `Implemented by` table over the ' +
      'prose.',
  );

  out.push('## Contents');
  const toc: string[] = [];
  for (const cat of RFC_CATEGORIES) {
    const ps = byCat.get(cat);
    if (!ps?.length) continue;
    toc.push(`- **[${RFC_CATEGORY_META[cat].label}](#${cat})**`);
    for (const p of ps) toc.push(`    - [${cell(p.title)}](#${p.id}) · \`${p.id}\``);
  }
  out.push(toc.join('\n'));

  for (const cat of RFC_CATEGORIES) {
    const ps = byCat.get(cat);
    if (!ps?.length) continue;
    out.push(`<a id="${cat}"></a>`);
    out.push(`## ${RFC_CATEGORY_META[cat].label}`);
    out.push(RFC_CATEGORY_META[cat].blurb);
    for (const p of ps) {
      out.push(`<a id="${p.id}"></a>`);
      out.push(`### ${cell(p.title)}`);
      out.push(rfcBody(p, { toFlavors: '../flavors.md', linkRequire: (id) => `#${id}`, partIds }));
      out.push(`[lookup page →](./${p.category}/${p.id}.md) · [↑ contents](#contents)`);
      out.push('---');
    }
  }
  return out.join('\n\n');
}

function renderRfcPartPage(part: RfcPart, partById: Map<string, RfcPart>): string {
  const out: string[] = [];
  out.push(`# ${part.title}`);
  out.push(
    `**Category:** [${RFC_CATEGORY_META[part.category]?.label ?? part.category}](../index.md#${part.category})  \n` +
      `**Part id:** \`${part.id}\``,
  );
  out.push(
    rfcBody(part, {
      toFlavors: '../../flavors.md',
      partIds: new Set(partById.keys()),
      linkRequire: (id) => {
        const d = partById.get(id);
        return d ? `../${d.category}/${d.id}.md` : `../index.md#${id}`;
      },
    }),
  );
  out.push('---');
  out.push(`[in the full RFC →](../index.md#${part.id}) · [RFC contents](../index.md#contents)`);
  return out.join('\n\n');
}

/** The pull feed: a poll-able JSON of every part + which flavors implement it. */
function renderRfcFeed(parts: ReturnType<typeof loadRfcParts>, flavorIds: string[]): string {
  const sorted = rfcSorted(parts);
  const partObjs = sorted.map((p) => ({
    id: p.id,
    category: p.category,
    title: p.title,
    status: p.status ?? 'draft',
    since: p.since ?? null,
    features: p.features ?? [],
    implementations: (p.implementations ?? []).map((i) => ({ flavor: i.flavor, status: i.status })),
    ref: `rfc/index.md#${p.id}`,
  }));
  const byFlavor: Record<string, string[]> = {};
  for (const id of flavorIds) byFlavor[id] = [];
  for (const p of sorted) {
    for (const i of p.implementations ?? []) {
      (byFlavor[i.flavor] ??= []).push(p.id);
    }
  }
  return (
    JSON.stringify(
      {
        spec: 'wacrg',
        version: SPEC_VERSION,
        note: 'Pull feed. Poll this file; the parts a flavor implements are under flavors.<id>. Diff across versions to follow updates.',
        parts: partObjs,
        flavors: byFlavor,
      },
      null,
      2,
    ) + '\n'
  );
}

function renderRfcUpdates(parts: ReturnType<typeof loadRfcParts>): string {
  const sorted = rfcSorted(parts);
  const out: string[] = [];
  out.push('# RFC updates');
  out.push(
    'How libraries follow the spec. **Pull:** poll [`feed.json`](./feed.json) — it ' +
      'lists every part, its `since` version, and the flavors that implement it; ' +
      'diff across versions to see what changed in the parts you implement. ' +
      '**Push (opt-in):** a flavor that sets `notify_repo` + `notify_opt_in: true` ' +
      'in its `spec/flavors/<id>.yaml` gets a tracking issue opened in its repo when ' +
      'a part it implements changes.',
  );
  out.push('## Parts by version');
  const byVer = new Map<string, RfcPart[]>();
  for (const p of sorted) {
    const v = p.since ?? '(unversioned)';
    const arr = byVer.get(v) ?? [];
    arr.push(p);
    byVer.set(v, arr);
  }
  for (const [ver, ps] of [...byVer.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
    out.push(`### ${ver}`);
    out.push(
      ps
        .map((p) => `- [\`${p.id}\`](./index.md#${p.id}) — ${cell(p.title)} (${p.category}, ${p.status ?? 'draft'})`)
        .join('\n'),
    );
  }
  out.push('[Back to spec overview](../index.md)');
  return out.join('\n\n');
}

function renderGlossary(): string {
  const glossary = loadGlossary();
  const out: string[] = [];
  out.push('# Glossary');
  out.push('Shared vocabulary for the WhatsApp calls protocol. Generated from `spec/glossary.yaml`.');
  const terms = glossary?.data.terms ?? [];
  if (terms.length === 0) {
    out.push('_No terms defined yet._');
  } else {
    const head = '| Term | Definition |\n| --- | --- |';
    const rows = terms
      .slice()
      .sort((a, b) => a.term.localeCompare(b.term))
      .map((t) => `| **${cell(t.term)}** | ${cell(t.definition)} |`);
    out.push([head, ...rows].join('\n'));
  }
  out.push('[Back to spec overview](./index.md)');
  return out.join('\n\n');
}

function renderOverview(counts: {
  rfcParts: number;
  stanzas: number;
  flows: number;
  enums: number;
  techniques: number;
  tools: number;
  flavors: number;
  contributors: number;
}): string {
  const out: string[] = [];
  out.push('# Specification overview');
  out.push(
    'This is the generated, human-readable view of the wacrg corpus, a ' +
      'machine-readable model of the WhatsApp 1:1 call protocol. Every page ' +
      'below is generated from YAML under `spec/`; do not edit the Markdown by ' +
      'hand.',
  );
  out.push(
    '!!! warning "Research scaffold, not authoritative truth"\n' +
      '    No real captures exist yet. Examples are synthetic and clearly ' +
      'labeled, and most facts carry `probable` or `speculative` confidence ' +
      'with open questions. Trust the confidence levels, not the prose.',
  );
  out.push('## Contents');
  out.push(
    `| Section | Count |\n| --- | --- |\n` +
      `| [**The RFC**](./rfc/index.md) — normative call-stack spec | ${counts.rfcParts} parts |\n` +
      `| [Stanzas](./stanzas/index.md) | ${counts.stanzas} |\n` +
      `| [Flows](./flows/index.md) | ${counts.flows} |\n` +
      `| [Enums](./enums.md) | ${counts.enums} |\n` +
      `| [Techniques](./techniques.md) | ${counts.techniques} |\n` +
      `| [Tools](./tools.md) | ${counts.tools} |\n` +
      `| [Flavors](./flavors.md) | ${counts.flavors} |\n` +
      `| [Implementation map](./flavor-map.md) | - |\n` +
      `| [Contributors](./contributors.md) | ${counts.contributors} |\n` +
      `| [Glossary](./glossary.md) | - |\n` +
      `| [Coverage](./coverage.md) | - |`,
  );
  out.push(
    '## How the spec is organized\n\n' +
      '- **Stanzas** describe individual WABinary nodes (tag, attributes, ' +
      'nested children) with per-fact provenance and confidence.\n' +
      '- **Flows** stitch stanzas into end-to-end signaling sequences with ' +
      'mermaid diagrams.\n' +
      '- **Enums** capture closed value sets (e.g. terminate reasons).\n' +
      '- **Techniques** document the reverse-engineering methods that back ' +
      'each fact; **Tools** and **Contributors** record what produced it and ' +
      'who submitted it.\n' +
      '- **Flavors** are independent reimplementations that corroborate the ' +
      'spec; the **Implementation map** records where each bit of the spec is ' +
      'realized in their code (the inverse of a code-to-reference pointer).\n' +
      '- **Coverage** quantifies how confirmed the spec currently is.',
  );
  return out.join('\n\n');
}

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------

const stanzas = loadStanzas();
const flows = loadFlows();
const enums = loadEnums();
const techniques = loadTechniques();
const contributors = loadContributors();
const tools = loadTools();
const flavors = loadFlavors();
const flavorMaps = loadFlavorMaps();
const rfcParts = loadRfcParts();

for (const { data } of stanzas) {
  write(`docs/spec/stanzas/${data.id}.md`, renderStanza(data));
}
write('docs/spec/stanzas/index.md', renderStanzaIndex(stanzas.map((s) => s.data)));

for (const { data } of flows) {
  write(`docs/spec/flows/${data.id}.md`, renderFlow(data));
}
write('docs/spec/flows/index.md', renderFlowIndex(flows.map((f) => f.data)));

write('docs/spec/enums.md', renderEnums(enums));
write('docs/spec/techniques.md', renderTechniques(techniques));
write('docs/spec/tools.md', renderTools(tools));
write('docs/spec/flavors.md', renderFlavors(flavors));
write('docs/spec/flavor-map.md', renderFlavorMap(flavors, flavorMaps));

// The RFC: one compiled page + a standalone lookup page per part + the pull feed.
write('docs/spec/rfc/index.md', renderRfcIndex(rfcParts));
const rfcPartById = new Map(rfcParts.map((p) => [p.data.id, p.data]));
for (const { data } of rfcParts) {
  write(`docs/spec/rfc/${data.category}/${data.id}.md`, renderRfcPartPage(data, rfcPartById));
}
write('docs/spec/rfc/updates.md', renderRfcUpdates(rfcParts));
writeRaw('docs/spec/rfc/feed.json', renderRfcFeed(rfcParts, flavors.map((f) => f.data.id)));

write('docs/spec/contributors.md', renderContributors(contributors));
write('docs/spec/glossary.md', renderGlossary());
write(
  'docs/spec/index.md',
  renderOverview({
    rfcParts: rfcParts.length,
    stanzas: stanzas.length,
    flows: flows.length,
    enums: enums.length,
    techniques: techniques.length,
    tools: tools.length,
    flavors: flavors.length,
    contributors: contributors.length,
  }),
);

console.log('Generated docs/spec from corpus:');
console.log(
  `  stanzas: ${stanzas.length}  flows: ${flows.length}  enums: ${enums.length}  ` +
    `techniques: ${techniques.length}  tools: ${tools.length}  ` +
    `flavors: ${flavors.length}  flavor-maps: ${flavorMaps.length}  ` +
    `contributors: ${contributors.length}`,
);
