/**
 * ingest-issue.ts — turn a stanza-capture Issue Form submission into a corpus
 * capture YAML file.
 *
 * Reads ISSUE_NUMBER, ISSUE_TITLE, ISSUE_BODY from the environment. The body is
 * GitHub Issue Form output: each field renders as `### <Heading>` followed by
 * the value. We split on those headings and map the known headings (defined by
 * the GITHUB CONFIG CONTRACT, in order) onto the CAPTURE shape, then write
 * corpus/captures/issue-<n>.yaml with sanitized:true and status:draft.
 *
 * Missing sections are tolerated (omitted or given a safe placeholder).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { TECHNIQUE_IDS, fromRoot, type Capture } from './lib/corpus.ts';

// The exact section headings produced by .github/ISSUE_TEMPLATE/stanza_capture.yml.
const HEADINGS = {
  STANZA_TAG: 'Stanza tag',
  DIRECTION: 'Direction',
  CLIENT: 'Client / platform',
  TECHNIQUE: 'Capture technique',
  TOOLS: 'Tools used',
  CONFIDENCE: 'Confidence',
  RAW: 'Raw stanza',
  DECODED: 'Decoded structure',
  ATTRIBUTES: 'Observed attributes',
  PROVENANCE: 'Provenance',
  NOTES: 'Notes / open questions',
} as const;

/** GitHub renders an empty field as "_No response_"; treat it as absent. */
const NO_RESPONSE = /^_no response_$/i;

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '' || NO_RESPONSE.test(value.trim());
}

/**
 * Split an Issue Form body into { heading -> value } sections by `^### `.
 * Headings are matched case-insensitively against the known set later.
 */
function parseSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  // Normalize CRLF so the multiline regex behaves.
  const normalized = body.replace(/\r\n/g, '\n');
  const parts = normalized.split(/^### /m);
  // parts[0] is any preamble before the first heading; ignore it.
  for (const part of parts.slice(1)) {
    const newlineIdx = part.indexOf('\n');
    const heading = (newlineIdx === -1 ? part : part.slice(0, newlineIdx)).trim();
    const value = (newlineIdx === -1 ? '' : part.slice(newlineIdx + 1)).trim();
    sections.set(heading.toLowerCase(), value);
  }
  return sections;
}

function get(sections: Map<string, string>, heading: string): string | undefined {
  const value = sections.get(heading.toLowerCase());
  if (isBlank(value)) return undefined;
  return value;
}

/** Strip a fenced code block (```lang ... ```) down to its inner text. */
function unfence(value: string | undefined): { format?: string; body: string } | undefined {
  if (!value) return undefined;
  const fenceMatch = value.match(/^```([A-Za-z0-9_-]*)\n([\s\S]*?)\n?```$/m);
  if (fenceMatch) {
    const lang = fenceMatch[1]?.trim();
    return { format: lang || undefined, body: fenceMatch[2] ?? '' };
  }
  return { body: value };
}

