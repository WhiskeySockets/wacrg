/**
 * coverage.ts — quantify how confirmed the spec currently is.
 *
 * Walks every attribute and child across all stanzas, tallies counts by
 * confidence, and computes:
 *     coverage% = round( (confirmed + 0.5 * probable) / total * 100 )
 * It also breaks the score down by category (per stanza) and by technique
 * (per attribute provenance). Outputs:
 *     COVERAGE.md            (repo root)
 *     docs/spec/coverage.md  (identical content)
 *     docs/coverage-badge.json (shields.io endpoint object)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  TECHNIQUE_IDS,
  fromRoot,
  loadStanzas,
  walkAttributes,
  walkChildren,
  type Category,
  type Confidence,
} from './lib/corpus.ts';

const CONFIDENCE_KEYS: Confidence[] = ['confirmed', 'probable', 'speculative', 'unknown'];

interface Tally {
  confirmed: number;
  probable: number;
  speculative: number;
  unknown: number;
  total: number;
}

function emptyTally(): Tally {
  return { confirmed: 0, probable: 0, speculative: 0, unknown: 0, total: 0 };
}

function add(t: Tally, confidence: Confidence | undefined): void {
  const key: Confidence = confidence ?? 'unknown';
  t[key] += 1;
  t.total += 1;
}

/** coverage% = (confirmed + 0.5*probable) / total, rounded to an integer. */
function coveragePct(t: Tally): number {
  if (t.total === 0) return 0;
  return Math.round(((t.confirmed + 0.5 * t.probable) / t.total) * 100);
}

function badgeColor(pct: number): string {
  if (pct >= 67) return 'green';
  if (pct >= 34) return 'yellow';
  return 'orange';
}

// ---------------------------------------------------------------------------
// Tally the corpus.
// ---------------------------------------------------------------------------

const stanzas = loadStanzas();

const overall = emptyTally();
const byCategory = new Map<Category, Tally>();
const byTechnique = new Map<string, Tally>();

// Seed technique buckets so every fixed technique appears even at zero.
for (const id of TECHNIQUE_IDS) byTechnique.set(id, emptyTally());
const NO_TECHNIQUE = '(no technique)';
byTechnique.set(NO_TECHNIQUE, emptyTally());

function categoryTally(cat: Category): Tally {
  let t = byCategory.get(cat);
  if (!t) {
    t = emptyTally();
    byCategory.set(cat, t);
  }
  return t;
}

for (const { data: stanza } of stanzas) {
  const catTally = categoryTally(stanza.category);

  // Attributes are confidence-bearing facts.
  for (const { attribute } of walkAttributes(stanza)) {
    add(overall, attribute.confidence);
    add(catTally, attribute.confidence);

    const techniques = attribute.provenance?.techniques ?? [];
    if (techniques.length === 0) {
      add(byTechnique.get(NO_TECHNIQUE)!, attribute.confidence);
    } else {
      for (const tech of techniques) {
        if (!byTechnique.has(tech)) byTechnique.set(tech, emptyTally());
        add(byTechnique.get(tech)!, attribute.confidence);
      }
    }
  }

  // Children are confidence-bearing facts too (structure presence/shape).
  for (const { child } of walkChildren(stanza)) {
    add(overall, child.confidence);
    add(catTally, child.confidence);
  }
}

const overallPct = coveragePct(overall);

// ---------------------------------------------------------------------------
// Render the report (shared by COVERAGE.md and docs/spec/coverage.md).
// ---------------------------------------------------------------------------

function tallyRow(label: string, t: Tally): string {
  return (
    `| ${label} | ${t.confirmed} | ${t.probable} | ${t.speculative} | ${t.unknown} | ` +
    `${t.total} | ${coveragePct(t)}% |`
  );
}

function buildReport(forDocs: boolean): string {
  const banner = forDocs
    ? '<!-- GENERATED FILE — do not edit by hand. Run `npm run coverage`. -->\n\n'
    : '<!-- GENERATED FILE — do not edit by hand. Run `npm run coverage`. -->\n\n';

  const lines: string[] = [];
  lines.push(banner.trimEnd());
  lines.push('# Spec coverage');
  lines.push('');
  lines.push(
    'Coverage is a weighted measure of how confirmed the corpus is, computed ' +
      'over every attribute and child across all stanzas:',
  );
  lines.push('');
  lines.push('> `coverage% = (confirmed + 0.5 × probable) / total`');
  lines.push('');
  lines.push(
    'It is a progress signal for the research speedrun, not a quality score — ' +
      'a low number is expected and honest while captures are still scarce.',
  );
  lines.push('');
  lines.push(`**Overall coverage: ${overallPct}%** across ${overall.total} documented facts.`);
  lines.push('');

  lines.push('## Overall');
  lines.push('');
  lines.push('| Scope | Confirmed | Probable | Speculative | Unknown | Total | Coverage |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  lines.push(tallyRow('All facts', overall));
  lines.push('');

  lines.push('## By category');
  lines.push('');
  lines.push('| Category | Confirmed | Probable | Speculative | Unknown | Total | Coverage |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  const cats = [...byCategory.keys()].sort();
  if (cats.length === 0) {
    lines.push('| _none_ | 0 | 0 | 0 | 0 | 0 | 0% |');
  } else {
    for (const cat of cats) lines.push(tallyRow(cat, byCategory.get(cat)!));
  }
  lines.push('');

  lines.push('## By technique');
  lines.push('');
  lines.push(
    'Each row counts the attributes whose provenance cites that technique ' +
      '(an attribute confirmed by several techniques is counted under each).',
  );
  lines.push('');
  lines.push('| Technique | Confirmed | Probable | Speculative | Unknown | Total | Coverage |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  // Fixed techniques first (in contract order), then any extras, then no-technique.
  const techOrder = [...TECHNIQUE_IDS];
  for (const tech of techOrder) {
    lines.push(tallyRow(tech, byTechnique.get(tech)!));
  }
  for (const [tech, t] of byTechnique) {
    if (techOrder.includes(tech as (typeof TECHNIQUE_IDS)[number])) continue;
    if (tech === NO_TECHNIQUE) continue;
    lines.push(tallyRow(tech, t));
  }
  lines.push(tallyRow(NO_TECHNIQUE, byTechnique.get(NO_TECHNIQUE)!));
  lines.push('');

  if (forDocs) {
    lines.push('[Back to spec overview](./index.md)');
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Write outputs.
// ---------------------------------------------------------------------------

function write(relPath: string, body: string): void {
  const abs = fromRoot(relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body.endsWith('\n') ? body : body + '\n', 'utf8');
}

write('COVERAGE.md', buildReport(false));
write('docs/spec/coverage.md', buildReport(true));

const badge = {
  schemaVersion: 1,
  label: 'spec coverage',
  message: `${overallPct}%`,
  color: badgeColor(overallPct),
};
write('docs/coverage-badge.json', JSON.stringify(badge, null, 2) + '\n');

console.log(`Spec coverage: ${overallPct}% over ${overall.total} facts.`);
for (const key of CONFIDENCE_KEYS) {
  console.log(`  ${key.padEnd(12)} ${overall[key]}`);
}
