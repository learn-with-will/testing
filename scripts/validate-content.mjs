// Validates the course content against the authoring contract:
//   - 24 lessons ↔ 24 quizzes ↔ manifest, ordered 1..24, 8 per level
//   - front-matter matches file path / level / order and the manifest
//   - every required H1 section is present, exactly 5 tags, ≥5 flash cards
//   - code fences use only python | bash | text
//   - quiz schema is valid per question type and every quiz spans all 5 types
// Run with `npm run validate`. Exits non-zero and prints every problem found.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = resolve(root, 'public', 'content');
const quizDir = resolve(root, 'public', 'quizzes');

const ALLOWED_FENCES = new Set(['python', 'bash', 'text']);
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const REQUIRED_SECTIONS = [
  'Learning Objectives',
  'Why It Matters',
  'Concept Explanation',
  'Key Terminology',
  'Options and Trade-offs',
  'Worked Example',
  'Real World Analogy',
  'Examples',
  'Common Mistakes',
  'Best Practices',
  'Summary',
  'Flash Cards',
  'Exercises',
  'Further Reading',
];
const QUESTION_TYPES = [
  'single-choice',
  'multiple-choice',
  'fill-blank',
  'ordering',
  'match-pair',
];

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

/** Minimal front-matter parser for the flat YAML the lessons use. */
function parseFrontMatter(raw, where) {
  if (!raw.startsWith('---')) {
    err(where, 'missing front-matter block');
    return { meta: {}, body: raw };
  }
  const end = raw.indexOf('\n---', 3);
  if (end === -1) {
    err(where, 'unterminated front-matter block');
    return { meta: {}, body: raw };
  }
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4);
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
      if (val && val !== '') {
        // inline list form is not used, but handle just in case
        meta.tags = val.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
      }
      continue;
    }
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    meta[key] = val;
  }
  return { meta, body };
}

