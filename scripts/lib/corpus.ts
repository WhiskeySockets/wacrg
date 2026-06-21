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

/** Top-level spec divisions (distinct from the stanza `Category` area enum). */
export const SPEC_CATEGORIES = ['signalling', 'encodings', 'crypto', 'relay'] as const;
export type SpecCategory = (typeof SPEC_CATEGORIES)[number];

/** Human label + order for each spec category on the compiled page. */
export const SPEC_CATEGORY_META: Record<SpecCategory, { label: string; blurb: string }> = {
  signalling: { label: 'Signalling', blurb: 'Call control over the WABinary/XMPP transport: the <call> stanza family and feature signalling.' },
  encodings: { label: 'Encodings', blurb: 'Media codecs and payload formats: MLow, Opus, and video.' },
  crypto: { label: 'Crypto', blurb: 'Keying and media protection: SRTP (hop-by-hop and end-to-end), SFrame, WARP, group-call crypto.' },
  relay: { label: 'Relay', blurb: 'The media transport and relay stack: STUN, the relay handshake, RTP/RTCP framing, and the media loop.' },
};

// ---------------------------------------------------------------------------
// Canonical TypeScript shapes for the YAML corpus.
// ---------------------------------------------------------------------------

export interface Provenance {
  /** Which reverse-engineering technique(s) revealed this fact. */
  techniques?: string[];
  /** Specific tool ids used (see spec/tools/); more granular than techniques. */
  tools?: string[];
  /**
   * Flavor ids (independent reimplementations, see spec/flavors/) that
   * corroborate this fact. A flavor is a corroborating source, not a technique:
   * it does not by itself promote confidence, and it does not corroborate a
   * flavor it derives_from.
   */
  flavors?: string[];
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
  /** Flavor ids (independent reimplementations) this contributor maintains/works on. */
  flavors?: string[];
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

/**
 * An independent reimplementation (a "flavor") of the protocol: a library or
 * port that realizes the spec in real code. Distinct from a Tool — a tool
 * gathers evidence, a flavor corroborates the spec by implementing it.
 */
export interface Flavor {
  id: string;
  name?: string;
  url?: string;
  language?: string;
  maturity?: 'experimental' | 'partial' | 'working' | 'production';
  license?: string;
  maintainer?: string;
  status?: Status;
  /** Coarse protocol planes this flavor implements (the map gives per-bit detail). */
  covers?: Category[];
  /** Technique ids this flavor was reconstructed from (judges corroboration independence). */
  basis?: string[];
  /** Flavor ids this one was ported/derived from; it is not independent of these. */
  derives_from?: string[];
  /** owner/repo to notify when an implemented spec part changes (opt-in push). */
  notify_repo?: string;
  /** When true (with notify_repo), the spec-notify workflow opens issues there. */
  notify_opt_in?: boolean;
  description?: string;
}

/** One entry of a flavor's implementation map: a spec bit -> where it lives in code. */
export interface FlavorMapEntry {
  spec: {
    area?: Category;
    stanza?: string;
    flow?: string;
    enum?: string;
    module?: string;
    label?: string;
  };
  code: { url: string; symbol?: string; lines?: string };
  validation?: { kat?: string; status?: 'scaffolded' | 'implemented' | 'verified' };
  confidence?: Confidence;
  notes?: string;
}

/**
 * A flavor's implementation map (spec/flavors/<id>.map.yaml): the inverse
 * Source-of-truth — where each bit of the spec is realized in that flavor's code.
 */
export interface FlavorMap {
  flavor: string;
  entries?: FlavorMapEntry[];
}

/** A flavor's in-the-wild implementation status for one spec part (light, not a code map). */
export interface SpecImplementation {
  flavor: string;
  status: 'working' | 'partial' | 'planned' | 'unknown';
  note?: string;
  /** Primary source file in the flavor's repo (drives per-implementation history/blame links). */
  path?: string;
  /** Commit SHAs in the flavor's repo that implement/changed this part. */
  commits?: string[];
}

/** A contributor credited on a spec part. */
export interface PartContributor {
  contributor: string;
  note?: string;
}

/** A dated changelog entry for a spec part. */
export interface SpecChange {
  date: string;
  /** The WhatsApp Web client revision string the change was observed in, if known. */
  version?: string;
  note: string;
}

/**
 * One normative section of the spec (spec/<category>/<id>.yaml). Parts compile
 * into a single ever-scrolling page and each renders as its own lookup page; the
 * id is the permanent citable reference.
 */
export interface SpecPart {
  id: string;
  /** Small stable annotation id (e.g. ENC-04) embedded in flavor source as `wacrg:<code>`. */
  code: string;
  category: SpecCategory;
  title: string;
  status?: Status;
  order?: number;
  features?: string[];
  summary: string;
  normative?: string;
  findings?: string;
  /** Id of the parent part this nests under (same category) in the numbered hierarchy. */
  parent?: string;
  requires?: string[];
  implementations?: SpecImplementation[];
  /** Who contributed to this part. */
  contributors?: PartContributor[];
  since?: string;
  open_questions?: string[];
  references?: Reference[];
  /** Dated changelog entries, newest first. */
  changelog?: SpecChange[];
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

/**
 * Flavor identity files. The `*.map.yaml` glob overlaps `*.yaml`, so the map
 * files are filtered out here and loaded separately by loadFlavorMaps().
 */
export function loadFlavors(): Loaded<Flavor>[] {
  return loadDir<Flavor>('spec/flavors/*.yaml').filter(
    (f) => !f.relPath.endsWith('.map.yaml'),
  );
}

/** Per-flavor implementation maps (the inverse Source-of-truth). */
export function loadFlavorMaps(): Loaded<FlavorMap>[] {
  return loadDir<FlavorMap>('spec/flavors/*.map.yaml');
}

/** Spec parts, one file per id under spec/<category>/ (the four SPEC_CATEGORIES). */
export function loadSpecParts(): Loaded<SpecPart>[] {
  return loadDir<SpecPart>(`spec/{${SPEC_CATEGORIES.join(',')}}/*.yaml`);
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
