/**
 * Shared corpus-loading helpers for the wacrg tooling.
 *
 * Every script (validate / generate-docs / coverage) imports from here so the
 * on-disk shapes are parsed and typed in exactly one place. Paths are resolved
 * relative to the repository root regardless of the current working directory.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import { parse as parseYaml } from 'yaml';

// ---------------------------------------------------------------------------
// Shared enums (kept in sync with the SHARED CONTRACT).
// ---------------------------------------------------------------------------

export type Confidence = 'confirmed' | 'probable' | 'speculative' | 'unknown';
export type Status = 'draft' | 'review' | 'stable' | 'deprecated';
export type Category = 'signaling' | 'keying' | 'media' | 'transport';
export type Direction = 'outgoing' | 'incoming' | 'bidirectional';

/** The fixed set of reverse-engineering technique ids. */
export const TECHNIQUE_IDS = [
  'websocket-capture',
  'baileys-instrumentation',
  'frida-hooking',
  'mitm-tls',
  'static-smali-analysis',
  'memory-dump',
  'wasm-analysis',
] as const;
export type TechniqueId = (typeof TECHNIQUE_IDS)[number];

export const SPEC_VERSION = '0.1.0';

// ---------------------------------------------------------------------------
// Canonical TypeScript shapes for the YAML corpus.
// ---------------------------------------------------------------------------

export interface Provenance {
  /** Which reverse-engineering technique(s) revealed this fact. */
  techniques?: string[];
  /** Specific tool ids used (see spec/tools/); more granular than techniques. */
  tools?: string[];
  /** Contributor ids who observed/submitted this fact (see spec/contributors/). */
  contributors?: string[];
  /** Issue/PR/commit references that back the claim: the proof trail. */
  sources?: string[];
}

export interface Attribute {
  name: string;
  type: string; // string|int|hex|bytes|bool|jid|timestamp|enum:<enum-id>
  required?: boolean;
  confidence?: Confidence;
  description?: string;
  observed_values?: Array<string | number | boolean>;
  provenance?: Provenance;
}

export interface Child {
  tag: string;
  occurrence?: string; // "1" | "0..1" | "0..n" | "1..n"
  confidence?: Confidence;
  description?: string;
  provenance?: Provenance;
  attributes?: Attribute[];
  children?: Child[];
}

export interface Example {
  title?: string;
  note?: string;
  format?: 'xml' | 'hex' | 'json';
  body?: string;
}

export interface Reference {
  title?: string;
  url?: string;
}

export interface Stanza {
  id: string;
  tag: string;
  display_name?: string;
  category: Category;
  direction?: Direction[];
  status?: Status;
  spec_version?: string;
  summary?: string;
  attributes?: Attribute[];
  children?: Child[];
  examples?: Example[];
  notes?: string;
  open_questions?: string[];
  references?: Reference[];
}

export interface FlowParticipant {
  id: string;
  label?: string;
}

export interface FlowStep {
  from: string;
  to: string;
  stanza?: string;
  label?: string;
  confidence?: Confidence;
  note?: string;
}

export interface Flow {
  id: string;
  title?: string;
  status?: Status;
  spec_version?: string;
  summary?: string;
  participants?: FlowParticipant[];
  steps?: FlowStep[];
  open_questions?: string[];
}

export interface EnumValue {
  value: string;
  confidence?: Confidence;
  description?: string;
}

export interface EnumDef {
  id: string;
  title?: string;
  status?: Status;
  summary?: string;
  values?: EnumValue[];
}

export interface Technique {
  id: string;
  title?: string;
  status?: Status;
  maturity?: 'established' | 'emerging' | 'experimental';
  summary?: string;
  targets?: Category[];
  strengths?: string[];
  limitations?: string[];
  tooling?: string[];
  maintainers?: string[];
  guide?: string;
  references?: Reference[];
}

/** A researcher who contributes to the spec. id is typically their GitHub handle. */
export interface Contributor {
  id: string;
  name?: string;
  github?: string;
  affiliation?: string;
  techniques?: string[];
  tools?: string[];
  links?: Reference[];
}

/** A concrete tool used to obtain evidence (more specific than a technique). */
export interface Tool {
  id: string;
  name?: string;
  version?: string;
  url?: string;
  techniques?: string[];
  maintainer?: string;
  description?: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface Glossary {
  terms?: GlossaryTerm[];
}

export interface CaptureSource {
  technique: string;
  issue?: number;
  contributor?: string;
  captured_at?: string;
  tools?: string[];
}

export interface CaptureAttribute {
  name?: string;
  value?: string;
  note?: string;
}

export interface Capture {
  id: string;
  title?: string;
  status?: Status;
  source: CaptureSource;
  stanza_tag?: string;
  direction?: Direction;
  confidence?: Confidence;
  raw?: { format?: string; body?: string };
  decoded?: string;
  attributes?: CaptureAttribute[];
  notes?: string;
  sanitized?: boolean;
}

/** A parsed file together with its absolute path (handy for error reports). */
export interface Loaded<T> {
  path: string;
  relPath: string;
  data: T;
}

// ---------------------------------------------------------------------------
// Path resolution. scripts/lib/corpus.ts -> repo root is two levels up.
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, '..', '..');

