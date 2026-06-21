/**
 * ingest-flavor.ts: turn a flavor-registration Issue Form submission into a
 * spec/flavors/<id>.yaml (and, when coverage rows are supplied, a sibling
 * <id>.map.yaml — the inverse Source-of-truth).
 *
 * Reads ISSUE_NUMBER / ISSUE_TITLE / ISSUE_BODY / ISSUE_AUTHOR from the env. The
 * body is GitHub Issue Form output: each field renders as `### <Heading>`
 * followed by the value. We split on those headings (defined by the GITHUB
 * CONFIG CONTRACT in .github/ISSUE_TEMPLATE/flavor_registration.yml) and map them
 * onto the Flavor shape. The submitter's GitHub login is stamped as maintainer —
 * a vendor attaches itself to the spec, GitHub-authenticated.
 *
 * This produces a draft for review; a maintainer confirms accuracy and merges.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import {
  TECHNIQUE_IDS,
  fromRoot,
  type Flavor,
  type FlavorMap,
  type FlavorMapEntry,
} from './lib/corpus.ts';

// The exact section headings produced by flavor_registration.yml.
const HEADINGS = {
  ID: 'Flavor id',
  NAME: 'Display name',
  URL: 'Repository URL',
  LANGUAGE: 'Language',
  MATURITY: 'Maturity',
  LICENSE: 'License (SPDX)',
  COVERS: 'Planes covered',
  BASIS: 'Reconstructed from (techniques)',
  DERIVES: 'Derives from (flavors)',
  DESCRIPTION: 'Description',
  COVERAGE: 'Coverage map',
} as const;

const CATEGORIES = ['signaling', 'keying', 'media', 'transport'] as const;
const LANGUAGES = [
  'go', 'rust', 'typescript', 'javascript', 'python', 'c', 'cpp', 'java', 'kotlin', 'swift', 'other',
] as const;
const MATURITIES = ['experimental', 'partial', 'working', 'production'] as const;
const MAP_STATUSES = ['scaffolded', 'implemented', 'verified'] as const;

const NO_RESPONSE = /^_no response_$/i;

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '' || NO_RESPONSE.test(value.trim());
}

/** Split an Issue Form body into { heading -> value } sections by `^### `. */
function parseSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const normalized = body.replace(/\r\n/g, '\n');
  for (const part of normalized.split(/^### /m).slice(1)) {
    const nl = part.indexOf('\n');
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim();
    const value = (nl === -1 ? '' : part.slice(nl + 1)).trim();
    sections.set(heading.toLowerCase(), value);
  }
  return sections;
}

function get(sections: Map<string, string>, heading: string): string | undefined {
  const value = sections.get(heading.toLowerCase());
  return isBlank(value) ? undefined : value;
}

/** Split a comma/newline list; lowercased, de-bulleted, de-duplicated. */
function parseList(value: string | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const raw of value.split(/[\n,]/)) {
    const item = raw.replace(/^[-*]\s*/, '').trim().toLowerCase();
    if (item) seen.add(item);
  }
  return [...seen];
}

/** Coerce a free-text value to one of an allowed set, else undefined. */
function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  const lowered = (value ?? '').trim().toLowerCase();
  return allowed.find((a) => a === lowered);
}

/**
 * Parse the optional "Coverage map" section into FlavorMap entries. Each line is
 * pipe-delimited: `area | module | code-url | symbol | kat | status`. area and
 * code-url are required for a row to be emitted; the rest are optional.
 */
