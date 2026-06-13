/**
 * validate.ts — schema + referential-integrity validator for the wacrg corpus.
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
  TECHNIQUE_IDS,
  fromRoot,
  loadCaptures,
  loadEnums,
  loadFlows,
  loadStanzas,
  loadTechniques,
  readSchema,
  readYaml,
  walkAttributes,
  walkChildren,
  type Attribute,
  type Loaded,
  type Provenance,
  type Stanza,
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
    warn(schemaPath, `schema not found — skipping schema validation for ${kind}`);
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
  if (!validate) return; // schema missing — already warned once
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
const captures = loadCaptures();

// Reference sets for integrity checks.
const techniqueIds = new Set<string>(techniques.map((t) => t.data.id));
const stanzaIds = new Set<string>(stanzas.map((s) => s.data.id));
const enumIds = new Set<string>(enums.map((e) => e.data.id));
const fixedTechniqueIds = new Set<string>(TECHNIQUE_IDS);

// During bootstrap the spec/techniques/ directory may not exist yet. When no
// technique files are present we still enforce the fixed technique vocabulary,
// but downgrade the "missing matching technique file" check to a warning so the
// corpus remains validatable while that directory is being authored.
const techniqueFilesPresent = techniques.length > 0;

// ---------------------------------------------------------------------------
// Schema validation pass.
// ---------------------------------------------------------------------------

for (const f of stanzas) validateFile('stanza', f);
for (const f of flows) validateFile('flow', f);
for (const f of enums) validateFile('enum', f);
for (const f of techniques) validateFile('technique', f);
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
  if (!prov?.techniques) return;
  for (const t of prov.techniques) {
    if (!fixedTechniqueIds.has(t)) {
      fail(relPath, `${where}: provenance technique "${t}" is not in the fixed technique set`);
    } else if (!techniqueIds.has(t)) {
      const msg = `${where}: provenance technique "${t}" has no matching spec/techniques/${t}.yaml`;
      if (techniqueFilesPresent) fail(relPath, msg);
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
  if (data.sanitized !== true) {
    fail(relPath, 'capture must set sanitized: true');
  }
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------

const fileCount =
  stanzas.length + flows.length + enums.length + techniques.length + captures.length;

console.log('wacrg corpus validation');
console.log('-----------------------');
console.log(
  `stanzas: ${stanzas.length}  flows: ${flows.length}  enums: ${enums.length}  ` +
    `techniques: ${techniques.length}  captures: ${captures.length}  (total ${fileCount} files)`,
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