/** Resolve a path fragment relative to the repository root. */
export function fromRoot(...parts: string[]): string {
  return resolve(REPO_ROOT, ...parts);
}

// ---------------------------------------------------------------------------
// Generic file loaders.
// ---------------------------------------------------------------------------

/** Read + parse a single YAML file relative to the repo root. */
export function readYaml<T>(absPath: string): T {
  const text = readFileSync(absPath, 'utf8');
  return parseYaml(text) as T;
}

/** Read a JSON Schema file (relative to repo root) as a plain object. */
export function readSchema(relPath: string): Record<string, unknown> {
  const text = readFileSync(fromRoot(relPath), 'utf8');
  return JSON.parse(text) as Record<string, unknown>;
}

function relativeToRoot(absPath: string): string {
  return absPath.startsWith(REPO_ROOT + '/')
    ? absPath.slice(REPO_ROOT.length + 1)
    : absPath;
}

/** Glob YAML files under a directory (relative to root) and parse each one. */
export function loadDir<T>(globPattern: string): Loaded<T>[] {
  const matches = fg.sync(globPattern, {
    cwd: REPO_ROOT,
    absolute: true,
    onlyFiles: true,
    dot: false,
  });
  matches.sort();
  return matches.map((absPath) => ({
    path: absPath,
    relPath: relativeToRoot(absPath),
    data: readYaml<T>(absPath),
  }));
}

// ---------------------------------------------------------------------------
// Typed corpus accessors.
// ---------------------------------------------------------------------------

export function loadStanzas(): Loaded<Stanza>[] {
  return loadDir<Stanza>('spec/stanzas/*.yaml');
}

export function loadFlows(): Loaded<Flow>[] {
  return loadDir<Flow>('spec/flows/*.yaml');
}

export function loadEnums(): Loaded<EnumDef>[] {
  return loadDir<EnumDef>('spec/enums/*.yaml');
}

export function loadTechniques(): Loaded<Technique>[] {
  return loadDir<Technique>('spec/techniques/*.yaml');
}

export function loadContributors(): Loaded<Contributor>[] {
  return loadDir<Contributor>('spec/contributors/*.yaml');
}

export function loadTools(): Loaded<Tool>[] {
  return loadDir<Tool>('spec/tools/*.yaml');
}

export function loadCaptures(): Loaded<Capture>[] {
  return loadDir<Capture>('corpus/captures/*.yaml');
}

/** The glossary is a single file; returns undefined if it does not exist. */
export function loadGlossary(): Loaded<Glossary> | undefined {
  const found = loadDir<Glossary>('spec/glossary.yaml');
  return found[0];
}

/**
 * Walk a stanza's attributes and children, yielding every attribute together
 * with the owning stanza and a dotted path describing where it lives. Used by
 * both the validator (enum:<id> checks) and the coverage tool.
 */
export function* walkAttributes(
  stanza: Stanza,
): Generator<{ attribute: Attribute; path: string }> {
  for (const attr of stanza.attributes ?? []) {
    yield { attribute: attr, path: `${stanza.tag}@${attr.name}` };
  }
  function* walkChildAttributes(
    children: Child[] | undefined,
    prefix: string,
  ): Generator<{ attribute: Attribute; path: string }> {
    for (const child of children ?? []) {
      const childPath = `${prefix}>${child.tag}`;
      for (const attr of child.attributes ?? []) {
        yield { attribute: attr, path: `${childPath}@${attr.name}` };
      }
      yield* walkChildAttributes(child.children, childPath);
    }
  }
  yield* walkChildAttributes(stanza.children, stanza.tag);
}

/**
 * Walk every child node (not attributes) of a stanza, depth-first, yielding
 * each child and its dotted path. Used by the coverage tool to count children
 * as confidence-bearing facts.
 */
export function* walkChildren(
  stanza: Stanza,
): Generator<{ child: Child; path: string }> {
  function* recurse(
    children: Child[] | undefined,
    prefix: string,
  ): Generator<{ child: Child; path: string }> {
    for (const child of children ?? []) {
      const childPath = `${prefix}>${child.tag}`;
      yield { child, path: childPath };
      yield* recurse(child.children, childPath);
    }
  }
  yield* recurse(stanza.children, stanza.tag);
}