function parseCoverage(value: string | undefined): FlavorMapEntry[] {
  if (!value) return [];
  const entries: FlavorMapEntry[] = [];
  for (const rawLine of value.split('\n')) {
    const line = rawLine.replace(/^[-*]\s*/, '').trim();
    if (!line || line.startsWith('#') || /^area\s*\|/i.test(line)) continue;
    const cols = line.split('|').map((c) => c.trim());
    const [area, moduleName, url, symbol, kat, status] = cols;
    if (!url || !/^https?:\/\//.test(url)) continue;
    const spec: FlavorMapEntry['spec'] = {};
    const cat = oneOf(area, CATEGORIES);
    if (cat) spec.area = cat;
    if (moduleName) spec.module = moduleName;
    if (!cat && !moduleName) spec.label = area || 'unspecified';
    const entry: FlavorMapEntry = { spec, code: { url } };
    if (symbol) entry.code.symbol = symbol;
    const st = oneOf(status, MAP_STATUSES);
    if (kat || st) entry.validation = { ...(kat ? { kat } : {}), ...(st ? { status: st } : {}) };
    entries.push(entry);
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Build the flavor (and optional map).
// ---------------------------------------------------------------------------

const issueNumber = (process.env.ISSUE_NUMBER ?? '').trim() || 'unknown';
const sections = parseSections(process.env.ISSUE_BODY ?? '');
const maintainer = (process.env.ISSUE_AUTHOR ?? '').trim() || undefined;

const rawId = (get(sections, HEADINGS.ID) ?? '').trim().toLowerCase();
const id = rawId.replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
  console.error(`ingest-flavor: invalid or missing flavor id (got "${rawId}")`);
  process.exit(1);
}

const covers = parseList(get(sections, HEADINGS.COVERS)).filter(
  (c): c is (typeof CATEGORIES)[number] => (CATEGORIES as readonly string[]).includes(c),
);
const basis = parseList(get(sections, HEADINGS.BASIS)).filter((t) =>
  (TECHNIQUE_IDS as readonly string[]).includes(t),
);
const derivesFrom = parseList(get(sections, HEADINGS.DERIVES));

const flavor: Flavor = {
  id,
  ...(get(sections, HEADINGS.NAME) ? { name: get(sections, HEADINGS.NAME) } : {}),
  ...(get(sections, HEADINGS.URL) ? { url: get(sections, HEADINGS.URL) } : {}),
  ...(oneOf(get(sections, HEADINGS.LANGUAGE), LANGUAGES)
    ? { language: oneOf(get(sections, HEADINGS.LANGUAGE), LANGUAGES) }
    : {}),
  ...(oneOf(get(sections, HEADINGS.MATURITY), MATURITIES)
    ? { maturity: oneOf(get(sections, HEADINGS.MATURITY), MATURITIES) }
    : {}),
  ...(get(sections, HEADINGS.LICENSE) ? { license: get(sections, HEADINGS.LICENSE) } : {}),
  ...(maintainer ? { maintainer } : {}),
  status: 'draft',
  ...(covers.length ? { covers } : {}),
  ...(basis.length ? { basis } : {}),
  ...(derivesFrom.length ? { derives_from: derivesFrom } : {}),
  ...(get(sections, HEADINGS.DESCRIPTION) ? { description: get(sections, HEADINGS.DESCRIPTION) } : {}),
};

const flavorHeader =
  '# Generated from a flavor-registration Issue Form by scripts/ingest-flavor.ts.\n' +
  '# A maintainer reviews accuracy (maturity, derives_from, basis) before merging.\n';
const flavorPath = `spec/flavors/${id}.yaml`;
writeFileSync(fromRoot(flavorPath), flavorHeader + stringifyYaml(flavor, { lineWidth: 0 }), 'utf8');
console.log(flavorPath);

const coverage = parseCoverage(get(sections, HEADINGS.COVERAGE));
if (coverage.length) {
  const map: FlavorMap = { flavor: id, entries: coverage };
  const mapHeader =
    `# Generated from issue #${issueNumber} by scripts/ingest-flavor.ts.\n` +
    '# The inverse Source-of-truth: where each spec bit lives in this flavor.\n' +
    '# Review permalinks (pin to a commit SHA) and validation before merging.\n';
  const mapPath = `spec/flavors/${id}.map.yaml`;
  mkdirSync(dirname(fromRoot(mapPath)), { recursive: true });
  writeFileSync(fromRoot(mapPath), mapHeader + stringifyYaml(map, { lineWidth: 0 }), 'utf8');
  console.log(mapPath);
}
