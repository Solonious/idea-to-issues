import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from '../bin/lib/stack.mjs';

const BIN = fileURLToPath(new URL('../bin/i2i.mjs', import.meta.url));
const DEFAULTS = readFileSync(new URL('../docs/stack-defaults.md', import.meta.url), 'utf8');
const IN_SCOPE = [
  'monorepo', 'web-framework', 'web-hosting', 'ui-library', 'api-framework', 'api-hosting',
  'data-access', 'database-engine', 'database-hosting',
  'auth', 'file-storage', 'email', 'push', 'payments', 'ai-api',
  'ci-cd', 'error-tracking', 'analytics',
];
const ALWAYS = ['ci-cd', 'error-tracking', 'analytics'];

// The body of one category's section in docs/stack-defaults.md, up to the next `## ` heading.
function section(category) {
  const parts = DEFAULTS.split(/^## /m);
  return parts.find((p) => p.startsWith(`\`${category}\`:`));
}

test('every category in scope has exactly one entry with a default', () => {
  assert.deepEqual(CATEGORIES.map((c) => c.category).sort(), [...IN_SCOPE].sort());
  for (const c of CATEGORIES) assert.ok(typeof c.default === 'string' && c.default.trim(), `${c.category} has no default`);
});

test('a product-dependent category has a question and an always-needed one has none', () => {
  for (const c of CATEGORIES) {
    assert.equal(typeof c.always, 'boolean', c.category);
    if (c.always) assert.equal(c.question, null, `${c.category} is always needed but has a question`);
    else assert.match(c.question ?? '', /\S.*\?$/, `${c.category} has no question`);
  }
  assert.deepEqual(CATEGORIES.filter((c) => c.always).map((c) => c.category).sort(), [...ALWAYS].sort());
});

test('docs/stack-defaults.md records the options and sources behind each default', () => {
  for (const { category } of CATEGORIES) {
    const body = section(category);
    assert.ok(body, `no section for ${category}`);
    assert.match(body, /^\*\*Default:\*\* (?!pending)\S/m, `${category} has no recorded default`);
    assert.ok((body.match(/^- \*\*/gm) ?? []).length >= 2, `${category} lists fewer than two options`);
    assert.match(body, /^Sources: https:\/\//m, `${category} cites no source`);
  }
});

const i2i = (...args) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });

test('every Needed line in docs/stack-defaults.md matches CATEGORIES', () => {
  for (const c of CATEGORIES) {
    const needed = c.always ? '**Needed:** always.' : `**Needed:** when the concept answers yes to: "${c.question}"`;
    assert.ok(section(c.category).includes(needed), `${c.category}: Needed line`);
  }
});

test('stack defaults prints every category once, in CATEGORIES order, with its default, always flag and question', () => {
  const r = i2i('stack', 'defaults');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, '');
  const headings = r.stdout.split('\n').filter((l) => l.startsWith('## `')).map((l) => l.slice(4, l.indexOf('`', 4)));
  assert.deepEqual(headings, CATEGORIES.map((c) => c.category));
  for (const c of CATEGORIES) {
    assert.ok(r.stdout.includes(`\ndefault: ${c.default}\n`), `${c.category}: default`);
    assert.ok(r.stdout.includes(`\nalways: ${c.always ? 'yes' : 'no'}\n`), `${c.category}: always`);
    assert.ok(r.stdout.includes(`\nquestion: ${c.question ?? 'none'}\n`), `${c.category}: question`);
  }
  assert.ok(r.stdout.split('\n').filter((l) => l.startsWith('Sources: https://')).length >= CATEGORIES.length);
});

test('stack defaults with names prints only those, and refuses an unknown one or another action', () => {
  let r = i2i('stack', 'defaults', 'ui-library');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.split('\n').filter((l) => l.startsWith('## ')).length, 1);
  assert.ok(r.stdout.includes('default: spartan/ui (Tailwind CSS v4)'));
  r = i2i('stack', 'defaults', 'nope');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /"nope" is not a category; the categories are monorepo, .*analytics/);
  for (const args of [['stack'], ['stack', 'other']]) {
    r = i2i(...args);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /^Usage: i2i stack defaults/);
  }
});

