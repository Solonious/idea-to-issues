import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES } from '../bin/lib/stack.mjs';

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
