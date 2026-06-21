/**
 * validate.ts: schema + referential-integrity validator for the wacrg corpus.
 *
 * Steps:
 *   1. Load every YAML file under spec/ and corpus/.
 *   2. Validate each against its JSON Schema (spec/schema/*.schema.json and
 *      corpus/schema/capture.schema.json) using ajv + ajv-formats.
 *   3. Check referential integrity:
 *        - provenance.techniques values exist as a technique id
 *        - capture.source.technique exists as a technique id
 *        - flow.steps[].stanza (when set) exists as a stanza id
 *        - attribute types of form enum:<id> reference an existing enum id
 *   4. Print a per-file report and exit 1 on any error, 0 on success.
 */
import { existsSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import {
  RFC_CATEGORIES,
  TECHNIQUE_IDS,
  fromRoot,
  loadCaptures,
  loadContributors,
  loadEnums,
  loadFlavorMaps,
  loadFlavors,
  loadFlows,
  loadRfcParts,
  loadStanzas,
  loadTechniques,
  loadTools,
  readSchema,
  readYaml,
  walkAttributes,
  walkChildren,
  type Attribute,
  type Contributor,
  type Flavor,
  type FlavorMap,
  type Loaded,
  type Provenance,
  type RfcPart,
  type Stanza,
  type Tool,
} from './lib/corpus.ts';

interface Problem {
  file: string;
  message: string;
}

const problems: Problem[] = [];
const warnings: Problem[] = [];

function fail(file: string, message: string): void {
  problems.push({ file, message });
}

function warn(file: string, message: string): void {
  warnings.push({ file, message });
}

// ---------------------------------------------------------------------------
// AJV setup. Each corpus kind maps to a schema file by convention.
// ---------------------------------------------------------------------------

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

interface SchemaKind {
  /** Human label used in reports. */
  label: string;
  /** Path (relative to repo root) of the schema file. */
  schemaPath: string;
}

const SCHEMAS: Record<string, SchemaKind> = {
  stanza: { label: 'stanza', schemaPath: 'spec/schema/stanza.schema.json' },
  flow: { label: 'flow', schemaPath: 'spec/schema/flow.schema.json' },
  enum: { label: 'enum', schemaPath: 'spec/schema/enum.schema.json' },
  technique: {
    label: 'technique',
    schemaPath: 'spec/schema/technique.schema.json',
  },
  contributor: {
    label: 'contributor',
    schemaPath: 'spec/schema/contributor.schema.json',
  },
  tool: {
    label: 'tool',
    schemaPath: 'spec/schema/tool.schema.json',
  },
  flavor: {
    label: 'flavor',
    schemaPath: 'spec/schema/flavor.schema.json',
  },
  flavorMap: {
    label: 'flavor-map',
    schemaPath: 'spec/schema/flavor-map.schema.json',
  },
  rfcPart: {
    label: 'rfc-part',
    schemaPath: 'spec/schema/rfc-part.schema.json',
  },
  glossary: {
    label: 'glossary',
    schemaPath: 'spec/schema/glossary.schema.json',
  },
  capture: {
    label: 'capture',
    schemaPath: 'corpus/schema/capture.schema.json',
  },
};

const validators = new Map<string, ValidateFunction | null>();

/** Compile (and cache) a validator for a corpus kind, or null if no schema. */
function getValidator(kind: keyof typeof SCHEMAS): ValidateFunction | null {
  if (validators.has(kind)) return validators.get(kind) ?? null;
  const { schemaPath } = SCHEMAS[kind];
  if (!existsSync(fromRoot(schemaPath))) {
    warn(schemaPath, `schema not found, skipping schema validation for ${kind}`);
    validators.set(kind, null);
    return null;
  }
  try {
    const schema = readSchema(schemaPath);
    const validate = ajv.compile(schema);
    validators.set(kind, validate);
    return validate;
  } catch (err) {
    fail(schemaPath, `failed to compile schema: ${(err as Error).message}`);
    validators.set(kind, null);
    return null;
  }
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors) return [];
  return errors.map((e) => {
    const where = e.instancePath || '(root)';
    return `${where} ${e.message ?? 'is invalid'}`;
  });
}

function validateFile(kind: keyof typeof SCHEMAS, file: Loaded<unknown>): void {
  const validate = getValidator(kind);
  if (!validate) return; // schema missing, already warned once
  const ok = validate(file.data);
  if (!ok) {
    for (const msg of formatAjvErrors(validate.errors)) {
      fail(file.relPath, msg);
    }
  }
}

// ---------------------------------------------------------------------------
// Load the corpus once; reuse for schema + integrity checks.
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
const captures = loadCaptures();