const FIXTURES = fileURLToPath(new URL('./fixtures/stack', import.meta.url));
const CONTRACT = fileURLToPath(new URL('../docs/CONTRACT.md', import.meta.url));

function tempDir(t) {
  const tmp = mkdtempSync(join(tmpdir(), 'i2i-'));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  return tmp;
}

// A copy of fixtures/stack/valid in a temp dir, with stack.md passed through `edit`.
function mutated(t, edit) {
  const tmp = tempDir(t);
  copyFileSync(join(FIXTURES, 'valid', 'CONCEPT.md'), join(tmp, 'CONCEPT.md'));
  writeFileSync(join(tmp, 'stack.md'), edit(readFileSync(join(FIXTURES, 'valid', 'stack.md'), 'utf8')));
  return tmp;
}

const dropLine = (prefix) => (text) => {
  const lines = text.split('\n');
  const at = lines.findIndex((l) => l.startsWith(prefix));
  assert.notEqual(at, -1, `no line starts with ${prefix}`);
  lines.splice(at, 1);
  return lines.join('\n');
};

test('stack check passes the valid fixture', () => {
  const { status, stdout, stderr } = i2i('stack', 'check', join(FIXTURES, 'valid'));
  assert.equal(status, 0, stderr);
  assert.equal(stderr, '');
  assert.match(stdout, /^stack check: 7 rows, 12 ledger lines, 16 rulings mapped, 0 findings$/m);
});

const RULES = [
  ['missing-category', 'email', dropLine('| `email` |')],
  ['not-needed-on-always-on', 'analytics', (text) => text.replace('|---|---|---|\n', '|---|---|---|\n| `analytics` | Ruling 2 | A household needs no analytics |\n')],
  ['bad-ruling-ref', 'Ruling 60', (text) => text.replace('Driver: Ruling 6\n', 'Driver: Ruling 60\n')],
  ['orphan-row', 'maps', dropLine('Driver: Ruling 15')],
  ['unmapped-ruling', 'Ruling 3', dropLine('| Ruling 3 | no runtime need |')],
];

for (const [rule, key, edit] of RULES) {
  test(`stack check reports ${rule} and only it`, (t) => {
    const { status, stdout, stderr } = i2i('stack', 'check', mutated(t, edit));
    assert.equal(status, 1, stderr);
    assert.equal(stdout, '');
    assert.ok(stderr.includes(` [${key}] ${rule}: `), stderr);
    assert.match(stderr, /^stack check: 1 finding\(s\)$/m);
  });
}

test('stack check usage and missing files exit 2', (t) => {
  const usage = i2i('stack', 'check', 'a', 'b');
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /^Usage: i2i stack defaults/);
  const none = i2i('stack', 'check', tempDir(t));
  assert.equal(none.status, 2);
  assert.match(none.stderr, /stack\.md does not exist/);
  const tmp = tempDir(t);
  copyFileSync(join(FIXTURES, 'valid', 'stack.md'), join(tmp, 'stack.md'));
  const noConcept = i2i('stack', 'check', tmp);
  assert.equal(noConcept.status, 2);
  assert.match(noConcept.stderr, /CONCEPT\.md does not exist/);
});

test('the stack example in docs/CONTRACT.md passes stack check', (t) => {
  const tmp = tempDir(t);
  const files = [...readFileSync(CONTRACT, 'utf8').matchAll(/^````markdown (\S+\.md)\n([\s\S]*?)\n````$/gm)].filter((f) => f[1] === 'docs/CONCEPT.md' || f[1] === 'docs/stack.md');
  assert.equal(files.length, 2);
  mkdirSync(join(tmp, 'docs'));
  for (const [, name, content] of files) writeFileSync(join(tmp, name), content + '\n');
  const { status, stdout, stderr } = i2i('stack', 'check', join(tmp, 'docs'));
  assert.equal(status, 0, stderr);
  assert.match(stdout, /0 findings$/m);
});
