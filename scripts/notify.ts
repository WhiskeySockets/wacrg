/**
 * notify.ts: the opt-in push side of "notify libraries of spec updates".
 *
 * Given a set of changed RFC part ids (env CHANGED_PARTS — a comma/space/newline
 * list of part ids or spec/rfc/**.yaml paths), compute which flavors implement
 * those parts AND have opted in (notify_opt_in + notify_repo), and emit a payload
 * the spec-notify workflow turns into tracking issues. Pull (feed.json) is always
 * available and needs nothing here; this is only the opt-in push channel.
 *
 * Writes notify-payload.json (repo-root) and prints a human summary. Exits 0 even
 * when there is nothing to notify.
 */
import { writeFileSync } from 'node:fs';
import { fromRoot, loadFlavors, loadRfcParts, type RfcPart } from './lib/corpus.ts';

function parseChanged(raw: string | undefined): Set<string> {
  const ids = new Set<string>();
  for (const token of (raw ?? '').split(/[\s,]+/)) {
    const t = token.trim();
    if (!t) continue;
    // Accept a bare part id, or a path like spec/rfc/<cat>/<id>.yaml.
    const m = t.match(/([a-z0-9][a-z0-9-]*)\.yaml$/);
    ids.add(m ? m[1] : t);
  }
  return ids;
}

const changed = parseChanged(process.env.CHANGED_PARTS);
const parts = loadRfcParts().map((p) => p.data);
const flavors = loadFlavors().map((f) => f.data);

const partById = new Map<string, RfcPart>(parts.map((p) => [p.id, p]));
const changedParts = [...changed].filter((id) => partById.has(id)).map((id) => partById.get(id)!);

interface PayloadEntry {
  flavor: string;
  repo: string;
  parts: Array<{ id: string; title: string; category: string; ref: string }>;
}

const payload: PayloadEntry[] = [];
for (const flavor of flavors) {
  if (!flavor.notify_opt_in || !flavor.notify_repo) continue;
  const hits = changedParts.filter((p) =>
    (p.implementations ?? []).some((i) => i.flavor === flavor.id),
  );
  if (!hits.length) continue;
  payload.push({
    flavor: flavor.id,
    repo: flavor.notify_repo,
    parts: hits.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      ref: `https://whiskeysockets.github.io/wacrg/spec/rfc/#${p.id}`,
    })),
  });
}

writeFileSync(fromRoot('notify-payload.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');

console.log('spec-notify');
console.log('-----------');
console.log(`changed RFC parts: ${changedParts.length ? changedParts.map((p) => p.id).join(', ') : '(none)'}`);
if (!payload.length) {
  console.log('No opted-in flavor implements a changed part. Nothing to push.');
} else {
  for (const e of payload) {
    console.log(`→ ${e.repo} (flavor ${e.flavor}): ${e.parts.map((p) => p.id).join(', ')}`);
  }
}
console.log('Wrote notify-payload.json');