// Reference sets for integrity checks.
const techniqueIds = new Set<string>(techniques.map((t) => t.data.id));
const stanzaIds = new Set<string>(stanzas.map((s) => s.data.id));
const enumIds = new Set<string>(enums.map((e) => e.data.id));
const flowIds = new Set<string>(flows.map((f) => f.data.id));
const contributorIds = new Set<string>(contributors.map((c) => c.data.id));
const toolIds = new Set<string>(tools.map((t) => t.data.id));
const flavorIds = new Set<string>(flavors.map((f) => f.data.id));
const rfcPartIds = new Set<string>(rfcParts.map((p) => p.data.id));
const rfcCategories = new Set<string>(RFC_CATEGORIES);
const fixedTechniqueIds = new Set<string>(TECHNIQUE_IDS);

// During bootstrap the spec/techniques/ directory may not exist yet. When no
// technique files are present we still enforce the fixed technique vocabulary,
// but downgrade the "missing matching technique file" check to a warning so the
// corpus remains validatable while that directory is being authored.
const techniqueFilesPresent = techniques.length > 0;
const contributorsPresent = contributors.length > 0;
const toolsPresent = tools.length > 0;
const flavorsPresent = flavors.length > 0;

// ---------------------------------------------------------------------------
// Schema validation pass.
// ---------------------------------------------------------------------------

for (const f of stanzas) validateFile('stanza', f);
for (const f of flows) validateFile('flow', f);
for (const f of enums) validateFile('enum', f);
for (const f of techniques) validateFile('technique', f);
for (const f of contributors) validateFile('contributor', f);
for (const f of tools) validateFile('tool', f);
for (const f of flavors) validateFile('flavor', f);
for (const f of flavorMaps) validateFile('flavorMap', f);
for (const f of rfcParts) validateFile('rfcPart', f);
for (const f of captures) validateFile('capture', f);