/** Guess a raw format from the technique / content; default to xml. */
function inferRawFormat(declared: string | undefined, body: string | undefined): string {
  const allowed = new Set(['xml', 'hex', 'base64', 'json']);
  if (declared && allowed.has(declared.toLowerCase())) return declared.toLowerCase();
  if (body) {
    const trimmed = body.trim();
    if (/^[{[]/.test(trimmed)) return 'json';
    if (/^<[a-zA-Z]/.test(trimmed)) return 'xml';
    if (/^[0-9a-fA-F\s]+$/.test(trimmed) && trimmed.replace(/\s/g, '').length % 2 === 0) {
      return 'hex';
    }
  }
  return 'xml';
}

/** Map a free-text technique value onto the fixed technique id set. */
function normalizeTechnique(value: string | undefined): string {
  if (!value) return 'websocket-capture';
  const lowered = value.trim().toLowerCase();
  // Exact id match first.
  for (const id of TECHNIQUE_IDS) {
    if (lowered === id) return id;
  }
  // Otherwise look for an id whose words all appear, or a keyword hit.
  const keywordMap: Record<string, (typeof TECHNIQUE_IDS)[number]> = {
    websocket: 'websocket-capture',
    wabinary: 'websocket-capture',
    baileys: 'baileys-instrumentation',
    instrument: 'baileys-instrumentation',
    frida: 'frida-hooking',
    hook: 'frida-hooking',
    mitm: 'mitm-tls',
    tls: 'mitm-tls',
    proxy: 'mitm-tls',
    smali: 'static-smali-analysis',
    static: 'static-smali-analysis',
    decompile: 'static-smali-analysis',
    memory: 'memory-dump',
    dump: 'memory-dump',
    wasm: 'wasm-analysis',
    warden: 'wasm-analysis',
    emscripten: 'wasm-analysis',
    webassembly: 'wasm-analysis',
  };
  for (const [keyword, id] of Object.entries(keywordMap)) {
    if (lowered.includes(keyword)) return id;
  }
  return 'websocket-capture';
}

/** Split a comma/newline list of tool ids; lowercased and de-bulleted. */
function parseTools(value: string | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const raw of value.split(/[\n,]/)) {
    const id = raw.replace(/^[-*]\s*/, '').trim().toLowerCase();
    if (id) seen.add(id);
  }
  return [...seen];
}

/** Map free-text direction onto the enum; default outgoing. */
function normalizeDirection(value: string | undefined): Capture['direction'] {
  const lowered = (value ?? '').trim().toLowerCase();
  if (lowered.includes('incoming') || lowered.includes('inbound')) return 'incoming';
  if (lowered.includes('bidirectional') || lowered.includes('both')) return 'bidirectional';
  return 'outgoing';
}

/** Map free-text confidence onto the enum; default speculative. */
function normalizeConfidence(value: string | undefined): Capture['confidence'] {
  const lowered = (value ?? '').trim().toLowerCase();
  if (lowered.includes('confirmed')) return 'confirmed';
  if (lowered.includes('probable')) return 'probable';
  if (lowered.includes('speculative')) return 'speculative';
  if (lowered.includes('unknown')) return 'unknown';
  return 'speculative';
}

/** Parse the "Observed attributes" section into {name,value,note} entries. */
function parseAttributes(value: string | undefined): Capture['attributes'] {
  if (!value) return [];
  const out: NonNullable<Capture['attributes']> = [];
  for (const rawLine of value.split('\n')) {
    const line = rawLine.replace(/^[-*]\s*/, '').trim();
    if (!line) continue;
    // Accept "name = value", "name: value", or just "name". The capture schema
    // requires both name and value, so a bare name gets an empty-string value.
    const eq = line.match(/^([^=:]+)[=:]\s*(.+)$/);
    if (eq) {
      out.push({ name: eq[1].trim(), value: eq[2].trim() });
    } else {
      out.push({ name: line, value: '' });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Build the capture.
// ---------------------------------------------------------------------------

const issueNumberRaw = process.env.ISSUE_NUMBER ?? '';
const issueTitle = process.env.ISSUE_TITLE ?? '';
const issueBody = process.env.ISSUE_BODY ?? '';

const issueNumber = issueNumberRaw.trim() || 'unknown';
const sections = parseSections(issueBody);

const rawSection = unfence(get(sections, HEADINGS.RAW));
const rawDeclaredFormat = rawSection?.format;
const rawBody = rawSection?.body;

const decodedSection = unfence(get(sections, HEADINGS.DECODED));

const techniqueRaw = get(sections, HEADINGS.TECHNIQUE);
// The submitter's GitHub login (passed by the workflow) is recorded as the
// contributor — a GitHub-authenticated record of WHO contributed this capture.
const contributor = (process.env.ISSUE_AUTHOR ?? '').trim() || undefined;
const toolsList = parseTools(get(sections, HEADINGS.TOOLS));

const numericIssue = /^\d+$/.test(issueNumber) ? Number(issueNumber) : undefined;

const capture: Capture = {
  id: `issue-${issueNumber}`,
  title: issueTitle.trim() || `Stanza capture from issue #${issueNumber}`,
  status: 'draft',
  source: {
    technique: normalizeTechnique(techniqueRaw),
    ...(numericIssue !== undefined ? { issue: numericIssue } : {}),
    ...(contributor ? { contributor } : {}),
    ...(toolsList.length ? { tools: toolsList } : {}),
  },
  stanza_tag: get(sections, HEADINGS.STANZA_TAG) ?? 'call',
  direction: normalizeDirection(get(sections, HEADINGS.DIRECTION)),
  confidence: normalizeConfidence(get(sections, HEADINGS.CONFIDENCE)),
  raw: {
    format: inferRawFormat(rawDeclaredFormat, rawBody),
    body: rawBody ?? '',
  },
  sanitized: true,
};

const decoded = decodedSection?.body;
if (decoded) capture.decoded = decoded;

const attributes = parseAttributes(get(sections, HEADINGS.ATTRIBUTES));
if (attributes && attributes.length) capture.attributes = attributes;

// Fold the platform + provenance + notes sections into a single notes field so
// nothing the contributor reported is lost.
const noteParts: string[] = [];
const client = get(sections, HEADINGS.CLIENT);
if (client) noteParts.push(`Client / platform: ${client}`);
const provenance = get(sections, HEADINGS.PROVENANCE);
if (provenance) noteParts.push(`Provenance: ${provenance}`);
if (techniqueRaw) noteParts.push(`Reported technique: ${techniqueRaw}`);
const notes = get(sections, HEADINGS.NOTES);
if (notes) noteParts.push(`Notes / open questions: ${notes}`);
if (noteParts.length) capture.notes = noteParts.join('\n\n');

// ---------------------------------------------------------------------------
// Write the file.
// ---------------------------------------------------------------------------

const relPath = `corpus/captures/issue-${issueNumber}.yaml`;
const absPath = fromRoot(relPath);
mkdirSync(dirname(absPath), { recursive: true });

const header =
  '# Generated from a stanza-capture Issue Form submission by ' +
  'scripts/ingest-issue.ts.\n' +
  '# Review for accuracy and sanitization before merging. sanitized MUST stay true.\n';

const yaml = stringifyYaml(capture, { lineWidth: 0 });
writeFileSync(absPath, header + yaml, 'utf8');

console.log(absPath);
