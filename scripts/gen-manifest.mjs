// Generates public/content/course-manifest.json from each lesson's YAML
// front-matter, so the manifest can never drift from the files. Ordered by the
// `order` field. Run with `node scripts/gen-manifest.mjs`.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = resolve(root, 'public', 'content');
const LEVELS = ['beginner', 'intermediate', 'advanced'];

function parseFrontMatter(raw) {
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return null;
  const fm = raw.slice(3, end).trim();
  const meta = {};
  let key = null;
  for (const line of fm.split('\n')) {
    if (/^\s*-\s+/.test(line) && key === 'tags') {
      meta.tags.push(line.replace(/^\s*-\s+/, '').trim());
      continue;
    }
    const m = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    key = m[1];
    let val = m[2].trim();
    if (key === 'tags') {
      meta.tags = [];
      continue;
    }
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    meta[key] = val;
  }
  return meta;
}

const entries = [];
for (const level of LEVELS) {
  const dir = resolve(contentDir, level);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    const raw = readFileSync(resolve(dir, f), 'utf8');
    const meta = parseFrontMatter(raw);
    if (!meta) {
      console.error(`skip ${level}/${f}: no front-matter`);
      continue;
    }
    entries.push({
      id: meta.id,
      slug: meta.slug,
      title: meta.title,
      level: meta.level,
      order: Number(meta.order),
      duration: Number(meta.duration),
      file: `${meta.level}/${meta.slug}.md`,
      summary: meta.summary,
      tags: meta.tags ?? [],
    });
  }
}

entries.sort((a, b) => a.order - b.order);
const out = resolve(contentDir, 'course-manifest.json');
writeFileSync(out, JSON.stringify(entries, null, 2) + '\n');
console.log(`Wrote ${entries.length} entries to course-manifest.json`);