// Validate the glossary file directly (single-file kind).
{
  const glossaryPath = fromRoot('spec/glossary.yaml');
  if (existsSync(glossaryPath)) {
    try {
      const glossary = readYaml<unknown>(glossaryPath);
      validateFile('glossary', {
        path: glossaryPath,
        relPath: 'spec/glossary.yaml',
        data: glossary,
      });
    } catch (err) {
      fail('spec/glossary.yaml', `could not load: ${(err as Error).message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Referential integrity pass.
// ---------------------------------------------------------------------------

function checkProvenance(
  relPath: string,
  where: string,
  prov: Provenance | undefined,
): void {
  if (!prov) return;
  for (const t of prov.techniques ?? []) {
    if (!fixedTechniqueIds.has(t)) {
      fail(relPath, `${where}: provenance technique "${t}" is not in the fixed technique set`);
    } else if (!techniqueIds.has(t)) {
      const msg = `${where}: provenance technique "${t}" has no matching spec/techniques/${t}.yaml`;
      if (techniqueFilesPresent) fail(relPath, msg);
      else warn(relPath, msg);
    }
  }
  for (const tool of prov.tools ?? []) {
    if (!toolIds.has(tool)) {
      const msg = `${where}: provenance tool "${tool}" has no matching spec/tools/${tool}.yaml`;
      if (toolsPresent) fail(relPath, msg);
      else warn(relPath, msg);
    }
  }
  for (const flavor of prov.flavors ?? []) {
    if (!flavorIds.has(flavor)) {
      const msg = `${where}: provenance flavor "${flavor}" has no matching spec/flavors/${flavor}.yaml`;
      if (flavorsPresent) fail(relPath, msg);
      else warn(relPath, msg);
    }
  }
  for (const c of prov.contributors ?? []) {
    if (!contributorIds.has(c)) {
      const msg = `${where}: provenance contributor "${c}" has no matching spec/contributors/${c}.yaml`;
      if (contributorsPresent) fail(relPath, msg);
      else warn(relPath, msg);
    }
  }
}

function checkAttributeType(relPath: string, attr: Attribute, where: string): void {
  const type = attr.type;
  if (typeof type !== 'string') return;
  if (type.startsWith('enum:')) {
    const enumId = type.slice('enum:'.length);
    if (!enumIds.has(enumId)) {
      fail(relPath, `${where}: attribute "${attr.name}" references unknown enum "${enumId}"`);
    }
  }
}

// Stanzas: provenance on every attribute + enum:<id> type references.
for (const { relPath, data } of stanzas as Loaded<Stanza>[]) {
  for (const { attribute, path } of walkAttributes(data)) {
    checkProvenance(relPath, path, attribute.provenance);
    checkAttributeType(relPath, attribute, path);
  }
  // Children may also carry provenance (per the stanza schema).
  for (const { child, path } of walkChildren(data)) {
    checkProvenance(relPath, path, child.provenance);
  }
}

// Flows: every step.stanza (when set) must reference an existing stanza id.
for (const { relPath, data } of flows) {
  for (const [i, step] of (data.steps ?? []).entries()) {
    if (step.stanza && !stanzaIds.has(step.stanza)) {
      fail(relPath, `steps[${i}]: references unknown stanza id "${step.stanza}"`);
    }
  }
}

// Techniques: id must come from the fixed set.
for (const { relPath, data } of techniques) {
  if (!fixedTechniqueIds.has(data.id)) {
    fail(relPath, `technique id "${data.id}" is not in the fixed technique set`);
  }
}

// Tools: declared techniques must be in the fixed set; maintainer must be a
// known contributor.
for (const { relPath, data } of tools as Loaded<Tool>[]) {
  for (const t of data.techniques ?? []) {
    if (!fixedTechniqueIds.has(t)) {
      fail(relPath, `tool "${data.id}": technique "${t}" is not in the fixed technique set`);
    }
  }
  if (data.maintainer && contributorsPresent && !contributorIds.has(data.maintainer)) {
    fail(relPath, `tool "${data.id}": maintainer "${data.maintainer}" has no matching contributor`);
  }
}

// Contributors: declared techniques must be in the fixed set; declared tools
// and flavors must exist.
for (const { relPath, data } of contributors as Loaded<Contributor>[]) {
  for (const t of data.techniques ?? []) {
    if (!fixedTechniqueIds.has(t)) {
      fail(relPath, `contributor "${data.id}": technique "${t}" is not in the fixed technique set`);
    }
  }
  for (const tool of data.tools ?? []) {
    if (toolsPresent && !toolIds.has(tool)) {
      fail(relPath, `contributor "${data.id}": tool "${tool}" has no matching spec/tools/${tool}.yaml`);
    }
  }
  for (const flavor of data.flavors ?? []) {
    if (flavorsPresent && !flavorIds.has(flavor)) {
      fail(relPath, `contributor "${data.id}": flavor "${flavor}" has no matching spec/flavors/${flavor}.yaml`);
    }
  }
}

// Flavors: basis techniques must be in the fixed set; maintainer must be a known
// contributor; derives_from must reference real flavor ids (and not itself).
for (const { relPath, data } of flavors as Loaded<Flavor>[]) {
  for (const t of data.basis ?? []) {
    if (!fixedTechniqueIds.has(t)) {
      fail(relPath, `flavor "${data.id}": basis technique "${t}" is not in the fixed technique set`);
    }
  }
  if (data.maintainer && contributorsPresent && !contributorIds.has(data.maintainer)) {
    fail(relPath, `flavor "${data.id}": maintainer "${data.maintainer}" has no matching contributor`);
  }
  for (const dep of data.derives_from ?? []) {
    if (dep === data.id) {
      fail(relPath, `flavor "${data.id}": derives_from cannot include itself`);
    } else if (!flavorIds.has(dep)) {
      fail(relPath, `flavor "${data.id}": derives_from "${dep}" has no matching spec/flavors/${dep}.yaml`);
    }
  }
}

// Flavor maps: the flavor must exist, and every entry's spec node reference
// (stanza/flow/enum) must resolve. area is schema-constrained; module/label are
// free-form. A map file's flavor id should also match its file name stem.
for (const { relPath, data } of flavorMaps as Loaded<FlavorMap>[]) {
  if (flavorsPresent && !flavorIds.has(data.flavor)) {
    fail(relPath, `flavor map references unknown flavor "${data.flavor}" (no spec/flavors/${data.flavor}.yaml)`);
  }
  const expectedStem = relPath.replace(/^.*\//, '').replace(/\.map\.yaml$/, '');
  if (data.flavor && data.flavor !== expectedStem) {
    fail(relPath, `flavor map "flavor: ${data.flavor}" does not match file name "${expectedStem}.map.yaml"`);
  }
  for (const [i, entry] of (data.entries ?? []).entries()) {
    const s = entry.spec ?? {};
    if (s.stanza && !stanzaIds.has(s.stanza)) {
      fail(relPath, `entries[${i}].spec.stanza references unknown stanza id "${s.stanza}"`);
    }
    if (s.flow && !flowIds.has(s.flow)) {
      fail(relPath, `entries[${i}].spec.flow references unknown flow id "${s.flow}"`);
    }
    if (s.enum && !enumIds.has(s.enum)) {
      fail(relPath, `entries[${i}].spec.enum references unknown enum id "${s.enum}"`);
    }
  }
}

// RFC parts: id matches file name, category matches parent dir, ids are unique,
// requires resolve to other parts, and implementation flavors are registered.
const rfcSeen = new Map<string, string>();
for (const { relPath, data } of rfcParts as Loaded<RfcPart>[]) {
  const segments = relPath.split('/'); // spec/rfc/<category>/<id>.yaml
  const stem = (segments.at(-1) ?? '').replace(/\.yaml$/, '');
  const parentDir = segments.at(-2);
  if (data.id !== stem) {
    fail(relPath, `rfc part id "${data.id}" does not match file name "${stem}.yaml"`);
  }
  if (data.category && parentDir && data.category !== parentDir) {
    fail(relPath, `rfc part category "${data.category}" does not match directory "${parentDir}/"`);
  }
  if (data.category && !rfcCategories.has(data.category)) {
    fail(relPath, `rfc part category "${data.category}" is not a known category`);
  }
  const prior = rfcSeen.get(data.id);
  if (prior) fail(relPath, `duplicate rfc part id "${data.id}" (also in ${prior})`);
  else rfcSeen.set(data.id, relPath);
  for (const dep of data.requires ?? []) {
    if (!rfcPartIds.has(dep)) {
      fail(relPath, `rfc part "${data.id}": requires "${dep}" has no matching spec/rfc part`);
    }
  }
  if (data.parent) {
    const pp = rfcParts.find((p) => p.data.id === data.parent);
    if (!pp) {
      fail(relPath, `rfc part "${data.id}": parent "${data.parent}" has no matching spec/rfc part`);
    } else if (pp.data.category !== data.category) {
      fail(relPath, `rfc part "${data.id}": parent "${data.parent}" is in a different category`);
    } else if (data.parent === data.id) {
      fail(relPath, `rfc part "${data.id}": parent cannot be itself`);
    }
  }
  if (data.discovered_by && contributorsPresent && !contributorIds.has(data.discovered_by)) {
    fail(relPath, `rfc part "${data.id}": discovered_by "${data.discovered_by}" has no matching spec/contributors/${data.discovered_by}.yaml`);
  }
  for (const impl of data.implementations ?? []) {
    if (flavorsPresent && impl.flavor && !flavorIds.has(impl.flavor)) {
      fail(relPath, `rfc part "${data.id}": implementation flavor "${impl.flavor}" has no matching spec/flavors/${impl.flavor}.yaml`);
    }
  }
}

// Captures: source.technique must exist as a technique id; sanitized must hold.
for (const { relPath, data } of captures) {
  const tech = data.source?.technique;
  if (!tech) {
    fail(relPath, 'source.technique is required');
  } else if (!fixedTechniqueIds.has(tech)) {
    fail(relPath, `source.technique "${tech}" is not in the fixed technique set`);
  } else if (!techniqueIds.has(tech)) {
    warn(relPath, `source.technique "${tech}" has no matching spec/techniques/${tech}.yaml`);
  }
  for (const tool of data.source?.tools ?? []) {
    if (toolsPresent && !toolIds.has(tool)) {
      warn(relPath, `source.tool "${tool}" has no matching spec/tools/${tool}.yaml`);
    }
  }
  const cap = data.source?.contributor;
  if (cap && contributorsPresent && !contributorIds.has(cap)) {
    warn(relPath, `source.contributor "${cap}" has no matching spec/contributors/${cap}.yaml`);
  }
  if (data.sanitized !== true) {
    fail(relPath, 'capture must set sanitized: true');
  }
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------

const fileCount =
  stanzas.length + flows.length + enums.length + techniques.length +
  contributors.length + tools.length + flavors.length + flavorMaps.length +
  rfcParts.length + captures.length;

console.log('wacrg corpus validation');
console.log('-----------------------');
console.log(
  `stanzas: ${stanzas.length}  flows: ${flows.length}  enums: ${enums.length}  ` +
    `techniques: ${techniques.length}  contributors: ${contributors.length}  ` +
    `tools: ${tools.length}  flavors: ${flavors.length}  flavor-maps: ${flavorMaps.length}  ` +
    `rfc-parts: ${rfcParts.length}  captures: ${captures.length}  (total ${fileCount} files)`,
);

if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  ~ ${w.file}: ${w.message}`);
}

if (problems.length) {
  console.error(`\nErrors (${problems.length}):`);
  for (const p of problems) console.error(`  ✗ ${p.file}: ${p.message}`);
  console.error('\nValidation FAILED.');
  process.exit(1);
}

console.log('\nAll files valid. ✓');
process.exit(0);
