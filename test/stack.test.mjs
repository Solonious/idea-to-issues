import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