/** H1 headings (lines beginning with a single `# `). */
function h1s(body) {
  return body
    .split('\n')
    .filter((l) => /^#\s+\S/.test(l))
    .map((l) => l.replace(/^#\s+/, '').trim());
}

function sectionBody(body, heading) {
  const lines = body.split('\n');
  const start = lines.findIndex((l) => l.replace(/^#\s+/, '').trim() === heading && /^#\s+/.test(l));
  if (start === -1) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#\s+\S/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join('\n');
}

function checkFences(body, where) {
  const fenceRe = /^```(\S*)/gm;
  let m;
  let open = false;
  const lines = body.split('\n');
  for (const line of lines) {
    const fm = /^```(.*)$/.exec(line);
    if (!fm) continue;
    if (!open) {
      const lang = fm[1].trim();
      if (!ALLOWED_FENCES.has(lang)) {
        err(where, `disallowed/blank code fence language: \`\`\`${lang || '(none)'}`);
      }
      open = true;
    } else {
      open = false;
    }
  }
  if (open) err(where, 'unbalanced code fence (```)');
  void fenceRe;
  void m;
}

// ---- Manifest -------------------------------------------------------------
const manifestPath = resolve(contentDir, 'course-manifest.json');
if (!existsSync(manifestPath)) {
  console.error('FATAL: course-manifest.json not found');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (!Array.isArray(manifest)) {
  console.error('FATAL: manifest is not an array');
  process.exit(1);
}
if (manifest.length !== 24) err('manifest', `expected 24 entries, found ${manifest.length}`);

const orders = manifest.map((m) => m.order).sort((a, b) => a - b);
for (let i = 0; i < 24; i++) {
  if (orders[i] !== i + 1) {
    err('manifest', `orders must be 1..24 with no gaps/dupes; got ${JSON.stringify(orders)}`);
    break;
  }
}
for (const level of LEVELS) {
  const n = manifest.filter((m) => m.level === level).length;
  if (n !== 8) err('manifest', `expected 8 ${level} lessons, found ${n}`);
}

// ---- Lessons --------------------------------------------------------------
const seenIds = new Set();
for (const entry of manifest) {
  const where = `lesson ${entry.id ?? '?'}`;
  const num = String(entry.order).padStart(2, '0');
  if (entry.id !== `lesson-${num}`) err(where, `id should be lesson-${num}, got ${entry.id}`);
  if (seenIds.has(entry.id)) err(where, `duplicate id ${entry.id}`);
  seenIds.add(entry.id);
  if (!LEVELS.includes(entry.level)) err(where, `bad level ${entry.level}`);
  if (entry.file !== `${entry.level}/${entry.slug}.md`)
    err(where, `file should be ${entry.level}/${entry.slug}.md, got ${entry.file}`);

  const filePath = resolve(contentDir, entry.file);
  if (!existsSync(filePath)) {
    err(where, `markdown file missing: ${entry.file}`);
    continue;
  }
  const raw = readFileSync(filePath, 'utf8');
  const { meta, body } = parseFrontMatter(raw, where);

  if (meta.id !== entry.id) err(where, `front-matter id ${meta.id} != manifest ${entry.id}`);
  if (meta.slug !== entry.slug) err(where, `front-matter slug ${meta.slug} != manifest ${entry.slug}`);
  if (meta.level !== entry.level) err(where, `front-matter level ${meta.level} != manifest ${entry.level}`);
  if (String(meta.order) !== String(entry.order))
    err(where, `front-matter order ${meta.order} != manifest ${entry.order}`);
  if (meta.summary !== entry.summary) err(where, 'front-matter summary != manifest summary');
  if (!Array.isArray(meta.tags) || meta.tags.length !== 5)
    err(where, `tags must be exactly 5, found ${meta.tags ? meta.tags.length : 0}`);
  if (!meta.duration || Number.isNaN(Number(meta.duration)))
    err(where, `duration must be a number, got ${meta.duration}`);

  const headings = h1s(body);
  for (const req of REQUIRED_SECTIONS) {
    if (!headings.includes(req)) err(where, `missing required H1 section: "${req}"`);
  }

  // Examples: at least 3 `## Example` H2s
  const exampleCount = (body.match(/^##\s+Example\s*\d/gim) || []).length;
  if (exampleCount < 3) err(where, `Examples needs 3 "## Example N" subsections, found ${exampleCount}`);

  // Exercises: Easy/Medium/Challenging H3s
  for (const tier of ['Easy', 'Medium', 'Challenging']) {
    if (!new RegExp(`^###\\s+${tier}\\b`, 'im').test(body))
      err(where, `Exercises missing "### ${tier}"`);
  }

  // Flash cards: ≥5 Q: markers within the Flash Cards section
  const fcBody = sectionBody(body, 'Flash Cards');
  const qCount = (fcBody.match(/^Q:\s+\S/gim) || []).length;
  const aCount = (fcBody.match(/^A:\s+\S/gim) || []).length;
  if (qCount < 5) err(where, `Flash Cards needs ≥5 Q:/A: pairs, found ${qCount} Q:`);
  if (qCount !== aCount) err(where, `Flash Cards Q: (${qCount}) and A: (${aCount}) counts differ`);

  checkFences(body, where);
}

// ---- Quizzes --------------------------------------------------------------
for (const entry of manifest) {
  const num = String(entry.order).padStart(2, '0');
  const where = `quiz lesson-${num}`;
  const quizPath = resolve(quizDir, `lesson-${num}.json`);
  if (!existsSync(quizPath)) {
    err(where, `quiz file missing: lesson-${num}.json`);
    continue;
  }
  let quiz;
  try {
    quiz = JSON.parse(readFileSync(quizPath, 'utf8'));
  } catch (e) {
    err(where, `invalid JSON: ${e.message}`);
    continue;
  }
  if (quiz.id !== `quiz-lesson-${num}`) err(where, `id should be quiz-lesson-${num}, got ${quiz.id}`);
  if (quiz.lessonId !== `lesson-${num}`) err(where, `lessonId should be lesson-${num}, got ${quiz.lessonId}`);
  if (quiz.passingScore !== 60) err(where, `passingScore should be 60, got ${quiz.passingScore}`);
  if (!Array.isArray(quiz.questions) || quiz.questions.length < 5 || quiz.questions.length > 6)
    err(where, `expected 5–6 questions, found ${quiz.questions ? quiz.questions.length : 0}`);

  const typesSeen = new Set();
  const qids = new Set();
  for (const q of quiz.questions || []) {
    const qw = `${where} ${q.id ?? '?'}`;
    if (!q.id) err(qw, 'question missing id');
    if (qids.has(q.id)) err(qw, `duplicate question id ${q.id}`);
    qids.add(q.id);
    if (!QUESTION_TYPES.includes(q.type)) {
      err(qw, `bad type ${q.type}`);
      continue;
    }
    typesSeen.add(q.type);
    if (!q.prompt) err(qw, 'missing prompt');
    if (!q.explanation) err(qw, 'missing explanation');

    if (q.type === 'single-choice') {
      const ids = new Set((q.options || []).map((o) => o.id));
      if (ids.size < 2) err(qw, 'single-choice needs ≥2 options');
      if (typeof q.answer !== 'string' || !ids.has(q.answer))
        err(qw, 'single-choice answer must be one option id');
    } else if (q.type === 'multiple-choice') {
      const ids = new Set((q.options || []).map((o) => o.id));
      if (ids.size < 2) err(qw, 'multiple-choice needs ≥2 options');
      if (!Array.isArray(q.answer) || q.answer.length < 1 || !q.answer.every((a) => ids.has(a)))
        err(qw, 'multiple-choice answer must be ≥1 valid option ids');
    } else if (q.type === 'fill-blank') {
      if (!Array.isArray(q.answer) || q.answer.length < 1 || !q.answer.every((a) => typeof a === 'string' && a.length))
        err(qw, 'fill-blank answer must be a non-empty string array');
    } else if (q.type === 'ordering') {
      const ids = (q.items || []).map((o) => o.id);
      if (ids.length < 2) err(qw, 'ordering needs ≥2 items');
      if (!Array.isArray(q.answer) || q.answer.length !== ids.length || [...q.answer].sort().join() !== [...ids].sort().join())
        err(qw, 'ordering answer must be a permutation of item ids');
    } else if (q.type === 'match-pair') {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2 || !q.pairs.every((p) => p.left && p.right))
        err(qw, 'match-pair needs ≥2 pairs with left/right');
    }
  }
  for (const t of QUESTION_TYPES) {
    if (!typesSeen.has(t)) err(where, `quiz should span all 5 types; missing "${t}"`);
  }
}

// ---- Stray files ----------------------------------------------------------
for (const level of LEVELS) {
  const dir = resolve(contentDir, level);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    const slug = f.replace(/\.md$/, '');
    if (!manifest.some((m) => m.level === level && m.slug === slug))
      err('content', `orphan lesson file not in manifest: ${level}/${f}`);
  }
}
for (const f of readdirSync(quizDir)) {
  if (!f.endsWith('.json')) continue;
  const m = /^lesson-(\d\d)\.json$/.exec(f);
  if (!m) err('quizzes', `unexpected quiz filename: ${f}`);
}

// ---- Report ---------------------------------------------------------------
if (errors.length) {
  console.error(`\n✗ Content validation failed with ${errors.length} problem(s):\n`);
  for (const e of errors) console.error('  • ' + e);
  console.error('');
  process.exit(1);
}
console.log('✓ Content validation passed: 24 lessons, 24 quizzes, manifest consistent.');
